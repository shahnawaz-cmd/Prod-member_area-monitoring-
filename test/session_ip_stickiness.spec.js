const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const GenerateEmail = require('../task/GenerateEmail');
const SignupAuthFlow = require('../task/SignupAuthFlow');
const SessionIpStickinessTask = require('../task/SessionIpStickinessTask');
const { IP_POOL, CookieHelper } = require('../utils/cookie.helper');

test.describe('Session IP Stickiness & Persistence Suite', () => {
  // Use clean isolated session state
  test.use({ storageState: { cookies: [], origins: [] } });

  test('CS-10 — Verify CWA IP stickiness, complete signup, and capture dashboard screenshot', async ({ page }, testInfo) => {
    test.setTimeout(180000); // 3 minutes budget

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    const targetUrl = actor.baseUrl.includes('members.vehiclehistory.report')
      ? `${actor.baseUrl}/members/signup`
      : `${actor.baseUrl}/signup`;

    console.log(`Navigating to target URL: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });

    const cookieHelper = new CookieHelper(page);
    const stickinessTask = new SessionIpStickinessTask();

    // 1. Initial Cookie Capture before injection
    await cookieHelper.captureAllCookies({ log: true, testInfo, filename: 'before-injection-cookies.json' });

    // 2. Execute full stickiness check with Regional IP (Korea)
    const report = await stickinessTask.executeStickinessCheck(page, IP_POOL.KOREA, 2, testInfo);

    // 3. Capture All Cookies after stickiness check
    await cookieHelper.captureAllCookies({ log: true, testInfo, filename: 'after-stickiness-cookies.json' });

    // 4. Assert stickiness report integrity
    expect(report.status).toBe('VERIFIED_SESSION_STICKY');
    expect(report.isMultiTabMatched).toBe(true);
    expect(report.refreshes.every(r => r.isMatched)).toBe(true);

    // 5. Generate Unique Account Credentials
    await actor.attemptsTo(new GenerateEmail('stickiness'));

    // 6. Complete Signup Auth Flow with Sticky Session
    console.log("Proceeding to signup with locked session IP...");
    await actor.attemptsTo(new SignupAuthFlow(null, null, isSlowNetwork));

    // 7. Verify Dashboard URL
    await expect(page).toHaveURL(/.*dashboard.*/, { timeout: 30000 });

    // 8. Capture Dashboard Screenshot & Attach to Test Report
    const screenshotDir = path.resolve(process.cwd(), 'test-results', 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, `dashboard-cs10-${Date.now()}.png`);
    const screenshotBuffer = await page.screenshot({ path: screenshotPath, fullPage: true });

    await testInfo.attach('dashboard-post-signup.png', {
      body: screenshotBuffer,
      contentType: 'image/png',
    });

    console.log(`📸 Dashboard screenshot captured and saved to: ${screenshotPath}`);
    console.log('✅ CS-10: IP Stickiness, Signup, and Dashboard screenshot completed successfully.');
    
    await page.close();
  });
});
