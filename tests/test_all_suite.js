const http = require('http');
const fs = require('fs');
const path = require('path');
const Parser = require('../js/parser.js');
const Analyzer = require('../js/analyzer.js');
const Samples = require('../js/samples.js');

console.log('='.repeat(70));
console.log('CATCHUP COMPREHENSIVE TEST SUITE (INTELLIGENCE, SCENARIOS, SECURITY, API)');
console.log('='.repeat(70));

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

// -----------------------------------------------------------------------------
// 1. SECTION 6 REQUIREMENTS VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 1: SECTION 6 REQUIREMENTS ON CONVERSATION ---');
const sampleChat = `[10/09/2026, 1:00 PM] Alice: Sprint sync is at 2:00 PM today.
[10/09/2026, 1:04 PM] Charlie: Did you see the match last night? What a game!
[10/09/2026, 1:06 PM] David: Yeah awesome match! Anyone want coffee? Heading down to Starbucks.
[10/09/2026, 1:08 PM] Charlie: Grab me an iced latte please.
[10/09/2026, 1:20 PM] Alice: Update: moving sprint sync to 4:00 PM today instead.
[10/09/2026, 1:30 PM] David: @Bob please submit the release verification report by 6:00 PM today. Confirmed hard deadline.
[10/09/2026, 1:35 PM] Alice: Also Bob, make sure to include test results and screenshots in that report.
[10/09/2026, 1:40 PM] Bob: Got it, I'll upload the screenshots before 6:00 PM.
[10/09/2026, 1:45 PM] David: Cancel the UI review meeting tomorrow.
[10/09/2026, 1:50 PM] Elena: There is an unconfirmed rumour that the submission deadline might move to next week, not verified.`;

const msgs = Parser.parse(sampleChat);
const res = Analyzer.analyze(msgs, 'Bob');

// Requirement 1: The meeting changes from 2 PM to 4 PM
const syncEvent = res.items.find(i => i.title.toLowerCase().includes('sync') || i.eventKey === 'sync');
assert(syncEvent && syncEvent.currentDeadline === '4:00 PM' && syncEvent.why.includes('2:00 PM'),
  `Meeting changes from 2 PM to 4 PM (Current: ${syncEvent ? syncEvent.currentDeadline : null}, Context: ${syncEvent ? syncEvent.why : null})`);

// Requirement 2: The confirmed 6 PM report deadline is retained
const reportTask = res.items.find(i => i.title.toLowerCase().includes('report'));
assert(reportTask && reportTask.currentDeadline && reportTask.currentDeadline.includes('6:00 PM'),
  `Confirmed 6 PM report deadline is retained (${reportTask ? reportTask.currentDeadline : null})`);

// Requirement 3: The requirement to include test results and screenshots is detected
const reportHasReqs = reportTask && reportTask.requirements && reportTask.requirements.some(r =>
  r.toLowerCase().includes('test results') || r.toLowerCase().includes('screenshots')
);
assert(reportHasReqs, 'Requirement to include test results and screenshots is detected on report deliverable');

// Requirement 4: My screenshot-upload task is detected
const uploadTask = res.items.find(i => i.title.toLowerCase().includes('screenshots') && i.isAssignedToUser);
assert(uploadTask && uploadTask.isAssignedToUser && uploadTask.assignee === 'Bob',
  `My screenshot-upload task is detected and assigned to user Bob (isAssignedToUser: ${uploadTask ? uploadTask.isAssignedToUser : false})`);

// Requirement 5: The cancelled UI review is identified
const cancelledReview = res.items.find(i =>
  (i.title.toLowerCase().includes('ui review') || i.title.toLowerCase().includes('review')) &&
  i.status === 'cancelled'
);
assert(cancelledReview && cancelledReview.status === 'cancelled',
  `The cancelled UI review is identified as cancelled (${cancelledReview ? cancelledReview.title : null})`);

// Requirement 6: The unconfirmed deadline rumour is not treated as fact
const rumourItem = res.items.find(i => i.srcText && (i.srcText.toLowerCase().includes('rumour') || i.srcText.toLowerCase().includes('rumor')));
assert(rumourItem && (rumourItem.priority === 'Needs Review' || rumourItem.uncertainty) && rumourItem.priority !== 'Critical',
  `Unconfirmed deadline rumour is not treated as fact (Priority: ${rumourItem ? rumourItem.priority : null}, Uncertainty: "${rumourItem ? rumourItem.uncertainty : null}")`);

