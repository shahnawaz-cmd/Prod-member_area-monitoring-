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
    
    // Ensure dashboard page is loaded dynamically
    if (!page.url().includes('dashboard')) {
      await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    }

    // Explicitly locate and click the UVC / Vehicle Report / Search Tab on dashboard after purchase
    console.log("Selecting UVC / Vehicle Report tab on dashboard...");
    const uvcTab = page.getByRole('button', { name: /UVC|Vehicle Report|Search/i })
      .or(page.getByRole('tab', { name: /UVC|Vehicle Report|Search/i }))
      .or(page.locator('button, div, span, a').filter({ hasText: /^(UVC|Vehicle Report|Search)$/i }))
      .first();

    if (await uvcTab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await uvcTab.click({ force: true }).catch(() => {});
      console.log("Clicked UVC / Vehicle Report tab.");
      await page.waitForTimeout(1000);
    } else {
      console.log("UVC Tab already active or directly visible.");
    }

    // Locate VIN input field
    const vinInput = page.getByPlaceholder(/enter vin/i)
      .or(page.getByRole('textbox', { name: /vin/i }))
      .first();

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

    // Resilient Redirection Handling to My Reports URL
    console.log("Waiting for redirection to /my-reports...");
    try {
      await page.waitForURL(url => url.pathname.includes('my-report'), { timeout: 15000 });
    } catch (e) {
      if (!page.url().includes('my-report') && actor.myReportsUrl) {
        await page.goto(actor.myReportsUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
    }
  }
}

module.exports = GenerateUVCReport;
