const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const { ReverseDecode, ClassicMappedSticker, ClassicUnmappedSticker } = require('../task/GenerateWindowStickers');

test.describe('Global Window Sticker Generation Flow', () => {
  test('CS-01 — Reverse Decode (motorcycle, ATV, Sticker generate)', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';
    const timeout = isSlowNetwork ? 60000 : 30000;

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Direct Navigation to Dashboard (using cached sticker session)
    console.log("Navigating directly to Dashboard...");
    await page.goto(`${actor.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Switch to Window Sticker Tab
    console.log("Switching to Window Sticker Tab...");
    const wsTab = page.getByText('Window Sticker').nth(2);
    await wsTab.waitFor({ state: 'visible', timeout: timeout });
    await wsTab.click();

    // 4. Perform Reverse Decode (Sticker generate with auto-shuffled VIN)
    await actor.attemptsTo(new ReverseDecode(null, isSlowNetwork));

    // 5. Expect Redirection to My Reports
    await expect(page).toHaveURL(/my-reports/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Window sticker reverse decode generation completed successfully.");
    await page.close();
  });

  test('CS-02 — Classic Mapped VIN Sticker Generation', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';
    const timeout = isSlowNetwork ? 60000 : 30000;

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Direct Navigation to Dashboard (using cached sticker session)
    console.log("Navigating directly to Dashboard...");
    await page.goto(`${actor.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Switch to Window Sticker Tab
    console.log("Switching to Window Sticker Tab...");
    const wsTab = page.getByText('Window Sticker').nth(2);
    await wsTab.waitFor({ state: 'visible', timeout: timeout });
    await wsTab.click();

    // 4. Perform Classic Mapped VIN Sticker Generation
    await actor.attemptsTo(new ClassicMappedSticker('228871N111628', isSlowNetwork));

    // 5. Expect Redirection to My Reports
    await expect(page).toHaveURL(/my-reports/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Classic Mapped VIN Window Sticker generation completed successfully.");
    await page.close();
  });

  test('CS-03 — Classic Unmapped VIN Sticker Generation (Dropdown Flow)', async ({ page }) => {
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';
    const timeout = isSlowNetwork ? 60000 : 30000;

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Direct Navigation to Dashboard (using cached sticker session)
    console.log("Navigating directly to Dashboard...");
    await page.goto(`${actor.baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Switch to Window Sticker Tab
    console.log("Switching to Window Sticker Tab...");
    const wsTab = page.getByText('Window Sticker').nth(2);
    await wsTab.waitFor({ state: 'visible', timeout: timeout });
    await wsTab.click();

    // 4. Perform Classic Unmapped VIN Sticker Generation (Buick Dropdown Flow)
    await actor.attemptsTo(new ClassicUnmappedSticker('245GH4156001', isSlowNetwork));

    // 5. Expect Redirection to My Reports or Classic Detail Page
    await expect(page).toHaveURL(/my-reports|classic/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Classic Unmapped VIN Window Sticker generation completed successfully.");
    await page.close();
  });
});
