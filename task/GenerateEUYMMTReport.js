/**
 * Task: GenerateEUYMMTReport
 * Takes an EU base VIN pattern (e.g. VF1 Renault / WAUZZZ Audi),
 * randomizes trailing characters to trigger an unmapped EU VIN flow,
 * and dynamically selects Year-Make-Model-Trim (YMMT) to generate a Vehicle Report.
 */
class GenerateEUYMMTReport {
  constructor(vins = ['VF1AGVYB055491691', 'WAUZZZ8P6CA083445', 'WBA3A5C58EF123456'], isSlowNetwork = false) {
    this.vins = Array.isArray(vins) ? vins : [vins];
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const baseUrl = actor.baseUrl;
    const timeout = this.isSlowNetwork ? 60000 : 30000;
    const apiTimeout = this.isSlowNetwork ? 300000 : 180000;
    const checkTimeout = this.isSlowNetwork ? 15000 : 5000;

    // 1. Generate randomized unmapped EU VIN (last character only)
    const baseVin = this.vins[Math.floor(Math.random() * this.vins.length)];
    const prefix = baseVin.slice(0, 16);
    const randomSuffix = Math.floor(Math.random() * 10).toString();
    const randomizedVin = prefix + randomSuffix;
    actor.euYmmtVin = randomizedVin;
    console.log(`Starting EU YMMT Report Generation for VIN: ${randomizedVin}`);

    // 2. Input VIN into search field
    const vinInput = page.getByPlaceholder(/enter vin/i);
    await vinInput.waitFor({ state: 'visible', timeout });
    await vinInput.fill(randomizedVin);

    const validatePromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/vin-validate'), 
      { timeout: apiTimeout }
    ).catch(() => null);

    const getReportBtn = page.getByRole('button', { name: /Get vehicle History/i })
      .or(page.locator('button:has-text("Get Vehicle History")'))
      .first();

    await getReportBtn.waitFor({ state: 'visible', timeout });
    await getReportBtn.click();
    console.log("Clicked 'Get Vehicle History' button.");

    await validatePromise;

    // 3. Confirm EU popup if prompted
    await this.clickEuropeYesIfPresent(page, checkTimeout);

    // 4. Dynamic YMMT Dropdowns Handling
    const yearCombobox = page.getByRole('combobox').filter({ hasText: /Year|\d{4}/i }).first()
      .or(page.getByRole('combobox').first());
    await yearCombobox.waitFor({ state: 'visible', timeout: this.isSlowNetwork ? 120000 : 60000 }).catch(() => {});

    if (await yearCombobox.isVisible().catch(() => false)) {
      console.log("EU VIN unmapped dropdown flow detected. Dynamically selecting Year, Make, Model, Trim...");

      try {
        // Dynamic / preferred Year selection
        await this.selectDropdownOption(page, yearCombobox, 'Year', '1980');

        // Dynamic / preferred Make selection
        const makeCombobox = page.getByRole('combobox').filter({ hasText: /Make/i }).first()
          .or(page.getByRole('combobox').nth(1));
        await this.selectDropdownOption(page, makeCombobox, 'Make', 'Audi');

        // Dynamic / preferred Model selection
        const modelCombobox = page.getByRole('combobox').filter({ hasText: /Model/i }).first()
          .or(page.getByRole('combobox').nth(2));
        await this.selectDropdownOption(page, modelCombobox, 'Model', '200');

        // Dynamic / preferred Trim selection
        const trimCombobox = page.getByRole('combobox').filter({ hasText: /Trim/i }).first()
          .or(page.getByRole('combobox').nth(3));
        await this.selectDropdownOption(page, trimCombobox, 'Trim', '/e Inline 5');

        // Report generation API listener
        const generatePromise = page.waitForResponse(
          res => res.url().includes('/api-cwa/generate-report'),
          { timeout: apiTimeout }
        ).catch(() => null);

        // Submit selections using the exact CTA button
        console.log("Submitting YMMT dropdown selections via 'Get Vehicle History'...");
        await getReportBtn.click({ force: true });

        await generatePromise;
        console.log("Report generation API call resolved.");
      } catch (err) {
        console.error("⚠️ Dropdown interaction note:", err.message);
      }
    }

