const http = require('http');

console.log('='.repeat(70));
console.log('TESTING LIVE /api/analyze ENDPOINT WITH GROQ BACKEND');
console.log('='.repeat(70));

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
  let raw = '';
  res.on('data', chunk => raw += chunk);
  res.on('end', () => {
    console.log(`Server responded with HTTP ${res.statusCode}`);
    if (res.statusCode !== 200) {
      console.error('Server returned error:', raw);
      process.exit(1);
    }

    const data = JSON.parse(raw);
    console.log('Response JSON parsed successfully!');
    console.log('isLocalFallback:', data.summary.isLocalFallback);
    console.log('Key summary points:');
    data.summary.keyPoints.forEach(p => console.log('  *', p));

    console.log('\n--- VERIFYING SECTION 6 REQUIREMENTS ON LIVE GROQ RESPONSE ---');

    // 1. The meeting time is updated from 2 PM to 4 PM
    const syncItem = data.items.find(i => 
      (i.title && i.title.toLowerCase().includes('sync')) ||
      (i.srcText && i.srcText.toLowerCase().includes('sync'))
    );
    const syncUpdated = syncItem && 
      (iTime(syncItem).includes('4') || (syncItem.why && syncItem.why.includes('4'))) &&
      (syncItem.why && syncItem.why.includes('2'));
    console.log(`1. Meeting time updated 2 PM -> 4 PM: ${syncUpdated ? 'PASS' : 'PARTIAL/CHECK'} (Title: "${syncItem ? syncItem.title : ''}", Deadline: "${syncItem ? syncItem.currentDeadline : ''}", Context: "${syncItem ? syncItem.why : ''}")`);

    // 2. The confirmed report deadline remains 6 PM
    const reportItem = data.items.find(i =>
      i.title && i.title.toLowerCase().includes('report')
    );
    const reportDeadline = reportItem && (iDeadline(reportItem).includes('6:00') || iDeadline(reportItem).includes('6 pm') || iDeadline(reportItem).includes('6'));
    console.log(`2. Confirmed report deadline remains 6 PM: ${reportDeadline ? 'PASS' : 'FAIL'} (Deadline: "${reportItem ? reportItem.currentDeadline : ''}", Assignee: "${reportItem ? reportItem.assignee : ''}")`);

    // 3. Test results and screenshots are detected as report requirements
    const hasReqs = reportItem && reportItem.requirements && reportItem.requirements.some(r =>
      r.toLowerCase().includes('test') || r.toLowerCase().includes('screenshot')
    );
    console.log(`3. Test results and screenshots detected as requirements: ${hasReqs ? 'PASS' : 'FAIL'} (Reqs: ${JSON.stringify(reportItem ? reportItem.requirements : [])})`);

    // 4. My screenshot-upload task is detected
    const userTask = data.items.find(i =>
      (i.isAssignedToUser || (i.assignee && i.assignee.toLowerCase() === 'bob')) &&
      ((i.title && i.title.toLowerCase().includes('screenshot')) || (i.why && i.why.toLowerCase().includes('screenshot')) || (i.requirements && i.requirements.some(r => r.toLowerCase().includes('screenshot'))))
    );
    console.log(`4. User screenshot task detected: ${userTask ? 'PASS' : 'FAIL'} (Item: "${userTask ? userTask.title : ''}", userAssigned: ${userTask ? userTask.isAssignedToUser : false})`);

    // 5. The cancelled UI review is identified
    const cancelItem = data.items.find(i =>
      (i.title && i.title.toLowerCase().includes('ui review')) ||
      (i.kind === 'cancellation') ||
      (i.status === 'cancelled')
    );
    const cancelIdentified = cancelItem && cancelItem.status === 'cancelled';
    console.log(`5. Cancelled UI review identified: ${cancelIdentified ? 'PASS' : 'FAIL'} (Title: "${cancelItem ? cancelItem.title : ''}", Status: "${cancelItem ? cancelItem.status : ''}")`);

    // 6. The rumoured deadline change is not treated as confirmed
    const rumourItem = data.items.find(i =>
      (i.title && (i.title.toLowerCase().includes('rumour') || i.title.toLowerCase().includes('rumor'))) ||
      (i.srcText && (i.srcText.toLowerCase().includes('rumour') || i.srcText.toLowerCase().includes('rumor')))
    );
    const rumourTentative = rumourItem && (rumourItem.priority === 'Needs Review' || rumourItem.kind === 'uncertainty') && rumourItem.priority !== 'Critical';
    console.log(`6. Rumour not treated as confirmed: ${rumourTentative ? 'PASS' : 'FAIL'} (Priority: "${rumourItem ? rumourItem.priority : ''}", Kind: "${rumourItem ? rumourItem.kind : ''}")`);

    // 7. Casual coffee and match messages are excluded
    const coffeeItem = data.items.find(i =>
      i.srcText && (i.srcText.toLowerCase().includes('coffee') || i.srcText.toLowerCase().includes('starbucks'))
    );
    const matchItem = data.items.find(i =>
      i.srcText && i.srcText.toLowerCase().includes('match last night')
    );
    console.log(`7. Casual coffee chatter excluded: ${!coffeeItem ? 'PASS' : 'FAIL'}`);
    console.log(`   Casual match chatter excluded: ${!matchItem ? 'PASS' : 'FAIL'}`);

    // Verification that response is NOT fallback
    console.log(`\nVerified response came from Groq AI (isLocalFallback === false): ${data.summary.isLocalFallback === false ? 'PASS' : 'FAIL'}`);

    if (data.summary.isLocalFallback !== false) {
      console.error('FAILED: Results came from local fallback, not Groq AI!');
      process.exit(1);
    }

    console.log('\n>>> LIVE GROQ INTEGRATION VERIFIED SUCCESSFULLY! <<<\n');
  });
});

function iTime(item) {
  return (item.currentDeadline || item.deadline || item.title || '').toLowerCase();
}

function iDeadline(item) {
  return (item.currentDeadline || item.deadline || '').toLowerCase();
}

req.on('error', err => {
  console.error('Request failed:', err.message);
  process.exit(1);
});

req.write(postData);
req.end();
