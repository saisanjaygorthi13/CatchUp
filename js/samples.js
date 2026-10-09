/**
 * CatchUp — Demo Scenarios & Test Datasets
 * Clean, realistic conversational datasets exhibiting:
 * - Changed meeting times
 * - Connected task requirements & deadlines
 * - Cancellations & superseded decisions
 * - Genuinely uncertain deadlines
 * - Irrelevant coffee chat & small talk (filtered out)
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChatSamples = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const SAMPLES = [
    {
      id: 'qa-release-sync',
      title: 'QA Deliverables & Release Sync',
      tagline: 'Rescheduled 2 PM to 4 PM sync, 6 PM report deadline, test results & screenshots, cancelled UI review, deadline rumour, coffee & match banter',
      recommendedUser: 'Bob',
      text: `[10/09/2026, 1:00 PM] Alice: Sprint sync is at 2:00 PM today.
[10/09/2026, 1:04 PM] Charlie: Did you see the match last night? What a game!
[10/09/2026, 1:06 PM] David: Yeah awesome match! Anyone want coffee? Heading down to Starbucks.
[10/09/2026, 1:08 PM] Charlie: Grab me an iced latte please.
[10/09/2026, 1:20 PM] Alice: Update: moving sprint sync to 4:00 PM today instead.
[10/09/2026, 1:30 PM] David: @Bob please submit the release verification report by 6:00 PM today. Confirmed hard deadline.
[10/09/2026, 1:35 PM] Alice: Also Bob, make sure to include test results and screenshots in that report.
[10/09/2026, 1:40 PM] Bob: Got it, I'll upload the screenshots before 6:00 PM.
[10/09/2026, 1:45 PM] David: Cancel the UI review meeting tomorrow.
[10/09/2026, 1:50 PM] Elena: There is an unconfirmed rumour that the submission deadline might move to next week, not verified.`
    },
    {
      id: 'benchmark-sync',
      title: 'Planning Sync & QA Deliverables',
      tagline: 'Changed meeting, report deadline, connected test results, cancellation, tentative audit, coffee banter',
      recommendedUser: 'Bob',
      text: `[10/09/2026, 9:00 AM] Alice: Morning team! Planning sync is at 10:00 AM today.
[10/09/2026, 9:04 AM] Charlie: Anyone want coffee? I'm heading down to Starbucks.
[10/09/2026, 9:06 AM] David: Grab me an iced caramel latte please!
[10/09/2026, 9:08 AM] Charlie: Sure thing, back in 15 mins.
[10/09/2026, 9:20 AM] Alice: Update: moving planning sync to 11:00 AM instead.
[10/09/2026, 9:30 AM] David: @Bob please submit the quarterly QA report by 6:00 PM today.
[10/09/2026, 9:45 AM] Alice: Also Bob, make sure to include the automated test results in that report.
[10/09/2026, 10:00 AM] David: Never mind the demo recording, cancel the demo recording.
[10/09/2026, 10:15 AM] Elena: The infrastructure audit deadline is tentative, maybe next Wednesday or Friday.
[10/09/2026, 10:20 AM] Bob: Got it, I'll have the QA report with test results ready before 6:00 PM.`
    },
    {
      id: 'sprint-pivot',
      title: 'Product Scope & Dinner Pivot',
      tagline: 'Rescheduled sync 2×, venue change, cancelled demo slides, urgent 5 PM deck',
      recommendedUser: 'Dana',
      text: `[10/08/2026, 9:02 AM] Priya: Morning team! Product sync is at 3 PM today in Room B.
[10/08/2026, 9:05 AM] Marcus: Got it. @Dana can you send the Q3 deck to the client by 5 PM today?
[10/08/2026, 9:07 AM] Dana: I'll send the deck by 5 PM. Need final numbers from @Sam first.
[10/08/2026, 9:15 AM] Sam: Numbers will be ready by noon.
[10/08/2026, 10:30 AM] Priya: Heads up, the product sync is moved to 4 PM.
[10/08/2026, 10:41 AM] Marcus: Where are we hosting the offsite dinner next week?
[10/08/2026, 10:44 AM] Priya: Let's go with Olive Garden for the offsite dinner.
[10/08/2026, 11:02 AM] Sam: I'll book the table for 12 people by Friday.
[10/08/2026, 11:20 AM] Dana: Can someone confirm the client's budget approval?
[10/08/2026, 12:10 PM] Priya: Update: product sync pushed again, now at 4:30 PM. Same room as before.
[10/08/2026, 12:30 PM] Marcus: Actually let's go with Sushi Zen instead of Olive Garden for the offsite dinner. Olive Garden is full.
[10/08/2026, 12:32 PM] Sam: I'll rebook the dinner table at Sushi Zen by Friday.
[10/08/2026, 1:05 PM] Marcus: @Priya please prepare the demo slides before the sync. URGENT
[10/08/2026, 1:20 PM] Priya: Cancel the demo slides, client asked to skip the demo.
[10/08/2026, 1:45 PM] Dana: Deck sent!
[10/08/2026, 2:10 PM] Sam: Reminder: submit your expense reports by 10/15.
[10/08/2026, 2:12 PM] Marcus: lol ok`
    },
    {
      id: 'p0-incident',
      title: 'P0 Production Outage',
      tagline: 'DB pool exhaustion, rollback to v2.4.1, emergency sync shift, unassigned patch',
      recommendedUser: 'Alex',
      text: `[10/09/2026, 11:15 AM] PagerDuty: [CRITICAL] 504 Gateway Timeouts exceeding 12% threshold on prod-api-cluster
[10/09/2026, 11:16 AM] Alex: Opening incident bridge right now. All hands on deck.
[10/09/2026, 11:17 AM] Maya: Checking APM traces. Database connection pool is exhausted on replica 3.
[10/09/2026, 11:19 AM] Jordan: We should restart the API containers immediately to drain stale sockets.
[10/09/2026, 11:20 AM] Maya: Wait, restarting won't fix the leak — the billing cron release from 10:30 AM is holding locks.
[10/09/2026, 11:22 AM] Alex: Agreed, final decision: let's roll back the billing release to v2.4.1 immediately.
[10/09/2026, 11:23 AM] Maya: I'll trigger the rollback pipeline to v2.4.1 right now.
[10/09/2026, 11:27 AM] Jordan: Can someone verify if the EU users were impacted during the spike?
[10/09/2026, 11:31 AM] Maya: Rollback finished! Error rates dropping back to 0.02%.
[10/09/2026, 11:34 AM] Alex: Emergency incident sync scheduled for 1:00 PM today.
[10/09/2026, 11:45 AM] Alex: Actually move the incident sync to 2:00 PM so Maya has time to draft the RCA doc.
[10/09/2026, 11:47 AM] Jordan: We need someone to patch the connection pool leak in main branch by 5 PM today.
[10/09/2026, 11:50 AM] Maya: Cancel the status page update, downtime was under 10 minutes total.`
    },
    {
      id: 'hackathon-crunch',
      title: 'Hackathon Final Sprint',
      tagline: '3-hour lock, pitch call reschedule, OAuth cancellation, unassigned demo recording',
      recommendedUser: 'Rohan',
      text: `10/09/2026, 12:00 PM - Rohan: Team, we have exactly 3 hours left before submissions lock at 3 PM!
10/09/2026, 12:02 PM - Aisha: Front-end dark mode is completely done and merged.
10/09/2026, 12:05 PM - Rohan: @Leo can you finish the README documentation and architecture diagram by 1:30 PM?
10/09/2026, 12:07 PM - Leo: On it, I'll submit the README and diagrams by 1:30 PM.
10/09/2026, 12:12 PM - Aisha: Should we include the export-to-PDF button or is it too risky?
10/09/2026, 12:14 PM - Rohan: Consensus is let's go with the simple clipboard markdown export instead of PDF to avoid bugs.
10/09/2026, 12:20 PM - Leo: Cancel the external OAuth login feature, let's keep it strictly local-first.
10/09/2026, 12:35 PM - Aisha: Pitch practice call set for 2:15 PM on Discord.
10/09/2026, 12:45 PM - Rohan: Quick change: pitch practice call moved to 2:30 PM to give Leo extra time.
10/09/2026, 12:50 PM - Aisha: We urgently need someone to record the 2-minute demo video before 2:45 PM.
10/09/2026, 1:00 PM - Leo: Did anyone test the app on a fresh browser profile without cache?`
    },
    {
      id: 'offsite-travel',
      title: 'Offsite & Logistics',
      tagline: 'Hotel booking, flight arrivals, dinner shift, budget questions',
      recommendedUser: 'Elena',
      text: `Elena: Hey everyone, planning for the Austin engineering offsite is underway!
Tariq: What date did we settle on for the flight arrival?
Elena: Let's go with arriving Wednesday October 21st by 2 PM.
Chloe: I'll reserve the Airbnb near downtown by tomorrow noon.
Tariq: Wait, my connecting flight lands at 4:30 PM on Wednesday, not 2 PM.
Elena: Okay revised plan: welcome dinner shifted from 6 PM to 8 PM at South Congress Cafe.
Chloe: @Elena can someone confirm the per-person dining budget from HR?
Tariq: Don't forget: everyone must submit their flight receipt by Friday EOD for reimbursement.
Elena: Cancel the rental van reservation, company policy prefers rideshares.`
    }
  ];

  return {
    SAMPLES: SAMPLES,
    getSample: function (id) {
      return SAMPLES.find(s => s.id === id) || SAMPLES[0];
    }
  };
});
