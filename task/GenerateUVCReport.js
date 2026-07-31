class GenerateUVCReport {
  constructor(vin, isSlowNetwork = false) {
    this.vin = vin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;
    
    console.log(`Generating UVC report for VIN: ${this.vin}`);
    console.log("Waiting 5 seconds for dashboard stabilization...");
    await page.waitForTimeout(5000);

    const vinInput = page.getByPlaceholder(/enter vin/i);
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    
    // Set up API listener for generate_uvc_report (to await network resolution)
    const genResPromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/generate_uvc_report'), 
      { timeout: 300000 }
    );
    
    await vinInput.fill(this.vin);
    
    // Click Get Vehicle History button
    const historyButton = page.getByRole('button', { name: /Get vehicle History/i });
    console.log("Attempting to click 'Get vehicle History' button for UVC...");
    await historyButton.waitFor({ state: 'visible', timeout: timeout });
    await historyButton.click({ force: true });
    console.log("Clicked 'Get vehicle History' button.");
    
    // Wait for the API request to resolve
    await genResPromise;
    console.log("UVC Report generation API call resolved.");
  }
}

module.exports = GenerateUVCReport;
