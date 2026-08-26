const { fastInputWithHealing, clickWithHealing } = require('../utils/selfHealingLocator');

class LoginAuthFlow {
  constructor(email = null, password = null, isSlowNetwork = false) {
    this.email = email;
    this.password = password;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const baseUrl = actor.baseUrl || "https://members.vehiclehistory.report";
    const loginUrl = baseUrl.includes('members.vehiclehistory.report') ? `${baseUrl}/members/login` : `${baseUrl}/login`;
    const timeout = this.isSlowNetwork ? 120000 : 60000;

    console.log(`Navigating to Login URL: ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: 'domcontentloaded', timeout: timeout });

    const emailToUse = this.email || actor.email;
    const passwordToUse = this.password || actor.password;

    if (!emailToUse || !passwordToUse) {
      throw new Error("No login credentials were provided or generated on the actor.");
    }

    // 1. Self-Healing Email Input
    await fastInputWithHealing(page, 'Email', emailToUse, [
      'input[placeholder*="email" i]',
      'input[type="email"]',
      'input[name*="email" i]',
      'input[id*="email" i]'
    ], { isSlowNetwork: this.isSlowNetwork });

    // 2. Self-Healing Password Input
    await fastInputWithHealing(page, 'Password', passwordToUse, [
      'input[placeholder*="password" i]',
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]'
    ], { isSlowNetwork: this.isSlowNetwork });

    // 3. Self-Healing Login Click
    await clickWithHealing(page, 'Access Dashboard', [
      'button[type="submit"]',
      'button:has-text("Sign in")',
      'button:has-text("Log in")',
      'button:has-text("Access Dashboard")',
      'input[type="submit"]'
    ]);

    await page.waitForURL('**/dashboard**', { timeout: timeout });
    console.log("Login successful.");
  }
}

module.exports = LoginAuthFlow;
