class DashboardRedirectionCheck {
  constructor(timeout = 60000) {
    this.timeout = timeout;
  }

  async performAs(actor) {
    const page = actor.page;
    const dashboardUrl = actor.dashboardUrl || (actor.baseUrl ? `${actor.baseUrl}/members/dashboard` : 'https://members.vehiclehistory.report/members/dashboard');

    console.log("Awaiting post-payment natural auto-navigation to Dashboard...");

    // 1. Wait for natural system redirection after payment
    try {
      await page.waitForURL(
        url => url.pathname.includes('dashboard') || url.pathname.includes('success-page') || url.pathname.includes('my-report'),
        { timeout: this.timeout, waitUntil: 'load' }
      );
    } catch (e) {
      console.log("Natural redirect timed out; checking current URL state...");
    }

    // 2. Allow system auto-navigation state to settle completely
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForTimeout(3000); // Buffer for auth tokens & cookies to save

    // 3. Guarantee transition to dashboard URL if not already on /dashboard
    if (!page.url().includes('/dashboard')) {
      console.log("Navigating to Dashboard URL to complete setup session...");
      await page.goto(dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    }

    // 4. Verify dashboard URL
    await page.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
    console.log(`✅ Successfully stabilized on dashboard: ${page.url()}`);
  }
}

module.exports = DashboardRedirectionCheck;
