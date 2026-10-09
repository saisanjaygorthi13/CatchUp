/**
 * CatchUp — Main Application Controller (High-Density Linear Edition)
 * Orchestrates parsing, relational NLP analysis, grouped rendering,
 * and stateful task completion/dismissal.
 */

(function () {
  'use strict';

  const State = {
    activeRoute: 'overview', // 'overview' | 'tasks' | 'decisions' | 'settings'
    activeFilter: 'all',    // 'all' | 'critical' | 'tasks' | 'deadlines' | 'decisions'
    searchQuery: '',
    rawText: '',
    messages: [],
    items: [],
    summary: null,
    dismissedIds: new Set(),
    selectedId: null,
    userName: 'Bob',
    theme: 'dark',
    isLoading: false,
    scenarioId: null
  };

  const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const el = {
    rawChat: document.getElementById('rawChat'),
    btnProcess: document.getElementById('btnProcess') || document.getElementById('btnAnalyze'),
    btnUpload: document.getElementById('btnUpload'),
    fileInput: document.getElementById('fileInput'),
    ingestCard: document.getElementById('ingestCard') || document.getElementById('inputCard'),
    userIdentity: document.getElementById('userIdentity'),
    outputArea: document.getElementById('outputArea'),
    alertBanner: document.getElementById('alertBanner') || document.getElementById('alertBox'),
    scenarioList: document.getElementById('scenarioList'),
    btnTheme: document.getElementById('btnTheme'),
    btnPrivacyDetails: document.getElementById('btnPrivacyDetails') || document.getElementById('btnPrivacy'),
    btnClearData: document.getElementById('btnClearData') || document.getElementById('btnClear'),
    appModal: document.getElementById('appModal') || document.getElementById('privacyModal'),
    drawerBackdrop: document.getElementById('drawerBackdrop'),
    evidenceDrawer: document.getElementById('evidenceDrawer')
  };

  /* ================== INITIALIZATION ================== */

  function init() {
    loadPreferences();
    setupEventListeners();
    renderScenarios();
    renderAppShell();
  }

  function loadPreferences() {
    try {
      const savedTheme = localStorage.getItem('catchup_theme');
      if (savedTheme) {
        setTheme(savedTheme);
      } else {
        setTheme('dark');
      }

      const savedName = localStorage.getItem('catchup_user_name');
      if (savedName && el.userIdentity) {
        el.userIdentity.value = savedName;
        State.userName = savedName;
      }
    } catch (e) {
      console.warn('LocalStorage unavailable.');
    }
  }

  function setTheme(theme) {
    State.theme = theme;
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      if (el.btnTheme) el.btnTheme.innerHTML = `${window.ChatUI.ICONS.moon} <span>Dark</span>`;
    } else {
      document.documentElement.removeAttribute('data-theme');
      if (el.btnTheme) el.btnTheme.innerHTML = `${window.ChatUI.ICONS.sun} <span>Light</span>`;
    }
    try {
      localStorage.setItem('catchup_theme', theme);
    } catch (e) {}
  }

  function toggleTheme() {
    setTheme(State.theme === 'light' ? 'dark' : 'light');
  }

  /* ================== EVENT LISTENERS ================== */

  function setupEventListeners() {
    if (el.btnProcess) el.btnProcess.onclick = runAnalysis;

    if (el.btnUpload) el.btnUpload.onclick = () => el.fileInput.click();
    if (el.fileInput) el.fileInput.onchange = handleFileUpload;

    if (el.ingestCard) {
      el.ingestCard.ondragover = e => {
        e.preventDefault();
        el.ingestCard.classList.add('is-dragover');
      };
      el.ingestCard.ondragleave = () => {
        el.ingestCard.classList.remove('is-dragover');
      };
      el.ingestCard.ondrop = e => {
        e.preventDefault();
        el.ingestCard.classList.remove('is-dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          readFile(e.dataTransfer.files[0]);
        }
      };
    }

    if (el.userIdentity) {
      el.userIdentity.oninput = e => {
        State.userName = e.target.value.trim();
        try {
          localStorage.setItem('catchup_user_name', State.userName);
        } catch (err) {}
        if (State.messages.length) runAnalysis();
      };
    }

    if (el.btnTheme) el.btnTheme.onclick = toggleTheme;
    if (el.btnPrivacyDetails) el.btnPrivacyDetails.onclick = openSettingsModal;
    if (el.btnClearData) el.btnClearData.onclick = clearAllData;

    if (el.appModal) {
      el.appModal.onclick = e => {
        if (e.target === el.appModal) closeModal();
      };
    }

    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runAnalysis();
      }
      if (e.key === 'Escape') {
        closeDrawer();
        closeModal();
      }
    });
  }

  /* ================== DEMO SCENARIOS ================== */

  function renderScenarios() {
    if (!el.scenarioList || !window.ChatSamples) return;
    const samples = window.ChatSamples.SAMPLES;

    el.scenarioList.innerHTML = samples.map(s => `
      <button class="scenario-chip${s.id === State.scenarioId ? ' active' : ''}" data-id="${s.id}" title="${s.tagline}">
        <span>${s.title}</span>
      </button>
    `).join('');

    el.scenarioList.querySelectorAll('.scenario-chip').forEach(btn => {
      btn.onclick = () => loadScenario(btn.dataset.id);
    });
  }

  function loadScenario(scenarioId) {
    if (!window.ChatSamples) return;
    const sample = window.ChatSamples.getSample(scenarioId);
    if (!sample) return;

    State.scenarioId = sample.id;
    renderScenarios();

    if (el.rawChat) el.rawChat.value = sample.text;
    if (el.userIdentity && sample.recommendedUser) {
      el.userIdentity.value = sample.recommendedUser;
      State.userName = sample.recommendedUser;
    }

    hideAlert();
    runAnalysis();
  }

  /* ================== FILE IMPORT ================== */

  function handleFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    readFile(file);
    e.target.value = '';
  }

  function readFile(file) {
    hideAlert();
    if (file.size > 5 * 1024 * 1024) {
      showAlert('File is larger than 5 MB. Please upload a smaller slice.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => showAlert('Could not read file.');
    reader.onload = () => {
      if (el.rawChat) el.rawChat.value = reader.result;
      runAnalysis();
    };
    reader.readAsText(file);
  }

  /* ================== ANALYSIS PIPELINE ================== */

  function applyAnalysisResults(results) {
    if (!results) {
      return;
    }

    State.messages = Array.isArray(results.messages) ? results.messages : [];
    State.items = Array.isArray(results.items) ? results.items : [];
    State.summary = results.summary || null;
    State.dismissedIds.clear();
    State.isLoading = false;

    updateProcessLoading(false);
    renderAppShell();
  }

  function runAnalysis() {
    hideAlert();
    closeDrawer();

    const text = el.rawChat ? el.rawChat.value.trim() : '';
    if (!text) {
      showAlert('Please paste a group conversation, upload a text file, or select a demo scenario.');
      return;
    }

    State.rawText = text;
    State.isLoading = true;
    updateProcessLoading(true);

    fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, userName: State.userName })
    })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || 'Live analysis failed.');
        }

        applyAnalysisResults({
          messages: Array.isArray(payload.messages) ? payload.messages : [],
          items: Array.isArray(payload.items) ? payload.items : [],
          summary: payload.summary || null
        });
      })
      .catch(err => {
        console.warn('[CatchUp] Live Groq analysis failed; using local parser as fallback.', err);

        // Prominently tell the user this is local analysis, not Groq
        showAlert(
          'AI analysis unavailable (' + (err.message || 'network error') +
          '). Showing LOCAL analysis — results are rule-based, not from Groq.'
        );

        try {
          const parsed = window.ChatParser.parse(text);
          if (!parsed || !parsed.length) {
            throw new Error('No valid chat messages could be parsed. Ensure messages have speaker names or timestamps.');
          }

          const results = window.ChatAnalyzer.analyze(parsed, State.userName);
          // Tag the results so the UI can show the "Local analysis" badge
          if (results && results.summary) {
            results.summary.isLocalFallback = true;
          }
          applyAnalysisResults(results);
        } catch (localErr) {
          State.isLoading = false;
          updateProcessLoading(false);
          renderAppShell();
          showAlert('Analysis Error: ' + (localErr.message || err.message));
        }
      });
  }

  function updateProcessLoading(loading) {
    if (!el.btnProcess) return;
    if (loading) {
      el.btnProcess.disabled = true;
      el.btnProcess.innerHTML = `
        <span class="spinner-icon"></span>
        <span>Processing</span>
      `;
    } else {
      el.btnProcess.disabled = false;
      el.btnProcess.innerHTML = `
        ${window.ChatUI.ICONS.zap}
        <span>Process conversation</span>
      `;
    }
  }

  /* ================== ROUTING ================== */

  function onNavigate(route) {
    if (route === 'settings') {
      openSettingsModal();
      return;
    }
    State.activeRoute = route;
    renderAppShell();
  }

  function onFilterChange(filter) {
    State.activeFilter = filter;
    renderAppShell();
  }

  /* ================== VIEW RENDERING ================== */

  function renderAppShell() {
    const visibleItems = State.items.filter(i => !State.dismissedIds.has(i.id));
    const activeTasks = visibleItems.filter(i => i.kind === 'task' && i.status === 'open');
    const decisionsCount = visibleItems.filter(i => i.kind === 'decision' || i.kind === 'event').length;

    // Sidebar navigation
    window.ChatUI.renderNav(
      State.activeRoute,
      { total: visibleItems.length, tasks: activeTasks.length, decisions: decisionsCount },
      onNavigate
    );

    if (!el.outputArea) return;

    if (State.isLoading) {
      el.outputArea.innerHTML = `
        <div class="empty-box">
          <span class="spinner-icon"></span>
          <div class="empty-title">Analysing conversation</div>
          <div class="empty-desc">Live Groq AI analysis in progress.</div>
        </div>
      `;
      return;
    }

    if (!State.messages.length) {
      el.outputArea.innerHTML = `
        <div class="empty-box">
          ${window.ChatUI.ICONS.messageSquare}
          <div class="empty-title">Nothing to catch up on yet</div>
          <div class="empty-desc">
            Paste a group chat above, upload a log, or pick an example dataset.
          </div>
        </div>
      `;
      return;
    }

    // Route: Action Items Dedicated View
    if (State.activeRoute === 'tasks') {
      const allTasks = visibleItems.filter(i => i.kind === 'task');
      el.outputArea.innerHTML = `
        <div class="view-stack">
          <div class="panel-title">
            ${window.ChatUI.ICONS.checkSquare}
            <span>Action items <span class="panel-count">${allTasks.length}</span></span>
          </div>
          <div class="item-rows-list">
            ${allTasks.length ? allTasks.map(window.ChatUI.renderItemRow).join('') : '<div class="empty-box is-inline"><div class="empty-desc">No action items found.</div></div>'}
          </div>
        </div>
      `;
      bindItemEvents();
      return;
    }

    // Route: Decisions Dedicated View
    if (State.activeRoute === 'decisions') {
      const decs = visibleItems.filter(i => i.kind === 'decision' || i.kind === 'event');
      el.outputArea.innerHTML = `
        <div class="view-stack">
          <div class="panel-title">
            ${window.ChatUI.ICONS.target}
            <span>Decisions and schedule changes <span class="panel-count">${decs.length}</span></span>
          </div>
          <div class="item-rows-list">
            ${decs.length ? decs.map(window.ChatUI.renderItemRow).join('') : '<div class="empty-box is-inline"><div class="empty-desc">No decisions found.</div></div>'}
          </div>
        </div>
      `;
      bindItemEvents();
      return;
    }

    // Route: Overview Dashboard (Default)
    const myTasks = activeTasks.filter(i => i.isAssignedToUser);
    const filteredItems = visibleItems.filter(i =>
      window.ChatUI.matchesFilter(i, State.activeFilter) &&
      window.ChatUI.matchesSearch(i, State.searchQuery)
    );

    el.outputArea.innerHTML = `
      <!-- Metric Summary Bar: Critical, Important, Needs Review, Informational -->
      ${window.ChatUI.renderMetricCards(State.summary ? State.summary.counts : {})}

      <!-- Executive Catch-Up Summary / What you missed -->
      ${window.ChatUI.renderExecutiveDigest(State.summary)}

      <!-- Dedicated Assigned to You Section (if any) -->
      ${myTasks.length ? window.ChatUI.renderMyActions(myTasks) : ''}

      <!-- Filter Toolbar -->
      ${window.ChatUI.renderFilterToolbar(State.activeFilter, State.searchQuery, filteredItems.length)}

      <!-- Grouped Results: Critical, Important, Needs Review, Informational -->
      ${window.ChatUI.renderGroupedSections(filteredItems)}
    `;

    bindItemEvents();
  }

  /* ================== DOM INTERACTION BINDINGS ================== */

  function bindItemEvents() {
    const btnCopySummary = document.getElementById('btnCopyExecutiveSummary');
    if (btnCopySummary) {
      btnCopySummary.onclick = () => {
        if (!State.summary) return;
        const md = generateMarkdownExport();
        navigator.clipboard.writeText(md);
        btnCopySummary.innerHTML = `${window.ChatUI.ICONS.check} <span>Copied!</span>`;
        setTimeout(() => {
          if (btnCopySummary) btnCopySummary.innerHTML = `${window.ChatUI.ICONS.copy} <span>Copy Markdown</span>`;
        }, 1500);
      };
    }

    el.outputArea.querySelectorAll('.filter-btn').forEach(btn => {
      btn.onclick = () => onFilterChange(btn.dataset.filter);
    });

    const searchInp = document.getElementById('searchFilter');
    if (searchInp) {
      searchInp.oninput = e => {
        State.searchQuery = e.target.value.trim();
        renderAppShell();
        const fresh = document.getElementById('searchFilter');
        if (fresh) {
          fresh.focus();
          fresh.setSelectionRange(State.searchQuery.length, State.searchQuery.length);
        }
      };
    }

    el.outputArea.querySelectorAll('.item-row').forEach(row => {
      row.onclick = e => {
        if (e.target.closest('input[type="checkbox"]') || e.target.closest('.btn-dismiss-item')) return;
        const id = Number(row.dataset.id);
        const item = State.items.find(i => i.id === id);
        if (item) {
          State.selectedId = id;
          window.ChatUI.openEvidenceDrawer(item, State.messages, closeDrawer);
        }
      };
    });

    el.outputArea.querySelectorAll('.btn-evidence').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        const item = State.items.find(i => i.id === id);
        if (item) {
          State.selectedId = id;
          window.ChatUI.openEvidenceDrawer(item, State.messages, closeDrawer);
        }
      };
    });

    el.outputArea.querySelectorAll('.task-checkbox').forEach(chk => {
      chk.onchange = e => {
        e.stopPropagation();
        const id = Number(chk.dataset.id);
        toggleTask(id, chk.checked);
      };
    });

    el.outputArea.querySelectorAll('.btn-dismiss-item').forEach(btn => {
      btn.onclick = e => {
        e.stopPropagation();
        const id = Number(btn.dataset.id);
        dismissItem(id);
      };
    });
  }

  function toggleTask(id, isDone) {
    const item = State.items.find(i => i.id === id);
    if (item) {
      item.status = isDone ? 'done' : 'open';
      renderAppShell();
    }
  }

  function dismissItem(id) {
    State.dismissedIds.add(id);
    if (State.selectedId === id) closeDrawer();
    renderAppShell();
  }

  function closeDrawer() {
    State.selectedId = null;
    window.ChatUI.openEvidenceDrawer(null, State.messages);
  }

  /* ================== SETTINGS MODAL ================== */

  function openSettingsModal() {
    if (!el.appModal) return;
    el.appModal.innerHTML = window.ChatUI.renderSettingsModal(
      State.userName,
      savePersona,
      clearAllData
    );
    el.appModal.classList.add('open');

    const btnClose = document.getElementById('btnCloseModal');
    if (btnClose) btnClose.onclick = closeModal;

    const btnSavePersona = document.getElementById('btnSavePersona');
    if (btnSavePersona) {
      btnSavePersona.onclick = () => {
        const inp = document.getElementById('settingsPersona');
        if (inp) savePersona(inp.value.trim());
      };
    }

    const btnSettingsClear = document.getElementById('btnSettingsClear');
    if (btnSettingsClear) {
      btnSettingsClear.onclick = () => {
        closeModal();
        clearAllData();
      };
    }
  }

  function closeModal() {
    if (el.appModal) el.appModal.classList.remove('open');
  }

  function savePersona(name) {
    State.userName = name;
    if (el.userIdentity) el.userIdentity.value = name;
    try {
      localStorage.setItem('catchup_user_name', name);
    } catch (e) {}
    closeModal();
    if (State.messages.length) runAnalysis();
  }

  function clearAllData() {
    if (confirm('Clear current conversation and memory?')) {
      if (el.rawChat) el.rawChat.value = '';
      if (el.userIdentity) el.userIdentity.value = '';
      State.rawText = '';
      State.messages = [];
      State.items = [];
      State.summary = null;
      State.dismissedIds.clear();
      State.selectedId = null;
      closeDrawer();
      closeModal();
      hideAlert();
      try {
        localStorage.removeItem('catchup_user_name');
      } catch (e) {}
      renderAppShell();
    }
  }

  /* ================== EXPORTS ================== */

  function generateMarkdownExport() {
    if (!State.summary) return '';
    let md = `# CatchUp — Executive Digest\n\n`;
    md += `> ${State.summary.narrative}\n\n`;
    md += `### What you missed:\n`;
    State.summary.keyPoints.forEach(p => {
      md += `- ${p.replace(/<[^>]+>/g, '')}\n`;
    });

    const tasks = State.items.filter(it => it.kind === 'task' && !State.dismissedIds.has(it.id));
    if (tasks.length) {
      md += `\n### Action Items:\n`;
      tasks.forEach(t => {
        const done = t.status === 'done' ? '[x]' : '[ ]';
        const asg = t.assignee ? ` (@${t.assignee})` : ' (Unassigned)';
        const dl = t.deadline ? ` [Due: ${t.deadline}]` : '';
        md += `- ${done} **${t.title}**${asg}${dl}\n`;
      });
    }

    md += `\n---\n*100% on-device deterministic intelligence by CatchUp.*`;
    return md;
  }

  function showAlert(msg) {
    if (el.alertBanner) {
      el.alertBanner.innerHTML = `${window.ChatUI.ICONS.alertTriangle} <span>${esc(msg)}</span>`;
      el.alertBanner.style.display = 'flex';
    }
  }

  function hideAlert() {
    if (el.alertBanner) {
      el.alertBanner.style.display = 'none';
      el.alertBanner.innerHTML = '';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
