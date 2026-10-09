You are my senior full-stack engineer and hackathon teammate. We have only 3 hours left, so prioritize a working, polished, demo-ready product over unnecessary complexity.

PROJECT: CatchUp — an AI micro-app for "The Unread Problem: What Did I Miss?"

IMPORTANT RULES:

* Work directly inside my currently opened project directory.
* Inspect all existing files before changing anything.
* Preserve useful existing code and functionality. Do not throw away working code without a reason.
* Do not create a separate standalone HTML file outside the project or just print code in your response. Implement changes directly in the actual project files.
* Detect the existing stack and use it unless there is a compelling technical reason to change it.
* If the project is currently a single HTML/CSS/JavaScript prototype, improve it in place or split it into maintainable files without breaking it.
* Do not waste time asking me questions. Make sensible engineering decisions and proceed.
* Do not claim something works until you have tested it.

CORE PRODUCT:
Users import or paste a long unread group conversation. CatchUp produces:

1. A concise catch-up summary.
2. Critical, Important and Informational items.
3. Action items with assignees when explicitly identifiable.
4. Deadlines and meeting changes.
5. Decisions, cancellations, direct mentions and unanswered questions.
6. Evidence linking every extracted item to its original message.
7. A list of uncertainties where information is incomplete or contradictory.

PRIVACY:

* Make the core demo work without sending conversation content to an external server or AI API.
* Implement a local-first processing pipeline. Do not add remote AI APIs, analytics, telemetry or external data uploads.
* Clearly document any browser storage used and its limitations.

FIRST, inspect the project, identify its stack and current functionality, and provide a short implementation plan. Then immediately implement the working application inside the existing project. Do not stop after producing the plan.

Keep the implementation simple enough to finish and test within this hackathon. Avoid unnecessary dependencies and complex infrastructure.




Now improve CatchUp's entire UI directly in my existing project files.

DESIGN DIRECTION:
Build a premium, modern productivity SaaS interface. Think Linear-level clarity with a distinctive conversation-intelligence dashboard.

VISUAL STYLE:

* Dark graphite background: #101114.
* Slightly lighter surfaces: #181A20.
* Subtle borders: #2A2D36.
* Violet primary accent: #9B87F5.
* Red/orange for genuinely urgent information.
* Green for completed tasks.
* Soft typography, generous spacing, consistent alignment, restrained shadows and smooth micro-interactions.
* Use a consistent spacing system, rounded cards and polished hover/focus states.
* Use Lucide icons if already available; otherwise use existing assets or simple inline SVG icons.
* Avoid emoji-heavy interfaces, excessive gradients, giant headings, unnecessary animations and generic chatbot layouts.

BUILD THESE SCREENS/SECTIONS:

1. APP SHELL

* CatchUp logo and tagline: "Your chats moved on. You shouldn't have to scroll back."
* Navigation: Overview, Action Items, Decisions, Settings.
* A clear privacy indicator showing whether processing is local.

2. OVERVIEW DASHBOARD

* A prominent "Catch up now" section.
* A large conversation import/paste area.
* A "Process conversation" button with a loading state.
* Small summary cards for Critical, Important and Pending items.
* A readable "What you missed" feed.
* A "Your next actions" section.

3. RESULTS EXPERIENCE

* A concise summary at the top.
* Critical items first, followed by Important and Informational items.
* Each item must show its category, priority, source speaker, original message excerpt, timestamp if available, and an explanation of why it matters.
* Clearly separate confirmed facts from inferred or uncertain information.
* Include filters for All, Critical, Tasks, Deadlines and Decisions.
* Add functional dismiss/mark-done controls where appropriate.

4. EMPTY, LOADING AND ERROR STATES

* Make the first-use experience attractive.
* Show an example conversation users can load with one click.
* Add a processing indicator and useful error messages.
* Never show fake progress that does not reflect actual work.

5. RESPONSIVENESS

