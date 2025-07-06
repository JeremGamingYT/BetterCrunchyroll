# 🚀 BetterCrunchyroll Chrome Extension

[![GitHub Stars](https://img.shields.io/github/stars/JeremGamingYT/BetterCrunchyrollroll?style=social)](https://github.com/JeremGamingYT/BetterCrunchyroll)
[![Issues](https://img.shields.io/github/issues/JeremGamingYT/BetterCrunchyroll)](https://github.com/JeremGamingYT/BetterCrunchyroll/issues)
[![Pull Requests](https://img.shields.io/github/issues-pr/JeremGamingYT/BetterCrunchyroll)](https://github.com/JeremGamingYT/BetterCrunchyroll/pulls)
[![MIT License](https://img.shields.io/github/license/JeremGamingYT/BetterCrunchyroll)](LICENSE)

> ✨ A fresh, glass-morphism makeover for Crunchyroll – plus productivity boosters for the ultimate binge-watcher.

---

## 📜 Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Full Changelog](#full-changelog)
4. [Customization](#customization)
5. [Installation](#installation)
6. [Dev Guide](#dev-guide)
7. [Roadmap](#roadmap)
8. [Contributing](#contributing)
9. [License](#license)

---

## 🎬 Overview
**BetterCrunchyroll** transforms the vanilla Crunchyroll UI into a sleek, dark, glass-styled experience, complete with silky animations, handy shortcuts and QoL tweaks – no server-side hacks, just pure CSS/JS injected on-the-fly.

<p align="center">
  <img src="./assets/screenshot.png" alt="BetterCrunchyroll preview" width="800" />
</p>

---

## 🧰 Features
| Category | Feature | Description |
|----------|---------|-------------|
| **UI** | Dark / glass theme | Gradient backdrop, translucent cards, rounded corners & soft shadows. |
| | Dynamic accent color | Every orange element now inherits `--cr-accent` (customizable). |
| | Hover lift ✈️ | Cards, banners & footer links float slightly on hover. |
| | Auto-hide navbar | Header glides away when scrolling down. |
| | Custom scrollbar | 10 px track with accent thumb. |
| **Cards** | Shine removed | Goodbye distracting glare. |
| | Wider playable cards | 160 → 190 px for better poster visibility. |
| | Minimal hover | Stripped titles/buttons, centered meta. |
| | "More options" hidden | Cleaner look. |
| **Actions** | Accent buttons | Continue, Up-next, Watchlist, Share, etc. now respect theme. |
| **Player** | Picture-in-Picture ⧉ | Native PiP button + `Ctrl/⌘+P` shortcut. |
| | Auto-Skip ⏩ | Skips intros/outros automatically (opt-in). |
| | Auto-Next ▶️ | Countdown overlay launches next episode (opt-in). |
| | Progress bar | Accent gradient + knob color. |
| | Loading spinner | SVG stroke recolored to accent. |
| **Simulcast Calendar** | Dedicated dark theme | Isolated `calendar.css`, glass header & hover animations. |
| | Rounded posters | Posters, thumbnails & popovers. |
| **Footer** | Animated links | Lift on hover, accent tint. |
| **User menu** | Glass panel | Dark background `#121317`, blur & rounded corners. |
| **Performance** | Selective injection | Extension disabled on `store.crunchyroll.com` & `help.crunchyroll.com`. |

---

## 📈 Full Changelog
See **[CHANGELOG](CHANGELOG.md)** for granular commits. Main milestones:
* v5.0 – Complete glass redesign, CSS variables.
* v5.2 – PiP button & video QoL.
* v5.3 – Calendar dark mode split into `calendar.css`.
* v5.5 – Dynamic spinner / progress recolor, README overhaul.

---

## 🎨 Customization
Open the extension popup:
1. Pick your **Accent Color** 🎨 (any HEX).
2. Set **Corner Radius** (px).
3. Toggles: *Colored Titles*, *Auto-Hide Header*, *Auto-Skip*, *Auto-Next*.

Changes propagate instantly thanks to CSS variables (or after refresh).

---

## ⚡ Installation
```bash
# Clone the repo
git clone https://github.com/JeremGamingYT/BetterCrunchyroll.git
cd BetterCrunchyroll

# Load into Chrome / Edge
chrome://extensions → Enable *Developer mode* → *Load unpacked* → select project folder.
```
Navigate to Crunchyroll – enjoy your upgraded interface! 🚀

> The extension injects on `*.crunchyroll.com` (excluding Store & Help) and `*.vrv.co`.

---

## 🔧 Dev Guide
* Manifest V3 – Service Worker `background.js`.
* **Global styles**: `content.css` ; **Calendar styles**: `calendar.css`.
* Live-reload: just hit *Reload* in the Extensions page after changes.

### Project Tree
```text
BetterCrunchyroll/
├─ background.js          # service worker
├─ content.js             # main logic
├─ content.css            # global CR overrides
├─ calendar.css           # simulcast calendar theme
├─ manifest.json          # MV3 manifest
├─ popup.html / popup.js  # settings UI
├─ icons/                 # logos
└─ Crunchyroll Default Files/ # reference originals
```

---

## 🚀 Roadmap
- [ ] Manga reader theming 📚
- [ ] Optional light theme 🌞
- [ ] Custom keyboard shortcuts ⌨️
- [ ] Firefox port 🦊 (MV3 parity)

---

## 🤝 Contributing
PRs are welcome! Please:
1. Fork → feature branch → PR.
2. Align with existing code style (Prettier defaults).
3. Describe **what** & **why** – screenshots/gifs appreciated.

Bug reports / feature requests → [Issues](https://github.com/JeremGamingYT/BetterCrunchyroll/issues).

---

## 📝 License
MIT © YourName – This project is unaffiliated with Crunchyroll LLC.

---

## ⚖️ Legal Notice
This project is **UI-only** – it does **not**:
* host, stream, download or redistribute any Crunchyroll content.
* bypass or weaken DRM / encryption technologies (17 U.S.C. §1201, Canadian Copyright Act s.41).
* collect personal data beyond what Chrome Storage sync requires for settings.

BetterCrunchyroll injects client-side CSS/JS to restyle pages already delivered to the user's browser, which is generally considered *fair use / permissible customization* under U.S. and Canadian law so long as no technical protection measures are circumvented and the original service is not impaired.

Crunchyroll® is a registered trademark of Crunchyroll LLC. This extension is an independent, fan-made project and is not affiliated, endorsed, or sponsored by Crunchyroll LLC, Sony Pictures, or any subsidiaries. 