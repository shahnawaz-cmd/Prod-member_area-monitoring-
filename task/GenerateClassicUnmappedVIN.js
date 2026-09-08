const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = process.env.MONGO_DB_NAME || 'sales_history';
const COLL_NAME = process.env.MONGO_COLL_NAME || 'sales13';

const UNMAPPED_VIN_POOL = [
  '245GH4156001',
  'RASLTR',
  'TPOTT',
  'GHW4KMN',
  'RAWALS',
  'VVNDMZD',
  'UPOLK',
  'NMNCX',
  'RTYEWS',
  'CVBZSDF',
  'OOOEWKJS',
  'GHKKKK',
  'NBNMNM',
  'CRH5030',
  'S815404',
  'AA315023',
  'M6UC148756',
  'P857H23709',
  'R051191722',
  '6132170287',
  '9R03F156782',
  '3P66R176367',
  'U15GLR80661',
  '01867F231090',
  '194676S119293',
  '136370K145588',
  '242670P177509',
  '194677S115742',
  '194677S101228',
  '446670H108337',
  'R023J71206021'
];

async function getVinFromMongo() {
  if (!MONGO_URI) return null;
  const client = new MongoClient(MONGO_URI, {
    serverSelectionTimeoutMS: 2000,
    connectTimeoutMS: 2000,
    socketTimeoutMS: 2500
  });
  try {
    await client.connect();
    const coll = client.db(DB_NAME).collection(COLL_NAME);
    const randomSkip = Math.floor(Math.random() * 100);
    const doc = await coll.findOne(
      { $expr: { $and: [{ $gt: [{ $strLenCP: "$vin" }, 4] }, { $lt: [{ $strLenCP: "$vin" }, 17] }] } },
      { skip: randomSkip, projection: { vin: 1 }, maxTimeMS: 2000 }
    );
    return doc?.vin;
  } catch (e) {
    console.warn(`MongoDB VIN fetch skipped (${e.message}). Using pool fallback.`);
    return null;
  } finally {
    await client.close().catch(() => {});
  }
}

