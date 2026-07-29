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
const isSuccess = failedCount === 0 && passedCount > 0;
const statusEmoji = isSuccess ? '✅' : '❌';
const statusText = isSuccess ? 'Passed' : 'Failed';

const payload = {
  text: `${statusEmoji} Prod Member area monitoring (functional & Cross browser testflow)`,
  blocks: [
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Status:*\nPassed: \`${passedCount}\` | Failed: \`${failedCount}\`` },
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
        text: `*Links:*\n• <${runUrl}|View Workflow Run>` + (REPORT_URL ? `\n• <${REPORT_URL}|View HTML Report>` : '')
      }
    }
  ]
};

console.log('Slack Payload:', JSON.stringify(payload, null, 2));

if (SLACK_WEBHOOK_URL) {
  axios.post(SLACK_WEBHOOK_URL, payload)
    .then(() => console.log('Slack notification sent successfully.'))
    .catch(err => console.error('Error sending Slack notification:', err));
} else {
  console.log('SLACK_WEBHOOK_URL not set, skipping notification.');
}
