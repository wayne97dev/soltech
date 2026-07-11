// unknown0 Browser — tab + navigation logic (runs in the chrome UI renderer).

const views = document.getElementById('views');
const tabsEl = document.getElementById('tabs');
const address = document.getElementById('address');
const backBtn = document.getElementById('back');
const fwdBtn = document.getElementById('forward');

const NEWTAB = 'newtab.html';

// Default search engine: our own unknown0 Search (SearXNG on the server).
// language=en forces English results (SearXNG otherwise follows the OS locale).
const SEARCH = 'https://search.unknown0.net/search?q=%s&language=en';

const tabs = [];
let activeId = null;
let seq = 0;

function isNewtab(url) {
  return !url || url.endsWith(NEWTAB);
}

// Decide whether the omnibox input is a URL or a search query.
function toURL(input) {
  const s = input.trim();
  if (!s) return null;
  if (/^(https?|file|about):/i.test(s)) return s;
  if (!s.includes(' ') && /\.[a-z]{2,}(\/|:|$)/i.test(s)) return 'https://' + s;
  return SEARCH.replace('%s', encodeURIComponent(s));
}

function activeTab() {
  return tabs.find((t) => t.id === activeId) || null;
}

function createTab(url) {
  const id = ++seq;
  const view = document.createElement('webview');
  view.className = 'view';
  view.src = url || NEWTAB;
  views.appendChild(view);

  const tab = { id, view, title: 'New tab', ready: false };
  tabs.push(tab);

  view.addEventListener('dom-ready', () => {
    tab.ready = true;
    if (id === activeId) updateNav();
  });
  view.addEventListener('page-title-updated', (e) => {
    tab.title = e.title || 'New tab';
    renderTabs();
  });

  const onNav = (navUrl) => {
    if (id === activeId) address.value = isNewtab(navUrl) ? '' : navUrl;
    updateNav();
  };
  view.addEventListener('did-navigate', (e) => onNav(e.url));
  view.addEventListener('did-navigate-in-page', (e) => {
    if (e.isMainFrame) onNav(e.url);
  });
  view.addEventListener('did-start-loading', () => {
    if (id === activeId) updateNav();
  });
  view.addEventListener('did-stop-loading', () => {
    if (id === activeId) updateNav();
  });

  setActive(id);
  renderTabs();
  return tab;
}

function setActive(id) {
  activeId = id;
  for (const t of tabs) t.view.classList.toggle('active', t.id === id);

  const t = activeTab();
  if (t) {
    let url = '';
    if (t.ready) {
      try {
        url = t.view.getURL();
      } catch {
        url = '';
      }
    }
    address.value = isNewtab(url) ? '' : url;
    updateNav();
  }
  renderTabs();
}

function navigate(url) {
  const t = activeTab();
  if (!t || !url) return;
  if (t.ready) {
    try {
      t.view.loadURL(url);
      return;
    } catch {
      /* fall through to src */
    }
  }
  t.view.src = url;
}

function closeTab(id) {
  const idx = tabs.findIndex((t) => t.id === id);
  if (idx === -1) return;
  tabs[idx].view.remove();
  tabs.splice(idx, 1);

  if (activeId === id) {
    const next = tabs[idx] || tabs[idx - 1];
    if (next) setActive(next.id);
    else createTab(NEWTAB);
  } else {
    renderTabs();
  }
}

function renderTabs() {
  tabsEl.innerHTML = '';
  for (const t of tabs) {
    const el = document.createElement('div');
    el.className = 'tab' + (t.id === activeId ? ' active' : '');
    el.title = t.title;

    const label = document.createElement('span');
    label.className = 'tab-title';
    label.textContent = t.title || 'New tab';

    const close = document.createElement('button');
    close.className = 'tab-close';
    close.textContent = '×';
    close.addEventListener('click', (e) => {
      e.stopPropagation();
      closeTab(t.id);
    });

    el.appendChild(label);
    el.appendChild(close);
    el.addEventListener('click', () => setActive(t.id));
    tabsEl.appendChild(el);
  }
}

function updateNav() {
  const t = activeTab();
  if (!t || !t.ready) {
    backBtn.disabled = true;
    fwdBtn.disabled = true;
    return;
  }
  try {
    backBtn.disabled = !t.view.canGoBack();
    fwdBtn.disabled = !t.view.canGoForward();
  } catch {
    backBtn.disabled = true;
    fwdBtn.disabled = true;
  }
}

// --- Omnibox ---
address.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const url = toURL(address.value);
    if (url) navigate(url);
  }
});
address.addEventListener('focus', () => address.select());

// --- Toolbar ---
backBtn.addEventListener('click', () => {
  const t = activeTab();
  if (t && t.ready) {
    try {
      if (t.view.canGoBack()) t.view.goBack();
    } catch {
      /* ignore */
    }
  }
});
fwdBtn.addEventListener('click', () => {
  const t = activeTab();
  if (t && t.ready) {
    try {
      if (t.view.canGoForward()) t.view.goForward();
    } catch {
      /* ignore */
    }
  }
});
document.getElementById('reload').addEventListener('click', () => {
  const t = activeTab();
  if (t && t.ready) {
    try {
      t.view.reload();
    } catch {
      /* ignore */
    }
  }
});
document.getElementById('newtab').addEventListener('click', () => createTab(NEWTAB));

// --- unknown0 VPN toggle + region picker (prototype) ---
let vpnOn = false;
let vpnRegion = 'de';
const vpnBtn = document.getElementById('vpn');
const vpnRegionSel = document.getElementById('vpnRegion');

// Populate the exit-country picker from the main process.
(async () => {
  try {
    const regions = (window.unknown0.vpnRegions && (await window.unknown0.vpnRegions())) || [];
    if (regions.length) {
      vpnRegionSel.innerHTML = '';
      for (const r of regions) {
        const opt = document.createElement('option');
        opt.value = r.id;
        opt.textContent = `${r.flag} ${r.name}`;
        vpnRegionSel.appendChild(opt);
      }
      vpnRegion = regions[0].id;
    }
  } catch {
    /* keep default */
  }
})();

function renderVpn() {
  vpnBtn.textContent = 'VPN: ' + (vpnOn ? 'on' : 'off');
  vpnBtn.classList.toggle('on', vpnOn);
}

vpnBtn.addEventListener('click', async () => {
  try {
    const res = await window.unknown0.toggleVpn(!vpnOn, vpnRegion);
    vpnOn = res.on;
    vpnRegion = res.region;
  } catch {
    vpnOn = !vpnOn;
  }
  renderVpn();
});

// Switching country while the VPN is on re-routes the exit immediately.
vpnRegionSel.addEventListener('change', async () => {
  vpnRegion = vpnRegionSel.value;
  if (vpnOn) {
    try {
      const res = await window.unknown0.toggleVpn(true, vpnRegion);
      vpnOn = res.on;
    } catch {
      /* ignore */
    }
  }
  renderVpn();
});

// --- Tracker blocker counter ---
if (window.unknown0 && window.unknown0.onBlocked) {
  window.unknown0.onBlocked((n) => {
    document.getElementById('blocked').textContent = String(n);
  });
}

// First tab
createTab(NEWTAB);
