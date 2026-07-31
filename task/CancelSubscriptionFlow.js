class CancelSubscriptionFlow {
  constructor(isSlowNetwork = false) {
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    console.log("Starting Subscription Cancellation Flow...");

    // 1. Mobile View Handling (Open side nav menu to expose settings link if on mobile)
    const viewport = page.viewportSize();
    const isMobile = viewport && viewport.width < 768;

    if (isMobile) {
      console.log("Mobile view detected, opening side navigation for settings link...");
      const menuToggle = page.getByRole('img', { name: 'Menu' }).first();
      await menuToggle.waitFor({ state: 'visible', timeout: timeout }).catch(() => {});
      if (await menuToggle.isVisible()) {
        await menuToggle.click();
      }
      await page.waitForTimeout(1000);
    }

    // 2. Click dynamic "Basic Account" nav item (ignores dynamic initial at the front)
    const accountLink = page.getByRole('link', { name: /Basic Account/i }).first();
    await accountLink.waitFor({ state: 'visible', timeout: timeout });
    await accountLink.click();
    console.log("Clicked 'Basic Account' navigation link.");

    // 3. Viewport-specific navigation to subscription details and cancel button
    if (isMobile) {
      console.log("Mobile view: Accessing Subscription(s) menu...");
      // Safe fallback from nth(1) to first() because new accounts only have 1 active subscription item
      const subTab = page.getByText('Subscription(s)').first();
      await subTab.waitFor({ state: 'visible', timeout: timeout });
      await subTab.click();
      
      const cancelLink = page.locator('a').filter({ hasText: 'Cancel Subscription' }).first();
      await cancelLink.waitFor({ state: 'visible', timeout: timeout });
      await cancelLink.click();
      console.log("Clicked 'Cancel Subscription' link on mobile.");
    } else {
      console.log("Desktop view: Accessing Order History menu...");
      // Safe fallback from nth(1) to first() for fresh accounts
      const orderHistoryTab = page.locator('div').filter({ hasText: /^Order History$/ }).first();
      await orderHistoryTab.waitFor({ state: 'visible', timeout: timeout });
      await orderHistoryTab.click();
      
      const cancelButton = page.getByRole('button', { name: 'Cancel Subscription' }).first();
      await cancelButton.waitFor({ state: 'visible', timeout: timeout });
      await cancelButton.click();
      console.log("Clicked 'Cancel Subscription' button on desktop.");
    }

    // Listen to the cancellation API request
    const cancelPromise = page.waitForResponse(
      res => res.url().includes('cancel-subscription'),
      { timeout: timeout }
    );

    // 4. Click the confirmation popup "Yes" button
    const yesButton = page.getByRole('button', { name: 'Yes' });
    await yesButton.waitFor({ state: 'visible', timeout: timeout });
    await yesButton.click({ force: true });
    console.log("Clicked confirmation 'Yes' button.");

    // Wait for the cancellation API to resolve
    await cancelPromise;
    console.log("Subscription cancellation API call resolved.");

    // 5. Click the confirmation success popup "Ok" button
    const okButton = page.getByRole('button', { name: 'Ok' })
      .or(page.getByRole('button', { name: 'OK' }))
      .or(page.locator('button').filter({ hasText: /^ok$/i }))
      .first();
      
    await okButton.waitFor({ state: 'visible', timeout: timeout });
    await okButton.click({ force: true });
    console.log("Clicked confirmation success 'Ok' button. Cancellation complete!");
  }
}

module.exports = CancelSubscriptionFlow;
