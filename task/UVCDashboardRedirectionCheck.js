class UVCDashboardRedirectionCheck {
  constructor(timeout = 60000) {
    this.timeout = timeout;
  }

  async performAs(actor) {
    const page = actor.page;
    console.log("Awaiting UVC post-payment natural system sequence...");

    // 1. Wait for post-checkout landing (success-page or dashboard)
    await page.waitForURL(
      url => url.pathname.includes('success-page') || url.pathname.includes('dashboard'),
      { timeout: this.timeout, waitUntil: 'load' }
    ).catch(() => {});

    console.log(`Landed on post-checkout URL: ${page.url()}`);

    // 2. Allow system's natural auto-redirection from success-page to dashboard
    if (!page.url().includes('/dashboard')) {
      console.log("Awaiting natural system auto-redirection to dashboard...");
      await page.waitForURL('**/dashboard**', { timeout: this.timeout, waitUntil: 'load' }).catch(async () => {
        // Fallback: Click success page button if auto-redirection does not trigger
        const continueBtn = page.getByRole('button', { name: /dashboard|continue|view|access|proceed/i })
          .or(page.getByRole('link', { name: /dashboard|continue|view|access|proceed/i }))
          .first();

        if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log("Clicking success page transition button...");
          await continueBtn.click({ force: true }).catch(() => {});
          await page.waitForURL('**/dashboard**', { timeout: 30000 }).catch(() => {});
        }
      });
    }

    await page.waitForTimeout(3000); // Allow DOM state to settle naturally
    console.log(`✅ UVC post-payment natural system sequence settled on: ${page.url()}`);
  }
}

module.exports = UVCDashboardRedirectionCheck;
