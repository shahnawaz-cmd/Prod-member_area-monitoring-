class SelectPlan {
  constructor(planName = 'Vehicle Report', isSlowNetwork = false) {
    this.planName = planName;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    await page.waitForURL('**/dashboard**', { timeout: timeout });

    // Mobile View Handling
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      console.log("Mobile view detected, opening side navigation...");
      const menuToggle = page.getByRole('img', { name: 'Menu' });
      await menuToggle.waitFor({ state: 'visible', timeout: timeout });
      await menuToggle.click();
      
      const reportButton = page.getByRole('button', { name: 'Vehicle Report' });
      await reportButton.waitFor({ state: 'visible', timeout: timeout });
      await reportButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Always click 'Vehicle Report' span first in desktop
      await page.locator('span:has-text("Vehicle Report")').click();
      console.log(`Clicked 'Vehicle Report' span. (Timeout: ${timeout}ms)`);
      await page.waitForTimeout(2000);
    }

    if (this.planName === 'UVC Subscription') {
      // Specific flow for UVC: Select radio button and click Proceed
      console.log("Selecting 'Unlimited VIN Check' plan...");
      await page.getByLabel('Unlimited VIN Check').click();
      await page.getByRole('button', { name: /Proceed to checkout/i }).click();
    } else {
      // Standard flow for other plans
      // Use exact match to avoid strict mode violation with multiple "proceed" buttons
      const proceedButton = page.getByRole('button', { name: 'Proceed to Checkout', exact: true });
      await proceedButton.waitFor({ state: 'visible', timeout: timeout });
      await proceedButton.click({ force: true });
      console.log("Clicked 'Proceed' button.");
    }

    await Promise.race([
      page.waitForURL('**/checkout**', { timeout: 60000 }).catch(() => {}),
      page.waitForURL('**/success-page**', { timeout: 60000 }).catch(() => {}),
    ]);
  }
}

module.exports = SelectPlan;
