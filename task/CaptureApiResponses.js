const { test } = require('@playwright/test');

class CaptureApiResponses {
  constructor(apiPatterns = []) {
    this.apiPatterns = apiPatterns.length > 0 ? apiPatterns : [
      '/api-cwa/search-page',
      '/api-cwa/payment-update',
      '/api-cwa/vin-validate',
      '/api-cwa/generate-report',
      '/api-cwa/generate_uvc_report',
      'cancel-subscription'
    ];
  }

  async performAs(actor) {
    const page = actor.page;
    const captured = {}; // To track what's been captured

    for (const pattern of this.apiPatterns) {
      console.log(`Setting up listener for: ${pattern}`);
      
      const listener = async (response) => {
        if (response.url().includes(pattern) && !captured[pattern]) {
          captured[pattern] = true; // Mark as captured
          
          const body = await response.json().catch(() => ({}));
          console.log(`📥 Intercepted and saved API Response payload for: ${pattern}`);

          // Attach to Playwright test report as separate JSON file entries
          const cleanName = pattern.replace(/^\/api-cwa\//, '').replace(/\//g, '_');
          await test.info().attach(`${cleanName}.json`, {
            body: JSON.stringify(body, null, 2),
            contentType: 'application/json',
          });

          // Remove listener after capture
          page.removeListener('response', listener);
        }
      };
      
      page.on('response', listener);
    }

    console.log("API listeners attached with report attachments (one-time capture).");
  }
}

module.exports = CaptureApiResponses;
