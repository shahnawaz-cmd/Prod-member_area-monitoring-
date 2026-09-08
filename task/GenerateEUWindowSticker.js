const STATIC_PRESETS = [
  { year: '1963', make: 'Oldsmobile', model: 'Starfire', trim: 'Hardtop Coupe 6.5 V8 V8' },
  { year: '1943', make: 'Willys Overland', model: 'Jeep', trim: 'Mb Inline' },
  { year: '1976', make: 'Alfa Romeo', model: 'Spider Series', trim: 'Junior Inline 4' },
  { year: '1920', make: 'Paige', model: 'Glenbrook', trim: 'Touring 6 42 Inline' },
  { year: '1957', make: 'Jensen', model: '541', trim: 'R Inline' }
];

/**
 * Task: GenerateEUWindowSticker
 * Preserves the provided EU VIN pattern (e.g. VF1 Renault / WAUZZZ Audi)
 * and randomizes trailing characters to generate a fresh, unique EU VIN on every run.
 * Handles both direct generation and unmapped dynamic/static Year-Make-Model-Trim dropdown flows.
 */
class GenerateEUWindowSticker {
  constructor(vin = null, isSlowNetwork = false) {
    this.vin = vin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;
    const apiTimeout = this.isSlowNetwork ? 300000 : 180000;
    const checkTimeout = this.isSlowNetwork ? 15000 : 5000;

    // Static list of verified EU VINs for sticker generation
    const staticEuVins = ['VF1AGVYB055491691', 'WAUZZZ8P6CA083445', 'WAUZZZ8V5DA002440', 'WV1ZZZSYZL9025249'];
    let baseVin = this.vin;
    if (!baseVin) {
      baseVin = staticEuVins[Math.floor(Math.random() * staticEuVins.length)];
    } else if (Array.isArray(baseVin)) {
      baseVin = baseVin[Math.floor(Math.random() * baseVin.length)];
    }

    const prefix = baseVin.slice(0, 12);
    // Randomize last 5 characters (positions 13-17) using alphanumeric characters (numbers + uppercase letters, excluding I, O, Q)
    const validVinChars = '0123456789ABCDEFGHJKLMNPRSTUVWXYZ';
    let randomSuffix = '';
    for (let i = 0; i < 5; i++) {
      randomSuffix += validVinChars.charAt(Math.floor(Math.random() * validVinChars.length));
    }
    const randomizedVin = prefix.length === 12 ? prefix + randomSuffix : baseVin;
    console.log(`Starting EU Window Sticker Generate for VIN: ${randomizedVin}`);

    // 1. VIN Decode (Fill VIN & click Get Window Sticker)
    const vinInput = page.getByRole('textbox', { name: 'VIN Number' });
    await vinInput.waitFor({ state: 'visible', timeout });
    await vinInput.click();
    await vinInput.fill(randomizedVin);

    const validatePromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/vin-validate'), 
      { timeout: apiTimeout }
    ).catch(() => null);

    const submitBtn = page.getByRole('button', { name: 'Get Window Sticker' })
      .or(page.getByRole('button', { name: 'Get Vehicle History' }))
      .or(page.locator('button:has-text("Get Vehicle History")'))
      .first();
    await submitBtn.waitFor({ state: 'visible', timeout });
    await submitBtn.click();
    console.log("Clicked 'Get Window Sticker' / 'Get Vehicle History' button.");

    await validatePromise;
    console.log("VIN validation API call resolved.");

    // 2. Click Yes on Europe confirmation popup
    await this.clickEuropeYesIfPresent(page, checkTimeout);

    // Check if directly navigated to my-reports page (e.g. mapped VIN or direct system redirect)
    if (page.url().includes('my-report')) {
      console.log("✅ Directly navigated to my-reports page. Flow completed successfully.");
      return;
    }

    // 3. System navigation auto-land on YMMT dropdown -> Wait until dropdown appears and stabilizes ~3 seconds
    console.log("Waiting for YMMT dropdown to appear and stabilize...");
    const yearCombobox = page.getByRole('combobox').filter({ hasText: 'Year' }).first()
      .or(page.getByRole('combobox').nth(0));
    
    // Wait for combobox or direct my-report URL redirect
    const yearVisible = await yearCombobox.waitFor({ state: 'visible', timeout: 15000 }).then(() => true).catch(() => false);
    if (!yearVisible || page.url().includes('my-report')) {
      if (page.url().includes('my-report')) {
        console.log("✅ Directly navigated to my-reports page during dropdown wait. Flow completed successfully.");
        return;
      }
    }
    console.log("YMMT Year dropdown visible. Stabilizing for 3 seconds...");
    await page.waitForTimeout(3000);

    // 4. Select data from dropdowns (random preset from pool)
    const preset = STATIC_PRESETS[Math.floor(Math.random() * STATIC_PRESETS.length)];
    console.log(`Selecting YMMT preset: ${preset.year} ${preset.make} ${preset.model} (${preset.trim})`);

