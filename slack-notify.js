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
  
  testSummary = results.suites.flatMap(suite => suite.specs).map(spec => {
    // Check if tests exist before accessing
    if (!spec.tests || spec.tests.length === 0) return `⚠️ ${spec.title} (No tests)`;
    const status = spec.tests[0].results[0]?.status || 'unknown';
    const browser = spec.tests[0].projectName;
    const emoji = status === 'passed' ? '✅' : '❌';
    return `${emoji} ${spec.title} (${browser})`;
  }).join('\n');
  console.log('Test summary generated:', testSummary);
} catch (e) {
  console.error('Error parsing results.json:', e);
  testSummary = 'Could not parse test results.';
}

// Derive Site and Env
const site = BASE_URL ? (BASE_URL.includes('vehiclehistory') ? 'VHR' : 'Other') : 'Unknown';
const env = BASE_URL ? (BASE_URL.includes('members') ? 'Prod' : 'Dev') : 'Unknown';

const runUrl = `${GITHUB_SERVER}/${GITHUB_REPO}/actions/runs/${GITHUB_RUN}`;
const statusEmoji = TEST_RESULT === 'success' ? '✅' : '❌';
const statusText = TEST_RESULT === 'success' ? 'Passed' : 'Failed';

const buttons = [
  {
    type: 'button',
    text: { type: 'plain_text', text: 'View Workflow Run' },
    url: runUrl
  }
];

if (REPORT_URL) {
  buttons.push({
    type: 'button',
    text: { type: 'plain_text', text: 'View HTML Report' },
    url: REPORT_URL
  });
}

const payload = {
  text: `${statusEmoji} Prod Member area monitoring (functional & Cross browser testflow) - *${statusText}*`,
  blocks: [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${statusEmoji} *Prod Member area monitoring (functional & Cross browser testflow)* - *${statusText}*`
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
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Repository:*\n${GITHUB_REPO}` },
        { type: 'mrkdwn', text: `*Branch:*\n${GITHUB_REF}` },
        { type: 'mrkdwn', text: `*Site:*\n${site}` },
        { type: 'mrkdwn', text: `*Env:*\n${env}` },
        { type: 'mrkdwn', text: `*Base URL:*\n${BASE_URL || 'N/A'}` },
        { type: 'mrkdwn', text: `*Actor:*\n${GITHUB_ACTOR}` },
        { type: 'mrkdwn', text: `*Event:*\n${GITHUB_EVENT}` }
      ]
    },
    {
      type: 'actions',
      elements: buttons
    }
  ]
};

if (SLACK_WEBHOOK_URL) {
  axios.post(SLACK_WEBHOOK_URL, payload)
    .then(() => console.log('Slack notification sent successfully.'))
    .catch(err => console.error('Error sending Slack notification:', err));
} else {
  console.log('SLACK_WEBHOOK_URL not set, skipping notification.');
}
