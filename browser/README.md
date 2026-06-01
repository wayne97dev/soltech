# SolTech Browser (prototype)

A privacy browser for SolTech holders, built on **Electron** (so the rendering engine is Chromium — the same engine as Chrome, Brave, Arc, Opera and Edge). You don't write a browser engine from scratch; you build a branded shell + features on top of one. This is that shell.

> Status: **prototype**. It already browses, but the SolTech integrations (real VPN, embedded wallet) are stubs/hooks — see the roadmap.

## What works today

- **Tabbed browsing** — multiple tabs, open/close, switch.
- **Omnibox** — type a URL, or anything else to search.
- **Back / forward / reload**, with correct enabled/disabled state.
- **Branded new-tab start page** ([newtab.html](src/ui/newtab.html)) with a search box.
- **Real tracker/ad blocker** — blocks a list of tracker hosts at the network layer, with a live "blocked" counter in the toolbar.
- **VPN toggle** — a toolbar switch (prototype: flips state; wiring to the real tunnel is below).

## Run it

> Electron is a desktop GUI app — it needs a real display, so it can't run headless/in CI.

```bash
cd browser
npm install
npm start
```

## Architecture

```
browser/
├── package.json          # Electron app (main = src/main.js)
└── src/
    ├── main.js           # Main process: window, tracker blocker (on the session), IPC
    ├── preload.js        # Safe contextBridge API exposed to the UI
    └── ui/
        ├── index.html    # Browser chrome: tab strip + toolbar + <webview> container
        ├── styles.css    # SolTech dark/monospace theme for the chrome
        ├── renderer.js   # Tab management, omnibox, navigation
        └── newtab.html   # Branded start page (loaded into each new tab)
```

Each tab is a Chromium `<webview>`. The chrome (toolbar/tabs) is the host page; the tracker blocker runs in the main process on the shared session, so it applies to every tab.

## Roadmap → a real product

- **Default search → SolTech Search.** Change the `SEARCH` constant in [renderer.js](src/ui/renderer.js) and [newtab.html](src/ui/newtab.html) to your deployed search URL (`.../search/?q=%s`).
- **VPN toggle → the real tunnel.** The `vpn:toggle` IPC handler in [main.js](src/main.js) currently just flips a flag. Wire it to bring the system **WireGuard** tunnel (the SolTech VPN) up/down.
- **Embedded Solana wallet** → token-gate premium features (free for holders), reusing the Sign-in-with-Solana flow from the web app.
- **Maintained blocklist** (EasyList) instead of the built-in starter list.
- **History, bookmarks, settings, downloads, find-in-page.**
- **Packaging & updates**: `electron-builder` for signed installers (Win/Mac/Linux) + auto-update.

## Honest notes

- **Engine.** This is Chromium via Electron — great for a real, shippable, branded browser. For a deeper, Brave-level product you'd eventually maintain a **Chromium fork**, which is a company-scale effort (huge builds + tracking every upstream security patch).
- **Security.** A browser is a large attack surface. This prototype favours clarity; a production build needs hardened `webview` settings, a strict CSP on the chrome, process sandboxing, and a maintained patch cadence.
