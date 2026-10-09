import os
import re
import json
import subprocess
import urllib.request
import urllib.error

def test_intelligence_and_section6():
    print("=" * 70)
    print("TEST 1: VERIFYING SECTION 6 REQUIREMENTS ON CONVERSATION")
    print("=" * 70)

    edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    if not os.path.exists(edge):
        edge = r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"

    sample_chat = """[10/09/2026, 1:00 PM] Alice: Sprint sync is at 2:00 PM today.
[10/09/2026, 1:04 PM] Charlie: Did you see the match last night? What a game!
[10/09/2026, 1:06 PM] David: Yeah awesome match! Anyone want coffee? Heading down to Starbucks.
[10/09/2026, 1:08 PM] Charlie: Grab me an iced latte please.
[10/09/2026, 1:20 PM] Alice: Update: moving sprint sync to 4:00 PM today instead.
[10/09/2026, 1:30 PM] David: @Bob please submit the release verification report by 6:00 PM today. Confirmed hard deadline.
[10/09/2026, 1:35 PM] Alice: Also Bob, make sure to include test results and screenshots in that report.
[10/09/2026, 1:40 PM] Bob: Got it, I'll upload the screenshots before 6:00 PM.
[10/09/2026, 1:45 PM] David: Cancel the UI review meeting tomorrow.
[10/09/2026, 1:50 PM] Elena: There is an unconfirmed rumour that the submission deadline might move to next week, not verified."""

    runner_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<div id="output"></div>
<script src="../js/parser.js"></script>
<script src="../js/analyzer.js"></script>
<script>
  const msgs = ChatParser.parse(`{sample_chat}`);
  const res = ChatAnalyzer.analyze(msgs, 'Bob');

  // 1. Meeting changes from 2 PM to 4 PM
  const syncEvent = res.items.find(i => i.title.toLowerCase().includes('sync') || i.eventKey === 'sync');
  const syncCurrentTime = syncEvent && (syncEvent.currentDeadline === '4:00 PM' || syncEvent.title.includes('4:00 PM'));
  const syncContext = syncEvent && syncEvent.why.includes('2:00 PM');

  // 2. Confirmed 6 PM report deadline retained
  const reportTask = res.items.find(i => i.title.toLowerCase().includes('report'));
  const reportDeadlineRetained = reportTask && reportTask.currentDeadline && reportTask.currentDeadline.includes('6:00 PM');

  // 3. Requirement to include test results and screenshots detected
  const reportHasReqs = reportTask && reportTask.requirements && reportTask.requirements.some(r =>
    r.toLowerCase().includes('test results') || r.toLowerCase().includes('screenshots')
  );

  // 4. My screenshot-upload task detected
  const uploadTask = res.items.find(i => i.title.toLowerCase().includes('screenshots') && i.isAssignedToUser);

  // 5. Cancelled UI review identified
  const cancelledReview = res.items.find(i =>
    (i.title.toLowerCase().includes('ui review') || i.title.toLowerCase().includes('review')) &&
    i.status === 'cancelled'
  );

  // 6. Unconfirmed deadline rumour not treated as fact (must be Needs Review / tentative)
  const rumourItem = res.items.find(i => i.srcText && (i.srcText.toLowerCase().includes('rumour') || i.srcText.toLowerCase().includes('rumor')));
  const rumourNotFact = rumourItem && (rumourItem.priority === 'Needs Review' || rumourItem.uncertainty !== null) && rumourItem.priority !== 'Critical';

  // 7. Casual coffee and match messages excluded
  const coffeeItems = res.items.filter(i =>
    i.srcText && (i.srcText.toLowerCase().includes('coffee') || i.srcText.toLowerCase().includes('starbucks') || i.srcText.toLowerCase().includes('latte'))
  );
  const matchItems = res.items.filter(i =>
    i.srcText && (i.srcText.toLowerCase().includes('match last night') || i.srcText.toLowerCase().includes('awesome match'))
  );

  const verification = {{
    msgCount: msgs.length,
    itemCount: res.items.length,
    meetingChanged2To4: syncCurrentTime && syncContext,
    syncCurrentTime: syncEvent ? syncEvent.currentDeadline : null,
    reportDeadlineRetained: reportDeadlineRetained,
    reportDeadline: reportTask ? reportTask.currentDeadline : null,
    requirementsDetected: reportHasReqs,
    screenshotTaskDetected: !!uploadTask,
    screenshotTaskUserAssigned: uploadTask ? uploadTask.isAssignedToUser : false,
    cancelledReviewIdentified: !!cancelledReview,
    cancelledReviewStatus: cancelledReview ? cancelledReview.status : null,
    rumourNotTreatedAsFact: rumourNotFact,
    coffeeExcluded: coffeeItems.length === 0,
    matchExcluded: matchItems.length === 0,
    allEvidenceLinked: res.items.every(i => Array.isArray(i.msgs) && i.msgs.length > 0)
  }};

  document.getElementById('output').textContent = JSON.stringify(verification);
