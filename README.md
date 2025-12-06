# 🎌 BetterCrunchyroll - Chrome Premium Extension [Unstable - Do Not Download Source]

> **⚠️ WARNING: DO NOT DOWNLOAD THE SOURCE CODE**
>
> The current source code is undergoing major restructuring and contains significant bugs.
> **Please do NOT download or build from the `main` branch quite yet.**
>
> For a stable experience, please download the latest stable version from the **"Releases"** section.

[![Version](https://img.shields.io/badge/version-1.1.0-orange.svg)](https://github.com)
[![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A complete and premium redesign of Crunchyroll as a Chrome extension that automatically replaces all pages of the official site.

![Preview](https://raw.githubusercontent.com/JeremGamingYT/BetterCrunchyroll/refs/heads/main/Images/exemple_2.png)

## ✨ Features

### 🎨 Complete Premium Redesign
- **Modern Design System** with harmonious color palette
- **Glassmorphism** and elegant blur effects
- **Smooth Animations** with Framer Motion (60fps)
- **Premium Dark Mode** optimized
- **Google Fonts Typography** (Outfit)

### 🆕 New Features (v1.1.0)

#### 🔖 Watchlist Management
- **Functional "Add to List" Button** on all series pages
- **Synchronization** with your Crunchyroll account
- **Dynamic State**: toggles between "ADD TO LIST" and "IN MY LIST"
- **Bookmark Icon Animation** (filled/outline)
- **Custom Style** when added to the list

#### 🔗 AniList Integration
- **AniList Button** on series pages (simulated)
- **Official AniList SVG Logo**
- **Ready for future implementation**

#### 📄 Smart Pagination
- **Latest & Popular Pages** with "Load More" system
- **+10 anime** on every click
- **Item Counter** for displayed items
- **Smooth Loading Animation**

### 📺 Included Pages

#### Home Page (Discover)
- Auto-animated Hero carousel with 3 slides
- 4 scrollable content rows (Top Picks, New Episodes, Popular, Simulcasts)
- Premium hover effects on all cards
- Animated progress indicators

#### Series Pages
- Immersive Header with hero image
- **Functional "Add to List" Button** ✨
- **AniList Button** (coming soon) ✨
- Season selector with tabs
- Episode grid with thumbnails
- Immediate episode loading (no more double-click) ✨
- "PREMIUM" badge only on actual premium episodes

#### Latest & Popular Pages
- **Pagination with "Load More"** ✨
- Initial display: 24 anime
- +10 anime per click
- Smart cache (15-30 min)

#### Simulcast Page
- **Improved Filtering** by current season ✨
- Only actual simulcasts
- Calendar by day of the week

#### Global Features
- **Navbar** with glassmorphism on scroll
- **Search Modal** centered with instant search
- **Smooth Navigation** between pages
- **Optimized Cache** (-60% API requests)
- **Responsive Design** mobile/tablet/desktop

### 🔧 Updated Navigation
Menu in exact order:
1. Latest
2. Popular
3. Simulcast
4. Category (dropdown)
5. Manga
6. Games
7. Shop
8. News

## 🚀 Quick Installation

### Prerequisites
- Node.js 18+ installed
- Chrome/Edge/Brave browser

### Build & Installation
```bash
# 1. Install dependencies
npm install

# 2. Build the extension
npm run build

# 3. Load into Chrome
# - Open chrome://extensions/
# - Enable "Developer mode"
# - Click "Load unpacked"
# - Select the dist/ folder
```

📖 **Detailed Guides**:
- [Installation & Build](./EXTENSION_GUIDE.md)
- [Test Guide](./GUIDE_TEST.md) ⭐
- [Summary of Fixes](./RESUME_CORRECTIONS.md) ⭐

## 📁 Project Structure

```
BetterCrunchyroll/
├── src/
│   ├── components/           # Reusable React components
│   │   ├── Navbar.tsx       # Glassmorphism navigation
│   │   ├── Hero.tsx         # Animated hero carousel
│   │   ├── ContentRow.tsx   # Scrollable rows
│   │   ├── AnimeDetail.tsx  # Detail modal (deprecated)
│   │   └── SearchModal.tsx  # Centered search modal
│   ├── pages/               # Application pages
│   │   ├── Home.tsx         # Home/discover page
│   │   └── Watch.tsx        # Watch page
│   ├── styles/              # Global SCSS styles
│   └── App.tsx              # Main Router
├── public/
│   ├── manifest.json        # Chrome Extension Config
│   ├── content.js           # Injection script
│   ├── popup.html           # Extension popup
│   └── icons/               # Icons 16/48/128px
├── dist/                    # Extension build
└── vite.config.ts          # Vite config for extension
```

## 🛠️ Technologies

| Category | Technologies |
|-----------|-------------|
| **Frontend** | React 19, TypeScript |
| **Build** | Vite, ESBuild |
| **Styling** | SCSS, CSS Variables |
| **Animations** | Framer Motion |
| **Icons** | Lucide React |
| **Routing** | React Router v6 |
| **Extension** | Chrome Manifest V3 |

## 🎯 How It Works

### Chrome Extension
1. **Content Script** (`content.js`) injects onto all Crunchyroll pages
2. **Removal** of original Crunchyroll content
3. **Injection** of our React application
4. **Complete and transparent replacement**

### Navigation
- `/` or `/discover` → Home Page with carousel
- `/watch/:id` → Watch Page with episodes
- Search modal accessible from the search icon

## 🎨 Design System

### Colors
```scss
--color-bg: #0a0a0a              // Deep Black
--color-bg-secondary: #141414     // Secondary Black
--color-primary: #f47521          // Crunchyroll Orange
--color-text: #ffffff             // White
--color-text-secondary: #a3a3a3   // Grey
```

### Effects
- **Glassmorphism**: `backdrop-filter: blur(12px)`
- **Shadows**: `0 4px 30px rgba(0,0,0,0.1)`
- **Transitions**: `cubic-bezier(0.215, 0.61, 0.355, 1)`
- **Z-index**: Navbar (1000), Modals (10000+)

## 🐛 Bug Fixes (v1.1.0)

### ✅ Issue #1: "Add to List" Button Not Functional
- **Before**: Inactive button, no account integration
- **After**: Fully functional with Crunchyroll API
- **Impact**: Total synchronization with your watchlist

### ✅ Issue #2: Incorrect "Back" Navigation
- **Before**: Redirected to `/simulcasts/seasons/fall-2025`
- **After**: Clean return to `/discover`
- **Impact**: Consistent bug-free navigation

### ✅ Issue #3: Double-Click on Seasons
- **Before**: Had to click twice to see episodes
- **After**: Immediate loading on first click
- **Impact**: Improved UX, less frustrating

### ✅ Issue #4: Incorrect Simulcast Filtering
- **Before**: Displayed anime from all seasons
- **After**: Only simulcasts from the current season
- **Impact**: Relevant and up-to-date content

### ✅ Issue #5: Missing Pagination
- **Before**: Latest/Popular pages limited to 24-30 anime
- **After**: "Load More" button with +10 anime per click
- **Impact**: Access to +100 series without lag

📖 **Full Details**: See [CHANGELOG.md](./CHANGELOG.md) and [CORRECTIONS_APPLIQUEES.md](./CORRECTIONS_APPLIQUEES.md)

## 📊 Performance

- **Build size**: ~358 KB (gzip: ~116 KB)
- **First Paint**: < 1s
- **Animations**: Constant 60fps
- **Images**: Lazy loading enabled

## 🔮 Roadmap

### Version 1.1
- [ ] Custom video player
- [ ] Real Crunchyroll API integration
- [ ] Watchlist sync with account

### Version 2.0
- [ ] Light mode
- [ ] Multi-language (FR/EN/JP)
- [ ] PWA (Progressive Web App)
- [ ] Offline mode

## 🤝 Contribution

Contributions are welcome!

```bash
# Fork the project
git clone https://github.com/your-username/bettercrunchyroll
cd bettercrunchyroll

# Create a branch
git checkout -b feature/amazing-feature

# Commit and push
git commit -m "Add amazing feature"
git push origin feature/amazing-feature

# Create a Pull Request
```

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## 🙏 Credits

- **Design**: Inspired by Apple, Netflix, and modern design
- **Images**: AlphaCoders (placeholders)
- **Fonts**: Google Fonts (Outfit)
- **Icons**: Lucide React

---

## 📞 Support

For any questions or issues:
- 📖 Read [EXTENSION_GUIDE.md](./EXTENSION_GUIDE.md)
- 📖 Consult [PRESENTATION.md](./PRESENTATION.md)
- 🐛 Open an issue on GitHub
- 💬 Contact us

---

**Made with ❤️ and ☕ by the BetterCrunchyroll Team**

*"Better design. Better experience. Better anime streaming."* ✨

---

### ⚠️ Disclaimer

This project is a conceptual redesign created for educational and demonstration purposes. It is not affiliated with Crunchyroll, Sony, or Crunchyroll, LLC. All rights and trademarks belong to their respective owners.