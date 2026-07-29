class PurchaseFlow {
  constructor(cardData = {}, isSlowNetwork = false) {
    this.cardNum = cardData.cardNum || '5454545454545454';
    this.expiry = cardData.expiry || '0232';
    this.cvc = cardData.cvc || '123';
    this.zip = cardData.zip || '12345';
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    await page.waitForSelector('form', { state: 'visible', timeout: timeout });
    await page.waitForTimeout(this.isSlowNetwork ? 10000 : 5000); 
    await page.waitForSelector('input[placeholder="Enter your name"]', { state: 'visible', timeout: timeout / 2 });
    await page.locator('input[placeholder="Enter your name"]').fill('Test User');

    // Use specific frameLocators for Stripe components
    const cardFrame = page.frameLocator('iframe[src*="componentName=cardNumber"]');
    const expiryFrame = page.frameLocator('iframe[src*="componentName=cardExpiry"]');
    const cvcFrame = page.frameLocator('iframe[src*="componentName=cardCvc"]');

    await cardFrame.locator('[name="cardnumber"]').fill(this.cardNum);
    await expiryFrame.locator('[name="exp-date"]').fill(this.expiry);
    await cvcFrame.locator('[name="cvc"]').fill(this.cvc);
    
    const zipLocator = page.locator('input[name="postal-code"], input#postal-code, [placeholder*="ZIP" i]');
    if (await zipLocator.first().isVisible({ timeout: 5000 })) {
        await zipLocator.first().fill(this.zip);
    }

    const payButton = page.locator('button[type="submit"]').filter({ hasText: /Pay|Subscribe/i });
    await payButton.waitFor({ state: 'visible', timeout: timeout });
    await payButton.click();
    console.log("Purchase flow completed.");
  }
}

module.exports = PurchaseFlow;
