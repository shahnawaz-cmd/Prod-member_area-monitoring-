const { test } = require('@playwright/test');

class CaptureApiResponses {
  constructor(apiPatterns = []) {
    this.apiPatterns = apiPatterns.length > 0 ? apiPatterns : [
      '/api-cwa/search-page',
      '/api-cwa/payment-update',
      '/api-cwa/vin-validate',
      '/api-cwa/generate-report',
      '/api-cwa/generate_uvc_report',
      '/api-cwa/autoloading-stickerdata',
      '/api-cwa/get-vymmtautoblog-forumData',
      '/api-cwa/confirm-sticker',
      'cancel-subscription',
      'license_plate_decode',
      'generate_sticker',
      'generate-sticker',
      'classicmapping',
      'generate_classic_sticker'
    ];
  }

  async performAs(actor) {
    const page = actor.page;
    const captured = {}; // To track what's been captured

    // 1. Block non-essential resources (images, fonts, media, tracking scripts) to speed up loading
    await page.route('**/*', (route) => {
      const url = route.request().url().toLowerCase();
      const resourceType = route.request().resourceType();

      if (
        resourceType === 'image' ||
        resourceType === 'font' ||
        resourceType === 'media' ||
        url.includes('google-analytics') ||
        url.includes('googletagmanager') ||
        url.includes('hotjar') ||
        url.includes('facebook') ||
        url.includes('pixel') ||
        url.includes('mixpanel') ||
        url.includes('amplitude')
      ) {
        route.abort().catch(() => {});
      } else {
        route.continue().catch(() => {});
      }
    });
    console.log("Blocked non-essential resources (images, fonts, trackers) for speed optimization.");

    // 2. Set up AJAX API listeners
    for (const pattern of this.apiPatterns) {
      console.log(`Setting up listener for: ${pattern}`);
      
      const listener = async (response) => {
        if (page.isClosed()) return;
        if (response.url().includes(pattern) && !captured[pattern]) {
          captured[pattern] = true; // Mark as captured
          
          try {
            const body = await response.json().catch(() => ({}));
            console.log(`📥 Intercepted and saved API Response payload for: ${pattern}`);

            // Attach to Playwright test report as separate JSON file entries
            const cleanName = pattern.replace(/^\/api-cwa\//, '').replace(/\//g, '_');
            
            // Only attempt to attach if the test has not finished/failed
            if (test.info() && test.info().status === undefined) {
              await test.info().attach(`${cleanName}.json`, {
                body: JSON.stringify(body, null, 2),
                contentType: 'application/json',
              }).catch(() => {});
            }
          } catch (e) {
            console.warn(`Failed to process/attach API response for ${pattern}:`, e.message);
          } finally {
            // Remove listener after capture
            page.removeListener('response', listener);
          }
        }
      };
      
      page.on('response', listener);
    }

    console.log("API listeners attached with report attachments (one-time capture).");
  }
}

module.exports = CaptureApiResponses;
