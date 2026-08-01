const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const SignupAuthFlow = require('../task/SignupAuthFlow');
const SelectStickerPlan = require('../task/SelectStickerPlan');
const PurchaseFlow = require('../task/PurchaseFlow');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const DashboardRedirectionCheck = require('../task/DashboardRedirectionCheck');
const GenerateEmail = require('../task/GenerateEmail');

test('Setup Session — Window Sticker Signup and Purchase Flow', async ({ page }) => {
  test.setTimeout(300000); // 5 minutes
  
  const actor = new Actor(page);
  const isSlowNetwork = process.env.SLOW_NETWORK === 'true';

  // 0. Setup API Monitoring
  await actor.attemptsTo(new CaptureApiResponses());

  // 1. Configure Base URL
  await actor.attemptsTo(new ConfigureBaseUrl());

  // 2. Generate Email
  await actor.attemptsTo(new GenerateEmail('sticker'));

  // 3. Auth Flow
  await actor.attemptsTo(new SignupAuthFlow(null, null, isSlowNetwork));

  // 4. Plan Selection (Stickers)
  await actor.attemptsTo(new SelectStickerPlan('Window Sticker', isSlowNetwork));

  // 5. Purchase Flow
  await actor.attemptsTo(new PurchaseFlow({}, isSlowNetwork));

  // 6. Dashboard Redirection
  await actor.attemptsTo(new DashboardRedirectionCheck(isSlowNetwork ? 120000 : 60000));

  // Verification
  await expect(page).toHaveURL(/dashboard/, { timeout: 60000 });
  console.log("Sticker setup flow completed successfully. Saving session state...");
  
  // Save session state to sticker_state.json
  await page.context().storageState({ path: 'sticker_state.json' });
  console.log("Session state saved to sticker_state.json.");
  
  await page.close();
});
