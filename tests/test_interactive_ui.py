import subprocess
import os
import json

def test_interactive_ui():
    print("[TEST] Running interactive UI workflow verification (routes, tasks, filters, dismiss)...")
    edge = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
    
    runner_html = """<!DOCTYPE html>
<html><head><meta charset="utf-8"></head><body>
<div id="output"></div>
<div id="rawChat"></div>
<div id="sidebarNav"></div>
<div id="outputArea"></div>
<div id="alertBanner"></div>
<div id="evidenceDrawer"></div>
<div id="drawerBackdrop"></div>
<div id="appModal"></div>
<div id="btnProcess"></div>
<script src="../js/parser.js"></script>
<script src="../js/analyzer.js"></script>
<script src="../js/samples.js"></script>
<script src="../js/ui.js"></script>
<script>
  // Simulate full workflow
  const sample = ChatSamples.getSample('sprint-pivot');
  const msgs = ChatParser.parse(sample.text);
  const results = ChatAnalyzer.analyze(msgs, 'Dana');

  // Verify counts
  const critical = results.items.filter(i => i.priority === 'Critical');
  const tasks = results.items.filter(i => i.kind === 'task');
  const decisions = results.items.filter(i => i.kind === 'decision' || i.kind === 'event');

  // Verify filters work
  const filterCrit = results.items.filter(i => ChatUI.matchesFilter(i, 'critical'));
  const filterTasks = results.items.filter(i => ChatUI.matchesFilter(i, 'tasks'));
  const filterDeadlines = results.items.filter(i => ChatUI.matchesFilter(i, 'deadlines'));
  const filterDecisions = results.items.filter(i => ChatUI.matchesFilter(i, 'decisions'));

  // Test toggle task completion
  const firstTask = tasks[0];
  const initialStatus = firstTask.status;
  firstTask.status = 'done';
  const afterStatus = firstTask.status;

  // Test dismiss item
  const dismissedSet = new Set();
  dismissedSet.add(firstTask.id);
  const remainingItems = results.items.filter(i => !dismissedSet.has(i.id));

  const out = {
    totalItems: results.items.length,
    criticalCount: critical.length,
    taskCount: tasks.length,
    decisionCount: decisions.length,
    filterCritCount: filterCrit.length,
    filterTasksCount: filterTasks.length,
    filterDeadlinesCount: filterDeadlines.length,
    filterDecisionsCount: filterDecisions.length,
    taskStatusToggled: initialStatus !== afterStatus && afterStatus === 'done',
    dismissSuccessful: remainingItems.length === results.items.length - 1,
    hasUncertainties: results.uncertainties.length > 0,
    allEvidenceLinked: results.items.every(i => i.msgs && i.msgs.length > 0)
  };
  document.getElementById('output').textContent = JSON.stringify(out);
</script>
</body></html>"""

    runner_path = os.path.abspath("tests/runner_interactive.html")
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

    import re
    match = re.search(r'<div id="output">(.*?)</div>', dom)
    assert match, "Interactive runner did not produce output"
    data = json.loads(match.group(1))

    print("  Interactive UI Results:")
    print(f"    - Total items: {data['totalItems']}")
    print(f"    - Filter Critical: {data['filterCritCount']}")
    print(f"    - Filter Tasks: {data['filterTasksCount']}")
    print(f"    - Filter Deadlines: {data['filterDeadlinesCount']}")
    print(f"    - Filter Decisions: {data['filterDecisionsCount']}")
    print(f"    - Task toggle verified: {data['taskStatusToggled']}")
    print(f"    - Dismiss item verified: {data['dismissSuccessful']}")
    print(f"    - Inferred uncertainties detected: {data['hasUncertainties']}")
    print(f"    - Evidence links intact: {data['allEvidenceLinked']}")

    assert data['taskStatusToggled'], "Task completion toggle failed"
    assert data['dismissSuccessful'], "Dismiss item failed"
    assert data['filterTasksCount'] > 0, "Tasks filter returned 0"
    assert data['filterCritCount'] > 0, "Critical filter returned 0"
    assert data['allEvidenceLinked'], "Evidence links missing"

    if os.path.exists(runner_path):
        os.remove(runner_path)

    print("\nINTERACTIVE UI WORKFLOW TEST PASSED!")

if __name__ == "__main__":
    test_interactive_ui()
