class PurchaseFlow {
  constructor(cardData = {}, isSlowNetwork = false) {
    this.cardData = cardData;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    console.log("Determining checkout page layout/strategy dynamically...");

    // Click Card payment option first if visible
    const cardTabButton = page.getByRole('button', { name: 'Card' });
    try {
      if (await cardTabButton.isVisible({ timeout: 5000 })) {
        await cardTabButton.click();
        console.log("Selected Card tab option.");
      }
    } catch (e) {}

    // Precise selectors for the multi-frame elements (ignoring background helper Stripe frames)
    const multiFrameSelector = 'iframe[src*="componentName=cardNumber"], iframe[title*="Secure card number input frame" i]';
    // Precise selectors for the single-frame elements
    const singleFrameSelector = 'iframe[title*="payment" i], iframe[title*="Payment" i], iframe[src*="elements-inner-card"]';

    // Wait for at least one layout elements to attach/load
    await Promise.race([
      page.waitForSelector(multiFrameSelector, { state: 'attached', timeout: timeout }).catch(() => {}),
      page.waitForSelector(singleFrameSelector, { state: 'attached', timeout: timeout }).catch(() => {}),
    ]);

    // Check which design is rendered active
    const isSingleFrame = await page.locator(singleFrameSelector).first().isVisible().catch(() => false);
    const isMultiFrame = await page.locator(multiFrameSelector).first().isVisible().catch(() => false);

    console.log(`Active Stripe Layout Status -> SingleFrame: ${isSingleFrame}, MultiFrame: ${isMultiFrame}`);

    if (isMultiFrame) {
      console.log("Proceeding with Multi-Frame Checkout Strategy.");
      await this.performMultiFrameCheckout(page, timeout);
    } else {
      console.log("Defaulting to Single-Frame Checkout Strategy.");
      await this.performSingleFrameCheckout(page, timeout);
    }

    console.log("Purchase flow completed.");
  }

  async performSingleFrameCheckout(page, timeout) {
    const frame = page.frameLocator('iframe[title*="payment" i], iframe[title*="Payment" i], iframe[src*="elements-inner-card"]').first();

    const number = this.cardData.cardNum || '4242424242424242';
    let exp = this.cardData.expiry || '12/26';
    if (exp.length === 4 && !exp.includes('/')) {
      exp = `${exp.substring(0, 2)}/${exp.substring(2, 4)}`;
    }
    const cvc = this.cardData.cvc || '123';
    const zip = this.cardData.zip || '10001';
    const countryCode = this.cardData.countryCode || 'US';

    await frame.getByRole('textbox', { name: 'Card number' }).fill(number);
    await frame.getByRole('textbox', { name: 'Expiration date MM / YY' }).fill(exp);
    await frame.getByRole('textbox', { name: 'Security code' }).fill(cvc);

    try {
      const countryField = frame.getByLabel('Country');
      if (await countryField.isVisible({ timeout: 3000 })) {
        await countryField.selectOption(countryCode);
      }
    } catch (e) {}

    try {
      const zipField = frame.getByRole('textbox', { name: 'ZIP code' });
      if (await zipField.isVisible({ timeout: 3000 })) {
        await zipField.fill(zip);
      }
    } catch (e) {}

    const payButton = page.getByRole('button', { name: /^Pay\b/i });
    await payButton.waitFor({ state: 'visible', timeout: timeout });
    await payButton.click();
  }

  async performMultiFrameCheckout(page, timeout) {
    const nameInput = page.locator('input[placeholder="Enter your name"]');
    try {
      if (await nameInput.isVisible({ timeout: 5000 })) {
        await nameInput.fill('Test User');
      }
    } catch (e) {}

    const cardFrame = page.frameLocator('iframe[src*="componentName=cardNumber"], iframe[title*="Secure card number input frame" i]').first();
    const expiryFrame = page.frameLocator('iframe[src*="componentName=cardExpiry"], iframe[title*="Secure expiration date input frame" i]').first();
    const cvcFrame = page.frameLocator('iframe[src*="componentName=cardCvc"], iframe[title*="Secure CVC input frame" i]').first();

    const number = this.cardData.cardNum || '5454545454545454';
    const exp = this.cardData.expiry || '0232';
    const cvc = this.cardData.cvc || '123';
    const zip = this.cardData.zip || '12345';

    await cardFrame.locator('[name="cardnumber"]').fill(number);
    await expiryFrame.locator('[name="exp-date"]').fill(exp);
    await cvcFrame.locator('[name="cvc"]').fill(cvc);
    
    try {
      const zipLocator = page.locator('input[name="postal-code"], input#postal-code, [placeholder*="ZIP" i]');
      if (await zipLocator.first().isVisible({ timeout: 5000 })) {
          await zipLocator.first().fill(zip);
      }
    } catch (e) {}

    const payButton = page.locator('button[type="submit"]').filter({ hasText: /Pay|Subscribe/i });
    await payButton.waitFor({ state: 'visible', timeout: timeout });
    await payButton.click();
  }
}

module.exports = PurchaseFlow;
