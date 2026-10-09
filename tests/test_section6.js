const Parser = require('../js/parser.js');
const Analyzer = require('../js/analyzer.js');

console.log('='.repeat(70));
console.log('VERIFYING SECTION 6 CONVERSATION REQUIREMENTS VIA NODE TEST');
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

const msgs = Parser.parse(sampleChat);
const res = Analyzer.analyze(msgs, 'Bob');

// 1. The meeting changes from 2 PM to 4 PM
const syncEvent = res.items.find(i => i.title.toLowerCase().includes('sync') || i.eventKey === 'sync');
const syncCurrentTime = syncEvent && (syncEvent.currentDeadline === '4:00 PM' || syncEvent.title.includes('4:00 PM'));
const syncContext = syncEvent && syncEvent.why.includes('2:00 PM');
console.log('1. Meeting changes 2 PM -> 4 PM:', syncCurrentTime && syncContext, `(Current time: ${syncEvent ? syncEvent.currentDeadline : 'none'}, Why: ${syncEvent ? syncEvent.why : 'none'})`);

// 2. The confirmed 6 PM report deadline is retained
const reportTask = res.items.find(i => i.title.toLowerCase().includes('report'));
const reportDeadlineRetained = reportTask && reportTask.currentDeadline && reportTask.currentDeadline.includes('6:00 PM');
console.log('2. Confirmed 6 PM report deadline retained:', !!reportDeadlineRetained, `(Deadline: ${reportTask ? reportTask.currentDeadline : 'none'})`);

// 3. The requirement to include test results and screenshots is detected
const reportHasReqs = reportTask && reportTask.requirements && reportTask.requirements.some(r =>
  r.toLowerCase().includes('test results') || r.toLowerCase().includes('screenshots')
);
console.log('3. Requirement to include test results and screenshots detected:', !!reportHasReqs, `(Requirements: ${JSON.stringify(reportTask ? reportTask.requirements : [])})`);

// 4. My screenshot-upload task is detected
const uploadTask = res.items.find(i => i.title.toLowerCase().includes('screenshots') && i.isAssignedToUser);
console.log('4. My screenshot-upload task detected & assigned to user (Bob):', !!uploadTask, `(Title: "${uploadTask ? uploadTask.title : 'none'}", Assignee: ${uploadTask ? uploadTask.assignee : 'none'}, isAssignedToUser: ${uploadTask ? uploadTask.isAssignedToUser : false})`);

// 5. The cancelled UI review is identified
const cancelledReview = res.items.find(i =>
  (i.title.toLowerCase().includes('ui review') || i.title.toLowerCase().includes('review')) &&
  i.status === 'cancelled'
);
console.log('5. Cancelled UI review identified:', !!cancelledReview, `(Title: "${cancelledReview ? cancelledReview.title : 'none'}", Status: ${cancelledReview ? cancelledReview.status : 'none'})`);

// 6. The unconfirmed deadline rumour is not treated as fact
const rumourItem = res.items.find(i => i.srcText && (i.srcText.toLowerCase().includes('rumour') || i.srcText.toLowerCase().includes('rumor')));
const rumourNotFact = rumourItem && (rumourItem.priority === 'Needs Review' || rumourItem.uncertainty !== null) && rumourItem.priority !== 'Critical';
console.log('6. Unconfirmed deadline rumour not treated as fact (Needs Review / tentative):', !!rumourNotFact, `(Priority: ${rumourItem ? rumourItem.priority : 'none'}, Uncertainty: "${rumourItem ? rumourItem.uncertainty : 'none'}")`);

// 7. Casual coffee and match messages are excluded
const coffeeItems = res.items.filter(i =>
  i.srcText && (i.srcText.toLowerCase().includes('coffee') || i.srcText.toLowerCase().includes('starbucks') || i.srcText.toLowerCase().includes('latte'))
);
const matchItems = res.items.filter(i =>
  i.srcText && (i.srcText.toLowerCase().includes('match last night') || i.srcText.toLowerCase().includes('awesome match'))
);
console.log('7. Casual coffee banter excluded:', coffeeItems.length === 0);
console.log('   Casual sports match banter excluded:', matchItems.length === 0);

// Evidence check
const allEvidenceLinked = res.items.every(i => Array.isArray(i.msgs) && i.msgs.length > 0);
console.log('8. Supporting message evidence on all items:', allEvidenceLinked);

// Assert all
if (!syncCurrentTime || !syncContext) throw new Error('Meeting change verification failed');
if (!reportDeadlineRetained) throw new Error('Report deadline verification failed');
if (!reportHasReqs) throw new Error('Requirements verification failed');
if (!uploadTask) throw new Error('Screenshot upload task verification failed');
if (!cancelledReview) throw new Error('Cancelled UI review verification failed');
if (!rumourNotFact) throw new Error('Rumour handling verification failed');
if (coffeeItems.length > 0) throw new Error('Coffee banter was not excluded');
if (matchItems.length > 0) throw new Error('Match banter was not excluded');
if (!allEvidenceLinked) throw new Error('Evidence linking failed');

console.log('\n>>> ALL 7 SECTION 6 VERIFICATION CHECKS PASSED PERFECTLY! <<<\n');
