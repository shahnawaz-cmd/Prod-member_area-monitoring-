const { test } = require('@playwright/test');

class CaptureApiResponses {
  constructor(apiPatterns = []) {
    this.apiPatterns = apiPatterns.length > 0 ? apiPatterns : [
      '/api-cwa/search-page',
      '/api-cwa/payment-update'
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
          console.log(`📥 Captured API Response [${pattern}]:`, JSON.stringify(body, null, 2));

          // Attach to Playwright test report
          await test.info().attach(`API Response - ${pattern}`, {
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
