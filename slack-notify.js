const axios = require('axios');
const fs = require('fs');

const {
  SLACK_WEBHOOK_URL,
  GITHUB_SERVER,
  GITHUB_REPO,
  GITHUB_RUN,
  GITHUB_ACTOR,
  GITHUB_REF,
  GITHUB_EVENT,
  TEST_RESULT,
  REPORT_URL,
  BASE_URL
} = process.env;

let testSummary = '';
let passedCount = 0;
let failedCount = 0;
let flakyCount = 0;
let totalRetries = 0;

console.log('Current working directory:', process.cwd());
console.log('Checking for results.json...');
if (fs.existsSync('results.json')) {
  console.log('results.json found.');
} else {
  console.log('results.json NOT found.');
}

try {
  const results = JSON.parse(fs.readFileSync('results.json', 'utf8'));
  console.log('results.json parsed successfully.');
  
  const getAllSpecs = (suite) => {
    let specs = [];
    if (suite.specs) {
      specs.push(...suite.specs);
    }
    if (suite.suites) {
      for (const subSuite of suite.suites) {
        specs.push(...getAllSpecs(subSuite));
      }
    }
    return specs;
  };

  const allSpecs = [];
  if (results.suites) {
    for (const suite of results.suites) {
      allSpecs.push(...getAllSpecs(suite));
    }
  }

  testSummary = allSpecs.map(spec => {
    if (!spec.tests || spec.tests.length === 0) return `• ⚠️ ${spec.title} (No tests)`;
    
    // Count retries across all attempts of this test
    for (const testInstance of spec.tests) {
      if (testInstance.results) {
        totalRetries += Math.max(0, testInstance.results.length - 1);
      }
    }

    const attempts = spec.tests[0].results || [];
    const hasFailures = attempts.some(r => r.status === 'failed' || r.status === 'timedOut');
    const hasPass = attempts.some(r => r.status === 'passed');
    
    let isFlaky = false;
    let finalStatus = 'unknown';
    
    if (hasFailures && hasPass) {
      isFlaky = true;
      finalStatus = 'flaky';
    } else if (hasPass) {
      finalStatus = 'passed';
    } else if (hasFailures) {
      finalStatus = 'failed';
    } else {
      finalStatus = attempts[0]?.status || 'unknown';
    }

    let emoji = '❌';
    let suffix = '';
    
    if (isFlaky) {
      flakyCount++;
      emoji = '⚠️';
      suffix = ' *[Flaky - Passed on Retry]*';
    } else if (finalStatus === 'passed') {
      passedCount++;
      emoji = '✅';
    } else {
      failedCount++;
      emoji = '❌';
    }

    const browser = spec.tests[0].projectName || 'unknown';
    return `• ${emoji} *${spec.title}* (_${browser}_)${suffix}`;
  }).join('\n');

  if (!testSummary) {
    testSummary = 'No tests found in results.json.';
  }
  console.log('Test summary generated:', testSummary);
} catch (e) {
  console.error('Error parsing results.json:', e);
  testSummary = 'Could not parse test results.';
}

// Derive Site and Env
const site = BASE_URL ? (BASE_URL.includes('vehiclehistory') ? 'VHR' : 'Other') : 'Unknown';
const env = BASE_URL ? (BASE_URL.includes('members') ? 'Prod' : 'Dev') : 'Unknown';

const runUrl = `${GITHUB_SERVER}/${GITHUB_REPO}/actions/runs/${GITHUB_RUN}`;
const owner = GITHUB_REPO ? GITHUB_REPO.split('/')[0] : '';
const repoName = GITHUB_REPO ? GITHUB_REPO.split('/')[1] : '';
const reportUrl = REPORT_URL || ((owner && repoName) ? `https://${owner}.github.io/${repoName}/` : '');

// A run is successful if there are zero failed tests (flaky tests are allowed)
const isSuccess = failedCount === 0 && (passedCount > 0 || flakyCount > 0);
const statusEmoji = isSuccess ? '✅' : '❌';
const statusText = isSuccess ? 'Passed' : 'Failed';
const mentions = !isSuccess ? ' CC: <@U03UR6FFQKB> <@U09UE83AWGP>' : '';
const barColor = isSuccess ? '#2EB67D' : '#E01E5A'; // Slack Green or Red

const payload = {
  text: `${statusEmoji} Prod Member area monitoring (functional & Cross browser testflow)${mentions}`,
  attachments: [
    {
      color: barColor,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${statusEmoji} Prod Member Area Monitoring`,
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Status:* ${statusEmoji} *${statusText}*${mentions}\n*Total Tests:* \`${passedCount + failedCount + flakyCount}\` | *Passed:* \`${passedCount}\` | *Failed:* \`${failedCount}\` | *Flaky:* \`${flakyCount}\` | *Retries:* \`${totalRetries}\``
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Environment:* \`${env}\` (${site})\n` +
                  `*Base URL:* <${BASE_URL}|${BASE_URL || 'N/A'}>\n` +
                  `*Trigger Details:* \`${GITHUB_ACTOR || 'N/A'}\` via \`${GITHUB_EVENT || 'N/A'}\` (\`${GITHUB_REF || 'N/A'}\`)`
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Test Summary:*\n${testSummary}`
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Workflow Run 🛠️',
                emoji: true
              },
              url: runUrl,
              style: 'primary'
            },
            ...(reportUrl ? [{
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View HTML Report 📊',
                emoji: true
              },
              url: reportUrl
            }] : [])
          ]
        }
      ]
    }
  ]
};

console.log('Slack Payload:', JSON.stringify(payload, null, 2));

if (SLACK_WEBHOOK_URL) {
  // 1. Post main channel notification
  axios.post(SLACK_WEBHOOK_URL, payload)
    .then(() => {
      console.log('Slack main channel notification sent successfully.');
      
      // 2. If failed, send direct personal notifications to the member IDs
      if (!isSuccess) {
        console.log('Test failed. Distributing personal notifications...');
        const personalIds = ['U03UR6FFQKB', 'U09UE83AWGP'];
        
        for (const memberId of personalIds) {
          const personalPayload = {
            ...payload,
            channel: `@${memberId}`, // Target the user directly
            text: `⚠️ [DIRECT ALERT] Prod Member area monitoring failed!\n${mentions}`
          };
          
          axios.post(SLACK_WEBHOOK_URL, personalPayload)
            .then(() => console.log(`Direct notification sent successfully to Slack Member: ${memberId}`))
            .catch(err => console.error(`Failed to send direct notification to ${memberId}: ${err.message}`));
        }
      }
    })
    .catch(err => console.error('Error sending Slack notification:', err));
} else {
  console.log('SLACK_WEBHOOK_URL not set, skipping notification.');
}