    // Select Year
    await this.selectDropdownOption(page, yearCombobox, 'Year', preset.year);

    // Select Make
    const makeCombobox = page.getByRole('combobox').filter({ hasText: 'Make' }).first()
      .or(page.getByRole('combobox').nth(1));
    await this.selectDropdownOption(page, makeCombobox, 'Make', preset.make);

    // Select Model
    const modelCombobox = page.getByRole('combobox').filter({ hasText: 'Model' }).first()
      .or(page.getByRole('combobox').nth(2));
    await this.selectDropdownOption(page, modelCombobox, 'Model', preset.model);

    // Select Trim
    const trimCombobox = page.getByRole('combobox').filter({ hasText: 'Trim' }).first()
      .or(page.getByRole('combobox').nth(3));
    await this.selectDropdownOption(page, trimCombobox, 'Trim', preset.trim);

    // Ensure open dropdown popover is closed before clicking submit button
    await page.keyboard.press('Escape').catch(() => {});
    await page.waitForTimeout(500);

    // 5. Get Sticker button click & wait API call finish
    const generatePromise = page.waitForResponse(
      res => (res.url().includes('/api-cwa/generate_sticker') || res.url().includes('generate_sticker')) && res.status() === 200,
      { timeout: apiTimeout }
    ).catch(() => null);

    console.log("Submitting dropdown selections via CTA button...");
    const finalSubmitBtn = page.locator('button, [role="button"]').filter({ hasText: /Get.*(Sticker|History)/i }).first();

    await finalSubmitBtn.waitFor({ state: 'visible', timeout: timeout });
    await finalSubmitBtn.scrollIntoViewIfNeeded().catch(() => {});
    console.log("Clicking CTA button...");
    await finalSubmitBtn.click({ force: true }).catch(async () => {
      await finalSubmitBtn.dispatchEvent('click').catch(() => {});
    });

    console.log("Awaiting generate_sticker API resolution...");
    const genRes = await generatePromise;
    if (genRes) {
      console.log("✅ Sticker generation API call resolved with status 200.");
    }

    // 6. Wait system navigation when pattern URL matches (my-reports/classic/europe/sticker-tool)
    console.log("Waiting for native system navigation pattern URL match...");
    await page.waitForURL(
      url => url.pathname.includes('my-report') || url.pathname.includes('classic') || url.pathname.includes('europe') || url.pathname.includes('sticker-tool'),
      { timeout: apiTimeout }
    );
    console.log("Native system navigation complete. URL pattern matched successfully.");
  }

  /**
   * Selects a static option from a dropdown by name with smart wait.
   */
  async selectDropdownOption(page, combobox, label, targetName) {
    await combobox.waitFor({ state: 'visible', timeout: 15000 });
    await combobox.click();

    const optionBtn = page.getByRole('button', { name: targetName })
      .or(page.getByRole('option', { name: targetName }))
      .or(page.locator(`text=${targetName}`))
      .first();

    // Smart wait for option button to become visible instead of hardcoded timeouts
    await optionBtn.waitFor({ state: 'visible', timeout: 15000 }).catch(async () => {
      // If click didn't open menu, attempt re-click combobox once
      await combobox.click().catch(() => {});
      await optionBtn.waitFor({ state: 'visible', timeout: 5000 });
    });

    const text = await optionBtn.innerText().catch(() => targetName);
    console.log(`🎯 [Dropdown] Selected option for ${label}: "${text.trim()}"`);
    await optionBtn.click({ force: true }).catch(() => {});

    // Smart wait for dropdown menu/popover to close/settle
    await page.waitForLoadState('domcontentloaded').catch(() => {});
  }

  async clickEuropeYesIfPresent(page, timeoutMs = 8000) {
    console.log("Checking for Europe confirmation popup...");
    const startTime = Date.now();

    const yesBtn = page.getByRole('button', { name: /^Yes$/i })
      .or(page.locator('button:has-text("Yes")'))
      .or(page.locator('[role="button"]:has-text("Yes")'))
      .first();

    while (Date.now() - startTime < timeoutMs) {
      if (page.url().includes('my-report')) return true;

      if (await yesBtn.isVisible().catch(() => false)) {
        console.log("🎯 Found Europe popup 'Yes' button. Clicking...");
        await yesBtn.click().catch(() => yesBtn.click({ force: true }));
        console.log("✅ Clicked Yes on Europe popup.");
        await page.waitForTimeout(1000);
        return true;
      }

      if (await page.getByRole('combobox').first().isVisible().catch(() => false)) {
        return false;
      }

      await page.waitForTimeout(400);
    }

    console.log("No Europe confirmation popup detected within timeout.");
    return false;
  }
}

module.exports = GenerateEUWindowSticker;
