const { test, expect } = require('@playwright/test');
const Actor = require('../actor/Actor');
const ConfigureBaseUrl = require('../task/ConfigureBaseUrl');
const CaptureApiResponses = require('../task/CaptureApiResponses');
const FetchMotorcycleVIN = require('../task/FetchMotorcycleVIN');
const { ReverseDecode, ClassicMappedSticker, ClassicUnmappedSticker, GenerateEUSticker, GenerateSticker } = require('../task/GenerateWindowStickers');
const { RegenerateSticker } = require('../task/RegenerateWindowSticker');

test.describe('Global Window Sticker Generation Flow', () => {
  test('CS-01 — Reverse Decode (motorcycle, ATV, Sticker generate)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'sticker-mobile-safari', 'Runs on Safari only');
    test.setTimeout(300000);

    const actor = new Actor(page);
    const isSlowNetwork = process.env.SLOW_NETWORK === 'true';
    const timeout = isSlowNetwork ? 60000 : 30000;

    // 0. Setup API Monitoring
    await actor.attemptsTo(new CaptureApiResponses());

    // 1. Configure Base URL
    await actor.attemptsTo(new ConfigureBaseUrl());

    // 2. Fetch Motorcycle VIN dynamically from MongoDB
    await actor.attemptsTo(new FetchMotorcycleVIN());

    // 3. Direct Navigation to Dashboard (using cached sticker session)
    console.log("Navigating directly to Dashboard...");
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 4. Switch to Window Sticker Tab
    console.log("Switching to Window Sticker Tab...");
    const wsTab = page.getByText('Window Sticker').nth(2);
    await wsTab.waitFor({ state: 'visible', timeout: timeout });
    await wsTab.click();

    // 5. Perform Reverse Decode (Sticker generate with MongoDB fetched motorcycle VIN)
    await actor.attemptsTo(new ReverseDecode(actor.motorcycleVin, isSlowNetwork));

    // 5. Expect Redirection to My Reports
    await expect(page).toHaveURL(/my-reports?|my-report/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Window sticker reverse decode generation completed successfully.");
    await page.close();
  });

  test('CS-02 — Classic Mapped VIN Sticker Generation', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'sticker-mobile-safari', 'Runs on Safari only');
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
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Switch to Window Sticker Tab
    console.log("Switching to Window Sticker Tab...");
    const wsTab = page.getByText('Window Sticker').nth(2);
    await wsTab.waitFor({ state: 'visible', timeout: timeout });
    await wsTab.click();

    // 4. Perform Classic Mapped VIN Sticker Generation
    await actor.attemptsTo(new ClassicMappedSticker('228871N111628', isSlowNetwork));

    // 5. Expect Redirection to My Reports
    await expect(page).toHaveURL(/my-reports?|my-report/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Classic Mapped VIN Window Sticker generation completed successfully.");
    await page.close();
  });

  test('CS-03 — Classic Unmapped VIN Sticker Generation (Dropdown Flow)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'sticker-mobile-safari', 'Runs on Safari only');
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
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Switch to Window Sticker Tab
    console.log("Switching to Window Sticker Tab...");
    const wsTab = page.getByText('Window Sticker').nth(2);
    await wsTab.waitFor({ state: 'visible', timeout: timeout });
    await wsTab.click();

    // 4. Perform Classic Unmapped VIN Sticker Generation (Buick Dropdown Flow)
    await actor.attemptsTo(new ClassicUnmappedSticker('245GH4156001', isSlowNetwork));

    // 5. Expect Redirection to My Reports or Classic Detail Page
    await expect(page).toHaveURL(/my-reports?|my-report|classic/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Classic Unmapped VIN Window Sticker generation completed successfully.");
    await page.close();
  });

  test('CS-04 — EU Mapped VIN Sticker Generation', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'sticker-mobile-safari', 'Runs on Safari only');
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
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Switch to Window Sticker Tab
    console.log("Switching to Window Sticker Tab...");
    const wsTab = page.getByText('Window Sticker').nth(2);
    await wsTab.waitFor({ state: 'visible', timeout: timeout });
    await wsTab.click();

    // 4. Perform EU VIN Sticker Generation with provided VINs and randomize feature
    await actor.attemptsTo(new GenerateEUSticker(['VF1AGVYB055491691', 'WAUZZZ8P6CA083445'], isSlowNetwork));

    // 5. Expect Redirection to My Reports, Classic, Europe, or Sticker Tool Page
    await expect(page).toHaveURL(/my-reports?|my-report|classic|europe|sticker-tool/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("EU Window Sticker generation completed successfully.");
    await page.close();
  });

  test('CS-05 — Dynamic Window Sticker Generation (Multi-Trim Flow)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'sticker-desktop-chrome', 'Runs on Chrome only');
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
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Switch to Window Sticker Tab (Responsive Selector)
    console.log("Switching to Window Sticker Tab...");
    const isMobile = page.viewportSize() ? page.viewportSize().width < 768 : false;
    const wsTab = isMobile 
      ? page.getByText('Window Sticker').nth(2) 
      : page.getByText('Window Sticker').nth(1);
    await wsTab.waitFor({ state: 'visible', timeout: timeout });
    await wsTab.click();

    // 4. Perform Dynamic Window Sticker Generation (using GenerateSticker task)
    console.log("Generating initial Window Sticker...");
    await actor.attemptsTo(new GenerateSticker('1FTBF2B66HEE83884', isSlowNetwork));

    // 5. Expect Redirection to My Reports
    await expect(page).toHaveURL(/my-reports?|my-report/, { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Dynamic Window Sticker generation completed successfully.");
    await page.close();
  });

  test('CS-06 — Window Sticker Regeneration Flow', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'sticker-desktop-chrome', 'Runs on Chrome only');
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
    await page.goto(actor.dashboardUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/dashboard**', { timeout: 60000 });

    // 3. Navigate directly to My Reports
    console.log("Navigating to My Reports page...");
    await page.goto(actor.baseUrl.includes('members.vehiclehistory.report') ? `${actor.baseUrl}/members/my-reports` : `${actor.baseUrl}/my-reports`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL(url => url.pathname.includes('my-report'), { timeout: 60000 });

    // 4. Perform Sticker Regeneration Flow
    console.log("Starting Regenerate Sticker Flow...");
    await actor.attemptsTo(new RegenerateSticker(isSlowNetwork));

    // 5. Expect redirection back to my-reports after regeneration flow
    await page.waitForURL(url => url.pathname.includes('my-report'), { timeout: isSlowNetwork ? 120000 : 60000 });
    console.log("Window Sticker regeneration completed successfully.");
    await page.close();
    await page.context().close();
  });
});