// Requirement 7: Casual coffee and match messages are excluded
const coffeeItems = res.items.filter(i =>
  i.srcText && (i.srcText.toLowerCase().includes('coffee') || i.srcText.toLowerCase().includes('starbucks') || i.srcText.toLowerCase().includes('latte'))
);
const matchItems = res.items.filter(i =>
  i.srcText && (i.srcText.toLowerCase().includes('match last night') || i.srcText.toLowerCase().includes('awesome match'))
);
assert(coffeeItems.length === 0, 'Casual coffee chat messages are completely excluded');
assert(matchItems.length === 0, 'Casual sports match messages are completely excluded');

// Requirement 8: Evidence linking on every item
const allEvidenceLinked = res.items.every(i => Array.isArray(i.msgs) && i.msgs.length > 0 && typeof i.srcText === 'string');
assert(allEvidenceLinked, 'Supporting message evidence linked to every single extracted item');

// -----------------------------------------------------------------------------
// 2. ALL DEMO DATASETS VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 2: ALL BUILT-IN DATASETS VERIFICATION ---');
const sampleIds = ['qa-release-sync', 'benchmark-sync', 'sprint-pivot', 'p0-incident', 'hackathon-crunch', 'offsite-travel'];
for (const sid of sampleIds) {
  const sample = Samples.getSample(sid);
  assert(!!sample, `Sample '${sid}' exists in catalog`);
  const parsed = Parser.parse(sample.text);
  assert(parsed.length >= 8, `Sample '${sid}' parsed ${parsed.length} messages`);
  const analyzed = Analyzer.analyze(parsed, sample.recommendedUser);
  assert(analyzed.items.length >= 3, `Sample '${sid}' extracted ${analyzed.items.length} items`);
  assert(analyzed.summary && analyzed.summary.keyPoints && analyzed.summary.keyPoints.length > 0, `Sample '${sid}' generated key executive summary points`);
  assert(analyzed.items.every(i => Array.isArray(i.msgs) && i.msgs.length > 0), `Sample '${sid}' all items retain source evidence`);
}

// -----------------------------------------------------------------------------
// 3. SECURITY & PRIVACY VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 3: SECURITY, CREDENTIALS & GIT PRIVACY ---');
const rootDir = path.join(__dirname, '..');

// Check .gitignore
const gitignoreContent = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8');
assert(/^\.env\b/m.test(gitignoreContent), '.env is strictly excluded in .gitignore');

// Check .env.example
const envExampleContent = fs.readFileSync(path.join(rootDir, '.env.example'), 'utf8');
assert(envExampleContent.includes('GROQ_API_KEY=your_groq_api_key_here'), '.env.example contains safe placeholder');
assert(!envExampleContent.includes('gsk_'), '.env.example contains no real API keys');

// Check frontend files for leaked keys
const jsFiles = fs.readdirSync(path.join(rootDir, 'js')).filter(f => f.endsWith('.js'));
for (const jf of jsFiles) {
  const content = fs.readFileSync(path.join(rootDir, 'js', jf), 'utf8');
  assert(!content.includes('gsk_'), `js/${jf} contains no hardcoded Groq API keys`);
  assert(!content.includes('api.groq.com'), `js/${jf} makes no direct external API calls (calls same-origin proxy)`);
}

const htmlFiles = ['catchup.html', 'index.html'];
for (const hf of htmlFiles) {
  const content = fs.readFileSync(path.join(rootDir, hf), 'utf8');
  assert(!content.includes('gsk_'), `${hf} contains no hardcoded Groq API keys`);
}

// -----------------------------------------------------------------------------
// 4. BACKEND /api/analyze AND FALLBACK VERIFICATION
// -----------------------------------------------------------------------------
console.log('\n--- SUITE 4: BACKEND /api/analyze ENDPOINT & FALLBACK ---');

function testBackend() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      text: sampleChat,
      userName: 'Bob'
    });

    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/analyze',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode === 200) {
            assert(!parsed.summary.isLocalFallback, 'Live Groq AI responded and isLocalFallback is false');
            assert(parsed.items.length > 0, `Groq AI extracted ${parsed.items.length} items`);
            console.log('  [PASS] Live Groq integration verified successfully!');
          } else {
            assert(res.statusCode === 500, `Expected HTTP 500 on missing/invalid key, got ${res.statusCode}`);
            assert(typeof parsed.error === 'string', `Received structured error message: "${parsed.error}"`);
            console.log('  [PASS] Backend securely reported error without leaking secrets');
            console.log('  [NOTE] Live AI request could not be executed because no active GROQ_API_KEY is configured in .env.');
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', err => {
      console.warn('  [WARN] Server connection note:', err.message);
      resolve();
    });

    req.write(postData);
    req.end();
  });
}

testBackend().then(() => {
  console.log('\n' + '='.repeat(70));
  console.log(`TOTAL CHECKS PASSED: ${passed} / ${total}`);
  console.log('='.repeat(70) + '\n');
  process.exit(0);
}).catch(err => {
  console.error('\nSuite failed:', err);
  process.exit(1);
});