* Support desktop and mobile widths.
* Ensure buttons, navigation, filters and import controls actually work.
* Use accessible contrast and visible keyboard focus.

Use the existing project stack. Do not create a disconnected mockup or replace functional logic with static sample cards. Connect every UI element to real application state and existing backend logic.

After implementing the redesign, run the application, inspect the rendered UI if possible, fix layout issues and test the main workflow. Report which files you changed and what you verified.






You are a senior frontend engineer and AI product engineer. Improve my EXISTING CatchUp project directly. We have very little time before the hackathon deadline, so be efficient and make actual code changes.

CRITICAL RULES:

* Inspect the existing HTML, CSS and JavaScript first.
* Modify the existing project files in place. Do NOT create a new standalone app or duplicate the project.
* Preserve working functionality. Do not rewrite everything from scratch.
* Keep the implementation lightweight, dependency-free where possible, and compatible with the current setup.
* Do not spend tokens explaining your plan. Implement the changes, test them, and report only the important results.
* Do not replace functional logic with hardcoded demo results.

PART 1 — FIX THE INTELLIGENCE

CatchUp helps users understand what they missed in long chat conversations.

Improve the existing local JavaScript analysis pipeline so it reliably detects:

1. Tasks and explicit instructions.
2. Deadlines, submission requirements and dependencies.
3. Meeting time/date changes.
4. Decisions and commitments.
5. Cancellations and superseded instructions.
6. Direct mentions and personal action items.
7. Contradictions and ambiguous information.
8. Important updates buried in irrelevant discussion.

Implement these improvements:

* Parse messages into speaker, timestamp and text where possible.
* Use the original message as evidence for every extracted item.
* Detect the relationship between messages, not just keywords. For example, if a report is due at 6 PM and another message says to include test results in that report, connect those requirements without inventing new facts.
* When a meeting changes from 3 PM to 4 PM, show 4 PM as the current time and retain the earlier message as context.
* When a task is cancelled, do not continue presenting it as an active task.
* Deduplicate repeated tasks while preserving meaningful updates.
* Never invent dates, assignees, deadlines or decisions.
* Use a "Needs review" category for uncertain or contradictory information.
* Make priority explainable and proportional to urgency and consequences. Do not label every task Critical.
* If an action is explicitly assigned to the user, highlight it separately from general group tasks.
* Make results respond to the actual conversation input.

Keep processing local. Do not add external APIs, cloud LLMs, analytics or remote uploads.

PART 2 — REDESIGN THE UI

The current UI looks mediocre. Make it look like a polished, premium productivity application, not a generic AI dashboard.

Visual direction:

