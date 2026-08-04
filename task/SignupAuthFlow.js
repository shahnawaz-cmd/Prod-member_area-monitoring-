class SignupAuthFlow {
  constructor(email, password, isSlowNetwork = false) {
    this.email = email;
    this.password = password;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    // const baseUrl = actor.baseUrl || "https://members.vehiclehistory.report";
    const baseUrl = actor.baseUrl;
    const signupUrl = baseUrl.includes('members.vehiclehistory.report') ? `${baseUrl}/members/signup` : `${baseUrl}/signup`;
    
    // Condition-based timeout
    const timeout = this.isSlowNetwork ? 120000 : 60000;
    
    console.log(`Navigating to Signup URL: ${signupUrl} (Timeout: ${timeout}ms)`);
    // Added waitUntil: 'networkidle' to stabilize after navigation/refreshes
    await page.goto(signupUrl, { waitUntil: 'networkidle', timeout: timeout });
    
    const emailToUse = this.email || actor.email;
    if (!emailToUse) {
      throw new Error("No email was provided or generated on the actor.");
    }
    
    const passwordToUse = this.password || actor.password;
    if (!passwordToUse) {
      throw new Error("No password was provided or generated on the actor.");
    }
    
    await page.getByPlaceholder(/email/i).fill(emailToUse);
    await page.getByRole('textbox', { name: /^password$/i }).fill(passwordToUse);
    await page.getByRole('textbox', { name: /confirm/i }).fill(passwordToUse);
    
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    
    await page.waitForURL('**/dashboard**', { timeout: timeout });
    console.log("Signup successful.");
  }
}

module.exports = SignupAuthFlow;