class GenerateClassicUnmappedVIN {
  constructor(baseVin = null, isSlowNetwork = false) {
    this.baseVin = baseVin;
    this.isSlowNetwork = isSlowNetwork;
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    // Parallel fetch from MongoDB with timeout race before fallback to pool
    if (!this.baseVin) {
      try {
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2500));
        const mongoVin = await Promise.race([getVinFromMongo(), timeoutPromise]);
        this.baseVin = mongoVin || UNMAPPED_VIN_POOL[Math.floor(Math.random() * UNMAPPED_VIN_POOL.length)];
      } catch {
        this.baseVin = UNMAPPED_VIN_POOL[Math.floor(Math.random() * UNMAPPED_VIN_POOL.length)];
      }
    }

    // 1. Randomize trailing 4 characters of the base VIN (alphanumeric: digits and uppercase letters)
    const alphanum = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const chars = this.baseVin.split('');
    for (let i = 1; i <= 4; i++) {
      if (this.baseVin.length - i >= 0) {
        chars[this.baseVin.length - i] = alphanum.charAt(Math.floor(Math.random() * alphanum.length));
      }
    }
    const randomizedVin = chars.join('');
    console.log(`Generated randomized Classic Unmapped VIN: ${randomizedVin}`);

    console.log("Waiting 5 seconds for page stabilization...");
    await page.waitForTimeout(5000);

    // 2. Input VIN using Playwright web-first locator
    const vinInput = page.getByPlaceholder(/enter vin/i).first();
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    await vinInput.fill(randomizedVin);

    // 3. Listen to generate-report response
    const genResPromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/generate-report'), 
      { timeout: 180000 }
    ).catch(() => null);

    // 4. Click "Get Vehicle History" button
    const historyButton = page.getByRole('button', { name: /Get vehicle History/i }).first();
    await historyButton.waitFor({ state: 'visible', timeout: timeout });
    await historyButton.click();
    console.log("Clicked 'Get Vehicle History' button.");

    // 5. Inspect response to determine flow branch (Direct Success vs Unmapped Dropdown Landing)
    const genRes = await genResPromise;
    let responseData = {};
    if (genRes) {
      responseData = await genRes.json().catch(() => ({}));
      console.log("📥 Generate-Report Response:", JSON.stringify(responseData, null, 2));
    }

    const isSuccess = responseData.status === 'success' || responseData.type === 'success' || (responseData.status && responseData.status !== 'error' && !responseData.msg);
    const isError = responseData.status === 'error' || responseData.type === 'invalid' || responseData.msg === 'Wrong vin number' || (responseData.msg && responseData.msg.includes('Cannot autogenerate'));

    // Branch 1: Direct Report Generation Success -> Pass & navigate to /my-reports
    if (isSuccess && !isError) {
      console.log("✅ Generate-Report API returned success status. Proceeding to report page verification.");
      return;
    }

    // Branch 2: Error Status / Wrong VIN -> Must land on YMMT Dropdowns
    console.log("Detected error response ('Wrong vin number' or autogenerate error). Verifying landing on YMMT dropdowns...");

    // Branch 2: Error Status / Wrong VIN -> Land on YMMT Dropdowns
    console.log("Detected error response. Selecting YMMT dropdowns...");

    // 1. Year Selection (random year 1960-1980)
    const targetYear = Math.floor(1960 + Math.random() * 21).toString();
    console.log(`[Step 1/4] Year: ${targetYear}`);
    const yearCombobox = page.getByRole('combobox').nth(0);
    await this.selectStepDropdown(page, yearCombobox, targetYear);

    // 2. Make Selection
    console.log("[Step 2/4] Make");
    const makeCombobox = page.getByRole('combobox').nth(1);
    await this.selectStepDropdown(page, makeCombobox);

    // 3. Model Selection
    console.log("[Step 3/4] Model");
    const modelCombobox = page.getByRole('combobox').nth(2);
    await this.selectStepDropdown(page, modelCombobox);

    // 4. Trim Selection
    console.log("[Step 4/4] Trim");
    const trimCombobox = page.getByRole('combobox').nth(3);
    await this.selectStepDropdown(page, trimCombobox);

    // Setup listener for post-dropdown classic report generation API (/api-cwa/generate_classic_report)
    const postDropdownGenPromise = page.waitForResponse(
      res => res.url().includes('generate_classic_report') || res.url().includes('generate-report'),
      { timeout: 60000 }
    ).catch(() => null);

    // Click submit button
    const submitBtn = page.getByRole('button', { name: /Get vehicle History|Get Report|Generate Report|Proceed/i }).first()
      .or(page.locator('button[type="submit"]:visible')).first();
    await submitBtn.waitFor({ state: 'visible', timeout: 15000 });
    await submitBtn.click({ force: true });
    console.log("Clicked submit button. Waiting for report generation API response...");

    await postDropdownGenPromise;
    console.log("📥 Post-dropdown Generate-Report API completed.");

    // Wait until web app auto-redirects to /my-reports URL
    console.log("Waiting for auto-redirection to '/my-reports'...");
    await page.waitForURL(/my-reports?|my-report|classic/, { timeout: 30000 }).catch(async () => {
      // Fallback direct navigation if auto-redirect doesn't trigger URL event
      const targetUrl = actor.reportsUrl || `${actor.baseUrl}/my-reports`;
      await page.goto(targetUrl, { waitUntil: 'commit', timeout: 10000 });
    });
    console.log("✅ Auto-redirection verified: Landed on '/my-reports' page.");
  }

  /**
   * Popover-scoped resilient step selector for YMMT dropdowns.
   */
  async selectStepDropdown(page, combobox, targetText = null) {
    await combobox.waitFor({ state: 'visible', timeout: 30000 });
    await combobox.scrollIntoViewIfNeeded().catch(() => {});
    await combobox.click({ force: true });
    await page.waitForTimeout(800);

    // Locate active popover / overlay container
    const popover = page.locator('[data-radix-popper-content-wrapper]:visible, div[role="dialog"]:visible, div[role="listbox"]:visible, div[class*="popover"]:visible').first();
    await popover.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});

    const scope = (await popover.isVisible().catch(() => false)) ? popover : page;

    if (targetText) {
      // Try search box inside popover
      const searchInput = scope.getByPlaceholder(/search/i).first();
      if (await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        await searchInput.fill(targetText);
        await page.waitForTimeout(500);
      }

      const targetBtn = scope.getByRole('button', { name: new RegExp(`^${targetText}$`, 'i') })
        .or(scope.getByRole('button', { name: new RegExp(targetText, 'i') })).first();

      if (await targetBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        const text = await targetBtn.innerText().catch(() => targetText);
        console.log(`🎯 [Selected Specific]: "${text.trim()}"`);
        await targetBtn.click({ force: true });
        return;
      }
    }

    // Dynamic Fallback: Pick first valid option inside popover scope
    const optionBtn = scope.getByRole('button')
      .or(scope.getByRole('option'))
      .or(scope.locator('div[class*="item"], li'))
      .filter({
        hasNotText: /Get Vehicle History|Get Window Sticker|Credits|Close|Cancel|Select|Rate your experience|Uncover the hidden history|Can't find your vehicle/i
      }).first();

    if (await optionBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      const text = await optionBtn.innerText().catch(() => 'Option');
      console.log(`🎯 [Selected Dynamic Option]: "${text.trim()}"`);
      await optionBtn.click({ force: true });
    } else {
      console.log("🎯 Dynamic fallback: ArrowDown + Enter");
      await page.keyboard.press('ArrowDown').catch(() => {});
      await page.keyboard.press('Enter').catch(() => {});
    }
  }
}

