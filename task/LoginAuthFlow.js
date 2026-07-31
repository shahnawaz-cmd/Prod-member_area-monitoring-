class LoginAuthFlow {
  constructor(email = null, password = null, isSlowNetwork = false) {
    this.email = email;
    this.password = password;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const baseUrl = actor.baseUrl;
    const loginUrl = `${baseUrl}/login`;
    const timeout = this.isSlowNetwork ? 120000 : 60000;

    console.log(`Navigating to Login URL: ${loginUrl}`);
    await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: timeout });

    const emailToUse = this.email || actor.email;
    const passwordToUse = this.password || actor.password;

    if (!emailToUse || !passwordToUse) {
      throw new Error("No login credentials were provided or generated on the actor.");
    }

    await page.getByPlaceholder(/email/i).fill(emailToUse);
    await page.getByRole('textbox', { name: /^password$/i }).fill(passwordToUse);

    const loginButton = page.getByRole('button', { name: /Access Dashboard|log in|sign in/i }).first();
    await loginButton.waitFor({ state: 'visible', timeout: timeout / 2 });
    await loginButton.click();

    await page.waitForURL('**/dashboard**', { timeout: timeout });
    console.log("Login successful.");
  }
}

module.exports = LoginAuthFlow;
