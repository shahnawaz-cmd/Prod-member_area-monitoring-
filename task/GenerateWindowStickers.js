const STICKER_VINS = [
  'JS1EM16B5T7101131',
  'JKAENVC1X4A185175',
  'JYARJ08E66A007585',
  'JKAKLEE17FDA80765',
  'JKAEX8A1XFA012306',
  'JKAEX8A15EA001115',
  '5Y4AH28Y0EA011611',
  'MH3RH06Y7FK008558',
  'USYAMA2768A414',
  'JYARN33E7FA006457',
  '5SAAK4CK2E7101013'
];

class ReverseDecode {
  constructor(vin = null, isSlowNetwork = false) {
    this.vin = vin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    // Shuffle and pick a random VIN if none is explicitly provided
    let targetVin = this.vin;
    if (!targetVin) {
      const randomIndex = Math.floor(Math.random() * STICKER_VINS.length);
      targetVin = STICKER_VINS[randomIndex];
    }
    console.log(`Starting Reverse Decode / Sticker Generate for VIN: ${targetVin}`);

    // Fill VIN
    const vinInput = page.getByRole('textbox', { name: 'VIN Number' });
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    await vinInput.click();
    await vinInput.fill(targetVin);

    // Click Get Window Sticker
    const submitButton = page.getByRole('button', { name: 'Get Window Sticker' });
    await submitButton.waitFor({ state: 'visible', timeout: timeout });
    await submitButton.click();
    console.log("Clicked 'Get Window Sticker' button.");
  }
}

class ClassicMappedSticker {
  constructor(baseVin = '228871N111628', isSlowNetwork = false) {
    this.baseVin = baseVin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    console.log(`Starting Classic Mapped VIN Sticker Generate for VIN: ${this.baseVin}`);

    // Fill VIN
    const vinInput = page.getByRole('textbox', { name: 'VIN Number' });
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    await vinInput.click();
    await vinInput.fill(this.baseVin);

    // Set up API listeners to capture mapping and sticker generation responses
    const classicMappingPromise = page.waitForResponse(
      res => res.url().includes('classicmapping'),
      { timeout: 120000 }
    ).catch(() => null);

    const generatePromise = page.waitForResponse(
      res => res.url().includes('generate_classic_sticker'),
      { timeout: 180000 }
    ).catch(() => null);

    // Click Get Window Sticker
    const submitButton = page.getByRole('button', { name: 'Get Window Sticker' });
    await submitButton.waitFor({ state: 'visible', timeout: timeout });
    await submitButton.click();
    console.log("Clicked 'Get Window Sticker' button.");

    // Await API responses to ensure stability
    console.log("Awaiting classic mapping API resolution...");
    const mappingRes = await classicMappingPromise;
    if (mappingRes) {
      console.log("📥 ClassicMapping API Response Captured.");
    }

    console.log("Awaiting generate classic sticker API resolution...");
    const generateRes = await generatePromise;
    if (generateRes) {
      const genData = await generateRes.json().catch(() => ({}));
      console.log("📥 GenerateClassicSticker API Response Status:", genData.status);
    }
  }
}

class ClassicUnmappedSticker {
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
    console.log(`Generated randomized Classic Unmapped VIN for sticker: ${randomizedVin}`);

    console.log("Waiting 5 seconds for page stabilization...");
    await page.waitForTimeout(5000);

    // 2. Input VIN
    const vinInput = page.getByRole('textbox', { name: 'VIN Number' });
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    await vinInput.fill(randomizedVin);

    // 3. Set up listeners to check the classicmapping API response
    const classicMappingPromise = page.waitForResponse(
      res => res.url().includes('classicmapping'),
      { timeout: 120000 }
    ).catch(() => null);

    // 4. Click "Get Window Sticker" button
    const historyButton = page.getByRole('button', { name: 'Get Window Sticker' });
    await historyButton.waitFor({ state: 'visible', timeout: timeout });
    await historyButton.click();
    console.log("Clicked 'Get Window Sticker' button.");

    // Await the API mapping response
    const mappingRes = await classicMappingPromise;
    let mappingData = {};
    if (mappingRes) {
      mappingData = await mappingRes.json().catch(() => ({}));
      console.log("📥 ClassicMapping API Response Status:", mappingData.status);
    }

    // 5. Index-based check to see if dropdowns appear (safely handles any default year text)
    const yearCombobox = page.getByRole('combobox').nth(0);
    await yearCombobox.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    const dropdownsVisible = await yearCombobox.isVisible().catch(() => false);
    const isError = mappingData.status === 'error' || mappingData.error;

    if (dropdownsVisible || isError) {
      console.log("Classic unmapped VIN error confirmed. Selecting Ford Model K values...");
      
      try {
        // Year (Index 0)
        await yearCombobox.click();
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: '1906' }).click();
        await page.waitForTimeout(1000);

        // Make (Index 1 or filter 'Make')
        const makeCombobox = page.getByRole('combobox').filter({ hasText: 'Make' }).first();
        await makeCombobox.waitFor({ state: 'visible', timeout: timeout });
        await makeCombobox.click();
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Ford' }).click();
        await page.waitForTimeout(1000);

        // Model (Index 2 or filter 'Model')
        const modelCombobox = page.getByRole('combobox').filter({ hasText: 'Model' }).first();
        await modelCombobox.waitFor({ state: 'visible', timeout: timeout });
        await modelCombobox.click();
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Model K' }).click();
        await page.waitForTimeout(1000);

        // Trim (Index 3 or filter 'Trim')
        const trimCombobox = page.getByRole('combobox').filter({ hasText: 'Trim' }).first();
        await trimCombobox.waitFor({ state: 'visible', timeout: timeout });
        await trimCombobox.click();
        await page.waitForTimeout(1000);
        await page.getByRole('button', { name: 'Roadster' }).click();
        await page.waitForTimeout(1000);

        console.log("Submitting overridden selections...");
        const submitBtn = page.getByRole('button', { name: 'Get Window Sticker' });
        await submitBtn.waitFor({ state: 'visible', timeout: timeout });
        await submitBtn.click({ force: true });
        console.log("Clicked 'Get Window Sticker' after dropdown selection.");
        await page.waitForTimeout(5000);
      } catch (err) {
        console.error("⚠️ Dropdown interactions failed, proceeding:", err.message);
      }
    } else {
      console.log("Classic mapping successful, proceeding directly to report page.");
    }
  }
}

module.exports = {
  ReverseDecode,
  ClassicMappedSticker,
  ClassicUnmappedSticker
};
