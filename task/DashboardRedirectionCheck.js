class DashboardRedirectionCheck {
  constructor(timeout = 60000) {
    this.timeout = timeout;
  }

  async performAs(actor) {
    const page = actor.page;
    console.log("Waiting for redirection to dashboard or success-page...");
    
    await page.waitForURL(
      url => url.pathname.includes('dashboard') || url.pathname.includes('success-page') || url.pathname.includes('my-report'),
      { timeout: this.timeout }
    );
    const currentUrl = page.url();
    console.log(`Successfully redirected to: ${currentUrl}`);
  }
}

module.exports = DashboardRedirectionCheck;
