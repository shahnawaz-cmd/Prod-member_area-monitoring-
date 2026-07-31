class GenerateVinReport {
  constructor(vin = null, isSlowNetwork = false) {
    this.vin = vin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const baseUrl = actor.baseUrl;
    const timeout = this.isSlowNetwork ? 120000 : 60000;
    const apiTimeout = this.isSlowNetwork ? 300000 : 180000;

    const vinToUse = this.vin || actor.usVin || actor.classicVin;
    if (!vinToUse) {
      throw new Error("No VIN was provided or generated on the actor.");
    }

    console.log(`Generating report for VIN: ${vinToUse}`);
    const vinInput = page.getByPlaceholder(/enter vin/i);
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    
    // Flow control promise: Wait for the API request to complete before navigating
    const genResPromise = page.waitForResponse(res => res.url().includes('/api-cwa/generate-report'), { timeout: apiTimeout });
    
    await vinInput.fill(vinToUse);
    await page.getByRole('button', { name: /Get vehicle History/i }).click();
    console.log("Clicked 'Get vehicle History' button.");
    
    // Wait for backend report generation to finish
    await genResPromise;
    console.log("Generate-Report API call completed successfully.");
    
    console.log("Navigating to /my-reports...");
    if (!page.url().includes('my-reports')) {
      await page.goto(`${baseUrl}/my-reports`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/my-reports**', { timeout: timeout });
      await page.waitForTimeout(2000); // Keep for stability
    }
    console.log("Navigated to /my-reports");
  }
}

class GenerateEUReport {
  constructor(vin = null, isSlowNetwork = false) {
    this.vin = vin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const baseUrl = actor.baseUrl;
    const timeout = this.isSlowNetwork ? 120000 : 60000;
    const apiTimeout = this.isSlowNetwork ? 300000 : 180000;
    const checkTimeout = this.isSlowNetwork ? 15000 : 5000;

    const vinToUse = this.vin || actor.euVin;
    if (!vinToUse) {
      throw new Error("No EU VIN was provided or generated on the actor.");
    }

    console.log(`Generating EU report for VIN: ${vinToUse}`);
    const vinInput = page.getByPlaceholder(/enter vin/i);
    await vinInput.waitFor({ state: 'visible', timeout: timeout });

    const validateResPromise = page.waitForResponse(res => res.url().includes('/api-cwa/vin-validate'), { timeout: apiTimeout });
    await vinInput.fill(vinToUse);
    await page.getByRole('button', { name: /Get vehicle History/i }).click();
    console.log("Clicked 'Get vehicle History' button.");
    
    await validateResPromise;
    console.log("Vin-Validate API call resolved.");
    
    // Robust selector: looks for any button containing "Yes" (case-insensitive)
    const yesButton = page.locator('button').filter({ hasText: /Yes/i }).first();
    try {
      console.log("Waiting for EU confirmation popup 'Yes' button...");
      await yesButton.waitFor({ state: 'visible', timeout: checkTimeout });
      await yesButton.scrollIntoViewIfNeeded();
      await yesButton.click({ force: true });
      console.log("✅ Clicked Yes confirmation button for EU VIN.");
    } catch (e) {
      console.log(`⚠️ Yes confirmation button not found or did not appear: ${e.message}. Skipping.`);
    }
    
    // Flow control promise: Wait for the API request to complete before navigating
    const genResPromise = page.waitForResponse(res => res.url().includes('/api-cwa/generate-report'), { timeout: apiTimeout });
    await genResPromise;
    console.log("Generate-Report API call completed successfully.");
    
    console.log("Navigating to /my-reports...");
    if (!page.url().includes('my-reports')) {
      await page.goto(`${baseUrl}/my-reports`, { waitUntil: 'domcontentloaded' });
      await page.waitForURL('**/my-reports**', { timeout: timeout });
      await page.waitForTimeout(2000); // Keep for stability
    }
    console.log("Navigated to /my-reports");
  }
}

module.exports = {
  GenerateVinReport,
  GenerateEUReport
};
