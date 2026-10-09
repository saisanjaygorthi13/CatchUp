/**
 * CatchUp — High-Density Productivity UI Manager
 * Compact, intentional SaaS layout without excess card bloat.
 * Groups results into: Critical, Important, Needs Review, Informational.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ChatUI = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = str => String(str ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const cut = (s, n = 110) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '');

  // Clean Lucide-style SVG Icons
  const ICONS = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    checkSquare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',
    alertTriangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="2"/></svg>',
    messageSquare: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    layout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
    zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>'
  };

  const NAV_ROUTES = [
    { key: 'overview', label: 'Overview', icon: ICONS.layout },
    { key: 'tasks', label: 'Action items', icon: ICONS.checkSquare },
    { key: 'decisions', label: 'Decisions', icon: ICONS.target },
    { key: 'settings', label: 'Settings', icon: ICONS.settings }
  ];

  const RESULT_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'deadlines', label: 'Deadlines' },
    { key: 'decisions', label: 'Decisions' }
  ];

  function matchesFilter(item, filterKey) {
    if (!item) return false;
    switch (filterKey) {
      case 'all': return true;
      case 'critical': return item.priority === 'Critical';
      case 'tasks': return item.kind === 'task';
      case 'deadlines': return item.kind === 'event' || !!item.deadline;
      case 'decisions': return item.kind === 'decision';
      default: return true;
    }
  }

  function matchesSearch(item, query) {
    if (!query) return true;
    const q = query.toLowerCase();
    const haystack = [
      item.title,
      item.why,
      item.srcText,
      item.assignee,
      item.sender,
      item.deadline,
      ...(item.requirements || [])
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(q);
  }

  function renderNav(activeRoute, counts, onNavigate) {
    const navEl = $('sidebarNav');
    if (!navEl) return;

    let html = '';
    NAV_ROUTES.forEach(route => {
      const isActive = activeRoute === route.key;
      let count = 0;
      if (route.key === 'overview') count = counts.total || 0;
      else if (route.key === 'tasks') count = counts.tasks || 0;
      else if (route.key === 'decisions') count = counts.decisions || 0;

      const badgeHtml = count > 0 ? `<span class="nav-count">${count}</span>` : '';
      html += `
        <button class="nav-link ${isActive ? 'active' : ''}" data-route="${route.key}">
          ${route.icon}
          <span>${esc(route.label)}</span>
          ${badgeHtml}
        </button>
      `;
    });

    navEl.innerHTML = html;
    navEl.querySelectorAll('.nav-link').forEach(btn => {
      btn.onclick = () => onNavigate(btn.dataset.route);
    });
  }

  function renderMetricCards(counts) {
    const cell = (cls, label, val) => `
      <div class="metric-cell ${cls}">
        <div class="metric-cell-label"><span class="metric-dot"></span><span>${label}</span></div>
        <div class="metric-cell-val">${val || 0}</div>
      </div>`;
    return `
      <div class="metric-summary-bar">
        ${cell('cell-crit', 'Critical', counts.critical)}
        ${cell('cell-imp', 'Important', counts.important)}
        ${cell('cell-review', 'Needs review', counts.needsReview)}
        ${cell('cell-info', 'Informational', counts.informational)}
      </div>
    `;
  }

  function renderExecutiveDigest(summary) {
    if (!summary) return '';

    const feedItemsHtml = summary.keyPoints.map(p => `
      <div class="missed-row">
        <span class="missed-dot"></span>
        <div>${p}</div>
      </div>
    `).join('');

    return `
      <div class="digest-panel">
        <div class="digest-panel-top">
          <div class="panel-title">
            ${ICONS.zap}
            <span>Catch-up summary</span>
            ${summary.isLocalFallback ? '<span class="badge-local" title="Groq API unavailable — results generated by local rule-based engine">Local analysis</span>' : '<span class="badge-groq" title="Results generated by Groq AI">Groq AI</span>'}
          </div>
          <button class="btn btn-sm btn-ghost" id="btnCopyExecutiveSummary">
            ${ICONS.copy}
            <span>Copy Markdown</span>
          </button>
        </div>

        <div class="digest-narrative">
          ${summary.narrative || summary.overall || ''}
        </div>

        <div>
          <div class="missed-heading">What you missed</div>
          <div class="missed-list">
            ${feedItemsHtml}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Dedicated "Assigned to You" Section
   */
  function renderMyActions(tasks) {
    if (!tasks || !tasks.length) return '';

    const rows = tasks.map(t => renderItemRow(t)).join('');

    return `
      <div class="my-actions-panel">
        <div class="panel-title is-accent">
          ${ICONS.user}
          <span>Assigned to you <span class="panel-count">${tasks.length}</span></span>
        </div>
        <div class="item-rows-list">
          ${rows}
        </div>
      </div>
    `;
  }

  /**
   * Render Compact Structured Item Row
   */
  function renderItemRow(item) {
    const isDone = item.status === 'done';
    const isCancelled = item.status === 'cancelled';
    const isSuperseded = item.status === 'superseded';
    const priority = item.priority || 'Informational';

    let priTag = 'tag-info';
    let priDot = '';
    if (priority === 'Critical') { priTag = 'tag-crit'; priDot = 'pri-crit'; }
    else if (priority === 'Important') { priTag = 'tag-imp'; priDot = 'pri-imp'; }
    else if (priority === 'Needs Review') { priTag = 'tag-review'; priDot = 'pri-review'; }

    let kindLabel = item.kind;
    if (item.kind === 'event') kindLabel = item.rescheduled ? 'Schedule changed' : 'Schedule';
    if (item.changed) kindLabel = 'Decision revised';
    kindLabel = kindLabel ? kindLabel.charAt(0).toUpperCase() + kindLabel.slice(1) : '';

    const reqsHtml = (item.requirements && item.requirements.length > 0)
      ? item.requirements.map(r => `<span class="row-reqs">↳ ${esc(r)}</span>`).join('')
      : '';

    return `
      <div class="item-row ${isDone ? 'row-done' : ''}" data-id="${item.id}">
        ${item.kind === 'task' ? `
          <input type="checkbox" class="row-check task-checkbox" data-id="${item.id}" ${isDone ? 'checked' : ''} title="Mark done" aria-label="Mark done">
        ` : `
          <span class="row-bullet ${priDot}"></span>
        `}

        <div class="row-content">
          <div class="row-main-line">
            <span class="row-title">${esc(item.title)}</span>
            ${item.currentDeadline ? `<span class="row-deadline ${priority === 'Critical' ? 'pri-crit-text' : ''}">${esc(item.currentDeadline)}</span>` : ''}
          </div>

          <div class="row-reason">
            ${esc(item.why)}
            ${item.sender ? `<span class="row-from"> From ${esc(item.sender)}</span>` : ''}
          </div>

          ${reqsHtml ? `<div class="row-reqs-wrap">${reqsHtml}</div>` : ''}

          ${item.srcText ? `
            <div class="row-quote-snippet">“${esc(cut(item.srcText, 120))}”</div>
          ` : ''}

          <div class="row-meta">
            <span class="badge-tag ${priTag}">${esc(priority)}</span>
            <span class="badge-tag tag-info">${esc(kindLabel)}</span>
            ${item.isAssignedToUser ? '<span class="badge-tag tag-user">Assigned to you</span>' : ''}
            ${item.assignee && !item.isAssignedToUser ? `<span class="badge-tag tag-info">@${esc(item.assignee)}</span>` : ''}
            ${isCancelled ? '<span class="badge-tag tag-cancelled">Cancelled</span>' : ''}
            ${isSuperseded ? '<span class="badge-tag tag-info">Superseded</span>' : ''}
            ${isDone ? '<span class="badge-tag tag-done">Completed</span>' : ''}
          </div>
        </div>

        <div class="row-actions">
          <button class="btn btn-sm btn-ghost btn-evidence" data-id="${item.id}" title="Inspect source messages">
            ${ICONS.search}
            <span>Evidence</span>
          </button>
          <button class="btn btn-sm btn-ghost btn-icon btn-dismiss-item" data-id="${item.id}" title="Dismiss item" aria-label="Dismiss item">
            ${ICONS.x}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render Results Grouped into Critical, Important, Needs Review, Informational
   */
  function renderGroupedSections(items) {
    const critical = items.filter(i => i.priority === 'Critical');
    const important = items.filter(i => i.priority === 'Important');
    const needsReview = items.filter(i => i.priority === 'Needs Review' || (i.uncertainty && i.priority !== 'Critical'));
    const informational = items.filter(i => i.priority === 'Informational' || i.status === 'done' || i.status === 'cancelled');

    const section = (list, cls, title, sub) => list.length === 0 ? '' : `
      <div class="group-section">
        <div class="group-header ${cls}">
          <div class="group-title">
            <span class="group-dot"></span>
            <span>${title} <span class="group-count">${list.length}</span></span>
          </div>
          <span class="group-sub">${sub}</span>
        </div>
        <div class="item-rows-list">
          ${list.map(renderItemRow).join('')}
        </div>
      </div>
    `;

    let html = '';
    html += section(critical, 'header-crit', 'Critical', 'Immediate action or urgent deadlines');
    html += section(important, 'header-imp', 'Important', 'Key commitments, decisions and schedule changes');
    html += section(needsReview, 'header-review', 'Needs review', 'Ambiguous owners, tentative scope or open questions');
    html += section(informational, 'header-info', 'Informational and completed', 'Superseded items, cancellations and status notices');

    if (!html) {
      html = '<div class="empty-box"><div class="empty-title">Nothing matches</div><div class="empty-desc">Try a different filter or clear the search.</div></div>';
    }

    return html;
  }

  function renderFilterToolbar(activeFilter, searchQuery, count) {
    const buttonsHtml = RESULT_FILTERS.map(f => `
      <button class="filter-btn ${activeFilter === f.key ? 'active' : ''}" data-filter="${f.key}">${f.label}</button>
    `).join('');

    return `
      <div class="filter-toolbar">
        <div class="filter-segments">
          ${buttonsHtml}
        </div>
        <div class="filter-right">
          <div class="search-wrap">
            ${ICONS.search}
            <input type="text" class="search-input" id="searchFilter" placeholder="Filter items" value="${esc(searchQuery)}">
          </div>
          <span class="filter-count">${count} ${count === 1 ? 'item' : 'items'}</span>
        </div>
      </div>
    `;
  }

  function openEvidenceDrawer(item, messages, onClose) {
    const drawer = $('evidenceDrawer');
    const backdrop = $('drawerBackdrop');
    if (!drawer || !backdrop) return;

    if (!item) {
      drawer.classList.remove('open');
      backdrop.classList.remove('open');
      return;
    }

    const hitMsgIds = new Set(item.msgs || []);
    const contextIds = new Set();

    hitMsgIds.forEach(id => {
      for (let offset = -2; offset <= 2; offset++) {
        const candidateId = id + offset;
        if (candidateId >= 0 && candidateId < messages.length) {
          contextIds.add(candidateId);
        }
      }
    });

    const sortedIds = [...contextIds].sort((a, b) => a - b);
    let bubblesHtml = '';
    let lastId = -99;

    sortedIds.forEach(id => {
      if (lastId >= 0 && id - lastId > 1) {
        bubblesHtml += '<div class="drawer-gap">Unrelated messages omitted</div>';
      }
      const msg = messages.find(m => m.id === id);
      if (msg) {
        const isHit = hitMsgIds.has(id);
        bubblesHtml += `
          <div class="drawer-msg-item ${isHit ? 'is-hit' : ''}">
            <div class="drawer-msg-meta">
              <span class="drawer-speaker">${esc(msg.sender)}</span>
              <span class="drawer-msg-time">#${msg.id + 1} ${esc(msg.ts || 'No timestamp')}</span>
            </div>
            <div class="drawer-msg-text">${esc(msg.text)}</div>
          </div>
        `;
      }
      lastId = id;
    });

    drawer.innerHTML = `
      <div class="drawer-top-row">
        <div>
          <div class="drawer-tags">
            <span class="badge-tag tag-info">${esc(item.priority || 'Info')}</span>
            <span class="badge-tag tag-info">${esc(item.kind || 'Context')}</span>
          </div>
          <h3 class="drawer-title">${esc(item.title)}</h3>
        </div>
        <button class="btn btn-sm btn-ghost btn-icon" id="btnCloseDrawer" aria-label="Close">${ICONS.x}</button>
      </div>

      <div class="drawer-why">${esc(item.why)}</div>

      <div class="drawer-section-bar">
        <span class="drawer-section-title">Source conversation</span>
        <button class="btn btn-sm" id="btnCopyEvidenceQuote">
          ${ICONS.copy} <span>Copy quote</span>
        </button>
      </div>

      <div class="drawer-msg-stack">
        ${bubblesHtml}
      </div>
    `;

    drawer.classList.add('open');
    backdrop.classList.add('open');

    $('btnCloseDrawer').onclick = onClose;
    backdrop.onclick = onClose;

    $('btnCopyEvidenceQuote').onclick = () => {
      const hitMsgs = messages.filter(m => hitMsgIds.has(m.id));
      const textToCopy = hitMsgs.map(m => `[${m.ts || ''}] ${m.sender}: "${m.text}"`).join('\n');
      navigator.clipboard.writeText(textToCopy);
      const btn = $('btnCopyEvidenceQuote');
      btn.innerHTML = `${ICONS.check} <span>Copied!</span>`;
      setTimeout(() => {
        if ($('btnCopyEvidenceQuote')) $('btnCopyEvidenceQuote').innerHTML = `${ICONS.copy} <span>Copy quote</span>`;
      }, 1500);
    };
  }

  function renderSettingsModal(currentUserName, onSaveName, onClearAll) {
    return `
      <div class="modal-card" role="dialog" aria-modal="true" aria-label="Settings and privacy">
        <div class="modal-head">
          <h3 class="modal-title">Settings and privacy</h3>
          <button class="btn btn-sm btn-ghost btn-icon" id="btnCloseModal" aria-label="Close">${ICONS.x}</button>
        </div>
        <div class="modal-body">
          <div class="modal-field">
            <label for="settingsPersona">Your name</label>
            <div class="modal-input-row">
              <input type="text" class="input-persona" id="settingsPersona" value="${esc(currentUserName)}" placeholder="e.g. Bob">
              <button class="btn btn-primary" id="btnSavePersona">Save</button>
            </div>
            <div class="modal-note">Tasks and mentions assigned to you are grouped in their own section.</div>
          </div>

          <div class="modal-section">
            <strong>How your data is handled</strong>
            <ul>
              <li>Everything is analysed on this device. No external AI, no proxies, no telemetry.</li>
              <li>Only your theme and name are stored in <code>localStorage</code> (about 1 KB).</li>
            </ul>
          </div>

          <div class="modal-section modal-purge">
            <div>
              <strong>Purge data</strong>
              <div class="modal-note">Clears the current conversation immediately.</div>
            </div>
            <button class="btn btn-sm btn-danger" id="btnSettingsClear">Clear all</button>
          </div>
        </div>
      </div>
    `;
  }

  return {
    ICONS: ICONS,
    NAV_ROUTES: NAV_ROUTES,
    RESULT_FILTERS: RESULT_FILTERS,
    matchesFilter: matchesFilter,
    matchesSearch: matchesSearch,
    renderNav: renderNav,
    renderMetricCards: renderMetricCards,
    renderExecutiveDigest: renderExecutiveDigest,
    renderMyActions: renderMyActions,
    renderItemRow: renderItemRow,
    renderGroupedSections: renderGroupedSections,
    renderFilterToolbar: renderFilterToolbar,
    openEvidenceDrawer: openEvidenceDrawer,
    renderSettingsModal: renderSettingsModal
  };
});
