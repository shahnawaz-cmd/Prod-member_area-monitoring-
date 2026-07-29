class DashboardRedirectionCheck {
  constructor(timeout = 30000) {
    this.timeout = timeout;
  }

  async performAs(actor) {
    const page = actor.page;
    console.log("Waiting for redirection to dashboard...");
    
    await page.waitForURL('**/dashboard**', { timeout: this.timeout });
    const currentUrl = page.url();
    console.log(`Successfully redirected to: ${currentUrl}`);
    
    if (!currentUrl.includes('dashboard')) {
        throw new Error(`Failed to redirect to dashboard. Current URL: ${currentUrl}`);
    }
  }
}

module.exports = DashboardRedirectionCheck;
