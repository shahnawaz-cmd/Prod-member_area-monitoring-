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
      const menuToggle = page.getByRole('img', { name: 'Menu' }).first();
      await menuToggle.waitFor({ state: 'visible', timeout: timeout }).catch(() => {});
      if (await menuToggle.isVisible()) {
        await menuToggle.click();
      }
      
      const reportButton = page.locator('span:has-text("Vehicle Report")').first();
      await reportButton.waitFor({ state: 'visible', timeout: timeout });
      await reportButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Always click 'Vehicle Report' span first in desktop
      await page.locator('span:has-text("Vehicle Report")').first().click();
      console.log(`Clicked 'Vehicle Report' span. (Timeout: ${timeout}ms)`);
      await page.waitForTimeout(2000);
    }

    if (this.planName === 'UVC Subscription') {
      console.log("Selecting 'Unlimited VIN Check' plan...");
      await page.getByLabel('Unlimited VIN Check').click();
      await page.getByRole('button', { name: /Proceed to checkout/i }).click();
    } else {
      console.log("Locating the highest report package option available on the page...");
      const planLoadTimeout = this.isSlowNetwork ? 45000 : 20000;
      
      // Wait for any element with "Reports" text to be visible
      await page.locator('*:has-text("Reports")').first().waitFor({ state: 'visible', timeout: planLoadTimeout }).catch(() => {});
      
      // Target elements matching the report patterns directly by text (extremely robust, works on any HTML structure)
      const planMatchers = [
        /25\s*Reports/i,
        /10\s*Reports/i,
        /5\s*Reports/i,
        /2\s*Reports/i,
        /1\s*Report|Report\$/i
      ];

      let selected = false;
      for (const pattern of planMatchers) {
        // Find matching text element
        const planElement = page.getByText(pattern).first();
        
        if (await planElement.isVisible().catch(() => false)) {
          console.log(`Found and selecting plan matching pattern: ${pattern}`);
          
          await planElement.scrollIntoViewIfNeeded();
          await planElement.click({ force: true });
          
          selected = true;
          // Delay to ensure the dynamic plan selection registers in the UI state
          await page.waitForTimeout(1500);
          break;
        }
      }

      if (!selected) {
        console.log("⚠️ No matching dynamic plan cards were visible; proceeding with default checkout.");
      }

      // Click the Proceed button (using case-insensitive exact string match regex to avoid strict mode duplicates)
      const proceedButton = page.getByRole('button', { name: /^Proceed to Checkout$/i })
        .or(page.getByRole('button', { name: /^Proceed$/i }))
        .or(page.locator('button').filter({ hasText: /^Proceed$/i }))
        .first();

      await proceedButton.waitFor({ state: 'visible', timeout: timeout });
      await proceedButton.click({ force: true });
      console.log("Clicked 'Proceed' button.");
    }

    const redirectTimeout = this.isSlowNetwork ? 120000 : 60000;
    await Promise.race([
      page.waitForURL('**/checkout**', { timeout: redirectTimeout }).catch(() => {}),
      page.waitForURL('**/success-page**', { timeout: redirectTimeout }).catch(() => {}),
      page.waitForURL('**/members/checkout**', { timeout: redirectTimeout }).catch(() => {}),
    ]);
  }
}

module.exports = SelectPlan;
