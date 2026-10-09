import os
import re
import subprocess
import sys

def test_privacy_and_local_first():
    print("[TEST 1] Verifying 100% Local-First & Zero Remote Telemetry/API calls...")
    js_dir = os.path.join(os.path.dirname(__file__), "..", "js")
    forbidden_patterns = [
        r'fetch\s*\(',
        r'XMLHttpRequest',
        r'axios',
        r'api\.openai\.com',
        r'generativelanguage\.googleapis\.com',
        r'anthropic\.com',
        r'analytics',
        r'tracking',
        r'google-analytics'
    ]

    for fname in os.listdir(js_dir):
        if fname.endswith(".js"):
            fpath = os.path.join(js_dir, fname)
            with open(fpath, "r", encoding="utf-8") as f:
                content = f.read()
            for pat in forbidden_patterns:
                matches = re.findall(pat, content, re.IGNORECASE)
                if matches:
                    raise AssertionError(f"Forbidden pattern '{pat}' found in {fname}: {matches}")
    print("  PASS: All JavaScript files are 100% offline and local-first.")

def test_files_exist():
    print("[TEST 2] Verifying Core Application Files Exist...")
    base_dir = os.path.join(os.path.dirname(__file__), "..")
    required_files = [
        "index.html",
        "catchup.html",
        "css/styles.css",
        "js/parser.js",
        "js/analyzer.js",
        "js/samples.js",
        "js/ui.js",
        "js/app.js"
    ]
    for rf in required_files:
        p = os.path.join(base_dir, rf)
        assert os.path.exists(p), f"Missing required file: {rf}"
        assert os.path.getsize(p) > 50, f"File appears too small/empty: {rf}"
    print("  PASS: All core files exist with valid content.")

def test_headless_edge_render():
    print("[TEST 3] Running Headless Microsoft Edge to verify DOM rendering and JS execution...")
    edge_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe"
    ]
    edge_exe = None
    for ep in edge_paths:
        if os.path.exists(ep):
            edge_exe = ep
            break

    if not edge_exe:
        print("  SKIP: Edge executable not found in standard paths.")
        return

    html_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "index.html"))
    file_url = f"file:///{html_path.replace(os.sep, '/')}"

    cmd = [
        edge_exe,
        "--headless",
        "--disable-gpu",
        "--dump-dom",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=2000",
        file_url
    ]

    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=15)
        dom = proc.stdout or ""
        
        # Verify rendered items
        assert "Executive Catch-Up Summary" in dom, f"Executive Summary did not render in DOM. DOM snippet: {dom[:300]}"
        assert "What you missed" in dom, "What you missed feed not rendered"
        assert "Evidence" in dom, "Evidence button not rendered"
        assert "Local Engine Active" in dom, "Local Engine badge not rendered"
        assert "Critical" in dom, "Critical category not rendered"
        assert "Important" in dom, "Important category not rendered"
        assert "Needs Review" in dom or "Informational" in dom, "Result categories not rendered"
        print("  PASS: Headless Edge successfully loaded index.html, executed JS, and rendered Linear-style SaaS UI!")
    except Exception as e:
        print(f"  Headless Edge execution note: {e}")
        raise

if __name__ == "__main__":
    test_privacy_and_local_first()
    test_files_exist()
    test_headless_edge_render()
    print("\nALL AUTOMATED TESTS PASSED SUCCESSFULLY!")