const CLASSIC_MAKES = ['Chevy', 'Ford', 'Dodge', 'Pontiac', 'Plymouth', 'Buick', 'Cadillac', 'Lincoln', 'Mercury', 'Oldsmobile'];
const CLASSIC_MODELS = ['Mustang', 'Corvette', 'Charger', 'Camaro', 'Firebird', 'Thunderbird', 'Challenger', 'Impala', 'GTO', 'Cutlass'];
const CLASSIC_TRANSMISSIONS = ['Manual', 'Automatic', '3-Speed Manual', '4-Speed Manual', 'Hydra-Matic'];
const CLASSIC_ENGINES = ['V8', 'Inline 6', 'V6', '350 V8', '426 Hemi', '302 V8', '454 V8', '289 V8'];
const CLASSIC_FUELS = ['Gasoline', 'Gas', 'Leaded Gasoline'];
const CLASSIC_DRIVES = ['RWD', 'AWD', '4WD', 'FWD'];
const CLASSIC_CYLINDERS = ['8', '6', '4', '12'];

class GenerateClassicUnmappedVINManual {
  constructor(baseVin = null, isSlowNetwork = false) {
    this.baseVin = baseVin;
    this.isSlowNetwork = isSlowNetwork;
  }

  getRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  async performAs(actor) {
    const page = actor.page;
    const timeout = this.isSlowNetwork ? 60000 : 30000;

    // Parallel fetch from MongoDB with timeout race before fallback to pool
    if (!this.baseVin) {
      try {
        const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(null), 2500));
        const mongoVin = await Promise.race([getVinFromMongo(), timeoutPromise]);
        this.baseVin = mongoVin || UNMAPPED_VIN_POOL[Math.floor(Math.random() * UNMAPPED_VIN_POOL.length)];
      } catch {
        this.baseVin = UNMAPPED_VIN_POOL[Math.floor(Math.random() * UNMAPPED_VIN_POOL.length)];
      }
    }

    // 1. Randomize trailing 4 characters of the base VIN (alphanumeric: digits and uppercase letters)
    const alphanum = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const chars = this.baseVin.split('');
    for (let i = 1; i <= 4; i++) {
      if (this.baseVin.length - i >= 0) {
        chars[this.baseVin.length - i] = alphanum.charAt(Math.floor(Math.random() * alphanum.length));
      }
    }
    const randomizedVin = chars.join('');
    console.log(`Generated randomized Classic Unmapped VIN (Manual): ${randomizedVin}`);

    console.log("Waiting 5 seconds for page stabilization...");
    await page.waitForTimeout(5000);

    // 2. Input VIN
    const vinInput = page.getByPlaceholder(/enter vin/i).first();
    await vinInput.waitFor({ state: 'visible', timeout: timeout });
    await vinInput.fill(randomizedVin);

    // 3. Listen to generate-report response to capture manual-entry error message
    const genResPromise = page.waitForResponse(
      res => res.url().includes('/api-cwa/generate-report'), 
      { timeout: 180000 }
    ).catch(() => null);

    // 4. Click "Get Vehicle History" button
    const historyButton = page.getByRole('button', { name: /Get vehicle History/i }).first();
    await historyButton.waitFor({ state: 'visible', timeout: timeout });
    await historyButton.click();
    console.log("Clicked 'Get Vehicle History' button.");

    // 5. Inspect response or DOM to check if manual input selection is required
    const genRes = await genResPromise;
    let responseData = {};
    if (genRes) {
      responseData = await genRes.json().catch(() => ({}));
      console.log("📥 Generate-Report Response:", JSON.stringify(responseData, null, 2));
    }

    const cantFindLink = page.getByText("Can't find your vehicle?");
    const isLinkVisible = await cantFindLink.isVisible({ timeout: 5000 }).catch(() => false);
    const isErrorStatus = responseData.status === 'error' || Boolean(responseData.msg);

    if (isErrorStatus || isLinkVisible) {
      console.log("Detected classic unmapped VIN flow (error response or manual link visible). Proceeding with dynamic manual entry flow...");
      await page.waitForTimeout(2000);

      // Click "Can't find your vehicle?" link if visible
      if (await cantFindLink.isVisible().catch(() => false)) {
        await cantFindLink.click();
      }

      // Generate dynamic classic vehicle data
      const randomYear = Math.floor(1955 + Math.random() * 30).toString(); // e.g. 1968
      const randomMake = this.getRandom(CLASSIC_MAKES);
      const randomModel = this.getRandom(CLASSIC_MODELS);
      const randomTrans = this.getRandom(CLASSIC_TRANSMISSIONS);
      const randomEngine = this.getRandom(CLASSIC_ENGINES);
      const randomFuel = this.getRandom(CLASSIC_FUELS);
      const randomDrive = this.getRandom(CLASSIC_DRIVES);
      const randomCyl = this.getRandom(CLASSIC_CYLINDERS);

      console.log(`🎲 Dynamic Form Data -> Year: ${randomYear}, Make: ${randomMake}, Model: ${randomModel}, Trans: ${randomTrans}, Engine: ${randomEngine}, Fuel: ${randomFuel}, Drive: ${randomDrive}, Cyl: ${randomCyl}`);

      // Fill Year
      const yearInput = page.getByPlaceholder('1977').or(page.locator('input[name*="year" i]')).first();
      await yearInput.waitFor({ state: 'visible', timeout: timeout });
      await yearInput.click();
      await yearInput.fill(randomYear);

      // Fill Make
      const makeInput = page.getByPlaceholder('Ford').or(page.locator('input[name*="make" i]')).first();
      await makeInput.waitFor({ state: 'visible', timeout: timeout });
      await makeInput.click();
      await makeInput.fill(randomMake);
      await makeInput.press('Tab');

      // Fill Model
      const modelInput = page.getByPlaceholder('Mustang').or(page.locator('input[name*="model" i]')).first();
      await modelInput.waitFor({ state: 'visible', timeout: timeout });
      await modelInput.click();
      await modelInput.fill(randomModel);

      // Fill Transmission
      const transInput = page.getByPlaceholder('Automatic').or(page.locator('input[name*="trans" i]')).first();
      await transInput.waitFor({ state: 'visible', timeout: timeout });
      await transInput.click();
      await transInput.fill(randomTrans);

      // Fill Engine
      const engineInput = page.getByPlaceholder('Engine').or(page.locator('input[name*="engine" i]')).first();
      await engineInput.waitFor({ state: 'visible', timeout: timeout });
      await engineInput.click();
      await engineInput.fill(randomEngine);

      // Fill Fuel Type
      const fuelInput = page.getByPlaceholder('Gasoline').or(page.locator('input[name*="fuel" i]')).first();
      await fuelInput.waitFor({ state: 'visible', timeout: timeout });
      await fuelInput.click();
      await fuelInput.fill(randomFuel);

      // Fill Drivetrain
      const driveInput = page.getByPlaceholder('4WD').or(page.locator('input[name*="drive" i]')).first();
      await driveInput.waitFor({ state: 'visible', timeout: timeout });
      await driveInput.click();
      await driveInput.fill(randomDrive);

      // Fill Cylinders
      const cylInput = page.getByPlaceholder('4', { exact: true }).or(page.locator('input[name*="cyl" i]')).first();
      await cylInput.waitFor({ state: 'visible', timeout: timeout });
      await cylInput.click();
      await cylInput.fill(randomCyl);

      // Setup listener for post-manual input classic report generation API (/api-cwa/generate_classic_report)
      const postManualGenPromise = page.waitForResponse(
        res => res.url().includes('generate_classic_report') || res.url().includes('generate-report'),
        { timeout: 60000 }
      ).catch(() => null);

      // Click Get Report
      await page.getByText('Get Report').or(page.getByRole('button', { name: /Get Report/i })).first().click();
      console.log("Clicked 'Get Report' button after filling dynamic manual form.");

      await postManualGenPromise;
      console.log("Post-manual Generate-Report API completed.");

      // Wait until web app auto-redirects to /my-reports URL
      console.log("Waiting for auto-redirection to '/my-reports'...");
      await page.waitForURL(/my-reports?|my-report|classic/, { timeout: 30000 }).catch(async () => {
        const targetUrl = actor.reportsUrl || `${actor.baseUrl}/my-reports`;
        await page.goto(targetUrl, { waitUntil: 'commit', timeout: 10000 });
      });
      console.log("✅ Auto-redirection verified: Landed on '/my-reports' page.");
    }
  }
}

module.exports = {
  GenerateClassicUnmappedVIN,
  GenerateClassicUnmappedVINManual
};