* Dark charcoal background (#101114).
* Elevated dark surfaces (#191B22).
* Subtle borders (#2A2D36).
* Violet accent (#9B87F5).
* Use red/orange only for genuinely urgent items, green for completed items and neutral gray for informational items.
* Clean typography, balanced spacing, consistent padding, aligned components and restrained shadows.
* Elegant, subtle hover states and transitions.
* Avoid excessive gradients, giant headings, excessive empty space, emoji decorations and too many cards.

Layout:

* A compact sidebar or top navigation with CatchUp branding.
* A clear heading: "What did you miss?"
* A prominent conversation input/import panel with a visible Process button.
* A clean results dashboard with summary, priority counts and a readable list of extracted items.
* Each result should show its title, priority, source speaker, original message evidence, and reason for its classification.
* Group results into Critical, Important, Informational and Needs Review.
* Show action items with usable completion controls.
* Clearly distinguish changed decisions and cancelled tasks.
* Make empty, loading, error and completed states visually consistent.
* Ensure the layout works on desktop and mobile.
* Keep the UI compact, intentional and readable. Avoid making everything a separate card.

PART 3 — FUNCTIONALITY AND TESTING

* Every visible button, filter, navigation item and checkbox must perform its intended action.
* Do not use static mock results as the output of processing.
* Provide a one-click synthetic demo conversation if one already exists; improve it rather than adding redundant demo systems.
* Test the app with a conversation containing a changed meeting time, a report deadline, an instruction to include test results, a cancellation, a direct mention and irrelevant messages.
* Verify that all expected items are detected and that their evidence points to the correct original messages.
* Test a different input to ensure the output changes.
* Fix console errors and obvious layout defects.
* Do not claim tests passed unless you actually ran them.

PRIORITY ORDER:

1. Correct detection and evidence.
2. Clean, attractive UI.
3. Working interactions.
4. Final testing.

Implement the changes directly in the existing files now. Keep the code concise and avoid unnecessary abstractions or dependencies. At the end, give me a brief report of the files changed, bugs fixed and tests actually performed.





Act as a senior full-stack engineer. Integrate the **Google Gemini API** into my existing CatchUp project so that chat analysis uses a real AI model instead of mock data, hardcoded outputs, or rule-based fallback results.

### 1. Inspect before editing

* Inspect the entire existing project, especially `server.js`, `catchup.html`, and any existing API or analysis code.
* Reuse the current architecture and UI. Do not rebuild the app from scratch.
* Identify whether Gemini integration already exists and fix or complete it instead of duplicating it.

### 2. Connect the real Gemini API

* Use the official Google Gemini API.
* Read `GEMINI_API_KEY` from the project's `.env` file on the **server side only**.
* Never expose the API key in frontend JavaScript, HTML, browser requests, logs, or GitHub.
* Use a currently supported Gemini model and the official API endpoint.
* Create or fix a backend endpoint such as `POST /api/analyze`.
* Send the actual conversation text entered by the user to Gemini. Do not send only a sample or hardcoded conversation.
* Request structured JSON output containing:

  * `title`
  * `summary`
  * `priority` (Critical, Important, or Pending)
  * `category`
  * `owner`
  * `deadline`
  * `evidence` (exact supporting message from the conversation)
  * `confidence` or uncertainty explanation
  * `action_items`
* Detect deadline changes, cancellations, decisions, direct mentions, assigned tasks, conflicting information, and unconfirmed rumours. Prefer the latest explicitly confirmed information.
* Never invent deadlines, owners, or evidence. Mark unclear information as unconfirmed.

### 3. Connect the UI to the backend

* When the user clicks Analyze, send their actual pasted conversation to `/api/analyze`.
* Display the real response dynamically in the existing CatchUp interface.
* Add loading, error, retry, and empty-input states.
* If the API fails or the key is missing, clearly tell the user that AI analysis failed. You may offer the existing local fallback, but label it clearly as **Local analysis**. Never pretend fallback results came from Gemini.
* Preserve all existing filters, evidence links, task completion, sample datasets, and visual styling.

### 4. Configure the project safely

* Ensure `.env` is loaded correctly by the backend.
* Check whether required packages are installed and update `package.json` only if needed.
* Add `.env` to `.gitignore`. Provide an `.env.example` containing a placeholder, never my real key.
* Do not ask me to paste my API key into chat or hardcode it into source files.

### 5. Verify it actually works

* Run the available tests and fix regressions.
* Check the browser's Network tab and backend logs to verify that Analyze calls my backend and that the backend actually calls Google's Gemini API with the conversation text.
* Test a unique conversation that is not included in the sample datasets.
* Distinguish a successful Gemini response from local fallback output.
* If Node.js is unavailable, tell me exactly what I need to install rather than pretending the app has been tested.

### Final requirements

Make the changes directly in my existing project files. Do not just give me instructions or a code example. When finished, report:

1. Files changed.
2. Which Gemini model and endpoint are configured.
3. How to run the app.
4. How to verify that live Gemini analysis is working.
5. Any remaining errors or setup steps.

**Important:** Do not claim the integration works unless you have actually tested it. Preserve my existing app and avoid unnecessary rewrites.






Fix the Gemini AI analysis error in my existing CatchUp project.

Current error: "AI analysis unavailable (This model models/gemini-2.0-flash is no longer available. Please update your code to use models/gemini-3.8-flash...)". The app falls back to local rule-based analysis.

1. Inspect the existing Gemini integration and identify exactly where the model name and API request are configured.
2. Verify the currently supported Gemini model ID and API method using the official Google Gemini API documentation. Do not guess model names.
3. Update the integration with the correct supported model and request format.
4. Preserve the local rule-based fallback so the app remains functional if Gemini is unavailable.
5. Inspect how the API key is supplied. Never hardcode a real API key into browser JavaScript or commit it to Git.
6. If secure API access requires a backend, explain the smallest practical solution rather than pretending a frontend key is secure.
7. Test both the Gemini success path and the fallback path, and report which tests were actually performed.

Do not redesign the UI or rewrite unrelated detection logic. Make the smallest safe changes possible.




## Task: Fix CatchUp AI — Migrate from Gemini to Groq

My CatchUp hackathon app currently uses Google Gemini, but AI analysis fails with a high-demand error. It falls back to local rule-based analysis.

I want you to migrate the AI integration to Groq while preserving all existing functionality.

### 1. Inspect before editing

* Inspect the existing project files and identify exactly how Gemini is called.
* Identify the current request format, prompt, response parsing, and fallback logic.
* Do not rebuild the application or rewrite unrelated files.

### 2. Integrate Groq

* Replace the Gemini integration with Groq's official API.
* Use the OpenAI-compatible Chat Completions endpoint:
  https://api.groq.com/openai/v1/chat/completions
* Verify a currently supported model ID using https://console.groq.com/docs/models. Do not guess or use deprecated models.
* Preserve the existing analysis instructions and expected output structure.
* Parse the response reliably and handle malformed responses.

### 3. Configure the API key securely

* Use an environment variable named GROQ_API_KEY.
* NEVER hardcode the key into HTML, frontend JavaScript, or source files.
* If this project is currently a standalone HTML file, implement the smallest practical backend needed to call Groq securely.
* Provide a .env.example containing a placeholder, not a real key.
* Add .env to .gitignore.
* Never print, log, or expose the secret in API responses or browser developer tools.
* Explain exactly how I should configure the key and run the app locally.

### 4. Preserve CatchUp's core functionality

Keep all existing features working:

* Detect tasks and task owners.
* Identify deadlines and distinguish confirmed deadlines from rumours.
* Detect meeting time changes and cancellations.
* Detect direct mentions and personal action items.
* Identify important submission requirements.
* Include supporting message evidence.
* Exclude irrelevant casual conversations.
* Preserve the existing UI and result structure.
* Keep local rule-based analysis as a fallback if Groq fails.

### 5. Error handling

Handle invalid API keys, rate limits, network failures, server errors, and malformed responses gracefully. Display a clear status showing whether analysis used Groq or the local fallback. Never claim AI analysis succeeded if it did not.

### 6. Test before finishing

Use the existing sample conversation and verify:

* The meeting changes from 2 PM to 4 PM.
* The confirmed 6 PM report deadline is retained.
* The requirement to include test results and screenshots is detected.
* My screenshot-upload task is detected.
* The cancelled UI review is identified.
* The unconfirmed deadline rumour is not treated as fact.
* Casual coffee and match messages are excluded.

Test the Groq integration if credentials are available. If no API key is configured, clearly state that the live AI request could not be tested. Do not fabricate successful test results.

### Final instructions

Make the smallest safe changes necessary. After implementation, tell me:

1. Which files changed.
2. How to set GROQ_API_KEY.
3. Exactly how to start the app.
4. Which tests passed and failed.
5. Whether it is safe to push the project to a public GitHub repository.

Do not redesign the UI or remove any working features.

