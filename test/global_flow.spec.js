const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const SignupAuthFlow = require('../task/SignupAuthFlow');
const SelectPlan = require('../task/SelectPlan');
const PurchaseFlow = require('../task/PurchaseFlow');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const DashboardRedirectionCheck = require('../task/DashboardRedirectionCheck');

test.describe('Global Member Area Flow', () => {
  test('CS-Global — Full Signup, Plan Selection, and Purchase Flow', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes
    
    const actor = new Actor(page);
    const email = `test_${Date.now()}@example.com`;
    const password = "Password123!";

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Auth Flow
    await actor.attemptsTo(new SignupAuthFlow(email, password));

    // 3. Plan Selection
    await actor.attemptsTo(new SelectPlan('Vehicle Report'));

    // 4. Purchase Flow
    await actor.attemptsTo(new PurchaseFlow());

    // 5. Dashboard Redirection
    await actor.attemptsTo(new DashboardRedirectionCheck());

    // Verification
    await expect(page).toHaveURL(/dashboard/, { timeout: 60000 });
    console.log("Global flow completed successfully.");
    
    // Explicitly close page/browser context
    await page.close();
  });
});
