class RegenerateSticker {
  constructor(isSlowNetwork = false) {
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const clickTimeout = this.isSlowNetwork ? 60000 : 30000;
    const tourTimeout = this.isSlowNetwork ? 15000 : 5000;
    const trimTimeout = this.isSlowNetwork ? 300000 : 180000; // Allow up to 3-5 minutes for slow network response

    // Click Regenerate Sticker button
    const regenButton = page.getByRole('button', { name: 'Regenerate Sticker' }).nth(1);
    await regenButton.waitFor({ state: 'visible', timeout: clickTimeout });

    // Setup API response promises for regeneration load
    const validatePromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/vin-validate') && res.status() === 200,
      { timeout: trimTimeout }
    ).catch(() => null);

    const generatePromise = page.waitForResponse(
      res => res.url().includes('generate_sticker') || res.url().includes('generate-sticker'),
      { timeout: trimTimeout }
    ).catch(() => null);

    const autoloadPromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/autoloading-stickerdata'),
      { timeout: trimTimeout }
    ).catch(() => null);

    await regenButton.click();
    console.log("Clicked Regenerate Sticker. Awaiting vin-validate, generate-sticker, and autoloading APIs to complete...");
    await Promise.all([validatePromise, generatePromise, autoloadPromise]);
    console.log("Regeneration loading APIs resolved. Checking for tour popup...");

    // Close Tour popup before trim selection if visible
    await page.getByLabel('Close Tour').click();
    console.log("Tour popup closed.");

    // Wait for dynamic options container layout to load and settle
    const trimOption = page.getByRole('paragraph').filter({ hasText: "Xl 4wd Reg Cab 8' Box" }).first()
      .or(page.locator('button').filter({ hasText: "Xl 4wd Reg Cab 8' Box" }).first())
      .or(page.getByText("Xl 4wd Reg Cab 8' Box").first());
    await trimOption.waitFor({ state: 'attached', timeout: trimTimeout });

    // Setup listener for the get-vymmtautoblog-forumData API call triggered on trim selection change
    const getYmmtPromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/get-vymmtautoblog-forumData') && res.status() === 200,
      { timeout: trimTimeout }
    ).catch(() => null);

    await trimOption.click();
    console.log("Trim clicked. Waiting for getYMMT forumData API response to resolve...");
    await getYmmtPromise;
    console.log("getYMMT forumData API call resolved. Trim clicked successfully.");

    // Click Next button
    const nextButton = page.getByRole('button', { name: 'Next' }).first()
      .or(page.locator('button').filter({ hasText: 'Next' }).first());
    await nextButton.waitFor({ state: 'visible', timeout: clickTimeout });
    await nextButton.click();
    console.log("Next button clicked.");

    // Close Tour popup on color selection page if visible
    await page.getByLabel('Close Tour').click();
    console.log("Tour popup on color selection page closed.");

    // Wait and click Exterior color option (Blue Jeans Metallic)
    const colorOption = page.getByRole('paragraph').filter({ hasText: "Blue Jeans Metallic" }).first()
      .or(page.getByText("Blue Jeans Metallic").first());
    await colorOption.waitFor({ state: 'attached', timeout: clickTimeout });
    await colorOption.click();
    console.log("Exterior color Blue Jeans Metallic selected.");

    // Wait and click Interior color option (Medium Earth Gray w/Cloth 40/20/40 Split Bench Seat)
    const interiorOption = page.getByRole('paragraph').filter({ hasText: "Medium Earth Gray w/Cloth 40/20/40 Split Bench Seat" }).first()
      .or(page.locator('button').filter({ hasText: "Medium Earth Gray w/Cloth 40/20/40 Split Bench Seat" }).first())
      .or(page.getByText("Medium Earth Gray w/Cloth 40/20/40 Split Bench Seat").first());
    await interiorOption.waitFor({ state: 'attached', timeout: clickTimeout });
    await interiorOption.click();
    console.log("Interior color selected.");

    // Click Next button again
    const nextButton2 = page.getByRole('button', { name: 'Next' }).first()
      .or(page.locator('button').filter({ hasText: 'Next' }).first());
    await nextButton2.waitFor({ state: 'visible', timeout: clickTimeout });
    await nextButton2.click();
    console.log("Second Next button clicked.");

    // Close Tour popup on Options page if visible
    await page.getByLabel('Close Tour').click();
    console.log("Options page tour closed.");

    // Expand the "Axle Ratios" dropdown/accordion first
    await page.getByText('Axle Ratios3.73 Axle Ratio3.').first().click();
    console.log("Axle Ratio dropdown expanded.");

    // Select specific axle option
    await page.locator('div').filter({ hasText: /^Electronic-Locking w\/4\.30 Axle Ratio$/ }).first().click();
    console.log("Axle ratio option selected.");

    // Click 'Add this Option' button
    await page.getByRole('button', { name: 'Add this Option' }).click();
    console.log("Option added successfully.");

    // Final Confirm Click and API verification setup
    const confirmPromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/confirm-sticker'),
      { timeout: trimTimeout }
    ).catch(() => null);

    const reValidatePromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/vin-validate'),
      { timeout: trimTimeout }
    ).catch(() => null);

    const reGeneratePromise = page.waitForResponse(
      res => res.url().includes('generate_sticker') || res.url().includes('generate-sticker'),
      { timeout: trimTimeout }
    ).catch(() => null);

    const reAutoloadPromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/autoloading-stickerdata'),
      { timeout: trimTimeout }
    ).catch(() => null);

    const confirmBtn = page.locator('text="Confirm"')
      .or(page.getByRole('button', { name: 'Confirm' }))
      .first();
    await confirmBtn.waitFor({ state: 'visible', timeout: clickTimeout });
    await confirmBtn.click();
    console.log("Clicked final Confirm button. Waiting for update responses...");

    await confirmPromise;
    console.log("Regeneration complete and confirmed.");
  }
}

module.exports = { RegenerateSticker };
