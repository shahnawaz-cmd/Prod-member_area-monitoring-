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

    const emailToUse = this.email || actor.email;
    const passwordToUse = this.password || actor.password;
    if (!emailToUse || !passwordToUse) {
      throw new Error("Missing signup credentials on actor.");
    }

    console.log(`Navigating to Signup: ${signupUrl}`);
    // Await full document load and client initialization to prevent hydration resets/reloads
    await page.goto(signupUrl, { waitUntil: 'load', timeout });
    await page.waitForLoadState('load');

    // 1. Email Input
    const emailInput = page.locator('input[type="email"], input[name*="email" i], input[placeholder*="email" i]').first();
    await emailInput.waitFor({ state: 'visible', timeout });
    await emailInput.fill(emailToUse);

    // 2. Password Input
    const passwordInput = page.locator('input[type="password"]:not([name*="confirm" i]):not([placeholder*="confirm" i])').first();
    await passwordInput.waitFor({ state: 'visible', timeout });
    await passwordInput.fill(passwordToUse);

    // 3. Confirm Password (if present on form)
    const confirmInput = page.locator('input[name*="confirm" i], input[placeholder*="confirm" i]').first();
    if (await confirmInput.isVisible({ timeout: 1500 }).catch(() => false)) {
      await confirmInput.fill(passwordToUse);
    }

    // 4. Terms & Conditions Checkbox (if present)
    const termsCheckbox = page.locator('input[type="checkbox"]').first();
    if (await termsCheckbox.isVisible({ timeout: 1500 }).catch(() => false)) {
      await termsCheckbox.check().catch(() => termsCheckbox.click({ force: true }));
    }

    // 5. Submit Form
    const submitBtn = page.locator('button[type="submit"], button:has-text("Create Account"), button:has-text("Sign Up"), button:has-text("Create Free Account")').first();
    await submitBtn.waitFor({ state: 'visible', timeout: 10000 });
    await submitBtn.click();
    console.log("Clicked signup submit button.");

    // 6. Wait for Dashboard Redirection
    await page.waitForURL('**/dashboard**', { timeout });
    console.log(`✅ Signup successful and redirected to: ${page.url()}`);
  }
}

module.exports = SignupAuthFlow;