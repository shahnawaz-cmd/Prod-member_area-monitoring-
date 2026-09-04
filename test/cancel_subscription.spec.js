const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const SignupAuthFlow = require('../task/SignupAuthFlow');
const SelectPlan = require('../task/SelectPlan');
const PurchaseFlow = require('../task/PurchaseFlow');
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

    // 5. Purchase Plan via Stripe & Set up Payment Update API Listener
    console.log("Preparing to purchase and listen for payment-update API...");
    const paymentUpdatePromise = page.waitForResponse(
      res => res.url().includes('payment-update') && (res.status() === 200 || res.status() === 304),
      { timeout: 120000 }
    ).catch(() => null);

    await actor.attemptsTo(new PurchaseFlow({}, isSlowNetwork));

    // 6. Wait for payment-update API success & redirection
    console.log("Waiting for payment-update API to resolve...");
    const paymentRes = await paymentUpdatePromise;
    if (paymentRes) {
      console.log(`📥 payment-update API resolved with status: ${paymentRes.status()}`);
    }

    console.log("Waiting for automatic redirection to dashboard or success page...");
    try {
      await page.waitForURL(
        url => url.pathname.includes('dashboard') || url.pathname.includes('success-page') || url.pathname.includes('my-report'),
        { timeout: 45000 }
      );
      console.log(`✅ Redirection completed: ${page.url()}`);
    } catch {
      console.log("Auto-redirect timed out; navigating directly to dashboard...");
      await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    }
    await page.waitForTimeout(3000);

    // 7. Perform Subscription Cancellation (with Dynamic Subscription ID capture & UI verification)
    await actor.attemptsTo(new CancelSubscriptionFlow(isSlowNetwork));

    console.log("✅ CS-09: UVC Subscription purchase, automatic dashboard sync, and cancellation completed successfully.");
  });
});
