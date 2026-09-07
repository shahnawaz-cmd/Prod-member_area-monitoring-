class GenerateUVCReport {
  constructor(vin, isSlowNetwork = false) {
    this.vin = vin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;
    const apiTimeout = this.isSlowNetwork ? 180000 : 120000;
    
    console.log(`Generating UVC report for VIN: ${this.vin}`);
    
    // Ensure dashboard page is loaded
    if (!page.url().includes('dashboard')) {
      await page.waitForURL('**/dashboard**', { timeout: 30000, waitUntil: 'domcontentloaded' }).catch(async () => {
        await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
      });
    }

    // Locate VIN input field (handling both direct search and tab views)
    const vinInput = page.getByPlaceholder(/enter vin/i)
      .or(page.getByRole('textbox', { name: /vin/i }))
      .first();

    if (!await vinInput.isVisible({ timeout: 4000 }).catch(() => false)) {
      console.log("VIN input not directly visible. Opening Search / Vehicle Report tab...");
      const searchTab = page.getByRole('button', { name: 'Search' })
        .or(page.getByRole('button', { name: 'Vehicle Report' }))
        .or(page.locator('button:has-text("Search"), button:has-text("Vehicle Report")'))
        .first();

      if (await searchTab.isVisible({ timeout: 4000 }).catch(() => false)) {
        await searchTab.click();
        await page.waitForTimeout(1000);
      }
    }

    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    
    // Set up API listener for generate_uvc_report or generate-report
    const genResPromise = page.waitForResponse(
      res => res.url().includes('generate_uvc_report') || res.url().includes('generate-report'), 
      { timeout: apiTimeout }
    ).catch(() => null);
    
    await vinInput.fill(this.vin);
    
    // Click Get Vehicle History button
    const historyButton = page.getByRole('button', { name: /Get vehicle History/i }).first();
    console.log("Attempting to click 'Get vehicle History' button for UVC...");
    await historyButton.waitFor({ state: 'visible', timeout: timeout });
    await historyButton.click({ force: true });
    console.log("Clicked 'Get vehicle History' button.");
    
    // Wait for the API request to resolve
    await genResPromise;
    console.log("UVC Report generation API call resolved.");
    await page.waitForTimeout(3000);
  }
}

module.exports = GenerateUVCReport;
