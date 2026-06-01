// SolTech Browser — tab + navigation logic (runs in the chrome UI renderer).

const views = document.getElementById('views');
const tabsEl = document.getElementById('tabs');
const address = document.getElementById('address');
const backBtn = document.getElementById('back');
const fwdBtn = document.getElementById('forward');

const NEWTAB = 'newtab.html';

// Default search engine. In production, point this at SolTech Search, e.g.:
//   const SEARCH = 'https://your-soltech-site/search/?q=%s';
const SEARCH = 'https://duckduckgo.com/?q=%s';

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

// --- SolTech VPN toggle (prototype) ---
let vpnOn = false;
const vpnBtn = document.getElementById('vpn');
vpnBtn.addEventListener('click', async () => {
  try {
    vpnOn = await window.soltech.toggleVpn(!vpnOn);
  } catch {
    vpnOn = !vpnOn;
  }
  vpnBtn.textContent = 'VPN: ' + (vpnOn ? 'on' : 'off');
  vpnBtn.classList.toggle('on', vpnOn);
});

// --- Tracker blocker counter ---
if (window.soltech && window.soltech.onBlocked) {
  window.soltech.onBlocked((n) => {
    document.getElementById('blocked').textContent = String(n);
  });
}

// First tab
createTab(NEWTAB);
