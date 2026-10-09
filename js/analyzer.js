/**
 * CatchUp — Robust Local Conversation Intelligence Pipeline
 * 100% On-Device Deterministic NLP Engine. Zero External Network Requests.
 *
 * Highlights:
 * 1. Pre-filtering: Filters casual small talk, greetings, jokes, and coffee/food chatter BEFORE categorization.
 * 2. "Needs Review": Reserved strictly for genuine work ambiguities (tentative deadlines, conflicting info, unassigned tasks).
 * 3. Relational dependencies: Connects follow-up instructions to existing deliverables (e.g. including test results in report).
 * 4. Meeting reschedules: Reflects current time while retaining previous time as context.
 * 5. Cancellations: Isolates cancelled tasks and ensures they are never presented as pending.
 * 6. Evidence integrity: Preserves source-message IDs and verbatim text for every single result.
 * 7. Deduplication & priority proportionality: Genuinely urgent = Critical, clear commitments = Important.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChatAnalyzer = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // Semantic stopwords
  const STOPWORDS = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'you', 'our', 'your', 'can', 'could',
    'will', 'would', 'please', 'lets', "let's", 'just', 'not', 'yes', 'okay', 'from',
    'all', 'any', "i'll", "i'm", "i've", "don't", "can't", 'have', 'has', 'had', 'get',
    'got', 'going', 'one', 'are', 'was', 'were', 'its', 'out', 'then', 'now', 'but',
    'too', 'also', 'hey', 'hello', 'morning', 'afternoon', 'evening', 'team', 'guys',
    'everyone', 'about', 'there', 'here', 'what', 'when', 'where', 'which', 'who',
    'whom', 'why', 'how', 'been', 'being', 'more', 'some', 'such', 'only', 'own',
    'same', 'so', 'than', 'ok', 'okay', 'lol', 'haha', 'yep', 'nope', 'cool', 'thanks'
  ]);

  /* ================== SMALL TALK & BANTER FILTER ================== */
  
  // Patterns for casual coffee / food runs / snacks chatter
  const RX_COFFEE_BANTER = /\b(coffee|latte|espresso|cappuccino|tea|starbucks|snack|donuts?|bagels?|pizza|lunch run|coffee run|heading down|grab me|bring me|get me|back in \d+|iced caramel|smoothie|pastr(?:y|ies))\b/i;
  
  // Patterns for casual greetings, signoffs, and pleasantries
  const RX_CASUAL_GREETING = /^(hey|hello|hi|morning|good morning|gm|evening|afternoon|happy friday|happy monday|how are you|hope you had a good weekend|welcome back|see ya|cya|bye|good night|gn)[!., ]*$/i;
  
  // Patterns for jokes, memes, and standalone casual reactions
  const RX_CASUAL_BANTER = /^(lol|haha|hahaha|lmao|rofl|nice meme|funny|classic|cool|nice|awesome|sounds good|thumbs up|👍|❤️|😂|thanks|thank you|thanks team|np|no problem|no worries|you got it|lol okay|lol ok|sure thing)[!., ]*$/i;

  // Patterns for sports, match, and recreational chatter
  const RX_SPORTS_BANTER = /\b(did you (?:watch|see|catch) the (?:match|game)|cricket match|football match|soccer match|basketball game|who won the (?:match|game)|what a (?:match|game)|great (?:match|game)|score of the (?:match|game)|(?:match|game)\s+(?:yesterday|last night))\b/i;

  function isCasualSmallTalk(text) {
    if (!text) return true;
    const clean = text.trim();

    // 1. Direct match on casual banter / greetings
    if (RX_CASUAL_GREETING.test(clean) || RX_CASUAL_BANTER.test(clean)) {
      return true;
    }

    // 2. Coffee, drinks, and casual food chatter
    // Exception: Official offsite dinner or scheduled team events (e.g. "offsite dinner", "welcome dinner at 8 PM")
    const isOfficialEvent = /\b(offsite dinner|welcome dinner|dinner table|table for \d+|reservation|scheduled|meeting|budget approval)\b/i.test(clean);
    if (RX_COFFEE_BANTER.test(clean) && !isOfficialEvent) {
      return true;
    }

    // 3. Sports match & recreational chatter
    if (RX_SPORTS_BANTER.test(clean)) {
      return true;
    }

    // 4. Very short casual conversational acknowledgment
    if (/^(got it thanks|thanks see you|see you there|sure thing|sounds great|no problem|awesome)[!., ]*$/i.test(clean)) {
      return true;
    }

    return false;
  }

  function tokenize(str) {
    if (!str) return [];
    return (str.toLowerCase().match(/[a-z0-9][a-z0-9'-]*/g) || [])
      .filter(w => w.length > 2 && !STOPWORDS.has(w));
  }

  function tokenOverlap(tokensA, tokensB) {
    const setB = new Set(tokensB);
    return [...new Set(tokensA)].filter(w => setB.has(w)).length;
  }

  function capitalize(s) {
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function truncate(str, max = 110) {
    if (!str) return '';
    return str.length > max ? str.slice(0, max - 1) + '…' : str;
  }

  /* ================== REGEX DETECTION RULES ================== */

  // Explicit Task triggers
  const RX_TASK = /\b(i'?ll|i will|i can (?:take|do|handle|send|book|prepare|submit|build|draft|write|upload)|i'?m (?:going to|gonna)|let me|can you|could you|will you|would you|please|needs? to|to-?do|don'?t forget|remember to|make sure|action item|reminder|must|submit|finish|prepare|send|review|deploy|patch|write|record|reserve|upload)\b/i;
  const RX_SELF_COMMIT = /\b(i'?ll|i will|i can|i'?m going to|i'?m gonna|let me|count me in|i am handling|i took)\b/i;

  // Connected requirement triggers (e.g. "include test results in that report", "make sure to attach X")
  const RX_REQUIREMENT = /\b(?:make sure to|also|please|ensure you|don'?t forget to)\s+(?:include|attach|add|run|verify|test|check|bundle)\s+([^.!?]+)/i;

  // Deadline patterns
  const RX_DEADLINE = /\b(?:by|before|due(?:\s+date)?|until|deadline(?: is)?|no later than|finish by|complete by)\s+((?:end of day|eod|eow|tonight|noon|tomorrow(?: (?:morning|afternoon|evening))?|today|(?:next )?(?:mon|tues|wednes|thurs|fri|satur|sun)day|\d{1,2}(?::\d{2})?\s?[ap]\.?m\.?|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?)(?:\s+(?:today|tomorrow|tonight))?)/i;
  const RX_DEADLINE_SHORT = /\b(eod|end of day|tonight|asap|close of business|cob)\b/i;

  // Strict urgency triggers
  const RX_STRICT_URGENT = /\b(urgent|asap|emergency|critical|p0|blocker|blocking|immediately|right now|drop everything|time sensitive)\b/i;

  // Decision & consensus
  const RX_DECISION = /\b(let'?s go with|we'?ll go with|we will go with|going with|decided|we decided|agreed|it'?s settled|final decision|confirmed|approved|locked in|the plan is|we'?ll use|we are using|selected|consensus is)\b/i;
  const RX_DECISION_CHANGE = /\b(instead|switch(?:ing|ed)? to|change of plan|actually|changed? (?:it )?to|revised|new plan|pivot to)\b/i;

  // Cancellation
  const RX_CANCEL = /\b(cancel(?:l?ed)?|call(?:ed)? off|scrap(?:ped)?|no longer (?:need|needed|happening)|never ?mind|nvm|forget (?:about )?(?:it|that)|drop (?:it|that)|not happening|skip (?:the )?|abort(?:ed)?)\b/i;

  // Completion
  const RX_DONE = /\b(done|sent|finished|completed|submitted|booked|shipped|fixed|resolved|merged|pushed|closed|handled|uploaded)\b/i;

  // Meetings & events
  const RX_EVENTS = /\b(meeting|stand-?up|sync|call|demo|dinner|lunch|review|launch|workshop|interview|retro|presentation|huddle)\b/i;

  // Genuine tentative language for "Needs Review"
  const RX_TENTATIVE = /\b(maybe|might|tentative|tentatively|probably|not sure|perhaps|i think|if possible|subject to (?:change|approval)|pending|unconfirmed|tbd|to be decided|rumou?rs?|unverified|hearsay)\b/i;

  // Interrogatives
  const RX_QUESTION = /\?|^(?:who|what|where|when|why|how|can someone|could someone|is there|are we|does anyone)\b/i;

  // Time extractor (standardized with :00 if minutes omitted)
  function extractTime(text) {
    if (!text) return null;
    let m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*([ap]\.?m\.?)\b/i);
    if (m) {
      const min = m[2] ? (':' + m[2].padStart(2, '0')) : ':00';
      const ap = m[3].replace(/\./g, '').toUpperCase();
      return `${m[1]}${min} ${ap}`;
    }
    m = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (m) return m[0];
    if (/\bnoon\b/i.test(text)) return '12:00 PM';
    if (/\bmidnight\b/i.test(text)) return '12:00 AM';
    return null;
  }

  // Location extractor
  function extractLocation(text) {
    if (!text) return null;
    const m = text.match(/\b(?:in|at|room|link:?|on)\s+([A-Z0-9][\w\s-]{2,20}?)(?=[.,!?]|\s+(?:at|by|with|for|$))/);
    if (m && !/\b(?:sync|meeting|standup|call|today|tomorrow|noon|eod)\b/i.test(m[1].trim())) {
      return m[1].trim();
    }
    return null;
  }

  /**
   * Main Analysis Engine
   */
  function analyze(messages, currentUserName = '') {
    const validMsgs = messages.filter(m => !m.isSystem && m.text.trim().length > 0);
    const participants = [...new Set(validMsgs.map(m => m.sender).filter(Boolean))];
    const userLower = (currentUserName || '').trim().toLowerCase();

    const isMe = name => {
      if (!userLower || !name) return false;
      const nl = name.toLowerCase();
      return nl.includes(userLower) || userLower.includes(nl);
    };

    const resolveParticipant = token => {
      if (!token) return null;
      const clean = token.replace(/^[@~]+/, '').toLowerCase();
      return participants.find(p => {
        const parts = p.toLowerCase().split(/\s+/);
        return parts.includes(clean) || parts[0] === clean || p.toLowerCase() === clean;
      }) || token.replace(/^[@~]+/, '');
    };

    const extractMentions = text => {
      const mentions = [];
      const atMatches = text.matchAll(/@([A-Za-z0-9_.-]+)/g);
      for (const match of atMatches) {
        const res = resolveParticipant(match[1]);
        if (res) mentions.push(res);
      }
      const leadMatch = text.match(/^([A-Z][a-z0-9_-]+)[,:]\s+/);
      if (leadMatch) {
        const res = resolveParticipant(leadMatch[1]);
        if (res && participants.includes(res)) mentions.push(res);
      }
      return [...new Set(mentions)];
    };

    const items = [];
    const eventSeries = {};
    const pendingQuestions = [];

    function addItem(obj) {
      obj.id = items.length;
      obj.status = obj.status || 'open';
      obj.tokens = tokenize(obj.srcText || obj.title || '');
      obj.requirements = obj.requirements || [];
      items.push(obj);
      return obj;
    }

    /* ---- Pass 1: Parse message intents & relationships ---- */
    validMsgs.forEach((msg, idx) => {
      const text = msg.text.trim();
      const tokens = tokenize(text);
      const mentions = extractMentions(text);
      const isQ = RX_QUESTION.test(text);
      const isTentative = RX_TENTATIVE.test(text);
      const isStrictUrgent = RX_STRICT_URGENT.test(text);

      // CRITICAL: Filter casual small talk, greetings, jokes, coffee/food runs BEFORE categorization!
      // They must NEVER appear in "Needs Review" or "Action Items".
      if (isCasualSmallTalk(text)) {
        return;
      }

      // --- 1. CANCELLATION ---
      if (RX_CANCEL.test(text)) {
        let bestTarget = null;
        let bestScore = 0;

        for (const it of items) {
          if (it.status === 'cancelled' || it.status === 'done') continue;
          if (!['task', 'decision', 'event'].includes(it.kind)) continue;

          let score = tokenOverlap(tokens, it.tokens);
          if (it.eventKey && new RegExp('\\b' + it.eventKey + '\\b', 'i').test(text)) score += 3;
          if (score > bestScore) {
            bestScore = score;
            bestTarget = it;
          }
        }

        if (bestTarget && bestScore >= 1) {
          bestTarget.status = 'cancelled';
          bestTarget.msgs.push(msg.id);
          bestTarget.priority = 'Informational';
          bestTarget.cancelledBy = msg.sender;
          bestTarget.why = `Cancelled by ${msg.sender}. (${bestTarget.why})`;
        } else {
          addItem({
            kind: 'cancellation',
            title: `Cancelled: ${truncate(text, 80)}`,
            srcText: text,
            sender: msg.sender,
            msgs: [msg.id],
            priority: 'Informational',
            status: 'cancelled',
            why: `A cancellation was issued by ${msg.sender}.`
          });
        }
        return;
      }

      // --- 2. COMPLETION REPORT ---
      if (RX_DONE.test(text) && !isQ) {
        const potentialTasks = items.filter(it =>
          it.kind === 'task' &&
          it.status === 'open' &&
          (it.assignee === msg.sender || !it.assignee || mentions.includes(it.assignee)) &&
          tokenOverlap(tokens, it.tokens) >= 1
        );

        if (potentialTasks.length > 0) {
          potentialTasks.forEach(task => {
            task.status = 'done';
            task.msgs.push(msg.id);
            task.completedBy = msg.sender;
            task.priority = 'Informational';
            task.why = `Reported complete by ${msg.sender}. (${task.why})`;
          });
          return;
        }
      }

      // --- 3. SCHEDULED EVENTS & TIME CHANGES ---
      const eventMatch = text.match(RX_EVENTS);
      const extractedTime = extractTime(text);

      if (eventMatch && extractedTime && !isQ) {
        const key = eventMatch[1].toLowerCase().replace('-', '');
        const loc = extractLocation(text);

        if (!eventSeries[key]) {
          const item = addItem({
            kind: 'event',
            eventKey: key,
            title: `${capitalize(key)}: ${extractedTime}`,
            srcText: text,
            sender: msg.sender,
            msgs: [msg.id],
            priority: isTentative ? 'Needs Review' : 'Important',
            status: 'open',
            times: [{ time: extractedTime, msgId: msg.id, sender: msg.sender, loc }],
            currentDeadline: extractedTime,
            deadlineLabel: 'Current Time',
            location: loc,
            why: `Scheduled for ${extractedTime} by ${msg.sender}.`,
            uncertainty: isTentative ? 'Meeting time is tentative.' : null
          });
          eventSeries[key] = item;
        } else {
          const series = eventSeries[key];
          const lastTime = series.times[series.times.length - 1];

          if (lastTime.time !== extractedTime && series.status !== 'cancelled') {
            const previousTime = lastTime.time;
            series.times.push({ time: extractedTime, msgId: msg.id, sender: msg.sender, loc: loc || lastTime.loc });
            series.msgs.push(msg.id);
            if (loc) series.location = loc;

            series.title = `${capitalize(key)}: ${extractedTime} (Current time)`;
            series.currentDeadline = extractedTime;
            series.priority = series.times.length > 2 ? 'Critical' : 'Important';
            series.rescheduled = true;
            series.rescheduleCount = series.times.length - 1;
            series.why = `Moved from ${previousTime} to ${extractedTime} by ${msg.sender}. Previous time retained as context.`;

            if (isTentative) {
              series.uncertainty = `Time proposal appears tentative ("${text}").`;
              series.priority = 'Needs Review';
            }
          }
        }
        return;
      }

      // --- 4. CONNECTED REQUIREMENTS (RELATIONSHIPS BETWEEN MESSAGES) ---
      // E.g.: "Also Bob, make sure to include the automated test results in that report."
      const reqMatch = text.match(RX_REQUIREMENT);
      if (reqMatch) {
        const reqDetail = reqMatch[1].trim();
        const relatedTask = items.find(it =>
          it.kind === 'task' &&
          it.status === 'open' &&
          (tokenOverlap(tokens, it.tokens) >= 1 || (it.assignee && (it.assignee === msg.sender || mentions.includes(it.assignee))))
        );

        if (relatedTask) {
          relatedTask.msgs.push(msg.id);
          relatedTask.requirements.push(`Requirement from ${msg.sender}: include ${truncate(reqDetail, 60)}`);
          relatedTask.why += ` (Updated by ${msg.sender}: include ${truncate(reqDetail, 50)}).`;
          if (!relatedTask.assignee && mentions.length > 0) {
            relatedTask.assignee = mentions[0];
          }
          return;
        }
      }

      // --- 5. DECISIONS & DECISION CHANGES ---
      let matchedPrevDecision = null;
      let prevScore = 0;

      for (const it of items) {
        if (it.kind !== 'decision' || it.status !== 'open') continue;
        const score = tokenOverlap(tokens, it.tokens);
        if (score > prevScore) {
          prevScore = score;
          matchedPrevDecision = it;
        }
      }

      const isExplicitTask = RX_TASK.test(text) && (mentions.length > 0 || RX_SELF_COMMIT.test(text) || RX_DEADLINE.test(text));
      const isDec = RX_DECISION.test(text) && !isExplicitTask;
      const isDecChange = RX_DECISION_CHANGE.test(text) && prevScore >= 1;

      if (isDec || isDecChange) {
        const hasChange = matchedPrevDecision && (isDecChange || prevScore >= 2);

        if (hasChange) {
          matchedPrevDecision.status = 'superseded';
          matchedPrevDecision.priority = 'Informational';
          matchedPrevDecision.supersededBy = msg.id;
          matchedPrevDecision.why += ` (Superseded by later decision from ${msg.sender}).`;
        }

        addItem({
          kind: 'decision',
          title: `Decision: ${truncate(text, 80)}`,
          srcText: text,
          sender: msg.sender,
          msgs: hasChange ? [...matchedPrevDecision.msgs.slice(0, 1), msg.id] : [msg.id],
          priority: isTentative ? 'Needs Review' : 'Important',
          status: 'open',
          changed: !!hasChange,
          why: hasChange
            ? `Revises earlier consensus: "${truncate(matchedPrevDecision.title, 50)}". Confirmed by ${msg.sender}.`
            : `Agreed by ${msg.sender}.`,
          uncertainty: isTentative ? 'Decision language is tentative or conditional.' : null
        });
        return;
      }

      // --- 6. TASKS & EXPLICIT INSTRUCTIONS ---
      if (RX_TASK.test(text)) {
        let assignee = null;
        let isSelf = false;

        if (RX_SELF_COMMIT.test(text)) {
          assignee = msg.sender;
          isSelf = true;
        } else if (mentions.length > 0) {
          assignee = mentions[0];
        }

        const dlMatch = text.match(RX_DEADLINE);
        const deadline = dlMatch ? dlMatch[1].trim() : ((text.match(RX_DEADLINE_SHORT) || [])[1] || null);

        // Deduplication & Task Confirmation linking
        const existingTask = items.find(it =>
          it.kind === 'task' &&
          it.status === 'open' &&
          ((assignee && it.assignee === assignee) || (!it.assignee && assignee)) &&
          tokenOverlap(tokens, it.tokens) >= 2
        );

        if (existingTask) {
          existingTask.msgs.push(msg.id);
          if (isSelf && !existingTask.isSelf) {
            existingTask.assignee = msg.sender;
            existingTask.isSelf = true;
            existingTask.why += ` Accepted by ${msg.sender}.`;
          }
          if (!existingTask.deadline && deadline) {
            existingTask.deadline = deadline;
            existingTask.currentDeadline = deadline;
          }
          return;
        }

        // Proportional explainable priority
        const hasImminentDeadline = deadline && /today|tonight|eod|end of day|asap|within \d+ hours?/i.test(deadline);

        let priority = 'Important';
        let reason = isSelf
          ? `${msg.sender} committed to handle this.`
          : (assignee ? `Assigned to ${assignee} by ${msg.sender}.` : `Requested by ${msg.sender}.`);

        // Check for genuine uncertainty in the task
        if (isTentative) {
          priority = 'Needs Review';
          reason += ' Needs review: deadline or scope is tentative/unconfirmed.';
        } else if (isStrictUrgent || hasImminentDeadline || (assignee && isMe(assignee) && deadline)) {
          priority = 'Critical';
          reason += ' Urgent consequence or imminent deadline.';
        } else if (!assignee) {
          priority = 'Needs Review';
          reason += ' Needs review: no team member is explicitly assigned.';
        }

        addItem({
          kind: 'task',
          title: truncate(text, 90),
          srcText: text,
          sender: msg.sender,
          msgs: [msg.id],
          priority: priority,
          status: 'open',
          assignee: assignee || null,
          isSelf: isSelf,
          isAssignedToUser: isMe(assignee),
          deadline: deadline || null,
          currentDeadline: deadline || null,
          deadlineLabel: 'Deadline',
          why: reason,
          uncertainty: isTentative ? 'Tentative deadline or scope.' : (!assignee ? 'Unassigned task — needs an owner.' : null)
        });
        return;
      }

      // --- 7. GENUINE UNCERTAINTIES & TENTATIVE PROPOSALS (WORK CONTEXT) ---
      if (isTentative && !isQ) {
        // E.g. "The infrastructure audit deadline is tentative, maybe next Wednesday or Friday."
        addItem({
          kind: 'uncertainty',
          title: `Tentative: ${truncate(text, 85)}`,
          srcText: text,
          sender: msg.sender,
          msgs: [msg.id],
          priority: 'Needs Review',
          status: 'open',
          why: `Unconfirmed or tentative update stated by ${msg.sender}. Needs team review.`,
          uncertainty: 'Information is tentative or contradictory.'
        });
        return;
      }

      // --- 8. QUESTIONS (WORK RELATED ONLY) ---
      if (isQ) {
        pendingQuestions.push({
          msg,
          msgId: msg.id,
          sender: msg.sender,
          text: text,
          tokens: tokens,
          mentions: mentions,
          isStrictUrgent: isStrictUrgent
        });
        return;
      }

      // --- 9. DIRECT MENTIONS ---
      if (mentions.length > 0) {
        const isUserMentioned = mentions.some(isMe);
        addItem({
          kind: 'mention',
          title: `Mention: ${truncate(text, 80)}`,
          srcText: text,
          sender: msg.sender,
          msgs: [msg.id],
          priority: isUserMentioned ? 'Important' : 'Informational',
          status: 'open',
          assignee: mentions[0],
          isAssignedToUser: isUserMentioned,
          why: `${msg.sender} called out ${mentions.join(', ')}.`
        });
      }
    });

    /* ---- Pass 2: Unanswered Questions check ---- */
    pendingQuestions.forEach(qItem => {
      let isAnswered = false;
      const maxAhead = Math.min(validMsgs.length, qItem.msg.id + 7);

      for (let j = qItem.msg.id + 1; j < maxAhead; j++) {
        const candidate = validMsgs.find(m => m.id === j);
        if (!candidate || candidate.sender === qItem.sender) continue;
        const cTokens = tokenize(candidate.text);
        const overlap = tokenOverlap(cTokens, qItem.tokens);

        if ((qItem.mentions.includes(candidate.sender) && candidate.text.length > 4) || overlap >= 2) {
          isAnswered = true;
          break;
        }
      }

      if (!isAnswered) {
        addItem({
          kind: 'question',
          title: `Unanswered: "${truncate(qItem.text, 80)}"`,
          srcText: qItem.text,
          sender: qItem.sender,
          msgs: [qItem.msgId],
          priority: 'Needs Review',
          status: 'unanswered',
          targetRespondent: qItem.mentions[0] || null,
          why: `Asked by ${qItem.sender}; no reply received. Needs review.`,
          uncertainty: 'Question remains unanswered.'
        });
      }
    });

    /* ---- Pass 3: Grouping & Ordering ---- */
    const PRIORITY_ORDER = { 'Critical': 0, 'Important': 1, 'Needs Review': 2, 'Informational': 3 };
    const STATUS_ORDER = { 'open': 0, 'unanswered': 1, 'cancelled': 2, 'superseded': 3, 'done': 4 };

    items.sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 0;
      const sb = STATUS_ORDER[b.status] ?? 0;
      if (sa !== sb) return sa - sb;
      const pa = PRIORITY_ORDER[a.priority] ?? 2;
      const pb = PRIORITY_ORDER[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;
      return (a.msgs[0] || 0) - (b.msgs[0] || 0);
    });

    /* ---- Pass 4: Build Concise Summary ---- */
    const summary = generateSummary(items, validMsgs, participants, currentUserName);
    const uncertainties = items.filter(i => i.priority === 'Needs Review' || i.uncertainty);

    return {
      messages: validMsgs,
      participants: participants,
      items: items,
      uncertainties: uncertainties,
      summary: summary
    };
  }

  function generateSummary(items, messages, participants, currentUserName) {
    const liveTasks = items.filter(i => i.kind === 'task' && i.status === 'open');
    const myTasks = liveTasks.filter(i => i.isAssignedToUser);
    const criticalItems = items.filter(i => i.priority === 'Critical' && i.status !== 'done' && i.status !== 'cancelled');
    const meetingChanges = items.filter(i => i.kind === 'event' && i.rescheduled);
    const decisions = items.filter(i => i.kind === 'decision' && i.status === 'open');
    const cancellations = items.filter(i => i.status === 'cancelled');
    const needsReview = items.filter(i => i.priority === 'Needs Review' || i.uncertainty);

    const keyPoints = [];

    // Schedule changes
    meetingChanges.forEach(e => {
      keyPoints.push(`<b>${capitalize(e.eventKey)} moved to ${e.currentDeadline}</b> (previously scheduled for ${e.times[0].time}).`);
    });

    // Decisions
    decisions.filter(d => d.changed).forEach(d => {
      keyPoints.push(`<b>Decision updated:</b> ${truncate(d.title, 80)}.`);
    });

    // Cancellations
    cancellations.forEach(c => {
      keyPoints.push(`<b>Cancelled:</b> ${truncate(c.title, 75)}.`);
    });

    // Urgent tasks
    criticalItems.filter(i => i.kind === 'task').forEach(t => {
      keyPoints.push(`<b>Urgent Action:</b> ${truncate(t.title, 70)} ${t.assignee ? `(@${t.assignee})` : '(Unassigned)'}${t.deadline ? ` [Due: ${t.deadline}]` : ''}.`);
    });

    if (needsReview.length > 0) {
      keyPoints.push(`<b>${needsReview.length} item${needsReview.length > 1 ? 's' : ''} need review</b> due to tentative deadlines or open questions.`);
    }

    if (keyPoints.length === 0) {
      keyPoints.push('Team discussion with no major schedule alterations or critical blockers.');
    }

    let narrative = `Analyzed <b>${messages.length} messages</b> across <b>${participants.length} speakers</b>. `;
    if (criticalItems.length > 0) {
      narrative += `Identified <b>${criticalItems.length} critical item${criticalItems.length > 1 ? 's' : ''}</b> requiring fast action. `;
    } else {
      narrative += `No immediate critical blockers found. `;
    }
    if (liveTasks.length > 0) {
      narrative += `<b>${liveTasks.length} open task${liveTasks.length > 1 ? 's' : ''}</b> tracked. `;
    }
    if (myTasks.length > 0) {
      narrative += `<b>${myTasks.length} task${myTasks.length > 1 ? 's are' : ' is'} explicitly assigned to you</b>. `;
    }

    return {
      narrative: narrative,
      keyPoints: keyPoints,
      counts: {
        critical: criticalItems.length,
        important: items.filter(i => i.priority === 'Important' && i.status !== 'done' && i.status !== 'cancelled').length,
        needsReview: needsReview.length,
        informational: items.filter(i => i.priority === 'Informational' || i.status === 'done' || i.status === 'cancelled').length,
        tasks: liveTasks.length,
        myTasks: myTasks.length
      }
    };
  }

  return {
    analyze: analyze,
    isCasualSmallTalk: isCasualSmallTalk,
    tokenize: tokenize,
    tokenOverlap: tokenOverlap,
    truncate: truncate
  };
});
