(function () {
  'use strict';

  var STORAGE_KEY = 'dashboard-widgets';
  var WIDGET_TYPES = ['lines', 'chart', 'image', 'list', 'stat'];

  var TYPE_ICONS = {
    lines: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    chart: '<path d="M4 20V10M12 20V4M20 20v-6"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="M21 15l-5-5-9 9"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    stat: '<path d="M3 12h4l2-7 4 14 2-7h6"/>'
  };

  var QUICK_ACTIONS = [
    { label: 'Request Service', icon: '<path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2-2 2.6-2.6z"/>' },
    { label: 'Shop Parts', icon: '<circle cx="9" cy="20" r="1.3"/><circle cx="18" cy="20" r="1.3"/><path d="M2 3h2l2.6 12.6a2 2 0 002 1.4h8.8a2 2 0 002-1.6L21 7H6"/>' },
    { label: 'Assign Inspection', icon: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3a1 1 0 011-1h4a1 1 0 011 1v1"/><path d="M9.5 13l2 2 4-4"/>' },
    { label: 'Record Service', icon: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h8"/>' },
    { label: 'Log Hours', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>' },
    { label: 'Report Issue', icon: '<path d="M12 3L2 21h20L12 3z"/><path d="M12 9v5"/><path d="M12 17h.01"/>' }
  ];
  var QUICK_ACTION_MIN_TILE_WIDTH = 120;
  var QUICK_ACTION_GAP = 12;
  var ACTIONS_ICON = '<path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/>';
  var SEARCH_ICON = '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M20 20l-4.5-4.5"/>';

  var widgets = []; // source-of-truth model: {id, title, type, x, y, w, h}
  var grid;
  var dirty = false;
  var saveBtn;
  var quickActionsObservers = {}; // widget id -> ResizeObserver, for 'actions'-type widgets

  function uid() {
    return 'w-' + Math.random().toString(36).slice(2, 9);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function svgIcon(pathData) {
    return '<svg viewBox="0 0 24 24">' + pathData + '</svg>';
  }

  function closeQuickActionsMenu() {
    var menu = document.querySelector('.quick-actions-menu');
    if (menu) menu.remove();
  }

  function toggleQuickActionsMenu(anchorWrap, overflowActions) {
    var existing = document.querySelector('.quick-actions-menu');
    if (existing) {
      closeQuickActionsMenu();
      return;
    }
    var menu = document.createElement('div');
    menu.className = 'quick-actions-menu';
    menu.innerHTML = overflowActions.map(function (action) {
      return (
        '<button class="quick-actions-menu__item" type="button">' +
          svgIcon(action.icon) +
          '<span>' + escapeHtml(action.label) + '</span>' +
        '</button>'
      );
    }).join('');
    document.body.appendChild(menu);

    var anchorRect = anchorWrap.getBoundingClientRect();
    var menuRect = menu.getBoundingClientRect();
    var left = Math.min(anchorRect.right - menuRect.width, window.innerWidth - menuRect.width - 8);
    menu.style.top = (anchorRect.bottom + 6) + 'px';
    menu.style.left = Math.max(8, left) + 'px';
  }

  function renderQuickActions(container, visibleCount) {
    var visible = QUICK_ACTIONS.slice(0, visibleCount);
    var overflow = QUICK_ACTIONS.slice(visibleCount);

    var html = visible.map(function (action) {
      return (
        '<button class="quick-action" type="button">' +
          svgIcon(action.icon) +
          '<span>' + escapeHtml(action.label) + '</span>' +
        '</button>'
      );
    }).join('');

    if (overflow.length) {
      html += (
        '<div class="quick-action--more-wrap">' +
          '<button class="quick-action quick-action--more" type="button" aria-label="More actions">' +
            svgIcon('<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>') +
          '</button>' +
        '</div>'
      );
    }

    container.innerHTML = html;

    if (overflow.length) {
      var wrap = container.querySelector('.quick-action--more-wrap');
      wrap.querySelector('.quick-action--more').addEventListener('click', function (e) {
        e.stopPropagation();
        toggleQuickActionsMenu(wrap, overflow);
      });
    }
  }

  function layoutQuickActions(container) {
    var width = container.clientWidth;
    var perTile = QUICK_ACTION_MIN_TILE_WIDTH + QUICK_ACTION_GAP;
    var maxFit = Math.max(0, Math.floor((width + QUICK_ACTION_GAP) / perTile));
    var visibleCount = maxFit >= QUICK_ACTIONS.length ? QUICK_ACTIONS.length : Math.max(1, maxFit - 1);
    renderQuickActions(container, visibleCount);
  }

  function initQuickActionsWidget(widgetId) {
    var container = document.getElementById('quick-actions-' + widgetId);
    if (!container) return;
    layoutQuickActions(container);
    var observer = new ResizeObserver(function () {
      closeQuickActionsMenu();
      layoutQuickActions(container);
    });
    observer.observe(container);
    quickActionsObservers[widgetId] = observer;
  }

  function teardownQuickActionsWidget(widgetId) {
    var observer = quickActionsObservers[widgetId];
    if (observer) {
      observer.disconnect();
      delete quickActionsObservers[widgetId];
    }
  }

  function wireframeInner(type) {
    switch (type) {
      case 'lines':
        return '<div class="wf-bar"></div><div class="wf-bar"></div><div class="wf-bar"></div>';
      case 'chart': {
        var heights = [45, 70, 55, 90, 35, 60];
        return heights.map(function (h) {
          return '<div class="wf-col" style="height:' + h + '%"></div>';
        }).join('');
      }
      case 'image':
        return '<div class="wf-frame"></div>';
      case 'list':
        return [0, 1, 2].map(function () {
          return '<div class="wf-row"><div class="wf-dot"></div><div class="wf-row-line"></div></div>';
        }).join('');
      case 'stat':
        return '<div class="wf-big"></div><div class="wf-small"></div>';
      default:
        return '';
    }
  }

  function renderWidgetHTML(widget) {
    var isActions = widget.type === 'actions';
    var isSearch = widget.type === 'search';
    var icon = isActions ? ACTIONS_ICON : isSearch ? SEARCH_ICON : TYPE_ICONS[widget.type];
    var isPermanent = isActions || isSearch;
    var cycleBtn = isPermanent ? '' : (
      '<button class="widget__icon-btn widget__cycle" data-id="' + widget.id + '" type="button" title="Change type">' +
        svgIcon('<path d="M21 12a9 9 0 11-3-6.7"/><path d="M21 3v6h-6"/>') +
      '</button>'
    );
    var removeBtn = isPermanent ? '' : (
      '<button class="widget__icon-btn widget__remove" data-id="' + widget.id + '" type="button" title="Remove widget">' +
        svgIcon('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"/>') +
      '</button>'
    );
    var body;
    if (isActions) {
      body = '<div class="widget__body widget__body--actions"><div class="quick-actions" id="quick-actions-' + widget.id + '"></div></div>';
    } else if (isSearch) {
      body = (
        '<div class="widget__body widget__body--hero"><div class="hero-card">' +
          '<div class="hero-card__image"><div class="hero-card__tags">' +
            '<span class="hero-card__tag-label">Recently Viewed</span>' +
            '<span class="hero-card__tag">Asset Overview &mdash; Unit 4471</span>' +
            '<span class="hero-card__tag">Site Map &mdash; North Yard</span>' +
          '</div></div>' +
          '<label class="hero-card__search">' +
            svgIcon(SEARCH_ICON) +
            '<input type="text" placeholder="Search assets, sites, geofences, and more&hellip;">' +
          '</label>' +
        '</div></div>'
      );
    } else {
      body = '<div class="widget__body wf-' + widget.type + '">' + wireframeInner(widget.type) + '</div>';
    }

    return (
      '<div class="widget__header">' +
        svgIcon(icon) +
        '<span class="widget__title" contenteditable="true" spellcheck="false" data-id="' + widget.id + '">' +
          escapeHtml(widget.title) +
        '</span>' +
        '<span class="widget__spacer"></span>' +
        cycleBtn +
        removeBtn +
      '</div>' +
      body
    );
  }

  function findWidget(id) {
    return widgets.find(function (w) { return w.id === id; });
  }

  function setDirty(value) {
    dirty = value;
    if (saveBtn) saveBtn.disabled = !dirty;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
    setDirty(false);
  }

  function loadFromStorage() {
    var raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch (e) {
      /* ignore corrupt storage */
    }
    return null;
  }

  function defaultWidgets() {
    return [
      // wide left column: hero search, then two large content cards stacked below it
      { id: uid(), title: 'Search', type: 'search', x: 0, y: 0, w: 8, h: 5 },
      { id: uid(), title: 'Summary', type: 'lines', x: 0, y: 5, w: 8, h: 4 },
      { id: uid(), title: 'Preview', type: 'image', x: 0, y: 9, w: 8, h: 4 },
      // narrower right column: quick actions, then smaller cards stacked below it
      { id: uid(), title: 'Quick Actions', type: 'actions', x: 8, y: 0, w: 4, h: 2 },
      { id: uid(), title: 'Trend', type: 'chart', x: 8, y: 2, w: 4, h: 3 },
      { id: uid(), title: 'Overview', type: 'stat', x: 8, y: 5, w: 4, h: 3 },
      { id: uid(), title: 'Recent Activity', type: 'list', x: 8, y: 8, w: 4, h: 4 }
    ];
  }

  function renderAll(list) {
    Object.keys(quickActionsObservers).forEach(teardownQuickActionsWidget);
    widgets = list;
    grid.removeAll();
    grid.batchUpdate();
    widgets.forEach(function (w) {
      grid.addWidget({ id: w.id, x: w.x, y: w.y, w: w.w, h: w.h, content: renderWidgetHTML(w) });
    });
    grid.commit();
    widgets.forEach(function (w) {
      if (w.type === 'actions') initQuickActionsWidget(w.id);
    });
  }

  function addWidget(title, type) {
    var widget = { id: uid(), title: title, type: type, x: 0, y: 0, w: 3, h: 2 };
    widgets.push(widget);
    grid.addWidget({ id: widget.id, w: widget.w, h: widget.h, content: renderWidgetHTML(widget) });
    if (widget.type === 'actions') initQuickActionsWidget(widget.id);
    setDirty(true);
  }

  function removeWidget(id, el) {
    grid.removeWidget(el);
    widgets = widgets.filter(function (w) { return w.id !== id; });
    teardownQuickActionsWidget(id);
    setDirty(true);
  }

  function cycleWidgetType(id, headerEl, bodyEl) {
    var widget = findWidget(id);
    if (!widget) return;
    var idx = WIDGET_TYPES.indexOf(widget.type);
    widget.type = WIDGET_TYPES[(idx + 1) % WIDGET_TYPES.length];
    bodyEl.className = 'widget__body wf-' + widget.type;
    bodyEl.innerHTML = wireframeInner(widget.type);
    headerEl.querySelector('svg').outerHTML = svgIcon(TYPE_ICONS[widget.type]);
    setDirty(true);
  }

  function updateWidgetTitle(id, text) {
    var widget = findWidget(id);
    if (!widget) return;
    widget.title = text;
    setDirty(true);
  }

  document.addEventListener('DOMContentLoaded', function () {
    grid = GridStack.init({
      column: 12,
      cellHeight: 80,
      margin: 8,
      float: false,
      draggable: { handle: '.widget__header', cancel: '.widget__title, .widget__icon-btn' },
      columnOpts: {
        layout: 'compact',
        breakpoints: [
          { w: 480, c: 1 },  // small phones: full-width stack
          { w: 640, c: 2 },  // large phones: 2 up
          { w: 1024, c: 4 }  // tablets: 4 up
        ]
        // above 1024px: base `column: 12` (desktop)
      }
    });

    var gridEl = document.querySelector('.grid-stack');
    var dialog = document.getElementById('add-widget-dialog');
    var form = document.getElementById('add-widget-form');
    var titleInput = document.getElementById('widget-title-input');
    var typeInput = document.getElementById('widget-type-input');
    saveBtn = document.getElementById('save-changes-btn');

    // ---- initial layout ----
    renderAll(loadFromStorage() || defaultWidgets());
    setDirty(false);

    // ---- add widget dialog ----
    document.getElementById('add-widget-btn').addEventListener('click', function () {
      form.reset();
      dialog.showModal();
      titleInput.focus();
    });

    document.getElementById('add-widget-cancel').addEventListener('click', function () {
      dialog.close();
    });

    form.addEventListener('submit', function () {
      var title = titleInput.value.trim() || 'Untitled';
      var type = typeInput.value;
      addWidget(title, type);
    });

    // ---- save / reset ----
    saveBtn.addEventListener('click', function () {
      persist();
    });

    document.getElementById('reset-layout-btn').addEventListener('click', function () {
      localStorage.removeItem(STORAGE_KEY);
      renderAll(defaultWidgets());
      setDirty(false);
    });

    // ---- widget interactions (remove / cycle type / edit title) ----
    gridEl.addEventListener('click', function (e) {
      var removeBtn = e.target.closest('.widget__remove');
      if (removeBtn) {
        var item = removeBtn.closest('.grid-stack-item');
        removeWidget(removeBtn.dataset.id, item);
        return;
      }

      var cycleBtn = e.target.closest('.widget__cycle');
      if (cycleBtn) {
        var header = cycleBtn.closest('.widget__header');
        var body = cycleBtn.closest('.grid-stack-item-content').querySelector('.widget__body');
        cycleWidgetType(cycleBtn.dataset.id, header, body);
      }
    });

    gridEl.addEventListener('focusout', function (e) {
      var titleEl = e.target.closest('.widget__title');
      if (!titleEl) return;
      var text = titleEl.textContent.trim() || 'Untitled';
      titleEl.textContent = text;
      updateWidgetTitle(titleEl.dataset.id, text);
    });

    gridEl.addEventListener('keydown', function (e) {
      if (e.target.classList && e.target.classList.contains('widget__title') && e.key === 'Enter') {
        e.preventDefault();
        e.target.blur();
      }
    });

    // ---- keep model in sync with drag/resize ----
    grid.on('change', function (event, items) {
      (items || []).forEach(function (item) {
        var id = item.id || (item.el && item.el.getAttribute('gs-id'));
        var widget = findWidget(id);
        if (widget) {
          widget.x = item.x;
          widget.y = item.y;
          widget.w = item.w;
          widget.h = item.h;
        }
      });
      setDirty(true);
    });

    // ---- collapse/reopen toolbar ----
    var topbarActions = document.getElementById('topbar-actions');
    var reopenBtn = document.getElementById('reopen-toolbar-btn');
    document.getElementById('dismiss-toolbar-btn').addEventListener('click', function () {
      topbarActions.hidden = true;
      reopenBtn.hidden = false;
    });
    reopenBtn.addEventListener('click', function () {
      topbarActions.hidden = false;
      reopenBtn.hidden = true;
    });

    // ---- close quick actions overflow menu on outside click ----
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.quick-action--more-wrap')) closeQuickActionsMenu();
    });
  });
})();
