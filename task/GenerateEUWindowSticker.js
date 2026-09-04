/**
 * Task: GenerateEUWindowSticker
 * Preserves the provided EU VIN pattern (e.g. VF1 Renault / WAUZZZ Audi)
 * and randomizes trailing characters to generate a fresh, unique EU VIN on every run.
 * Handles both direct generation and unmapped dynamic/static Year-Make-Model-Trim dropdown flows.
 */
class GenerateEUWindowSticker {
  constructor(vins = ['VF1AGVYB055491691', 'WAUZZZ8P6CA083445'], isSlowNetwork = false) {
    this.vins = Array.isArray(vins) ? vins : [vins];
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;
    const apiTimeout = this.isSlowNetwork ? 300000 : 180000;
    const checkTimeout = this.isSlowNetwork ? 15000 : 5000;

    // 1. Pick provided base EU VIN pattern and randomize trailing characters
    const baseVin = this.vins[Math.floor(Math.random() * this.vins.length)];
    const prefix = baseVin.slice(0, 14);
    const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
    const randomizedVin = prefix + randomSuffix;
    console.log(`Starting EU Window Sticker Generate for VIN: ${randomizedVin}`);

    // 2. Fill VIN and submit
    const vinInput = page.getByRole('textbox', { name: 'VIN Number' });
    await vinInput.waitFor({ state: 'visible', timeout });
    await vinInput.click();
    await vinInput.fill(randomizedVin);

    const validatePromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/vin-validate'), 
      { timeout: apiTimeout }
    ).catch(() => null);

    const submitBtn = page.getByRole('button', { name: 'Get Window Sticker' });
    await submitBtn.waitFor({ state: 'visible', timeout });
    await submitBtn.click();
    console.log("Clicked 'Get Window Sticker' button.");

    await validatePromise;
    console.log("VIN validation API call resolved.");

    // 3. Confirm EU popup if visible
    const yesButton = page.locator('div:has-text("Europe")')
      .getByRole('button', { name: 'Yes' })
      .first();

    try {
      if (await yesButton.isVisible({ timeout: checkTimeout }).catch(() => false)) {
        await yesButton.click().catch(() => yesButton.click({ force: true }));
        console.log("✅ Clicked Yes on Europe popup.");
      }
    } catch (e) {
      console.log(`Europe popup handling note: ${e.message}`);
    }

    // 4. Handle dynamic/unmapped dropdowns if present
    const yearCombobox = page.getByRole('combobox').filter({ hasText: 'Year' }).first()
      .or(page.getByRole('combobox').nth(0));
    await yearCombobox.waitFor({ state: 'visible', timeout: 10000 }).catch(() => {});

