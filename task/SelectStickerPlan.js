class SelectStickerPlan {
  constructor(planName = 'Window Sticker', isSlowNetwork = false) {
    this.planName = planName;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    await page.waitForURL('**/dashboard**', { timeout: timeout });

    // Mobile View Handling
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      console.log("Mobile view detected, opening side navigation...");
      const menuToggle = page.getByRole('img', { name: 'Menu' }).first();
      await menuToggle.waitFor({ state: 'visible', timeout: timeout }).catch(() => {});
      if (await menuToggle.isVisible()) {
        await menuToggle.click();
      }
      
      const stickerButton = page.locator('span, button').filter({ hasText: 'Window Sticker' }).first();
      await stickerButton.waitFor({ state: 'visible', timeout: timeout });
      await stickerButton.click();
      await page.waitForTimeout(1000);
    } else {
      // Desktop View: Click the 'Window Sticker' button/tab
      const stickerTab = page.locator('span, button, a').filter({ hasText: /^Window Sticker$/i }).or(page.locator('button:has-text("Window Sticker")')).first();
      await stickerTab.waitFor({ state: 'visible', timeout: timeout });
      await stickerTab.click();
      console.log(`Clicked 'Window Sticker' tab. (Timeout: ${timeout}ms)`);
      await page.waitForTimeout(1000);
    }

    console.log("Locating the highest sticker package option available on the page...");
    const planLoadTimeout = this.isSlowNetwork ? 45000 : 20000;
    
    // Await the highest plan card (25 Stickers) to be visible to guarantee all options have finished rendering
    console.log("Waiting for plan cards to render...");
    await page.getByText(/25\s*Stickers/i).first().waitFor({ state: 'visible', timeout: planLoadTimeout }).catch(() => {
      console.log("⚠️ Timeout waiting for '25 Stickers' card to render. Proceeding to scan remaining plans...");
    });
    
    // Target elements matching the sticker patterns directly by text
    const planMatchers = [
      /25\s*Stickers/i,
      /10\s*Stickers/i,
      /5\s*Stickers/i,
      /2\s*Stickers/i,
      /1\s*Sticker|Sticker\$/i
    ];

    let selected = false;
    for (const pattern of planMatchers) {
      // Find matching text element
      const planElement = page.getByText(pattern).first();
      
      if (await planElement.isVisible().catch(() => false)) {
        console.log(`Found and selecting plan matching pattern: ${pattern}`);
        
        await planElement.scrollIntoViewIfNeeded();
        await planElement.click({ force: true });
        
        selected = true;
        // Delay to ensure the dynamic plan selection registers in the UI state
        await page.waitForTimeout(1500);
        break;
      }
    }

    if (!selected) {
      console.log("⚠️ No matching dynamic sticker plan cards were visible; proceeding with default checkout.");
    }

    // Click the Proceed button (using case-insensitive exact string match regex to avoid strict mode duplicates)
    const proceedButton = page.getByRole('button', { name: /^Proceed to Checkout$/i })
      .or(page.getByRole('button', { name: /^Proceed$/i }))
      .or(page.locator('button').filter({ hasText: /^Proceed$/i }))
      .first();

    await proceedButton.waitFor({ state: 'visible', timeout: timeout });
    await proceedButton.click({ force: true });
    console.log("Clicked 'Proceed' button.");

    const redirectTimeout = this.isSlowNetwork ? 120000 : 60000;
    await Promise.race([
      page.waitForURL(url => url.pathname.includes('checkout') || url.hash.includes('checkout') || url.pathname.includes('success'), { timeout: redirectTimeout }).catch(() => {}),
      page.waitForSelector('iframe[title*="payment" i], iframe[src*="componentName=cardNumber"], [role="dialog"], button:has-text("Card")', { state: 'attached', timeout: redirectTimeout }).catch(() => {}),
    ]);
  }
}

module.exports = SelectStickerPlan;
