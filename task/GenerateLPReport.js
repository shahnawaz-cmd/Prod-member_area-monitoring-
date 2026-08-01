class GenerateLPReport {
  constructor(plate = 'HBL1216', stateName = 'Texas', isSlowNetwork = false) {
    this.plate = plate;
    this.stateName = stateName;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    console.log(`Generating LP report for Plate: ${this.plate}, State: ${this.stateName}`);

    // Wait for the toggle switch to become visible
    const switchToggle = page.locator('role=switch[name="VIN License Plate"]');
    await switchToggle.waitFor({ state: 'visible', timeout: timeout });
    await switchToggle.click();

    // Fill License Plate
    const plateInput = page.getByRole('textbox', { name: 'License Plate' });
    await plateInput.waitFor({ state: 'visible', timeout: timeout });
    await plateInput.click();
    await plateInput.fill(this.plate);

    // Select State from Combobox
    const combobox = page.getByRole('combobox');
    await combobox.waitFor({ state: 'visible', timeout: timeout });
    await combobox.click();

    const searchInput = page.getByRole('textbox', { name: 'Search...' });
    await searchInput.waitFor({ state: 'visible', timeout: timeout });
    await searchInput.fill(this.stateName);

    const stateOption = page.getByRole('button', { name: this.stateName });
    await stateOption.waitFor({ state: 'visible', timeout: timeout });
    await stateOption.click();

    // Click "Get Vehicle History" button
    const historyButton = page.getByRole('button', { name: 'Get Vehicle History' });
    await historyButton.waitFor({ state: 'visible', timeout: timeout });

    // Set up API listeners to await network resolution
    const decodePromise = page.waitForResponse(
      res => res.url().includes('license_plate_decode'),
      { timeout: 180000 }
    ).catch(() => {});

    const generatePromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/generate-report'),
      { timeout: 180000 }
    ).catch(() => {});

    await historyButton.click();
    console.log("Clicked 'Get Vehicle History' button.");

    // Await both backend API resolutions
    console.log("Awaiting License Plate decode API response...");
    await decodePromise;
    console.log("Awaiting Report generation API response...");
    await generatePromise;
    console.log("License Plate Report generation APIs resolved successfully.");

    // Handle "Whoops.. Already generated" duplication state by manually redirecting to my-reports
    const alreadyGeneratedText = page.getByText(/Whoops\.\. Already generated/i);
    await page.waitForTimeout(3000);
    if (await alreadyGeneratedText.isVisible().catch(() => false)) {
      console.log("Detecting 'Already Generated' message. Statically navigating to My Reports...");
      await page.goto(`${actor.baseUrl}/my-reports`, { waitUntil: 'domcontentloaded' });
    }
  }
}

module.exports = GenerateLPReport;
