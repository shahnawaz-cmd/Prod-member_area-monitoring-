class SignupAuthFlow {
  constructor(email, password, isSlowNetwork = false) {
    this.email = email;
    this.password = password;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const baseUrl = actor.baseUrl || "https://members.vehiclehistory.report";
    const signupUrl = `${baseUrl}/members/signup`;
    
    // Condition-based timeout
    const timeout = this.isSlowNetwork ? 120000 : 60000;
    
    console.log(`Navigating to Signup URL: ${signupUrl} (Timeout: ${timeout}ms)`);
    // Added waitUntil: 'networkidle' to stabilize after navigation/refreshes
    await page.goto(signupUrl, { waitUntil: 'networkidle', timeout: timeout });
    
    await page.getByPlaceholder(/email/i).fill(this.email);
    await page.getByRole('textbox', { name: /^password$/i }).fill(this.password);
    await page.getByRole('textbox', { name: /confirm/i }).fill(this.password);
    
    await page.getByRole('button', { name: /sign up|create account/i }).click();
    
    await page.waitForURL('**/dashboard**', { timeout: timeout });
    console.log("Signup successful.");
  }
}

module.exports = SignupAuthFlow;
