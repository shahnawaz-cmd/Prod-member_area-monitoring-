const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const { GenerateVinReport } = require('../task/GenerateVinReport');
const GenerateEUReport = require('../task/GenerateEUReport');
const { GenerateUSVIN, ClassicMappedVIN, EUMappedVIN } = require('../task/GenerateVINs');
const FetchEUVIN = require('../task/FetchEUVIN');
const FetchUSVIN = require('../task/FetchUSVIN');
const GenerateUVCReport = require('../task/GenerateUVCReport');
const SignupAuthFlow = require('../task/SignupAuthFlow');
const SelectPlan = require('../task/SelectPlan');
const PurchaseFlow = require('../task/PurchaseFlow');
const GenerateEmail = require('../task/GenerateEmail');
const CancelSubscriptionFlow = require('../task/CancelSubscriptionFlow');
const DashboardRedirectionCheck = require('../task/DashboardRedirectionCheck');
const UVCDashboardRedirectionCheck = require('../task/UVCDashboardRedirectionCheck');
const GenerateLPReport = require('../task/GenerateLPReport');
const { GenerateClassicUnmappedVIN, GenerateClassicUnmappedVINManual } = require('../task/GenerateClassicUnmappedVIN');

test.describe('Global Member Area Report Generation Flow', () => {
  test('CS-02 — 17 Character VIN (US) report generate', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Start Dynamic pure 17-char US VIN extraction asynchronously from Mongo
    const usVinPromise = actor.attemptsTo(new FetchUSVIN());

    // 3. Direct Navigation to Dashboard (concurrent with VIN generation)
    console.log("Navigating directly to Dashboard...");
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // Await US VIN resolution
    await usVinPromise;

    // 4. Generate US VIN Report
    await actor.attemptsTo(new GenerateVinReport(null, isSlowNetwork));

    await expect(page).toHaveURL(/my-reports?|my-report/, { timeout: isSlowNetwork ? 120000 : 60000 });
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
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Generate Classic Mapped VIN
    await actor.attemptsTo(new ClassicMappedVIN('228871N111628', isSlowNetwork));

    // 4. Generate Classic VIN Report
    await actor.attemptsTo(new GenerateVinReport(null, isSlowNetwork));

    await expect(page).toHaveURL(/my-reports?|my-report/, { timeout: isSlowNetwork ? 120000 : 60000 });
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

    // 2. Start EU VIN pre-fetch asynchronously in background
    const vinFetchPromise = actor.attemptsTo(new FetchEUVIN());

    // 3. Direct Navigation to Dashboard (concurrent with VIN pre-fetch)
    console.log("Navigating directly to Dashboard...");
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // Await VIN resolution (resolved in background)
    await vinFetchPromise;

    // 4. Generate EU VIN Report
    await actor.attemptsTo(new GenerateEUReport(actor.euVin, isSlowNetwork));

    await expect(page).toHaveURL(/my-reports?|my-report/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("EU VIN report generation completed successfully.");
    await page.close();
  });

  test('CS-05 — License Plate (LP) report generate', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Direct Navigation to Dashboard (using cached session)
    console.log("Navigating directly to Dashboard...");
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Generate License Plate Report
    await actor.attemptsTo(new GenerateLPReport('HBL1216', 'Texas', isSlowNetwork));

    // 4. Expect Redirection to My Reports
    await expect(page).toHaveURL(/my-reports?|my-report/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("License Plate report generation completed successfully.");
    await page.close();
  });

  test('CS-06 — Classic Unmapped VIN Report Generation', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Direct Navigation to Dashboard (using cached session)
    console.log("Navigating directly to Dashboard...");
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Generate Classic Unmapped VIN & dropdown selectors
    await actor.attemptsTo(new GenerateClassicUnmappedVIN(null, isSlowNetwork));
    console.log("Classic Unmapped VIN report generation completed successfully.");
    await page.close();
  });

  test('CS-07 — Classic unmapped (using manual input)', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Direct Navigation to Dashboard (using cached session)
    console.log("Navigating directly to Dashboard...");
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Generate Classic Unmapped VIN & fill manual input textboxes
    await actor.attemptsTo(new GenerateClassicUnmappedVINManual(null, isSlowNetwork));
    console.log("Classic Unmapped VIN report (manual input) completed successfully.");
    await page.close();
  });
});
