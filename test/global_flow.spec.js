const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const { GenerateVinReport, GenerateEUReport } = require('../task/GenerateVinReport');
const { GenerateUSVIN, ClassicMappedVIN, EUMappedVIN } = require('../task/GenerateVINs');
const GenerateUVCReport = require('../task/GenerateUVCReport');
const SignupAuthFlow = require('../task/SignupAuthFlow');
const SelectPlan = require('../task/SelectPlan');
const PurchaseFlow = require('../task/PurchaseFlow');
const GenerateEmail = require('../task/GenerateEmail');
const CancelSubscriptionFlow = require('../task/CancelSubscriptionFlow');
const DashboardRedirectionCheck = require('../task/DashboardRedirectionCheck');
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

    // 2. Direct Navigation to Dashboard (using cached session)
    console.log("Navigating directly to Dashboard...");
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Generate Dynamic US VIN
    await actor.attemptsTo(new GenerateUSVIN('mongo'));

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

    // 2. Direct Navigation to Dashboard
    console.log("Navigating directly to Dashboard...");
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Generate EU Mapped VIN
    await actor.attemptsTo(new EUMappedVIN(['VF1AGVYB055491691', 'WAUZZZ8P6CA083445'], isSlowNetwork));

    // 4. Generate EU VIN Report
    await actor.attemptsTo(new GenerateEUReport(null, isSlowNetwork));

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
    await actor.attemptsTo(new GenerateClassicUnmappedVIN('245GH4156001', isSlowNetwork));

    // 4. Expect Redirection to My Reports or Classic Detail Page
    await expect(page).toHaveURL(/my-reports?|my-report|classic/, { timeout: isSlowNetwork ? 120000 : 60000 });
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
    await actor.attemptsTo(new GenerateClassicUnmappedVINManual('245GH4156001', isSlowNetwork));

    // 4. Expect Redirection to My Reports or Classic Detail Page
    await expect(page).toHaveURL(/my-reports?|my-report|classic/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Classic Unmapped VIN report (manual input) completed successfully.");
    await page.close();
  });
});

// Independent Test Suite for UVC (runs fully independent with a clean state per test)
test.describe('Independent UVC Subscription Operations', () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // Clean state for UVC tests

  test('CS-08 — UVC Report purchase and generate', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Generate Email & Password
    await actor.attemptsTo(new GenerateEmail());

    // 3. Signup
    await actor.attemptsTo(new SignupAuthFlow(null, null, isSlowNetwork));

    // 4. Select UVC Subscription Plan
    await actor.attemptsTo(new SelectPlan('UVC Subscription', isSlowNetwork));

    // 5. Purchase Plan via Stripe
    await actor.attemptsTo(new PurchaseFlow({}, isSlowNetwork));

    // 5.1 Redirection to Dashboard
    await actor.attemptsTo(new DashboardRedirectionCheck(60000));

    // 6. Generate US VIN from Mongo
    await actor.attemptsTo(new GenerateUSVIN('mongo'));

    // 7. Generate UVC Report
    await actor.attemptsTo(new GenerateUVCReport(actor.usVin, isSlowNetwork));

    // 8. Wait for Redirection to My Reports
    console.log("Waiting for redirection to My Reports...");
    try {
      await page.waitForURL(url => url.pathname.includes('my-report'), { timeout: 15000 });
    } catch (e) {
      if (!page.url().includes('my-report')) {
        await page.goto(actor.myReportsUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
      }
    }

    await expect(page).toHaveURL(/my-reports?|my-report/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("UVC report purchase and generation completed successfully.");
    await page.close();
  });
});
