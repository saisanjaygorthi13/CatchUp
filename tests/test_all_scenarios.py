import subprocess
import os
import json

def test_all_scenarios():
    print("[TEST] Running automated scenario verification across all 4 built-in datasets...")
    edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    html_path = os.path.abspath("index.html").replace(os.sep, "/")
    url = f"file:///{html_path}"

    scenarios = [
        ("sprint-pivot", "Sync shifted", "Sushi Zen", "Dana"),
        ("p0-incident", "Emergency incident", "v2.4.1", "Maya"),
        ("hackathon-crunch", "Pitch practice call", "README", "Leo"),
        ("offsite-travel", "dinner shifted", "Airbnb", "Chloe")
    ]

    for sc_id, phrase1, phrase2, assignee in scenarios:
        # Create a tiny runner HTML that loads the specific scenario
        runner_html = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<div id="output"></div>
<script src="../js/parser.js"></script>
<script src="../js/analyzer.js"></script>
<script src="../js/samples.js"></script>
<script>
  const sample = ChatSamples.getSample("{sc_id}");
  const msgs = ChatParser.parse(sample.text);
  const res = ChatAnalyzer.analyze(msgs, sample.recommendedUser);
  const out = {{
    msgCount: msgs.length,
    itemsCount: res.items.length,
    criticalCount: res.items.filter(i => i.priority === 'Critical').length,
    tasksCount: res.items.filter(i => i.kind === 'task').length,
    uncertaintiesCount: res.uncertainties.length,
    hasAssignee: res.items.some(i => i.assignee && i.assignee.toLowerCase().includes("{assignee.lower()}")),
    hasEvidence: res.items.every(i => Array.isArray(i.msgs) && i.msgs.length > 0),
    summary: res.summary.narrative,
    keyPoints: res.summary.keyPoints
  }};
  document.getElementById('output').textContent = JSON.stringify(out);
</script>
</body></html>"""
        runner_path = os.path.abspath(f"tests/runner_{sc_id}.html")
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
        dom = proc.stdout
        
        # Extract json inside <div id="output">...</div>
        import re
        match = re.search(r'<div id="output">(.*?)</div>', dom)
        assert match, f"Scenario {sc_id} did not produce JSON output"
        data = json.loads(match.group(1))

        print(f"  Verifying {sc_id}:")
        print(f"    - Messages: {data['msgCount']}")
        print(f"    - Extracted Items: {data['itemsCount']}")
        print(f"    - Tasks: {data['tasksCount']}")
        print(f"    - Uncertainties: {data['uncertaintiesCount']}")
        print(f"    - Every item has linked evidence: {data['hasEvidence']}")
        print(f"    - Targeted assignee detected ({assignee}): {data['hasAssignee']}")

        assert data["msgCount"] >= 8, f"Too few messages parsed in {sc_id}"
        assert data["itemsCount"] >= 3, f"Too few items extracted in {sc_id}"
        assert data["hasEvidence"], f"Evidence linking missing in {sc_id}"
        assert data["hasAssignee"], f"Expected assignee {assignee} missing in {sc_id}"
        assert len(data["keyPoints"]) > 0, f"No key summary points for {sc_id}"

        # Clean up runner file
        if os.path.exists(runner_path):
            os.remove(runner_path)

    print("\nALL 4 SCENARIOS PASSED WITH HIGH-FIDELITY EXTRACTION & EVIDENCE LINKING!")

if __name__ == "__main__":
    test_all_scenarios()
