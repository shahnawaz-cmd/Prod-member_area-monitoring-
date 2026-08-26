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
    
    // 1. Self-Healing Email Input
    console.log(`Filling Email: ${emailToUse}`);
    await fastInputWithHealing(
      page,
      'Email',
      emailToUse,
      [
        'input[type="email"]',
        'input[name*="email" i]',
        'input[id*="email" i]',
        'input[placeholder*="email" i]'
      ],
      { isSlowNetwork: this.isSlowNetwork }
    );

    // 2. Self-Healing Password Input
    console.log("Filling Password...");
    await fastInputWithHealing(
      page,
      'Password',
      passwordToUse,
      [
        'input[type="password"]:not([name*="confirm" i]):not([id*="confirm" i])',
        'input[type="password"]',
        'input[name="password"]',
        'input[id="password"]',
        'input[placeholder*="password" i]'
      ],
      { isSlowNetwork: this.isSlowNetwork }
    );

    // 3. Adaptive Confirm Password (Conditional - only fills if present)
    const confirmPasswordLocators = [
      page.getByRole('textbox', { name: /confirm/i }),
      page.getByPlaceholder(/confirm password/i),
      page.locator('input[name*="confirm" i]'),
      page.locator('input[id*="confirm" i]')
    ];

    for (const loc of confirmPasswordLocators) {
      try {
        const visibleConfirm = loc.locator('visible=true').first();
        if (await visibleConfirm.isVisible({ timeout: 2000 })) {
          console.log("Found Confirm Password field, filling...");
          await visibleConfirm.fill(passwordToUse);
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

    // 5. Self-Healing Submit / Create Account Click
    console.log("Submitting Signup Form...");
    const submitButtonSelectors = [
      'button[type="submit"]',
      'button:has-text("Sign Up")',
      'button:has-text("Create Account")',
      'button:has-text("Create Free Account")',
      'button:has-text("Continue")',
      'button:has-text("Get Started")',
      'input[type="submit"]'
    ];

    await clickWithHealing(
      page,
      'Sign up',
      submitButtonSelectors,
      { strategyTimeout: 5000 }
    );

    // 6. Resilient Post-Signup Navigation
    console.log("Waiting for post-signup navigation...");
    try {
      await Promise.race([
        page.waitForURL(url => !url.pathname.includes('/signup'), { timeout: timeout }),
        page.waitForURL(/.*(dashboard|pricing|select-plan|plan|checkout|members).*/i, { timeout: timeout }),
        page.locator('text=Select a Plan, text=Choose Plan, text=Dashboard').first().waitFor({ state: 'visible', timeout: timeout })
      ]);
      console.log(`✅ Signup completed! Current URL: ${page.url()}`);
    } catch (e) {
      console.warn(`⚠️ Post-signup navigation warning: ${e.message}. Proceeding...`);
    }
  }
}

module.exports = SignupAuthFlow;