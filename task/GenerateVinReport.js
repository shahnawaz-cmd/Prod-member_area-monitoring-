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
    
    // Resilient Redirection Handling: Wait for site's auto-redirect, fallback to safe manual goto
    console.log("Waiting for redirection to /my-reports...");
    try {
      await page.waitForURL(url => url.pathname.includes('my-report'), { timeout: 15000 });
    } catch (e) {
      if (!page.url().includes('my-report')) {
        const targetReportsUrl = baseUrl.includes('members.vehiclehistory.report') 
          ? `${baseUrl}/members/my-reports` 
          : `${baseUrl}/my-reports`;
        await page.goto(targetReportsUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForURL(url => url.pathname.includes('my-report'), { timeout: timeout });
      }
    }
    console.log("Successfully navigated to /my-reports");
  }
}

const GenerateEUReport = require('./GenerateEUReport');

module.exports = {
  GenerateVinReport,
  GenerateEUReport
};
