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
    if (!spec.tests || spec.tests.length === 0) return `⚠️ ${spec.title} (No tests)`;
    
    // Count retries across all attempts of this test
    for (const testInstance of spec.tests) {
      if (testInstance.results) {
        totalRetries += Math.max(0, testInstance.results.length - 1);
      }
    }

    const status = spec.tests[0].results?.[0]?.status || 'unknown';
    const browser = spec.tests[0].projectName || 'unknown';
    const emoji = status === 'passed' ? '✅' : '❌';
    if (status === 'passed') {
      passedCount++;
    } else {
      failedCount++;
    }
    return `${emoji} ${spec.title} (${browser})`;
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

const isSuccess = failedCount === 0 && passedCount > 0;
const statusEmoji = isSuccess ? '✅' : '❌';
const statusText = isSuccess ? 'Passed' : 'Failed';
const mentions = !isSuccess ? ' CC: <@U03UR6FFQKB> <@U09UE83AWGP>' : '';

const payload = {
  text: `${statusEmoji} Prod Member area monitoring (functional & Cross browser testflow)${mentions}`,
  blocks: [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${statusEmoji} Prod Member area monitoring (functional & Cross browser testflow)`,
        emoji: true
      }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Overall Status:*\n${statusEmoji} ${statusText}${mentions}` },
        { type: 'mrkdwn', text: `*Total Tests:*\n\`${passedCount + failedCount}\` (Passed: \`${passedCount}\` | Failed: \`${failedCount}\`)` },
        { type: 'mrkdwn', text: `*Retries:*\n\`${totalRetries}\`` },
        { type: 'mrkdwn', text: `*Site:*\n${site}` },
        { type: 'mrkdwn', text: `*Env:*\n${env}` },
        { type: 'mrkdwn', text: `*Base URL:*\n${BASE_URL || 'N/A'}` },
        { type: 'mrkdwn', text: `*Repository:*\n${GITHUB_REPO || 'N/A'}` },
        { type: 'mrkdwn', text: `*Branch:*\n${GITHUB_REF || 'N/A'}` },
        { type: 'mrkdwn', text: `*Actor:*\n${GITHUB_ACTOR || 'N/A'}` },
        { type: 'mrkdwn', text: `*Event:*\n${GITHUB_EVENT || 'N/A'}` }
      ]
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Test Summary:*\n${testSummary}`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Links:*\n• <${runUrl}|View Workflow Run>` + (reportUrl ? `\n• <${reportUrl}|View HTML Report>` : '')
      }
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
