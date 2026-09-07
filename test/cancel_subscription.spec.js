const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const SignupAuthFlow = require('../task/SignupAuthFlow');
const SelectPlan = require('../task/SelectPlan');
const PurchaseFlow = require('../task/PurchaseFlow');
const DashboardRedirectionCheck = require('../task/DashboardRedirectionCheck');
const GenerateEmail = require('../task/GenerateEmail');
const CancelSubscriptionFlow = require('../task/CancelSubscriptionFlow');

test.describe('Dedicated Subscription Cancellation Suite', () => {
  // Use clean isolated session state (no cached cookies)
  test.use({ storageState: { cookies: [], origins: [] } });

  test('CS-09 — UVC Subscription Purchase and Cancel Flow', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes budget

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL (Production)
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Generate Unique Email & Password
    await actor.attemptsTo(new GenerateEmail('cancel'));

    // 3. Signup New Account
    await actor.attemptsTo(new SignupAuthFlow(null, null, isSlowNetwork));

    // 4. Select UVC Subscription Plan
    await actor.attemptsTo(new SelectPlan('UVC Subscription', isSlowNetwork));

    // 5. Purchase Plan via Stripe (awaits payment-update API automatically)
    await actor.attemptsTo(new PurchaseFlow({}, isSlowNetwork));

    // 6. Dashboard Redirection & Session Stabilization
    await actor.attemptsTo(new DashboardRedirectionCheck(120000));

    // 7. Perform Subscription Cancellation (with Dynamic Subscription ID capture & UI verification)
    await actor.attemptsTo(new CancelSubscriptionFlow(isSlowNetwork));

    console.log("✅ CS-09: UVC Subscription purchase, automatic dashboard sync, and cancellation completed successfully.");
  });
});