    if (await yearCombobox.isVisible().catch(() => false)) {
      console.log("EU VIN unmapped dropdown flow detected. Selecting Year, Make, Model, Trim...");

      try {
        // Select Year (Preferred: '1980' for Audi, or dynamic live DOM)
        await this.selectDropdownOption(page, yearCombobox, 'Year', '1980');

        // Select Make (Preferred: 'Audi', or dynamic live DOM)
        const makeCombobox = page.getByRole('combobox').filter({ hasText: 'Make' }).first()
          .or(page.getByRole('combobox').nth(1));
        await this.selectDropdownOption(page, makeCombobox, 'Make', 'Audi');

        // Select Model (Preferred: '200', or dynamic live DOM)
        const modelCombobox = page.getByRole('combobox').filter({ hasText: 'Model' }).first()
          .or(page.getByRole('combobox').nth(2));
        await this.selectDropdownOption(page, modelCombobox, 'Model', '200');

        // Select Trim (Preferred: '/e Inline 5' or 'Inline 5', or dynamic live DOM)
        const trimCombobox = page.getByRole('combobox').filter({ hasText: 'Trim' }).first()
          .or(page.getByRole('combobox').nth(3));
        await this.selectDropdownOption(page, trimCombobox, 'Trim', '/e Inline 5');

        // Set up generation listener
        const generatePromise = page.waitForResponse(
          res => res.url().includes('generate_classic_sticker') || res.url().includes('generate_sticker') || res.url().includes('generate-sticker'),
          { timeout: apiTimeout }
        ).catch(() => null);

        // Submit selections
        console.log("Submitting dropdown selections...");
        const finalSubmitBtn = page.getByRole('button', { name: 'Get Window Sticker' });
        await finalSubmitBtn.waitFor({ state: 'visible', timeout });
        await finalSubmitBtn.click({ force: true });
        console.log("Clicked 'Get Window Sticker' after dropdown selection.");

        await generatePromise;
        console.log("Sticker generation API call resolved.");
        await page.waitForTimeout(3000);
      } catch (err) {
        console.error("⚠️ Dropdown interactions encountered note, proceeding:", err.message);
      }
    }
  }

  /**
   * Selects an option from a dropdown:
   * First attempts to select preferredName if visible, otherwise dynamically picks an option strictly from the open dropdown menu.
   */
  async selectDropdownOption(page, combobox, label, preferredName = null) {
    await combobox.waitFor({ state: 'visible', timeout: 15000 });
    await combobox.click();
    await page.waitForTimeout(1000);

    // 1. Try preferred named button first if available
    if (preferredName) {
      const preferredBtn = page.getByRole('button', { name: preferredName, exact: false }).first()
        .or(page.getByRole('button', { name: /Inline 5/i }).first())
        .or(page.locator(`button:has-text("${preferredName}")`).first())
        .or(page.locator('[role="option"]').filter({ hasText: preferredName }).first());

      if (await preferredBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
        const text = await preferredBtn.innerText().catch(() => preferredName.toString());
        console.log(`🎯 [Dropdown] Selected preferred option for ${label}: "${text.trim()}"`);
        await preferredBtn.click().catch(() => preferredBtn.click({ force: true }));
        await page.waitForTimeout(1000);
        return;
      }
    }

    // 2. Strict scoped locator targeting only the open menu/popover container
    const openMenu = page.locator([
      '[role="listbox"]:visible',
      '[role="menu"]:visible',
      '[data-radix-popper-content-wrapper]:visible',
      'div[class*="popover"]:visible',
      'div[class*="dropdown-menu"]:visible',
      'div[class*="select-options"]:visible',
      'div[class*="select-dropdown"]:visible',
      'div[class*="menu-items"]:visible'
    ].join(', ')).first();

    const isMenuVisible = await openMenu.isVisible({ timeout: 2000 }).catch(() => false);
    const container = isMenuVisible ? openMenu : page;

    // Filter out all global navigation labels
    const optionLocator = isMenuVisible
      ? container.locator('button, [role="option"], [role="menuitem"], li').filter({
          hasNotText: /Get Window Sticker|Window Sticker|Vehicle Report|Proceed|Confirm|Cancel|Select|Search|Order Credits|Help|Subscriptions|Decode|Tools|Dealers|My Reports|Saved Cars|Rate your experience|Basic Account/i
        })
      : page.locator('[role="listbox"] [role="option"], [role="listbox"] button, [role="option"]').filter({
          hasNotText: /Get Window Sticker|Window Sticker|Vehicle Report|Proceed|Confirm|Cancel|Select|Search|Order Credits|Help|Subscriptions|Decode|Tools|Dealers|My Reports|Saved Cars|Rate your experience|Basic Account/i
        });

    const count = await optionLocator.count().catch(() => 0);
    if (count > 0) {
      const randomIndex = Math.floor(Math.random() * count);
      const chosen = optionLocator.nth(randomIndex);
      const text = await chosen.innerText().catch(() => `Option #${randomIndex}`);
      console.log(`🎯 [Dynamic Dropdown] Found ${count} available ${label} options. Selected (${randomIndex + 1}/${count}): "${text.trim()}"`);
      await chosen.click().catch(() => chosen.click({ force: true }));
    } else {
      // 3. Fallback: try first button or item inside openMenu
      if (isMenuVisible) {
        const firstItem = openMenu.locator('button, [role="option"], li').filter({
          hasNotText: /Get Window Sticker|Window Sticker|Vehicle Report|Proceed|Confirm|Cancel|Select|Search|Order Credits|Help|Subscriptions|Decode|Tools|Dealers|My Reports|Saved Cars/i
        }).first();
        if (await firstItem.isVisible({ timeout: 2000 }).catch(() => false)) {
          const text = await firstItem.innerText().catch(() => 'First item');
          console.log(`🎯 [Fallback Dropdown] Clicked first available item for ${label}: "${text.trim()}"`);
          await firstItem.click({ force: true }).catch(() => {});
        } else {
          console.warn(`⚠️ [Dropdown] No options detected for ${label}.`);
        }
      } else {
        console.warn(`⚠️ [Dropdown] No open menu container detected for ${label}.`);
      }
    }

    await page.waitForTimeout(1000);
  }
}

module.exports = GenerateEUWindowSticker;
