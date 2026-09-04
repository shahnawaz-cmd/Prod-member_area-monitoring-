const { expect } = require('@playwright/test');
const { CookieIpInjector, IP_POOL } = require('../utils/cookie.helper');

/**
 * Task to verify CWA IP persistence across multiple page refreshes
 * and new tabs within the SAME browser session.
 */
class SessionIpStickinessTask {
  constructor(targetIp = IP_POOL.KOREA, reloadCount = 2) {
    this.targetIp = targetIp;
    this.reloadCount = reloadCount;
  }

  async performAs(actor) {
    await this.executeStickinessCheck(actor.page, this.targetIp, this.reloadCount);
  }

  /**
   * 1. Multiple Page Refreshes:
   * Reloads the page N times in the same tab and verifies cwa_ip stays locked on every refresh.
   */
  async verifyMultipleRefreshes(page, expectedIp = IP_POOL.KOREA, reloadCount = 2) {
    const ipInjector = new CookieIpInjector(page.context());
    const results = [];

    console.log('\n' + '═'.repeat(70));
    console.log(`🔄 [SESSION STICKINESS] Testing ${reloadCount} consecutive page reload(s) in same browser`);
    console.log('═'.repeat(70));

    for (let i = 1; i <= reloadCount; i++) {
      console.log(`   ⏳ Performing Reload #${i}...`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => {});

      const currentIp = (await ipInjector.getCwaIpValue()) || '';
      const isMatched = currentIp === expectedIp;

      console.log(`   • [Reload #${i}] Current 'cwa_ip': "${currentIp}" | Expected: "${expectedIp}" ➡️ ${isMatched ? '✅ LOCKED' : '❌ CHANGED'}`);

      expect(
        currentIp,
        `[FAILURE] 'cwa_ip' changed on reload #${i}! Expected "${expectedIp}", got "${currentIp}"`
      ).toBe(expectedIp);

      results.push({
        reloadIndex: i,
        ipValue: currentIp,
        isMatched,
      });
    }

    console.log(`✅ [SESSION STICKINESS] Successfully passed all ${reloadCount} page reload checks!`);
    console.log('═'.repeat(70) + '\n');

    return results;
  }

  /**
   * 2. Opening a New Tab in the Same Browser Window:
   * Opens a second tab in the same browser context and verifies cwa_ip is shared and unchanged.
   */
  async verifyNewTabPersistence(context, targetUrl, expectedIp = IP_POOL.KOREA) {
    const ipInjector = new CookieIpInjector(context);

    console.log('\n' + '═'.repeat(70));
    console.log(`📑 [SESSION STICKINESS] Opening Tab 2 in the same browser window`);
    console.log('═'.repeat(70));

    // Open new tab in same browser context
    const tab2 = await context.newPage();
    await tab2.goto(targetUrl, { waitUntil: 'domcontentloaded' });
    await tab2.waitForLoadState('networkidle').catch(() => {});

    const tab2Ip = (await ipInjector.getCwaIpValue()) || '';
    const isMatched = tab2Ip === expectedIp;

    console.log(`   • [Tab 2 URL]    ${tab2.url()}`);
    console.log(`   • [Tab 2 cwa_ip] "${tab2Ip}" | Expected: "${expectedIp}" ➡️ ${isMatched ? '✅ SYNCED' : '❌ MISMATCH'}`);

    expect(
      tab2Ip,
      `[FAILURE] Tab 2 'cwa_ip' does not match session IP! Expected "${expectedIp}", got "${tab2Ip}"`
    ).toBe(expectedIp);

    console.log(`✅ [SESSION STICKINESS] Tab 2 successfully inherited locked session IP!`);
    console.log('═'.repeat(70) + '\n');

    return {
      newTabPage: tab2,
      tabIp: tab2Ip,
      isMatched,
    };
  }

  /**
   * Comprehensive Execution: Runs Refreshes & New Tab and generates test report artifact.
   */
  async executeStickinessCheck(page, targetIp = IP_POOL.KOREA, reloadCount = 2, testInfo = null) {
    const context = page.context();
    const ipInjector = new CookieIpInjector(context);
    const targetUrl = page.url() && page.url() !== 'about:blank' ? page.url() : (process.env.BASE_URL || 'https://members.vehiclehistory.report');

    // 1. Initial Set & Inject IP
    await ipInjector.setCwaIpCookie(targetIp);

    // 2. Perform Multiple Refreshes in Tab 1
    const refreshResults = await this.verifyMultipleRefreshes(page, targetIp, reloadCount);

    // 3. Open Tab 2 in Same Browser & Verify Persistence
    const tab2Result = await this.verifyNewTabPersistence(context, targetUrl, targetIp);

    // Close secondary tab
    await tab2Result.newTabPage.close().catch(() => {});

    const report = {
      targetUrl,
      targetIp,
      refreshes: refreshResults,
      newTabIp: tab2Result.tabIp,
      isMultiTabMatched: tab2Result.isMatched,
      status: 'VERIFIED_SESSION_STICKY',
    };

    if (testInfo) {
      await testInfo.attach('session-ip-stickiness-report.json', {
        body: JSON.stringify(report, null, 2),
        contentType: 'application/json',
      }).catch(() => {});
    }

    return report;
  }
}

module.exports = SessionIpStickinessTask;
