const { fastInputWithHealing, clickWithHealing } = require('../utils/selfHealingLocator');

class SignupAuthFlow {
  constructor(email, password, isSlowNetwork = false) {
    this.email = email;
    this.password = password;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const baseUrl = actor.baseUrl || "https://members.vehiclehistory.report";
    const signupUrl = baseUrl.includes('members.vehiclehistory.report') 
      ? `${baseUrl}/members/signup` 
      : `${baseUrl}/signup`;
    
    const timeout = this.isSlowNetwork ? 120000 : 60000;
    
    console.log(`Navigating to Signup URL: ${signupUrl} (Timeout: ${timeout}ms)`);
    await page.goto(signupUrl, { waitUntil: 'domcontentloaded', timeout: timeout });
    
    const emailToUse = this.email || actor.email;
    if (!emailToUse) {
      throw new Error("No email was provided or generated on the actor.");
    }
    
    const passwordToUse = this.password || actor.password;
    if (!passwordToUse) {
      throw new Error("No password was provided or generated on the actor.");
    }
    
    // 1. Resilient Email Input (With React Hydration Protection)
    console.log(`Filling Email: ${emailToUse}`);
    const emailInput = page.getByPlaceholder(/enter your email|email/i)
      .or(page.getByRole('textbox', { name: /email/i }))
      .or(page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]'))
      .first();

    await emailInput.waitFor({ state: 'visible', timeout: timeout });
    await emailInput.click();
    await emailInput.fill(emailToUse);
    await emailInput.dispatchEvent('input').catch(() => {});
    await emailInput.dispatchEvent('change').catch(() => {});

    // Guard against SPA/React hydration clearing the initial field on mount
    await page.waitForTimeout(300);
    const currentEmailVal = await emailInput.inputValue().catch(() => '');
    if (currentEmailVal !== emailToUse) {
      console.log("React hydration reset detected. Re-filling Email...");
      await emailInput.click();
      await emailInput.fill(emailToUse);
      await emailInput.dispatchEvent('input').catch(() => {});
    }

    // 2. Self-Healing Password Input
    console.log("Filling Password...");
    const passwordInput = page.getByPlaceholder(/enter your password|password/i)
      .or(page.getByRole('textbox', { name: /^password$/i }))
      .or(page.locator('input[type="password"]:not([placeholder*="confirm" i]):not([name*="confirm" i])'))
      .first();

    await passwordInput.waitFor({ state: 'visible', timeout: timeout });
    await passwordInput.click();
    await passwordInput.fill(passwordToUse);
    await passwordInput.dispatchEvent('input').catch(() => {});
    await passwordInput.dispatchEvent('change').catch(() => {});

    // 3. Adaptive Confirm Password (Conditional - only fills if present)
    const confirmPasswordLocators = [
      page.getByPlaceholder(/confirm your password|confirm password/i),
      page.getByRole('textbox', { name: /confirm/i }),
      page.locator('input[placeholder*="confirm" i]'),
      page.locator('input[name*="confirm" i]'),
      page.locator('input[id*="confirm" i]')
    ];

    for (const loc of confirmPasswordLocators) {
      try {
        const visibleConfirm = loc.locator('visible=true').first();
        if (await visibleConfirm.isVisible({ timeout: 2000 })) {
          console.log("Found Confirm Password field, filling...");
          await visibleConfirm.click();
          await visibleConfirm.fill(passwordToUse);
          await visibleConfirm.dispatchEvent('input').catch(() => {});
          await visibleConfirm.dispatchEvent('change').catch(() => {});
          break;
        }
      } catch (e) {}
    }

    // 4. Adaptive Terms & Conditions Checkbox
    try {
      const termsCheckbox = page.locator('input[type="checkbox"]').first();
      if (await termsCheckbox.isVisible({ timeout: 2000 })) {
        const isChecked = await termsCheckbox.isChecked().catch(() => false);
        if (!isChecked) {
          console.log("Checking Terms and Conditions checkbox...");
          await termsCheckbox.check({ force: true }).catch(() => termsCheckbox.click({ force: true }));
        }
      }
    } catch (e) {}

    // 5. Submit Form
    console.log("Submitting Signup Form...");
    const submitBtn = page.getByRole('button', { name: /Create Account|Sign Up|Create Free Account/i })
      .or(page.locator('button:has-text("Create Account")'))
      .or(page.locator('button[type="submit"]'))
      .first();

    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click({ force: true });
    console.log("Clicked Create Account button.");

    // 6. Wait for redirect to Dashboard
    console.log("Waiting for redirection to dashboard...");
    await page.waitForURL('**/dashboard**', { timeout: timeout });
    console.log(`✅ Signup successful and redirected to: ${page.url()}`);
  }
}

module.exports = SignupAuthFlow;