const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const { GenerateVinReport, GenerateEUReport } = require('../task/GenerateVinReport');
const { GenerateUSVIN, ClassicMappedVIN, EUMappedVIN } = require('../task/GenerateVINs');

test.describe('Global Member Area Report Generation Flow', () => {
  test('CS-02 — 17 Character VIN (US) report generate', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Direct Navigation to Dashboard (using cached session)
    console.log("Navigating directly to Dashboard...");
    await page.goto(`${actor.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Generate Dynamic US VIN
    await actor.attemptsTo(new GenerateUSVIN('mongo'));

    // 4. Generate US VIN Report
    await actor.attemptsTo(new GenerateVinReport(null, isSlowNetwork));

    await expect(page).toHaveURL(/my-reports/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("US VIN report generation completed successfully.");
    await page.close();
  });

  test('CS-03 — Classic Mapped VIN report generate', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Direct Navigation to Dashboard
    console.log("Navigating directly to Dashboard...");
    await page.goto(`${actor.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Generate Classic Mapped VIN
    await actor.attemptsTo(new ClassicMappedVIN('228871N111628', isSlowNetwork));

    // 4. Generate Classic VIN Report
    await actor.attemptsTo(new GenerateVinReport(null, isSlowNetwork));

    await expect(page).toHaveURL(/my-reports/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Classic VIN report generation completed successfully.");
    await page.close();
  });

  test('CS-04 — EU Mapped VIN report generate', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Direct Navigation to Dashboard
    console.log("Navigating directly to Dashboard...");
    await page.goto(`${actor.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Generate EU Mapped VIN
    await actor.attemptsTo(new EUMappedVIN(['VF1AGVYB055491691', 'WAUZZZ8P6CA083445'], isSlowNetwork));

    // 4. Generate EU VIN Report
    await actor.attemptsTo(new GenerateEUReport(null, isSlowNetwork));

    await expect(page).toHaveURL(/my-reports/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("EU VIN report generation completed successfully.");
    await page.close();
  });
});