    // 5. Redirection Handling to /my-reports
    console.log("Waiting for redirection to /my-reports...");
    try {
      await page.waitForURL(url => url.pathname.includes('my-report'), { timeout });
    } catch (e) {
      if (!page.url().includes('my-report')) {
        const targetReportsUrl = baseUrl.includes('members.vehiclehistory.report') 
          ? `${baseUrl}/members/my-reports` 
          : `${baseUrl}/my-reports`;
        await page.goto(targetReportsUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await page.waitForURL(url => url.pathname.includes('my-report'), { timeout });
      }
    }
    console.log("Successfully navigated to /my-reports");
  }

  /**
   * Minimal, robust dropdown selector:
   * Selects preferred option if present, otherwise dynamically picks any valid option from the open listbox.
   */
  async selectDropdownOption(page, combobox, label, preferredName = null) {
    await combobox.waitFor({ state: 'visible', timeout: 15000 });
    await combobox.click();
    await page.waitForTimeout(600);

    // 1. Try preferred option if visible
    if (preferredName) {
      const preferredBtn = page.getByRole('button', { name: preferredName, exact: false }).first()
        .or(page.locator(`[role="option"]:has-text("${preferredName}"), button:has-text("${preferredName}")`).first());

      if (await preferredBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = await preferredBtn.innerText().catch(() => preferredName);
        console.log(`🎯 [Dropdown] Selected preferred option for ${label}: "${text.trim()}"`);
        await preferredBtn.click({ force: true }).catch(() => {});
        await page.waitForTimeout(600);
        return;
      }
    }

    // 2. Dynamic fallback: pick from open listbox / popover (excluding navigation & CTA buttons)
    const options = page.locator('[role="listbox"] [role="option"], [role="listbox"] button, [data-radix-popper-content-wrapper] button, [role="option"]')
      .filter({
        hasNotText: /Get Vehicle History|Vehicle History|Vehicle Report|Cancel|Search|Order Credits|Help|Subscriptions|My Reports|Saved Cars/i
      });

    const count = await options.count().catch(() => 0);
    if (count > 0) {
      const chosen = options.first();
      const text = await chosen.innerText().catch(() => 'Option');
      console.log(`🎯 [Dynamic Dropdown] Selected first available option for ${label}: "${text.trim()}"`);
      await chosen.click({ force: true }).catch(() => {});
    } else {
      console.warn(`⚠️ [Dropdown] No dynamic options detected for ${label}.`);
    }

    await page.waitForTimeout(600);
  }

  async clickEuropeYesIfPresent(page, timeoutMs = 8000) {
    console.log("Checking for Europe confirmation popup...");
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (page.url().includes('my-report')) {
        return true;
      }

      const yesBtnRole = page.getByRole('button', { name: /^Yes$/i }).first();
      if (await yesBtnRole.isVisible().catch(() => false)) {
        console.log("🎯 Found Europe popup 'Yes' button (by role). Clicking...");
        await yesBtnRole.click().catch(() => yesBtnRole.click({ force: true }));
        console.log("✅ Clicked Yes on Europe popup.");
        await page.waitForTimeout(1000);
        return true;
      }

      const yesBtnText = page.locator('button:has-text("Yes"), [role="button"]:has-text("Yes")').first();
      if (await yesBtnText.isVisible().catch(() => false)) {
        console.log("🎯 Found Europe popup 'Yes' button (by text). Clicking...");
        await yesBtnText.click().catch(() => yesBtnText.click({ force: true }));
        console.log("✅ Clicked Yes on Europe popup.");
        await page.waitForTimeout(1000);
        return true;
      }

      const modalYesBtn = page.locator([
        '[role="dialog"] button',
        '[role="alertdialog"] button',
        'div[class*="modal"] button',
        'div[class*="popup"] button',
        'div[class*="dialog"] button',
        'div[data-radix-popper-content-wrapper] button'
      ].join(', ')).filter({ hasText: /^Yes$/i }).first();

      if (await modalYesBtn.isVisible().catch(() => false)) {
        console.log("🎯 Found Europe popup 'Yes' button (inside modal container). Clicking...");
        await modalYesBtn.click().catch(() => modalYesBtn.click({ force: true }));
        console.log("✅ Clicked Yes on Europe popup.");
        await page.waitForTimeout(1000);
        return true;
      }

      const yearCombobox = page.getByRole('combobox').first();
      if (await yearCombobox.isVisible().catch(() => false)) {
        return false;
      }

      await page.waitForTimeout(400);
    }

    console.log("No Europe confirmation popup detected within timeout.");
    return false;
  }
}

module.exports = GenerateEUYMMTReport;
