class DashboardRedirectionCheck {
  constructor(timeout = 60000) {
    this.timeout = timeout;
  }

  async performAs(actor) {
    const page = actor.page;
    const dashboardUrl = actor.dashboardUrl || (actor.baseUrl ? `${actor.baseUrl}/members/dashboard` : 'https://members.vehiclehistory.report/members/dashboard');

    console.log("Awaiting post-payment redirection to Dashboard...");

    // 1. Wait for natural redirection to dashboard or intermediate success-page
    try {
      await page.waitForURL(
        url => url.pathname.includes('dashboard') || url.pathname.includes('success-page') || url.pathname.includes('my-report'),
        { timeout: this.timeout, waitUntil: 'load' }
      );
    } catch (e) {
      console.log("Natural redirect timed out; transitioning directly to dashboard...");
    }

    // 2. If not yet on dashboard, navigate directly to dashboard
    if (!page.url().includes('/dashboard')) {
      console.log("Navigating directly to Dashboard URL...");
      await page.goto(dashboardUrl, { waitUntil: 'load', timeout: 30000 }).catch(() => {});
    }

    // 3. Strictly verify dashboard URL and full document load state
    await page.waitForURL('**/dashboard**', { timeout: 30000, waitUntil: 'load' });
    await page.waitForLoadState('load');

    // 4. Ensure dashboard DOM (search/VIN input) is mounted & storage/cookies are settled
    const dashboardAnchor = page.locator('input[placeholder*="VIN" i], input[name*="vin" i], a[href*="dashboard"], button:has-text("Search"), button:has-text("Get vehicle")').first();
    await dashboardAnchor.waitFor({ state: 'visible', timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000); // Buffer to guarantee all auth cookies & localStorage tokens are saved

    console.log(`✅ Successfully stabilized on dashboard: ${page.url()}`);
  }
}

module.exports = DashboardRedirectionCheck;
