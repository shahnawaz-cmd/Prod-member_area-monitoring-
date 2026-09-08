const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const SignupAuthFlow = require('../task/SignupAuthFlow');
const SelectPlan = require('../task/SelectPlan');
const PurchaseFlow = require('../task/PurchaseFlow');
const UVCDashboardRedirectionCheck = require('../task/UVCDashboardRedirectionCheck');
const GenerateEmail = require('../task/GenerateEmail');
const FetchUSVIN = require('../task/FetchUSVIN');
const GenerateUVCReport = require('../task/GenerateUVCReport');

test.describe('Independent UVC Subscription & Report Operations', () => {
  // Use clean isolated session state (no cached cookies)
  test.use({ storageState: { cookies: [], origins: [] } });

  test('CS-08 — UVC Report purchase and generate', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes budget

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Generate Unique Email & Password
    await actor.attemptsTo(new GenerateEmail('uvc'));

    // 3. Signup New Account
    await actor.attemptsTo(new SignupAuthFlow(null, null, isSlowNetwork));

    // 4. Select UVC Subscription Plan
    await actor.attemptsTo(new SelectPlan('UVC Subscription', isSlowNetwork));

    // 5. Purchase Plan via Stripe
    await actor.attemptsTo(new PurchaseFlow({}, isSlowNetwork));

    // 6. Natural UVC System Redirection Sequence
    await actor.attemptsTo(new UVCDashboardRedirectionCheck(120000));

    // 7. Fetch Pure 17-Char US VIN from MongoDB
    await actor.attemptsTo(new FetchUSVIN());

    // 8. Generate UVC Report
    await actor.attemptsTo(new GenerateUVCReport(actor.usVin, isSlowNetwork));

    // 9. Expect Redirection to My Reports
    await expect(page).toHaveURL(/my-reports?|my-report/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("✅ CS-08: UVC report purchase and generation completed successfully.");
    await page.close();
  });
});
