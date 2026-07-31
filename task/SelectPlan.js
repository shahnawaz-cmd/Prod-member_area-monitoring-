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
      console.log("Dynamically scanning page to select the highest report package available...");
      const checkTimeout = this.isSlowNetwork ? 15000 : 5000;
      
      // Locate all elements that could represent plan cards/buttons
      const candidateLocators = page.locator('button, label, [class*="card" i], [class*="plan" i], div');
      
      // Wait for at least one report option to become visible
      await page.locator('div, button, label').filter({ hasText: /Reports?/i }).first().waitFor({ state: 'visible', timeout: checkTimeout }).catch(() => {});
      
      const count = await candidateLocators.count();
      let highestReportNum = 0;
      let highestPlanLocator = null;

      for (let i = 0; i < count; i++) {
        const candidate = candidateLocators.nth(i);
        try {
          if (await candidate.isVisible()) {
            const text = await candidate.innerText();
            
            // Match patterns representing report selection packages (e.g., "Report..." or "25 Reports...")
            if (/Reports?/i.test(text)) {
              const match = text.match(/^(\d+)\s*Reports?/i);
              let reportNum = 1; // Default to 1 if it starts with "Report"
              if (match) {
                reportNum = parseInt(match[1], 10);
              }
              
              // Validate that the element is a plan option (not a large page layout container)
              if (text.length < 150 && (/credit|Pay|\$/i.test(text) || text.includes('Value'))) {
                console.log(`Parsed option: "${text.replace(/\n/g, ' ')}" -> Reports: ${reportNum}`);
                if (reportNum > highestReportNum) {
                  highestReportNum = reportNum;
                  highestPlanLocator = candidate;
                }
              }
            }
          }
        } catch (err) {
          // Skip elements that might have detached or failed state checks
        }
      }

      if (highestPlanLocator) {
        console.log(`Selecting the highest available package: ${highestReportNum} Reports`);
        await highestPlanLocator.scrollIntoViewIfNeeded();
        await highestPlanLocator.click({ force: true });
      } else {
        console.log("No dynamic report package cards detected; proceeding directly.");
      }

      // Click the exact Proceed button
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