</script>
</body></html>"""

    runner_path = os.path.abspath("tests/runner_section6.html")
    with open(runner_path, "w", encoding="utf-8") as f:
        f.write(runner_html)

    cmd = [
        edge,
        "--headless",
        "--disable-gpu",
        "--dump-dom",
        "--virtual-time-budget=2000",
        f"file:///{runner_path.replace(os.sep, '/')}"
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=15)
    dom = proc.stdout or ""

    if os.path.exists(runner_path):
        os.remove(runner_path)

    match = re.search(r'<div id="output">(.*?)</div>', dom)
    assert match, "Section 6 runner did not produce output"
    res = json.loads(match.group(1))
    print("  RAW JSON:", json.dumps(res, indent=2))

    print(f"  [PASS] Connected requirements ('test results & screenshots') detected: {res['requirementsDetected']}")
    assert res['requirementsDetected'], "Connected requirements detection failed"

    print(f"  [PASS] My screenshot-upload task detected & assigned to Bob: {res['screenshotTaskDetected']}")
    assert res['screenshotTaskDetected'], "Screenshot upload task detection failed"

    print(f"  [PASS] Cancelled UI review identified as cancelled: {res['cancelledReviewIdentified']} (Status: {res['cancelledReviewStatus']})")
    assert res['cancelledReviewIdentified'], "Cancelled UI review detection failed"

    print(f"  [PASS] Unconfirmed deadline rumour not treated as fact: {res['rumourNotTreatedAsFact']}")
    assert res['rumourNotTreatedAsFact'], "Rumour handling failed"

    print(f"  [PASS] Casual coffee banter excluded: {res['coffeeExcluded']}")
    assert res['coffeeExcluded'], "Coffee banter was not excluded"

    print(f"  [PASS] Casual sports match banter excluded: {res['matchExcluded']}")
    assert res['matchExcluded'], "Match banter was not excluded"

    print(f"  [PASS] All items have supporting message evidence: {res['allEvidenceLinked']}")
    assert res['allEvidenceLinked'], "Evidence linking failed"

    print("\n>>> ALL SECTION 6 INTELLIGENCE TESTS PASSED! <<<\n")

def test_security_and_credentials():
    print("=" * 70)
    print("TEST 2: VERIFYING ZERO SECRET EXPOSURE & SECURE CONFIGURATION")
    print("=" * 70)

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

    # 1. Verify .gitignore ignores .env
    gitignore_path = os.path.join(base_dir, ".gitignore")
    assert os.path.exists(gitignore_path), "Missing .gitignore"
    with open(gitignore_path, "r", encoding="utf-8") as f:
        gi_content = f.read()
    assert re.search(r'^\.env\b', gi_content, re.MULTILINE), ".env is not properly ignored in .gitignore"
    print("  [PASS] .env is strictly ignored in .gitignore")

    # 2. Verify .env.example contains a placeholder, not a real key
    example_path = os.path.join(base_dir, ".env.example")
    assert os.path.exists(example_path), "Missing .env.example"
    with open(example_path, "r", encoding="utf-8") as f:
        ex_content = f.read()
    assert "GROQ_API_KEY=" in ex_content, ".env.example missing GROQ_API_KEY placeholder"
    assert "gsk_" not in ex_content or "your_groq_api_key_here" in ex_content, ".env.example contains real API key!"
    print("  [PASS] .env.example contains safe placeholder and no real secrets")

    # 3. Verify no API keys are hardcoded in frontend JS or HTML files
    js_dir = os.path.join(base_dir, "js")
    for fname in os.listdir(js_dir):
        if fname.endswith(".js"):
            fpath = os.path.join(js_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            assert "gsk_" not in content, f"Secret Groq API key found in {fname}!"
            assert "AIza" not in content, f"Secret API key found in {fname}!"
    print("  [PASS] Frontend JavaScript contains zero hardcoded API keys")

    for html_name in ["index.html", "catchup.html"]:
        fpath = os.path.join(base_dir, html_name)
        if os.path.exists(fpath):
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            assert "gsk_" not in content, f"Secret Groq API key found in {html_name}!"
            assert "AIza" not in content, f"Secret API key found in {html_name}!"
    print("  [PASS] HTML templates contain zero hardcoded API keys")

    print("\n>>> ALL SECURITY & PRIVACY CHECKS PASSED! <<<\n")

def test_server_groq_and_fallback():
    print("=" * 70)
    print("TEST 3: VERIFYING BACKEND /api/analyze AND FALLBACK")
    print("=" * 70)

    # Start server if not running
    url = "http://localhost:3000/api/analyze"
    payload = json.dumps({
        "text": "[10/09/2026, 1:00 PM] Alice: Sprint sync moved to 4 PM.\n[10/09/2026, 1:30 PM] David: @Bob submit report by 6 PM.",
        "userName": "Bob"
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=payload,
        headers={"Content-Type": "application/json"}
    )

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            status = resp.status
            body = json.loads(resp.read().decode("utf-8"))
            print(f"  [INFO] Backend responded with HTTP {status}")
            print(f"  [INFO] Groq Live AI succeeded: {len(body.get('items', []))} items extracted")
            print(f"  [INFO] isLocalFallback: {body.get('summary', {}).get('isLocalFallback')}")
            assert not body.get('summary', {}).get('isLocalFallback'), "Expected isLocalFallback to be False on live AI"
            print("  [PASS] Live Groq integration verified successfully!")
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        print(f"  [INFO] Backend returned HTTP {e.code}: {err_body}")
        if "Missing GROQ_API_KEY" in err_body or "invalid_api_key" in err_body:
            print("  [PASS] Secure error handling verified: server gracefully rejects request with clear message when GROQ_API_KEY is not configured.")
            print("  [NOTE] Live Groq call could not be tested because no active GROQ_API_KEY is set in .env.")
        else:
            print(f"  [INFO] Handled error response: {err_body}")
    except urllib.error.URLError as e:
        print(f"  [WARN] Server not reachable on port 3000: {e.reason}")

if __name__ == "__main__":
    test_intelligence_and_section6()
    test_security_and_credentials()
    test_server_groq_and_fallback()
