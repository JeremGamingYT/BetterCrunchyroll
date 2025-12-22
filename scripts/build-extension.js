/**
 * BetterCrunchyroll - Extension Build Script
 * 
 * This script builds the Chrome extension.
 * The extension loads the app from the development server via iframe,
 * so we only need the extension files, not the Next.js build output.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const EXTENSION_SRC = path.join(ROOT_DIR, 'extension');
const DIST_DIR = path.join(ROOT_DIR, 'dist', 'extension');

// Create directory recursively
function mkdirp(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Copy file or directory recursively
function copyRecursive(src, dest) {
    const stats = fs.statSync(src);

    if (stats.isDirectory()) {
        mkdirp(dest);
        const files = fs.readdirSync(src);
        files.forEach(file => {
            copyRecursive(path.join(src, file), path.join(dest, file));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Clean destination directory
function cleanDir(dir) {
    if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
    }
    mkdirp(dir);
}

// Create a simple HTML page for the extension popup/app
function createAppHtml() {
    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>BetterCrunchyroll</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .loading {
      text-align: center;
    }
    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(249, 115, 22, 0.3);
      border-top-color: #f97316;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: #f97316;
    }
    p {
      color: #888;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <h1>BetterCrunchyroll</h1>
    <p>Chargement de l'application...</p>
  </div>
</body>
</html>`;

    const appDir = path.join(DIST_DIR, 'app');
    mkdirp(appDir);
    fs.writeFileSync(path.join(appDir, 'index.html'), html);
    console.log('   ✓ Created app/index.html');
}

// Main build function
async function build() {
    console.log('🚀 Building BetterCrunchyroll Extension...\n');

    // Clean and create dist directory
    console.log('📁 Preparing distribution directory...');
    cleanDir(DIST_DIR);

    // Copy extension files
    console.log('📋 Copying extension files...');
    const extensionFiles = ['manifest.json', 'content-script.js', 'injected-script.js', 'background.js', 'content-style.css'];
    extensionFiles.forEach(file => {
        const src = path.join(EXTENSION_SRC, file);
        const dest = path.join(DIST_DIR, file);
        if (fs.existsSync(src)) {
            fs.copyFileSync(src, dest);
            console.log(`   ✓ ${file}`);
        } else {
            console.warn(`   ⚠ ${file} not found`);
        }
    });

    // Copy icons
    console.log('🎨 Copying icons...');
    const iconsDir = path.join(DIST_DIR, 'icons');
    mkdirp(iconsDir);

    // Check for existing icons in various locations
    const iconSources = [
        path.join(ROOT_DIR, 'public', 'icons'),
        path.join(ROOT_DIR, 'icons'),
    ];

    let iconsFound = false;
    for (const iconDir of iconSources) {
        if (fs.existsSync(iconDir)) {
            const files = fs.readdirSync(iconDir).filter(f => f.endsWith('.png') || f.endsWith('.svg'));
            if (files.length > 0) {
                files.forEach(file => {
                    fs.copyFileSync(path.join(iconDir, file), path.join(iconsDir, file));
                });
                iconsFound = true;
                console.log(`   ✓ Icons copied from ${iconDir}`);
                break;
            }
        }
    }

    // Use existing icons from public as fallback
    if (!iconsFound) {
        const icon32Dark = path.join(ROOT_DIR, 'public', 'icon-dark-32x32.png');
        if (fs.existsSync(icon32Dark)) {
            fs.copyFileSync(icon32Dark, path.join(iconsDir, 'logo.png'));
            console.log('   ✓ Using icon-dark-32x32.png as logo');
            iconsFound = true;
        }
    }

    if (!iconsFound) {
        console.log('   ⚠ No icons found, extension may not load properly');
    }

    // Create app HTML
    console.log('📄 Creating app files...');
    createAppHtml();

    // Done!
    console.log('\n✅ Extension built successfully!');
    console.log(`   Location: ${DIST_DIR}`);
    console.log('\n📝 To install the extension:');
    console.log('   1. Open Chrome and go to chrome://extensions/');
    console.log('   2. Enable "Developer mode" (top right)');
    console.log('   3. Click "Load unpacked"');
    console.log(`   4. Select the folder: ${DIST_DIR}`);
    console.log('\n⚠️  Note: For the extension to work, you also need to run:');
    console.log('   npm run dev');
    console.log('   This starts the development server that the extension connects to.');
}

// Run build
build().catch(err => {
    console.error('❌ Build failed:', err);
    process.exit(1);
});
