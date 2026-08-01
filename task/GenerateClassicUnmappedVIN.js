class GenerateClassicUnmappedVIN {
  constructor(baseVin = '245GH4156001', isSlowNetwork = false) {
    this.baseVin = baseVin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    // 1. Randomize the last 4 characters of the base VIN to ensure uniqueness
    const chars = this.baseVin.split('');
    for (let i = 1; i <= 4; i++) {
      if (this.baseVin.length - i >= 0) {
        chars[this.baseVin.length - i] = Math.floor(Math.random() * 10).toString();
      }
    }
    const randomizedVin = chars.join('');
    console.log(`Generated randomized Classic Unmapped VIN: ${randomizedVin}`);

    console.log("Waiting 5 seconds for page stabilization...");
    await page.waitForTimeout(5000);

    // 2. Input VIN
    const vinInput = page.getByPlaceholder(/enter vin/i);
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    await vinInput.fill(randomizedVin);

    // 3. Listen to generate-report response to capture manual-entry error message
    const genResPromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/generate-report'), 
      { timeout: 180000 }
    ).catch(() => null);

    // 4. Click "Get Vehicle History" button
    const historyButton = page.getByRole('button', { name: /Get vehicle History/i });
    await historyButton.waitFor({ state: 'visible', timeout: timeout });
    await historyButton.click();
    console.log("Clicked 'Get Vehicle History' button.");

    // 5. Inspect response to check if manual dropdown selection is required
    const genRes = await genResPromise;
    let responseData = {};
    if (genRes) {
      responseData = await genRes.json().catch(() => ({}));
      console.log("📥 Generate-Report Response:", JSON.stringify(responseData, null, 2));
    }

    if (responseData.status === 'error' && responseData.msg && responseData.msg.includes("Cannot autogenerate report for this classic vin.")) {
      console.log("Detected autogenerate error. Selecting dropdown values...");
      await page.waitForTimeout(3000);

      // Select Year
      const yearCombobox = page.getByRole('combobox').filter({ hasText: /^(Year|\d{4})$/i });
      await yearCombobox.waitFor({ state: 'visible', timeout: timeout });
      await yearCombobox.click();
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: '1935' }).click();
      await page.waitForTimeout(1000);

      // Select Make
      const makeCombobox = page.getByRole('combobox').filter({ hasText: /Make/i });
      await makeCombobox.waitFor({ state: 'visible', timeout: timeout });
      await makeCombobox.click();
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: 'Alvis' }).click();
      await page.waitForTimeout(1000);

      // Select Model
      const modelCombobox = page.getByRole('combobox').filter({ hasText: /Model/i });
      await modelCombobox.waitFor({ state: 'visible', timeout: timeout });
      await modelCombobox.click();
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: 'Speed Twenty Vanden Plas' }).click();
      await page.waitForTimeout(1000);

      // Select Trim
      const trimCombobox = page.getByRole('combobox').filter({ hasText: /Trim/i });
      await trimCombobox.waitFor({ state: 'visible', timeout: timeout });
      await trimCombobox.click();
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: 'Saloon' }).click();
      await page.waitForTimeout(1000);

      // Click button again
      await page.getByRole('button', { name: /Get vehicle History/i }).click({ force: true });
      console.log("Clicked 'Get Vehicle History' button after selecting dropdown values.");
      await page.waitForTimeout(5000);
    }
  }
}

class GenerateClassicUnmappedVINManual {
  constructor(baseVin = '245GH4156001', isSlowNetwork = false) {
    this.baseVin = baseVin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    // 1. Randomize the last 4 characters of the base VIN to ensure uniqueness
    const chars = this.baseVin.split('');
    for (let i = 1; i <= 4; i++) {
      if (this.baseVin.length - i >= 0) {
        chars[this.baseVin.length - i] = Math.floor(Math.random() * 10).toString();
      }
    }
    const randomizedVin = chars.join('');
    console.log(`Generated randomized Classic Unmapped VIN (Manual): ${randomizedVin}`);

    console.log("Waiting 5 seconds for page stabilization...");
    await page.waitForTimeout(5000);

    // 2. Input VIN
    const vinInput = page.getByPlaceholder(/enter vin/i);
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    await vinInput.fill(randomizedVin);

    // 3. Listen to generate-report response to capture manual-entry error message
    const genResPromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/generate-report'), 
      { timeout: 180000 }
    ).catch(() => null);

    // 4. Click "Get Vehicle History" button
    const historyButton = page.getByRole('button', { name: /Get vehicle History/i });
    await historyButton.waitFor({ state: 'visible', timeout: timeout });
    await historyButton.click();
    console.log("Clicked 'Get Vehicle History' button.");

    // 5. Inspect response to check if manual input selection is required
    const genRes = await genResPromise;
    let responseData = {};
    if (genRes) {
      responseData = await genRes.json().catch(() => ({}));
      console.log("📥 Generate-Report Response:", JSON.stringify(responseData, null, 2));
    }

    if (responseData.status === 'error' && responseData.msg && responseData.msg.includes("Whoops.. Cannot autogenerate report for this classic vin.")) {
      console.log("Detected autogenerate error. Proceeding with manual entry flow.");
      await page.waitForTimeout(3000);

      // Click "Can't find your vehicle?" link
      await page.getByText("Can't find your vehicle?").click();

      // Fill Year (Pre-populated year: current year minus 1)
      const yearInput = page.getByPlaceholder('1977');
      await yearInput.waitFor({ state: 'visible', timeout: timeout });
      await yearInput.click();
      await yearInput.fill(`${new Date().getFullYear() - 1}`);

      // Fill Make
      const makeInput = page.getByPlaceholder('Ford');
      await makeInput.waitFor({ state: 'visible', timeout: timeout });
      await makeInput.click();
      await makeInput.fill('Chevy');
      await makeInput.press('Tab');

      // Fill Model
      const modelInput = page.getByPlaceholder('Mustang');
      await modelInput.waitFor({ state: 'visible', timeout: timeout });
      await modelInput.click();
      await modelInput.fill('1500');

      // Fill Transmission
      const transInput = page.getByPlaceholder('Automatic');
      await transInput.waitFor({ state: 'visible', timeout: timeout });
      await transInput.click();
      await transInput.fill('Manual');

      // Fill Engine
      const engineInput = page.getByPlaceholder('Engine');
      await engineInput.waitFor({ state: 'visible', timeout: timeout });
      await engineInput.click();
      await engineInput.fill('V8');

      // Fill Fuel Type
      const fuelInput = page.getByPlaceholder('Gasoline');
      await fuelInput.waitFor({ state: 'visible', timeout: timeout });
      await fuelInput.click();
      await fuelInput.fill('Gasoline');

      // Fill Drivetrain
      const driveInput = page.getByPlaceholder('4WD');
      await driveInput.waitFor({ state: 'visible', timeout: timeout });
      await driveInput.click();
      await driveInput.fill('AWD');

      // Fill Cylinders
      const cylInput = page.getByPlaceholder('4', { exact: true });
      await cylInput.waitFor({ state: 'visible', timeout: timeout });
      await cylInput.click();
      await cylInput.fill('6');

      // Click Get Report
      await page.getByText('Get Report').click();
      await page.waitForTimeout(2000);
    }
  }
}

module.exports = {
  GenerateClassicUnmappedVIN,
  GenerateClassicUnmappedVINManual
};
