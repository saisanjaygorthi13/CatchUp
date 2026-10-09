const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 3000);

loadEnv(path.join(ROOT_DIR, '.env'));

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function safeResolve(filePath) {
  const normalized = path.normalize(filePath);
  if (!normalized.startsWith(ROOT_DIR)) {
    return null;
  }
  return normalized;
}

const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

async function discoverFallbackModel(apiKey) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.data)) return null;
    const availableIds = data.data.map(m => m.id);
    
    // Ranked preference list of known high-quality Groq text-generation models
    const preferences = [
      'openai/gpt-oss-120b',
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      'allam-2-7b',
      'canopylabs/orpheus-v1-english'
    ];
    for (const pref of preferences) {
      if (availableIds.includes(pref)) return pref;
    }
    const textModel = availableIds.find(id => !id.includes('whisper') && !id.includes('guard'));
    return textModel || availableIds[0] || null;
  } catch (err) {
    return null;
  }
}

async function analyzeWithGroq(text, userName, overrideModel, isRetry = false) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GROQ_API_KEY in environment or .env file');
  }

  const model = overrideModel || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  const systemPrompt = `You are CatchUp, an expert conversation intelligence engine.
Analyze the provided group chat log and extract what the user missed.
You must return only a valid JSON object matching the requested schema. Do NOT include markdown formatting, code fences, or conversational text.`;

  const userPrompt = `Analyze this chat log and return a JSON object with:
1. "summary":
   - "keyPoints": array of up to 5 clear strings summarizing key changes, decisions, and deadlines.
   - "counts": { "critical": number, "important": number, "needsReview": number, "informational": number }
   - "overall": concise narrative paragraph explaining what happened.
2. "items": array of objects, each with:
   - "id": number
   - "title": concise descriptive title of the item
   - "kind": "task" | "decision" | "event" | "cancellation" | "mention" | "uncertainty"
   - "priority": "Critical" | "Important" | "Needs Review" | "Informational"
   - "why": clear explanation of why this item matters and context
   - "assignee": person responsible (or null if unassigned)
   - "deadline": explicit deadline string if mentioned (or null)
   - "currentDeadline": current deadline or scheduled time (or null)
   - "srcText": verbatim message excerpt providing evidence
   - "timestamp": message timestamp if present (or "")
   - "status": "open" | "done" | "cancelled" | "superseded"
   - "requirements": array of strings for connected requirements (e.g. "include test results", "attach screenshots")
   - "isAssignedToUser": boolean (true if assigned to "${userName || 'the user'}", otherwise false)

Intelligence rules:
- Meeting time changes: State the current/latest meeting time in title and currentDeadline. Mention the previous time in "why" as context.
- Confirmed deadlines: Keep confirmed deliverable deadlines intact.
- Connected deliverables: When a follow-up message adds requirements to a deliverable (e.g. including test results or uploading screenshots), connect those requirements to the deliverable item or create a clearly linked task.
- Cancellations: Mark cancelled items with status "cancelled" and priority "Informational". Never present cancelled items as active or pending.
- Unconfirmed rumours / tentative information: Put unverified rumours, tentative proposals, or unconfirmed deadline changes in "Needs Review" with an uncertainty explanation. Do NOT present rumours as confirmed facts.
- Personal tasks: Detect when tasks are assigned to or committed by "${userName || 'the user'}".
- Small talk exclusion: Exclude irrelevant greetings, coffee runs, casual snacks, jokes, and sports match discussions from items.
- Evidence integrity: Every item must quote the authentic source message excerpt in srcText.

Conversation log:
${text}
`;

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const rawMsg = payload?.error?.message || payload?.error || `HTTP ${response.status}`;
    const code = payload?.error?.code;

    // Check if the requested model is not found or unavailable to account
    const isModelUnavailable = response.status === 404 || code === 'model_not_found' || /does not exist|not have access|not found/i.test(rawMsg);
    if (isModelUnavailable && !isRetry) {
      console.warn(`[Groq] Model '${model}' is unavailable. Querying /openai/v1/models for supported replacement...`);
      const discovered = await discoverFallbackModel(apiKey);
      if (discovered && discovered !== model) {
        console.log(`[Groq] Automatically switching to supported model '${discovered}' and retrying...`);
        return analyzeWithGroq(text, userName, discovered, true);
      }
    }

    let userFacingMsg = rawMsg;
    if (response.status === 401 || code === 'invalid_api_key') {
      userFacingMsg = `Authentication error (401): Invalid or expired GROQ_API_KEY. (${rawMsg})`;
    } else if (response.status === 403 || code === 'permission_denied') {
      userFacingMsg = `Permission error (403): Access denied to model '${model}'. (${rawMsg})`;
    } else if (isModelUnavailable) {
      userFacingMsg = `Model error (404): Model '${model}' does not exist or is unavailable on this Groq account. (${rawMsg})`;
    } else if (response.status === 429 || code === 'rate_limit_exceeded') {
      userFacingMsg = `Rate limit error (429): Groq rate limit exceeded. Please retry shortly. (${rawMsg})`;
    } else if (response.status >= 500) {
      userFacingMsg = `Groq server error (${response.status}): ${rawMsg}`;
    }

    console.error(`[Groq] API error (${response.status}): ${userFacingMsg}`);
    throw new Error(userFacingMsg);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content || '';

  if (!rawContent.trim()) {
    throw new Error('Groq returned an empty response');
  }

  // Strip markdown fences if present, then locate the outermost JSON boundaries
  let cleaned = rawContent
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();

  const jsonStart = cleaned.indexOf('{');
  if (jsonStart > 0) {
    cleaned = cleaned.slice(jsonStart);
  }
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonEnd !== -1 && jsonEnd < cleaned.length - 1) {
    cleaned = cleaned.slice(0, jsonEnd + 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseErr) {
    console.error('[Groq] JSON parse error:', parseErr.message, 'Raw content:', rawContent.slice(0, 200));
    throw new Error('Malformed JSON received from Groq AI');
  }

  const summary = parsed.summary || {};
  const items = Array.isArray(parsed.items) ? parsed.items : [];

  const normalizedSummary = {
    keyPoints: Array.isArray(summary.keyPoints) ? summary.keyPoints.slice(0, 5) : items.slice(0, 3).map(item => item.title || 'Key update'),
    counts: {
      critical: Number(summary.counts?.critical || 0),
      important: Number(summary.counts?.important || 0),
      needsReview: Number(summary.counts?.needsReview || 0),
      informational: Number(summary.counts?.informational || 0)
    },
    overall: String(summary.overall || 'Key changes from the conversation.'),
    narrative: String(summary.overall || summary.narrative || 'Key changes from the conversation.'),
    isLocalFallback: false
  };

  const normalizedItems = items.map((item, index) => ({
    id: Number(item.id ?? index + 1),
    title: String(item.title || `Item ${index + 1}`),
    kind: String(item.kind || 'task'),
    priority: String(item.priority || 'Informational'),
    why: String(item.why || 'No explanation provided.'),
    assignee: String(item.assignee || ''),
    deadline: String(item.deadline || item.currentDeadline || ''),
    currentDeadline: String(item.currentDeadline || item.deadline || ''),
    srcText: String(item.srcText || ''),
    timestamp: String(item.timestamp || ''),
    status: String(item.status || 'open'),
    requirements: Array.isArray(item.requirements) ? item.requirements.map(String) : [],
    isAssignedToUser: Boolean(item.isAssignedToUser)
  }));

  // Synthesize sentinel message object so UI empty-state check passes
  const syntheticMessages = normalizedItems.length > 0 ? [{ id: 1, sender: 'Groq', text: '(conversation processed)' }] : [];

  return {
    messages: syntheticMessages,
    summary: normalizedSummary,
    items: normalizedItems
  };
}

function handleApiAnalyze(req, res) {
  return new Promise((resolve, reject) => {
    readRequestBody(req)
      .then(async rawBody => {
        try {
          const payload = rawBody ? JSON.parse(rawBody) : {};
          const text = typeof payload.text === 'string' ? payload.text : '';
          const userName = typeof payload.userName === 'string' ? payload.userName : '';

          if (!text.trim()) {
            sendJson(res, 400, { error: 'No conversation text provided.' });
            return resolve();
          }

          const charCount = text.length;
          const model = process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;
          console.log(`[API] /api/analyze — ${charCount} chars, user="${userName || '(none)'}"`);
          console.log(`[API] Calling Groq API (${model})…`);

          const result = await analyzeWithGroq(text, userName);
          console.log(`[API] Groq OK — ${result.items.length} items extracted.`);
          sendJson(res, 200, result);
          resolve();
        } catch (error) {
          console.error('[API] Analysis failed:', error.message);
          sendJson(res, 500, { error: error.message || 'Failed to analyze conversation.' });
          resolve();
        }
      })
      .catch(reject);
  });
}

function serveFile(res, relativePath) {
  const target = safeResolve(path.join(ROOT_DIR, relativePath.replace(/^\//, '')));
  if (!target || !fs.existsSync(target)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const stats = fs.statSync(target);
  if (stats.isDirectory()) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'POST' && url.pathname === '/api/analyze') {
    handleApiAnalyze(req, res).catch(error => {
      sendJson(res, 500, { error: error.message || 'Unexpected server error.' });
    });
    return;
  }

  const requestedPath = url.pathname === '/' ? '/catchup.html' : url.pathname;
  serveFile(res, requestedPath);
});

server.listen(PORT, () => {
  console.log(`CatchUp live server running at http://localhost:${PORT}`);
});
