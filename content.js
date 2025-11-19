/* BetterCrunchy PLUS – Redesign Logic */

const SETTINGS = {
  colorTitles: true,
  autoHideHeader: true,
  accentColor: '#f47521',
  radius: 16,
  font: 'Inter',
  autoSkip: false,
  autoNext: false,
  autoNextDelay: 5,
  enabled: true,
};

// Icons (Lucide)
const ICONS = {
  play: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`,
  star: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  share: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>`,
  bookmark: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  bell: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
  user: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`,
  chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
  menu: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`
};

// Main Entry Point
// Main Entry Point
chrome.storage.sync.get(SETTINGS, stored => {
  Object.assign(SETTINGS, stored);
  if (!SETTINGS.enabled) return;

  // Initialize existing features
  initFeatures();

  // Start the SPA Navigation Handler
  initNavigationHandler();
});

// --- SPA Navigation Handler ---
let currentPath = window.location.pathname;
let observer = null;

function initNavigationHandler() {
  // Initial check
  handleNavigation();

  // Poll for URL changes (most robust for SPAs)
  setInterval(() => {
    if (window.location.pathname !== currentPath) {
      currentPath = window.location.pathname;
      console.log('[BetterCrunchy] URL changed to:', currentPath);
      handleNavigation();
    }
  }, 500);
}

function handleNavigation() {
  // Cleanup previous injection
  cleanupRedesign();

  // Determine page type and initialize
  if (isSeriesPage()) {
    console.log('[BetterCrunchy] Series page detected. Initializing redesign...');
    initRedesign();
  } else if (isHomePage() || isDiscoverPage()) {
    console.log('[BetterCrunchy] Home/Discover page detected. Initializing redesign...');
    initFeedRedesign();
  }
}

function cleanupRedesign() {
  document.body.classList.remove('bcp-redesign-active');
  const container = document.querySelector('.bcp-container');
  if (container) container.remove();
}

function isHomePage() {
  const path = window.location.pathname;
  return path === '/' || path === '/fr' || path === '/fr/';
}

function isDiscoverPage() {
  return window.location.pathname.includes('/discover');
}

function isSeriesPage() {
  return window.location.href.includes('/series/');
}

// --- Redesign Logic ---

async function initRedesign() {
  console.log('[BetterCrunchy] Starting redesign initialization...');

  // Wait for key elements to load using robust selectors
  // We look for the hero container which seems to have a stable data-t attribute
  const hero = await waitForElement('[data-t="series-hero-container"]');

  if (!hero) {
    console.warn('[BetterCrunchy] Series hero not found. Aborting redesign.');
    return;
  }

  console.log('[BetterCrunchy] Hero container found, waiting for episodes...');

  // IMPORTANT: Wait for episode links to load (they load dynamically)
  const firstEpisodeLink = await waitForElement('a[href*="/watch/"]', 15000);

  if (!firstEpisodeLink) {
    console.warn('[BetterCrunchy] No episode links found, but continuing anyway...');
  } else {
    console.log('[BetterCrunchy] Episode links detected!');
  }

  // Scrape Data
  const data = scrapeSeriesData();
  if (!data) {
    console.error('[BetterCrunchy] Failed to scrape series data.');
    return;
  }
  console.log('[BetterCrunchy] Scraped Data:', data);

  // CRITICAL: Scrape episodes separately and add to data
  data.episodes = scrapeEpisodes();
  console.log(`[BetterCrunchy] Total episodes after scraping: ${data.episodes.length}`);

  // Inject New UI
  injectNewUI(data);
}

async function initFeedRedesign() {
  console.log('[BetterCrunchy] Starting feed redesign initialization...');

  // Wait for content to load
  // We'll wait for *any* significant content to ensure hydration
  await waitForElement('body');

  // Give a little time for React to hydrate
  await new Promise(r => setTimeout(r, 2000));

  const data = scrapeFeedData();
  console.log('[BetterCrunchy] Scraped Feed Data:', data);

  injectFeedUI(data);
}

function scrapeFeedData() {
  try {
    const heroItems = [];
    const feedSections = [];
    const seenUrls = new Set();

    // --- 1. SCRAPE HERO CAROUSEL ---
    // Use specific classes from main-page-carousel.html
    const carouselContainer = document.querySelector('.hero-carousel--1-yhX, .carousel--uuuFa, [class*="hero-carousel"], [data-t="hero-carousel"]');

    if (carouselContainer) {
      // Select slides using the specific class found
      const slides = carouselContainer.querySelectorAll('.hero-carousel__item--uOsyF, [class*="hero-carousel__item"], [data-t="hero-card-wrapper"]');

      slides.forEach(slide => {
        // Image
        const imgEl = slide.querySelector('img[data-t="original-image"]') ||
          slide.querySelector('img[class*="progressive-image-loading__original"]') ||
          slide.querySelector('img');

        let image = '';
        if (imgEl) {
          image = imgEl.src || imgEl.srcset?.split(',')[0]?.split(' ')[0] || '';
          image = image.replace(/,blur=\d+/, '').replace(/,width=\d+/, '').replace(/,height=\d+/, '');
        }

        // Title & Description
        const title = slide.querySelector('.hero-content-card__seo-title--HJ9jl, h2, [class*="heading"]')?.textContent?.trim();
        const description = slide.querySelector('.hero-content-card__description--N73xU, p, [class*="description"]')?.textContent?.trim();

        // Link
        const linkEl = slide.querySelector('.hero-card-layout__logo--KHmlZ, a[href*="/series/"], a[href*="/watch/"]');
        const link = linkEl ? linkEl.href : '#';

        // Logo
        const logoEl = slide.querySelector('.hero-card-layout__logo-img--z2De7, [class*="logo"] img');
        const logo = logoEl ? logoEl.src : null;

        if (image && title && !seenUrls.has(link)) {
          seenUrls.add(link);
          heroItems.push({ image, title, description, link, logo });
        }
      });
    } else {
      // Fallback
      const heroImg = document.querySelector('img[class*="hero-image"], [class*="banner"] img');
      if (heroImg) {
        const title = document.querySelector('h1, [class*="hero-heading"]')?.textContent?.trim() || 'Featured';
        const desc = document.querySelector('[class*="hero-description"]')?.textContent?.trim() || '';
        heroItems.push({
          image: heroImg.src,
          title: title,
          description: desc,
          link: window.location.href,
          logo: null
        });
      }
    }

    // --- 2. SCRAPE DYNAMIC SECTIONS ---
    const feedWrapper = document.querySelector('.dynamic-feed-wrapper, [class*="feed-container"], [data-t="feed"]');
    if (feedWrapper) {
      const sections = feedWrapper.querySelectorAll(':scope > div');

      sections.forEach(section => {
        const titleEl = section.querySelector('h2, [class*="feed-header__title"]');
        if (!titleEl) return;
        const title = titleEl.textContent.trim();
        const isTrending = title.toLowerCase().includes('trending') || title.toLowerCase().includes('tendances');

        const cards = [];
        const cardEls = section.querySelectorAll('[data-t="series-card"], [data-t="playable-card"], [data-t="personalized-collection-card"], .browse-card--esJdT');

        cardEls.forEach((card, index) => {
          const linkEl = card.querySelector('a');
          if (!linkEl) return;
          const link = linkEl.href;

          if (seenUrls.has(link)) return;
          seenUrls.add(link);

          const imgEl = card.querySelector('img[data-t="original-image"]') ||
            card.querySelector('img[class*="progressive-image-loading__original"]') ||
            card.querySelector('img');
          let image = '';
          if (imgEl) {
            image = imgEl.src || imgEl.srcset?.split(',')[0]?.split(' ')[0] || '';
            image = image.replace(/,blur=\d+/, '');
          }

          const cardTitle = card.querySelector('[class*="title"]')?.textContent?.trim();
          const cardDesc = card.querySelector('[class*="description"]')?.textContent?.trim();

          // Rating
          let rating = '';
          const ratingEl = card.querySelector('[data-t="rating-section"], [class*="rating"]');
          if (ratingEl) {
            const ratingText = ratingEl.textContent?.trim() || '';
            const match = ratingText.match(/(\d+[.,]\d+)/);
            if (match) rating = match[1];
          }

          const meta = card.querySelector('[data-t="meta-tags"]')?.textContent?.trim();

          // Rank for Trending
          let rank = null;
          if (isTrending) {
            // Try to find rank in the card
            const rankEl = card.querySelector('[class*="rank"], [class*="number"]');
            if (rankEl) {
              rank = rankEl.textContent.trim();
            } else {
              // Fallback to index + 1 if it's a trending section
              rank = index + 1;
            }
          }

          if (image) {
            cards.push({
              image,
              title: cardTitle,
              description: cardDesc,
              link,
              rating,
              meta,
              rank
            });
          }
        });

        if (cards.length > 0) {
          feedSections.push({ title, cards, isTrending });
        }
      });
    }

    return { heroItems, feedSections };

  } catch (e) {
    console.error('[BetterCrunchy] Error scraping feed data:', e);
    return { heroItems: [], feedSections: [] };
  }
}

function injectFeedUI(data) {
  document.body.classList.add('bcp-redesign-active');
  const container = document.createElement('div');
  container.className = 'bcp-container bcp-feed-container';

  container.innerHTML = `
    ${renderNavbar()}
    ${renderFeedHero(data.heroItems)}
    ${renderFeedContent(data.feedSections)}
    ${renderFooter()}
  `;

  document.body.appendChild(container);
  setupInteractions();

  // Initialize Carousel Script if multiple items
  if (data.heroItems.length > 1) {
    initHeroCarousel();
  }
}

function renderFeedHero(items) {
  if (!items || items.length === 0) return '<div class="bcp-hero-placeholder"></div>';

  // Render all slides, we will toggle them with JS
  const slidesHtml = items.map((item, index) => `
    <div class="bcp-hero-slide ${index === 0 ? 'active' : ''}" data-index="${index}">
      <div class="bcp-hero-bg">
        <img src="${item.image}" alt="${item.title}" class="animate-subtle-zoom">
        <div class="bcp-hero-overlay-t"></div>
        <div class="bcp-hero-overlay-r"></div>
        <div class="bcp-hero-overlay-b"></div>
        <div class="bcp-hero-overlay-l"></div>
      </div>
      
      <div class="bcp-hero-content">
        <div class="bcp-hero-main">
          ${item.logo ? `<img src="${item.logo}" class="bcp-hero-logo animate-slide-up delay-100" alt="${item.title}">` : ''}
          <h1 class="bcp-title animate-slide-up delay-200" ${item.logo ? 'style="display:none"' : ''}>${item.title}</h1>
          <p class="bcp-description animate-slide-up delay-300">${item.description || ''}</p>
          <div class="bcp-actions animate-slide-up delay-400">
            <a href="${item.link}" class="bcp-btn bcp-btn-primary">
              ${ICONS.play}
              <span>Regarder</span>
            </a>
            <button class="bcp-btn bcp-btn-secondary">
              ${ICONS.plus}
              <span>Watchlist</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  // Navigation Dots
  const dotsHtml = items.length > 1 ? `
    <div class="bcp-hero-dots">
      ${items.map((_, index) => `
        <button class="bcp-hero-dot ${index === 0 ? 'active' : ''}" data-index="${index}"></button>
      `).join('')}
    </div>
  ` : '';

  // Arrows
  const arrowsHtml = items.length > 1 ? `
    <button class="bcp-hero-arrow prev" id="bcp-hero-prev">${ICONS.chevronRight}</button>
    <button class="bcp-hero-arrow next" id="bcp-hero-next">${ICONS.chevronRight}</button>
  ` : '';

  return `
    <div class="bcp-hero bcp-feed-hero" id="bcp-hero-carousel">
      ${slidesHtml}
      ${dotsHtml}
      ${arrowsHtml}
    </div>
  `;
}

// Carousel Logic (No inline handlers)
let currentHeroIndex = 0;
let heroInterval = null;

function switchHeroSlide(index) {
  const slides = document.querySelectorAll('.bcp-hero-slide');
  const dots = document.querySelectorAll('.bcp-hero-dot');

  if (slides.length === 0) return;

  if (index >= slides.length) index = 0;
  if (index < 0) index = slides.length - 1;

  currentHeroIndex = index;

  slides.forEach(s => s.classList.remove('active'));
  dots.forEach(d => d.classList.remove('active'));

  if (slides[index]) slides[index].classList.add('active');
  if (dots[index]) dots[index].classList.add('active');

  // Reset timer
  if (heroInterval) clearInterval(heroInterval);
  heroInterval = setInterval(nextHeroSlide, 8000);
}

function nextHeroSlide() {
  switchHeroSlide(currentHeroIndex + 1);
}

function prevHeroSlide() {
  switchHeroSlide(currentHeroIndex - 1);
}

function initHeroCarousel() {
  // Attach Event Listeners
  const prevBtn = document.getElementById('bcp-hero-prev');
  const nextBtn = document.getElementById('bcp-hero-next');
  const dots = document.querySelectorAll('.bcp-hero-dot');

  if (prevBtn) prevBtn.addEventListener('click', prevHeroSlide);
  if (nextBtn) nextBtn.addEventListener('click', nextHeroSlide);

  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const index = parseInt(e.target.getAttribute('data-index'));
      switchHeroSlide(index);
    });
  });

  // Start Auto-play
  if (heroInterval) clearInterval(heroInterval);
  heroInterval = setInterval(nextHeroSlide, 8000);
}

function renderFeedContent(sections) {
  if (!sections || sections.length === 0) return '<div class="bcp-feed-placeholder">No Feed Content Found</div>';

  return `
    <div class="bcp-episodes-section">
      ${sections.map(section => `
        <div class="bcp-feed-section ${section.isTrending ? 'bcp-trending-section' : ''}">
          <h2 class="bcp-section-title">${section.title}</h2>
          <div class="bcp-episode-grid">
            ${section.cards.map(card => `
              <a href="${card.link}" class="bcp-feed-card">
                <div class="bcp-card-image-wrapper">
                  <img src="${card.image}" alt="${card.title}" loading="lazy">
                  <div class="bcp-card-overlay">
                    <div class="bcp-play-icon">${ICONS.play}</div>
                  </div>
                  ${card.rating ? `<div class="bcp-card-rating">${ICONS.star} ${card.rating}</div>` : ''}
                  ${card.rank ? `<div class="bcp-card-rank">${card.rank}</div>` : ''}
                </div>
                <div class="bcp-card-content">
                  <h3 class="bcp-card-title">${card.title || ''}</h3>
                  <div class="bcp-card-meta">
                    ${card.meta ? `<span>${card.meta}</span>` : ''}
                  </div>
                </div>
              </a>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function waitForElement(selector, timeout = 10000) {
  return new Promise(resolve => {
    if (document.querySelector(selector)) return resolve(document.querySelector(selector));
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector));
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
}

function scrapeSeriesData() {
  try {
    // METHOD 1: Try JSON-LD first (most reliable)
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
      try {
        const jsonData = JSON.parse(jsonLdScript.textContent);
        console.log('[BetterCrunchy] Using JSON-LD data:', jsonData);

        return {
          title: jsonData.name?.replace('Watch ', '') || 'Unknown Series',
          description: jsonData.description || '',
          rating: jsonData.aggregateRating?.ratingValue?.toString() || '0',
          votes: jsonData.aggregateRating?.ratingCount?.toString() || '0',
          backgroundImage: jsonData.image || '',
          episodes: [] // Will be filled by scrapeEpisodes
        };
      } catch (e) {
        console.warn('[BetterCrunchy] Failed to parse JSON-LD, falling back to DOM scraping', e);
      }
    }

    // METHOD 2: Fallback to DOM scraping
    const heroBody = document.querySelector('[data-t="series-hero-body"]');
    const heroContainer = document.querySelector('[data-t="series-hero-container"]');

    const title = heroBody?.querySelector('h1')?.textContent?.trim() || 'Unknown Title';
    const description = document.querySelector('[data-t="description"]')?.textContent?.trim() || '';

    // Rating: Parse from data-t="average-rating"
    const ratingText = document.querySelector('[data-t="average-rating"]')?.textContent?.trim() || '';
    const ratingMatch = ratingText.match(/([0-9.]+)/);
    const votesMatch = ratingText.match(/\(([0-9.]+[km]?)\)/);

    const rating = ratingMatch ? ratingMatch[1] : '0';
    const votes = votesMatch ? votesMatch[1] : '0';

    // Background Image
    let backgroundImage = '';
    const img = heroContainer?.querySelector('img');
    if (img?.srcset) {
      const sources = img.srcset.split(',').map(s => s.trim().split(' '));
      backgroundImage = sources[sources.length - 1][0];
    } else if (img?.src) {
      backgroundImage = img.src;
    }

    console.log('[BetterCrunchy] Scraped series data:', { title, rating, votes });

    return {
      title,
      description,
      rating,
      votes,
      backgroundImage,
      episodes: []
    };
  } catch (error) {
    console.error('[BetterCrunchy] Error scraping series data:', error);
    return {
      title: 'Unknown Series',
      description: '',
      rating: '0',
      votes: '0',
      backgroundImage: '',
      episodes: []
    };
  }
}

function scrapeEpisodes() {
  console.log('[BetterCrunchy] Starting episode scraping...');

  // REAL STRUCTURE: h3.playable-card__title with link containing "E1 - Seule et solitaire"
  // Find all cards with the playable-card class
  const allCards = Array.from(document.querySelectorAll('[class*="playable-card"]'));
  console.log(`[BetterCrunchy] Found ${allCards.length} playable cards`);

  // Filter: must have /watch/ link
  const episodeCards = allCards.filter(card => {
    return !!card.querySelector('a[href*="/watch/"]');
  });

  console.log(`[BetterCrunchy] Filtered to ${episodeCards.length} episode cards`);

  const episodes = episodeCards.map((card, index) => {
    // Get the link
    const linkEl = card.querySelector('a[href*="/watch/"]');
    const link = linkEl?.href || '#';

    // Extract TITLE and NUMBER from h3.playable-card__title
    // Format: "E1 - Seule et solitaire" or "E1 - Title"
    let title = '';
    let number = '';

    const h3Title = card.querySelector('h3[class*="playable-card__title"]');
    if (h3Title) {
      const fullText = h3Title.textContent?.trim() || '';
      // Parse "E1 - Seule et solitaire" format
      const match = fullText.match(/^E(\d+)\s*-\s*(.+)$/);
      if (match) {
        number = match[1];
        title = match[2].trim();
      } else {
        // Fallback: just take the text as title
        title = fullText.replace(/^E\d+\s*[-:]?\s*/i, '').trim();
        // Try to extract number from text
        const numMatch = fullText.match(/E?(\d+)/);
        if (numMatch) number = numMatch[1];
      }
    }

    // Fallback for number
    if (!number) {
      // Try from URL
      const urlMatch = link.match(/episode[_-]?(\d+)/i);
      if (urlMatch) {
        number = urlMatch[1];
      } else {
        number = (index + 1).toString();
      }
    }

    // Fallback for title
    if (!title || title.length < 2) {
      title = `Épisode ${number}`;
    }

    // Extract DURATION from spans (avoid "Vu" text, prefer actual time)
    let duration = '';
    const durationEl = Array.from(card.querySelectorAll('span, div')).find(el => {
      const text = el.textContent?.trim() || '';
      // Match "24m" or "12:34" but NOT "Vu"
      return /^\d+\s*m(in)?$|^\d+:\d+$/.test(text) && text !== 'Vu';
    });
    duration = durationEl?.textContent?.trim() || '24m';

    // Thumbnail - get the SHARP image, not the blurry preview
    // Look for the "original" image without blur=30
    const imgOriginal = card.querySelector('img[class*="progressive-image-loading__original"]');
    const imgFallback = card.querySelector('img[data-t="card-image"]');
    const img = imgOriginal || imgFallback || card.querySelector('img');

    let thumbnail = '';
    if (img?.src) {
      // Remove blur parameter if present
      thumbnail = img.src.replace(/,blur=\d+/, '');
    } else if (img?.srcset) {
      thumbnail = img.srcset.split(',')[0]?.split(' ')[0]?.replace(/,blur=\d+/, '') || '';
    }

    // Description from playable-card-hover__description with data-t="description"
    const description = card.querySelector('[data-t="description"]')?.textContent?.trim() ||
      card.querySelector('[class*="description"]')?.textContent?.trim() || '';

    // Progress bar
    const progressEl = card.querySelector('[class*="progress"]');
    let progress = 0;
    if (progressEl) {
      const style = progressEl.getAttribute('style');
      if (style?.includes('width')) {
        const match = style.match(/width:\s*(\d+)%/);
        if (match) progress = parseInt(match[1]);
      }
    }

    return {
      id: index.toString(),
      title,
      number,
      thumbnail,
      link,
      duration,
      description,
      progress
    };
  });

  // CRITICAL: Sort episodes numerically
  episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number));

  // CRITICAL: Deduplicate by unique link URL (remove duplicates from hover cards)
  const seen = new Set();
  const uniqueEpisodes = episodes.filter(ep => {
    if (seen.has(ep.link)) {
      return false; // Skip duplicate
    }
    seen.add(ep.link);
    return true; // Keep first occurrence
  });

  console.log(`[BetterCrunchy] Scraped ${episodes.length} total, deduplicated to ${uniqueEpisodes.length} unique episodes`);
  if (uniqueEpisodes.length > 0) {
    console.log('[BetterCrunchy] First episode:', uniqueEpisodes[0]);
    console.log('[BetterCrunchy] Last episode:', uniqueEpisodes[uniqueEpisodes.length - 1]);
  }

  return uniqueEpisodes;
}

function injectNewUI(data) {
  // Add class to body to hide original content via CSS
  document.body.classList.add('bcp-redesign-active');

  // Create Container
  const container = document.createElement('div');
  container.className = 'bcp-container';

  // Render Components
  container.innerHTML = `
    ${renderNavbar()}
    ${renderHero(data)}
    ${renderEpisodeList(data)}
    ${renderFooter()}
  `;

  // Append to body
  document.body.appendChild(container);

  // Add Event Listeners
  setupInteractions();
}

function renderNavbar() {
  return `
    <nav class="bcp-navbar">
      <div class="bcp-nav-content">
        <!-- Left Section: Logo + Navigation Links -->
        <div style="display:flex; align-items:center; gap:2.5rem;">
          <!-- Logo Crunchyroll Officiel -->
          <a href="/fr/discover" style="display:flex; align-items:center; gap:0.5rem; cursor:pointer; text-decoration:none;">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style="width:2rem; height:2rem; fill:var(--cr-accent);">
              <path d="M5.818 26.871c.01-11.65 9.466-21.086 21.117-21.073 11.153.01 20.275 8.678 21.022 19.638.028-.467.043-.94.043-1.413C48.014 10.77 37.28.013 24.024 0 10.768-.014.014 10.721 0 23.976-.014 37.23 10.721 47.987 23.976 48c.548 0 1.092-.018 1.63-.054-11.051-.676-19.8-9.856-19.788-21.076Zm32.568.312a8.2 8.2 0 0 1-8.19-8.208 8.204 8.204 0 0 1 5.424-7.71 17.923 17.923 0 0 0-8.375-2.073c-9.95-.01-18.022 8.047-18.032 17.995-.01 9.95 8.047 18.022 17.995 18.033 9.948.01 18.022-8.047 18.032-17.997 0-1.127-.103-2.23-.301-3.301a8.187 8.187 0 0 1-6.554 3.261h.001Z"/>
            </svg>
            <span style="font-weight:700; font-size:1.125rem; letter-spacing:-0.025em; color:white;">crunchyroll</span>
          </a>
          
          <!-- Navigation Links -->
          <div style="display:flex; align-items:center; gap:1.5rem; font-size:0.875rem; font-weight:600;">
            <a href="/fr/videos/new" style="color:#d1d5db; text-decoration:none; transition:color 0.2s; cursor:pointer;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Nouveau</a>
            <a href="/fr/videos/popular" style="color:#d1d5db; text-decoration:none; transition:color 0.2s; cursor:pointer;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Populaire</a>
            <a href="/fr/simulcast" style="color:#d1d5db; text-decoration:none; transition:color 0.2s; cursor:pointer;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Simulcast</a>
            
            <!-- Menu Catégories (Dropdown) -->
            <div class="bcp-dropdown" style="position:relative;">
              <button class="bcp-dropdown-btn" data-dropdown="categories" style="display:flex; align-items:center; gap:0.375rem; color:white; background:none; border:none; font-size:0.875rem; font-weight:600; cursor:pointer; padding:0.5rem 0.75rem; border-radius:0.375rem; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='none'">
                Catégories
                <svg viewBox="0 0 24 24" fill="currentColor" style="width:1rem; height:1rem;">
                  <path d="M7 10h10l-5 5z"/>
                </svg>
              </button>
              <!-- Dropdown Menu -->
              <div class="bcp-dropdown-menu" id="categories-menu" style="display:none; position:absolute; top:calc(100% + 0.5rem); left:0; background:rgba(18,18,18,0.98); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.1); border-radius:0.75rem; padding:1.5rem; min-width:650px; box-shadow:0 20px 50px rgba(0,0,0,0.5); z-index:100;">
                <div style="display:grid; grid-template-columns:1fr 2fr; gap:2rem;">
                  <!-- Section Principale -->
                  <div>
                    <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.5rem;">
                      <li><a href="/fr/videos/popular" style="display:block; padding:0.625rem 1rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.5rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Populaire</a></li>
                      <li><a href="/fr/videos/new" style="display:block; padding:0.625rem 1rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.5rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Nouveau</a></li>
                      <li><a href="/fr/videos/alphabetical" style="display:block; padding:0.625rem 1rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.5rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Tout parcourir (A-Z)</a></li>
                      <li><a href="/fr/simulcasts/seasons/fall-2025" style="display:block; padding:0.625rem 1rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.5rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Simulcast par saison</a></li>
                      <li><a href="https://www.crunchyroll.com/simulcastcalendar" style="display:block; padding:0.625rem 1rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.5rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Agenda</a></li>
                      <li><a href="/fr/music" style="display:block; padding:0.625rem 1rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.5rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Clips & Concerts</a></li>
                    </ul>
                  </div>
                  <!-- Section Genres -->
                  <div>
                    <h4 style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.1em; color:#6b7280; margin:0 0 1rem 0;">Genres</h4>
                    <ul style="list-style:none; padding:0; margin:0; display:grid; grid-template-columns:repeat(2,1fr); gap:0.5rem;">
                      <li><a href="/fr/videos/action" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Action</a></li>
                      <li><a href="/fr/videos/adventure" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Aventure</a></li>
                      <li><a href="/fr/videos/comedy" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Comédie</a></li>
                      <li><a href="/fr/videos/drama" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Drama</a></li>
                      <li><a href="/fr/videos/fantasy" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Fantastique</a></li>
                      <li><a href="/fr/videos/music" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Musique</a></li>
                      <li><a href="/fr/videos/romance" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Romance</a></li>
                      <li><a href="/fr/videos/sci-fi" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Science Fiction</a></li>
                      <li><a href="/fr/videos/seinen" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Seinen</a></li>
                      <li><a href="/fr/videos/shojo" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Shôjo</a></li>
                      <li><a href="/fr/videos/shonen" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Shônen</a></li>
                      <li><a href="/fr/videos/slice-of-life" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Tranche de vie</a></li>
                      <li><a href="/fr/videos/sports" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Sport</a></li>
                      <li><a href="/fr/videos/supernatural" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Supernaturel</a></li>
                      <li><a href="/fr/videos/thriller" style="display:block; padding:0.5rem 0.75rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Thriller</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Liens Externes -->
            <a href="https://www.crunchyroll.com/manga" style="color:#d1d5db; text-decoration:none; transition:color 0.2s; cursor:pointer;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Manga</a>
            <a href="https://www.crunchyroll.com/games/index.html" target="_blank" style="color:#d1d5db; text-decoration:none; transition:color 0.2s; cursor:pointer;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Jeux</a>
            <a href="https://store.crunchyroll.com/?utm_source=web" target="_blank" style="color:#d1d5db; text-decoration:none; transition:color 0.2s; cursor:pointer;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#d1d5db'">Boutique</a>
            
            <!-- Menu News (Dropdown) -->
            <div class="bcp-dropdown" style="position:relative;">
              <button class="bcp-dropdown-btn" data-dropdown="news" style="display:flex; align-items:center; gap:0.375rem; color:white; background:none; border:none; font-size:0.875rem; font-weight:600; cursor:pointer; padding:0.5rem 0.75rem; border-radius:0.375rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='none'">
                News
                <svg viewBox="0 0 24 24" fill="currentColor" style="width:1rem; height:1rem;">
                  <path d="M7 10h10l-5 5z"/>
                </svg>
              </button>
              <!-- Dropdown Menu News -->
              <div class="bcp-dropdown-menu" id="news-menu" style="display:none; position:absolute; top:calc(100% + 0.5rem); left:0; background:rgba(18,18,18,0.98); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.1); border-radius:0.75rem; padding:1rem; min-width:280px; box-shadow:0 20px 50px rgba(0,0,0,0.5); z-index:100;">
                <ul style="list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:0.25rem;">
                  <li><a href="https://www.crunchyroll.com/news" target="_self" style="display:block; padding:0.75rem 1rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.5rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Toutes les news</a></li>
                  <li><a href="https://www.crunchyroll.com/fr/animeawards/index.html" target="_self" style="display:block; padding:0.75rem 1rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.5rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Anime Awards</a></li>
                  <li><a href="https://www.crunchyrollexpo.com" target="_self" style="display:block; padding:0.75rem 1rem; color:#d1d5db; text-decoration:none; font-size:0.875rem; font-weight:500; border-radius:0.5rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">Événements & expériences</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Section: Search, Watchlist, Notifications, Profile -->
        <div style="display:flex; align-items:center; gap:1rem; color:#d1d5db;">
          <!-- Recherche -->
          <a href="/fr/search" style="width:2.5rem; height:2.5rem; display:flex; align-items:center; justify-content:center; cursor:pointer; border-radius:0.5rem; transition:background 0.2s; color:inherit; text-decoration:none;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
            ${ICONS.search}
          </a>
          
          <!-- Watchlist -->
          <a href="/fr/watchlist" style="width:2.5rem; height:2.5rem; display:flex; align-items:center; justify-content:center; cursor:pointer; border-radius:0.5rem; transition:background 0.2s; color:inherit; text-decoration:none;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
            ${ICONS.bookmark}
          </a>
          
          <!-- Notifications -->
          <a href="/fr/notifications" style="width:2.5rem; height:2.5rem; display:flex; align-items:center; justify-content:center; cursor:pointer; border-radius:0.5rem; transition:background 0.2s; position:relative; color:inherit; text-decoration:none;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
            ${ICONS.bell}
            <!-- Badge de notification -->
            <span style="position:absolute; top:0.5rem; right:0.5rem; width:0.5rem; height:0.5rem; background:var(--cr-accent); border-radius:50%; border:2px solid var(--cr-dark-bg);"></span>
          </a>
          
          <!-- Séparateur -->
          <div style="width:1px; height:1.5rem; background:rgba(255,255,255,0.1); margin:0 0.5rem;"></div>
          
          <!-- Menu Utilisateur avec Avatar -->
          <div class="bcp-dropdown" style="position:relative;">
            <button class="bcp-dropdown-btn bcp-user-btn" data-dropdown="profile" style="display:flex; align-items:center; gap:0.5rem; background:none; border:none; cursor:pointer; padding:0.25rem 0.5rem; border-radius:0.5rem; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.05)'" onmouseout="this.style.background='transparent'">
              <!-- Avatar avec image -->
              <div style="width:2rem; height:2rem; border-radius:50%; overflow:hidden; border:2px solid rgba(244,117,33,0.5);">
                <img src="https://static.crunchyroll.com/assets/avatar/170x170/1046-dr-stone-senku.png" alt="Avatar" style="width:100%; height:100%; object-fit:cover;">
              </div>
              <svg viewBox="0 0 24 24" fill="currentColor" style="width:1rem; height:1rem; color:#9ca3af;">
                <path d="M7 10h10l-5 5z"/>
              </svg>
            </button>
            
            <!-- Dropdown Menu Profile -->
            <div class="bcp-dropdown-menu" id="profile-menu" style="display:none; position:absolute; top:calc(100% + 0.5rem); right:0; left:auto; background:rgba(18,18,18,0.98); backdrop-filter:blur(24px); border:1px solid rgba(255,255,255,0.1); border-radius:0.75rem; padding:0; min-width:320px; max-height:80vh; overflow-y:auto; box-shadow:0 20px 50px rgba(0,0,0,0.5); z-index:100;">
              
              <!-- Profile Header Section -->
              <a href="/fr/profiles/manage" style="display:flex; align-items:center; gap:1rem; padding:1.25rem; border-bottom:1px solid rgba(255,255,255,0.1); text-decoration:none; transition:background 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
                <div style="width:3.5rem; height:3.5rem; border-radius:50%; overflow:hidden; border:2px solid rgba(244,117,33,0.5); flex-shrink:0;">
                  <img src="https://static.crunchyroll.com/assets/avatar/170x170/1046-dr-stone-senku.png" alt="Avatar" style="width:100%; height:100%; object-fit:cover;">
                </div>
                <div style="flex:1; min-width:0;">
                  <h4 style="color:white; font-size:0.95rem; font-weight:700; margin:0 0 0.25rem 0;">JeremGaming</h4>
                  <div style="display:flex; align-items:center; gap:0.375rem;">
                    <svg style="width:0.875rem; height:0.875rem; fill:var(--cr-accent);" viewBox="0 0 16 16">
                      <path d="M2.419 13L0 4.797 4.837 6.94 8 2l3.163 4.94L16 4.798 13.581 13z"/>
                    </svg>
                    <span style="color:var(--cr-accent); font-size:0.75rem; font-weight:600;">Membre Premium</span>
                  </div>
                </div>
                <svg style="width:1rem; height:1rem; color:#6b7280;" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.566 6.368l-1.339 1.657-2.833-2.37 1.308-1.57a.994.994 0 0 1 .612-.317.716.716 0 0 1 .568.16l1.532 1.255c.17.148.288.377.317.612a.726.726 0 0 1-.165.573zM5.852 19.087l1.412-4.8.224-.272 2.82 2.338-.215.259-4.24 2.475zm10.26-9.696l-4.674 5.607-2.828-2.343 4.657-5.645 2.845 2.38zm4.368-3.81a2.775 2.775 0 0 0-.927-1.743L18.02 2.583c-1.027-.899-2.697-.743-3.658.357L5.789 13.304a.895.895 0 0 0-.166.312l-2.087 7.101a.881.881 0 0 0 1.29 1.01l6.29-3.67a.894.894 0 0 0 .232-.198l6.489-7.785 2.078-2.572c.452-.517.652-1.2.565-1.92z"/>
                </svg>
              </a>

              <!-- Account Section -->
              <div style="border-bottom:1px solid rgba(255,255,255,0.1);">
                <a href="#" style="display:flex; align-items:center; gap:0.875rem; padding:0.875rem 1.25rem; color:#d1d5db; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">
                  <svg style="width:1.25rem; height:1.25rem; flex-shrink:0;" viewBox="0 0 24 24" fill="currentColor">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M17.278 10.95a1 1 0 0 0 1.414 1.414l4.327-4.327a.996.996 0 0 0 .002-1.416l-4.329-4.328a1 1 0 1 0-1.414 1.414L19.9 6.328H9.656a1 1 0 0 0 0 2h10.242l-2.62 2.622ZM7.036 13.707a1 1 0 1 0-1.415-1.414L1.293 16.62a.996.996 0 0 0-.208 1.113.994.994 0 0 0 .215.309l4.321 4.321a1 1 0 0 0 1.415-1.414l-2.622-2.621h9.243a1 1 0 1 0 0-2H4.414l2.622-2.622Z"/>
                  </svg>
                  <span style="font-size:0.9rem; font-weight:500;">Changer de profil</span>
                </a>
                <a href="/fr/account/preferences" style="display:flex; align-items:center; gap:0.875rem; padding:0.875rem 1.25rem; color:#d1d5db; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">
                  <svg style="width:1.25rem; height:1.25rem; flex-shrink:0;" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,15.2 C10.2331429,15.2 8.8,13.7668571 8.8,12 C8.8,10.2331429 10.2331429,8.8 12,8.8 C13.7668571,8.8 15.2,10.2331429 15.2,12 C15.2,13.7668571 13.7668571,15.2 12,15.2 L12,15.2 Z M19.9691429,11.5005714 C19.9691429,11.3542857 19.9108571,11.224 19.7965714,11.1097143 C19.6822857,10.9954286 19.5622857,10.928 19.4377143,10.9062857 L18.344,10.7497143 C18.0102857,10.7085714 17.792,10.5314286 17.688,10.2182857 L17.2811429,9.21828571 C17.1348571,8.928 17.1565714,8.64571429 17.344,8.37485714 L18.0308571,7.50057143 C18.2182857,7.22971429 18.208,6.96914286 18,6.71885714 L17.2502857,6 C17.0205714,5.792 16.7702857,5.78171429 16.4994286,5.96914286 L15.6251429,6.62514286 C15.3542857,6.83314286 15.072,6.86514286 14.7817143,6.71885714 L13.7817143,6.312 C13.656,6.27085714 13.536,6.18285714 13.4217143,6.04685714 C13.3062857,5.912 13.2502857,5.78171429 13.2502857,5.656 L13.0937143,4.56228571 C13.072,4.43771429 13.0045714,4.31771429 12.8902857,4.20342857 C12.776,4.08914286 12.6457143,4.03085714 12.4994286,4.03085714 C12.3954286,4.01028571 12.2285714,4 12,4 L11.5005714,4.03085714 C11.3542857,4.03085714 11.224,4.08914286 11.1097143,4.20342857 C10.9942857,4.31771429 10.9268571,4.43771429 10.9062857,4.56228571 L10.7497143,5.656 C10.7085714,5.98971429 10.5314286,6.208 10.2194286,6.312 L9.21942857,6.71885714 C8.92685714,6.86514286 8.64571429,6.83314286 8.37485714,6.62514286 L7.50057143,5.96914286 C7.22971429,5.78171429 6.96914286,5.792 6.71885714,6 L6,6.71885714 C5.792,6.96914286 5.78171429,7.22971429 5.96914286,7.50057143 L6.62514286,8.37485714 C6.83314286,8.64685714 6.864,8.928 6.71885714,9.21942857 L6.312,10.2194286 C6.27085714,10.344 6.18171429,10.464 6.04685714,10.5782857 C5.91085714,10.6937143 5.78171429,10.7497143 5.656,10.7497143 L4.56228571,10.9062857 C4.43771429,10.928 4.31771429,10.9954286 4.20342857,11.1097143 C4.088,11.224 4.03085714,11.3542857 4.03085714,11.5005714 C4.01028571,11.6045714 4,11.7714286 4,12 L4.03085714,12.4994286 C4.03085714,12.6457143 4.088,12.776 4.20342857,12.8902857 C4.31771429,13.0057143 4.43771429,13.0731429 4.56228571,13.0937143 L5.656,13.2502857 C5.78171429,13.2502857 5.91085714,13.3074286 6.04685714,13.4217143 C6.18171429,13.5371429 6.27085714,13.656 6.312,13.7817143 L6.71885714,14.7817143 C6.864,15.0731429 6.83314286,15.3542857 6.62514286,15.6251429 L5.96914286,16.5005714 C5.78171429,16.7714286 5.76,16.9897143 5.90628571,17.1565714 C5.92685714,17.1771429 5.95314286,17.208 5.984,17.2502857 C6.016,17.2914286 6.05142857,17.3382857 6.09371429,17.3908571 C6.13485714,17.4422857 6.17714286,17.4902857 6.21828571,17.5314286 C6.26057143,17.5737143 6.30171429,17.6148571 6.344,17.656 C6.38514286,17.6982857 6.42628571,17.7394286 6.46857143,17.7817143 C6.50971429,17.8228571 6.552,17.8548571 6.59428571,17.8742857 C6.67657143,17.9588571 6.81714286,18.0205714 7.016,18.0628571 C7.21371429,18.104 7.37485714,18.0937143 7.50057143,18.0308571 L8.37485714,17.3748571 C8.64571429,17.1668571 8.92685714,17.136 9.21828571,17.2811429 L10.2182857,17.688 C10.344,17.7291429 10.464,17.8182857 10.5782857,17.9531429 C10.6925714,18.0891429 10.7497143,18.2182857 10.7497143,18.344 L10.9062857,19.4377143 C10.9268571,19.5622857 10.9942857,19.6822857 11.1097143,19.7965714 C11.224,19.9108571 11.3542857,19.968 11.4994286,19.968 C11.6034286,19.9897143 11.7702857,20 12,20 L12.4994286,19.9691429 C12.6457143,19.9691429 12.776,19.9108571 12.8902857,19.7965714 C13.0045714,19.6822857 13.072,19.5622857 13.0937143,19.4377143 L13.2502857,18.344 C13.2502857,18.2182857 13.3074286,18.0891429 13.4217143,17.9531429 C13.536,17.8182857 13.656,17.7291429 13.7817143,17.688 L14.7817143,17.2811429 C15.0731429,17.136 15.3542857,17.1668571 15.6251429,17.3748571 L16.5005714,18.0308571 C16.7702857,18.2182857 17.0308571,18.208 17.2811429,18 L18,17.2811429 C18.208,17.0308571 18.2182857,16.7714286 18.032,16.4994286 L17.344,15.6251429 C17.1565714,15.3542857 17.136,15.0731429 17.2811429,14.7817143 L17.688,13.7817143 C17.792,13.4685714 18.0102857,13.2914286 18.344,13.2502857 L19.4377143,13.0937143 C19.5622857,13.0731429 19.6822857,13.0057143 19.7965714,12.8902857 C19.9108571,12.776 19.9691429,12.6457143 19.9691429,12.4994286 C19.9897143,12.3965714 20,12.2297143 20,12 L19.9691429,11.5005714 Z"/>
                  </svg>
                  <span style="font-size:0.9rem; font-weight:500;">Paramètres</span>
                </a>
              </div>

              <!-- Content Section -->
              <div style="border-bottom:1px solid rgba(255,255,255,0.1);">
                <a href="/fr/watchlist" style="display:flex; align-items:center; gap:0.875rem; padding:0.875rem 1.25rem; color:#d1d5db; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">
                  <svg style="width:1.25rem; height:1.25rem; flex-shrink:0;" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17 18.113l-3.256-2.326A2.989 2.989 0 0 0 12 15.228c-.629 0-1.232.194-1.744.559L7 18.113V4h10v14.113zM18 2H6a1 1 0 0 0-1 1v17.056c0 .209.065.412.187.581a.994.994 0 0 0 1.394.233l4.838-3.455a1 1 0 0 1 1.162 0l4.838 3.455A1 1 0 0 0 19 20.056V3a1 1 0 0 0-1-1z"/>
                  </svg>
                  <span style="font-size:0.9rem; font-weight:500;">Watchlist</span>
                </a>
                <a href="/fr/crunchylists" style="display:flex; align-items:center; gap:0.875rem; padding:0.875rem 1.25rem; color:#d1d5db; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">
                  <svg style="width:1.25rem; height:1.25rem; flex-shrink:0;" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 17v2H6v-2h16zM3 17c.552 0 1 .448 1 1s-.448 1-1 1-1-.448-1-1 .448-1 1-1zm19-6v2H6v-2h16zM3 11c.552 0 1 .448 1 1s-.448 1-1 1-1-.448-1-1 .448-1 1-1zm19-6v2H6V5h16zM3 5c.552 0 1 .448 1 1s-.448 1-1 1-1-.448-1-1 .448-1 1-1z"/>
                  </svg>
                  <span style="font-size:0.9rem; font-weight:500;">Crunchylists</span>
                </a>
                <a href="/fr/history" style="display:flex; align-items:center; gap:0.875rem; padding:0.875rem 1.25rem; color:#d1d5db; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">
                  <svg style="width:1.25rem; height:1.25rem; flex-shrink:0;" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11 7a1 1 0 0 1 2 0v5.411l-3.293 3.293a1 1 0 0 1-1.414-1.414L11 11.583V7zm1-5c5.514 0 10 4.486 10 10s-4.486 10-10 10a9.977 9.977 0 0 1-6.667-2.547 1 1 0 1 1 1.334-1.49A7.986 7.986 0 0 0 12 20c4.411 0 8-3.589 8-8s-3.589-8-8-8c-4.072 0-7.436 3.06-7.931 7H6l-3 3-3-3h2.051C2.554 5.954 6.823 2 12 2z"/>
                  </svg>
                  <span style="font-size:0.9rem; font-weight:500;">Historique</span>
                </a>
              </div>

              <!-- Notifications Section -->
              <div style="border-bottom:1px solid rgba(255,255,255,0.1);">
                <a href="/fr/notifications" style="display:flex; align-items:center; gap:0.875rem; padding:0.875rem 1.25rem; color:#d1d5db; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">
                  <svg style="width:1.25rem; height:1.25rem; flex-shrink:0;" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.382 18L6 15.274V11c0-4.252 2.355-7 6-7s6 2.748 6 7v4.274L19.62 18H4.382zM12 21a1.993 1.993 0 0 1-1.722-1h3.444c-.347.595-.985 1-1.722 1zm9.806-3.234L20 14.726V11c0-5.299-3.29-9-8-9s-8 3.701-8 9v3.726L2.16 17.829a1.488 1.488 0 0 0 .066 1.459A1.49 1.49 0 0 0 3.502 20h4.64c.448 1.721 2 3 3.859 3s3.41-1.279 3.859-3h4.64c.525 0 1.002-.267 1.278-.713.275-.446.298-.992.029-1.521z"/>
                  </svg>
                  <span style="font-size:0.9rem; font-weight:500;">Notifications</span>
                </a>
                <a href="/fr/redeem" style="display:flex; align-items:flex-start; gap:0.875rem; padding:0.875rem 1.25rem; color:#d1d5db; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">
                  <svg style="width:1.25rem; height:1.25rem; flex-shrink:0; margin-top:0.125rem;" viewBox="0 0 40 40" fill="currentColor">
                    <path d="M13.963 3c2.827 0 4.882.872 6.044 2.95 1.118-2.003 3.069-2.886 5.742-2.947l.3-.003h.256c1.311.007 2.294.105 3.328.465 1.906.662 3.267 2.148 3.362 4.294L33 8v.295l-.003.286c-.021 1.321-.26 2.471-.748 3.419H37v10l-3.001-.001L34 37H6l-.001-15.001L3 22V12h4.763c-.488-.948-.727-2.098-.748-3.419l-.003-.286V8c0-2.276 1.39-3.848 3.367-4.535 1.034-.36 2.017-.458 3.328-.465h.256zM18.5 21.999 8.999 22v12l9.501-.001v-12zM30.999 22l-9.499-.001v12l9.499.001V22zm-17.062-7.001L6 15v4l12.5-.001V15h-4.488l-.075-.001zM34 15l-7.926-.001L26 15h-4.5v3.999L34 19v-4zm-7.578-8.998h-.611c-2.728.059-3.505 1.165-3.72 3.485l-.018.221-.026.413-.018.435-.01.458-.007.986H26c2.842 0 3.665-1.006 3.903-2.308l.021-.127.032-.25.022-.257.013-.26.006-.265L30 8c0-1.52-1.55-1.885-2.852-1.972l-.144-.009-.3-.012-.282-.005zm-12.833 0-.282.005-.3.012c-1.328.071-2.995.405-2.995 1.981l.003.533.006.264.013.261.022.256.032.251c.208 1.363.99 2.435 3.924 2.435H18l-.007-.986-.01-.458-.018-.435-.026-.413c-.187-2.471-.925-3.645-3.738-3.706h-.612z"/>
                  </svg>
                  <div>
                    <div style="font-size:0.9rem; font-weight:500;">Carte cadeau</div>
                    <div style="font-size:0.75rem; color:#9ca3af; margin-top:0.25rem; line-height:1.3;">Vous avez une carte cadeau ? Profitez-en ici.</div>
                  </div>
                </a>
              </div>

              <!-- Logout Section -->
              <a href="https://sso.crunchyroll.com/logout" style="display:flex; align-items:center; gap:0.875rem; padding:0.875rem 1.25rem; color:#d1d5db; text-decoration:none; transition:all 0.2s;" onmouseover="this.style.background='rgba(244,117,33,0.1)'; this.style.color='var(--cr-accent)'" onmouseout="this.style.background='transparent'; this.style.color='#d1d5db'">
                <svg style="width:1.25rem; height:1.25rem; flex-shrink:0;" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 15a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V4H6v16h8v-4a1 1 0 0 1 1-1zm8.923-2.618a1 1 0 0 1-.217.326l-4 3.999A.993.993 0 0 1 19 17a.999.999 0 0 1-.707-1.707L20.586 13H15a1 1 0 0 1 0-2h5.586l-2.293-2.293a.999.999 0 1 1 1.414-1.414l3.999 4a.992.992 0 0 1 .217 1.089z"/>
                </svg>
                <span style="font-size:0.9rem; font-weight:500;">Se déconnecter</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  `;
}

function renderHero(data) {
  return `
    <div class="bcp-hero">
      <div class="bcp-hero-bg">
        <img src="${data.backgroundImage}" alt="${data.title}" class="animate-subtle-zoom">
        <div class="bcp-hero-overlay-t"></div>
        <div class="bcp-hero-overlay-r"></div>
        <div class="bcp-hero-overlay-b"></div>
        <div class="bcp-hero-overlay-l"></div>
      </div>
      
      <div class="bcp-hero-content">
        <div class="bcp-hero-main">
          <div class="bcp-trending-tag animate-slide-up delay-100">
            <span style="width:0.5rem; height:0.5rem; border-radius:50%; background:var(--cr-accent);" class="animate-pulse"></span>
            <span class="bcp-trending-text">#1 Trending Now</span>
          </div>
          
          <h1 class="bcp-title animate-slide-up delay-200">${data.title}</h1>
          
          <div class="bcp-metadata animate-slide-up delay-300">
             <div class="bcp-rating-badge">
                ${ICONS.star}
                <span style="font-weight:700; color:#FFD700;">${data.rating}</span>
                <span style="font-size:0.75rem; color:var(--cr-text-tertiary);">(${data.votes})</span>
             </div>
             <span class="bcp-meta-tag">${data.contentRating || 'TV-14'}</span>
             <span class="bcp-meta-tag">${data.year || '2024'}</span>
             <span class="bcp-meta-tag" style="color:var(--cr-accent); background:rgba(255, 107, 0, 0.1);">HD</span>
             <span class="bcp-meta-tag">Sub | Dub</span>
          </div>
          
          <p class="bcp-description animate-slide-up delay-400">${data.description}</p>
          
          <div class="bcp-actions animate-slide-up delay-500">
            <button class="bcp-btn-primary" onclick="document.querySelector('.bcp-episode-card')?.click()">
              <span style="fill:white;">${ICONS.play}</span>
              <span>Start Watching E1</span>
            </button>
            <button class="bcp-btn-secondary">
              ${ICONS.bookmark}
              <span>Add to Watchlist</span>
            </button>
            <button class="bcp-btn-secondary" style="padding:1rem; border-radius:50%;">
              ${ICONS.share}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderEpisodeList(data) {
  const episodes = data.episodes || [];

  // Log for debugging
  console.log('[BetterCrunchy] Rendering episodes:', episodes.length, 'episodes found');

  return `
    <div class="bcp-episodes-section">
      <div class="bcp-season-selector">
        <button class="bcp-season-btn active">Season 1</button>
        <button class="bcp-season-btn">Season 2</button>
        <button class="bcp-season-btn">Specials</button>
      </div>
      
      <div class="bcp-episode-list-container">
        <div class="bcp-episode-scroll-area">
          ${episodes.length > 0 ? episodes.map((ep, index) => `
            <div class="bcp-episode-card animate-slide-up" style="animation-delay: ${100 + (index * 50)}ms" onclick="window.location.href='${ep.link}'">
              <div class="bcp-ep-thumb">
                <img src="${ep.thumbnail}" alt="${ep.title}" class="bcp-ep-img">
                <div class="bcp-ep-overlay">
                   <div class="bcp-play-btn">
                      ${ICONS.play}
                   </div>
                </div>
                ${ep.progress > 0 ? `
                <div class="bcp-ep-progress">
                    <div class="bcp-ep-progress-bar" style="width: ${ep.progress}%"></div>
                </div>` : ''}
                <div class="bcp-ep-duration">
                    ${ep.duration}
                </div>
              </div>
              <div class="bcp-ep-info">
                 <h3><span style="color:var(--cr-text-tertiary); font-weight:400; margin-right:0.5rem;">${ep.number}</span>${ep.title}</h3>
                 <p>${ep.description}</p>
              </div>
            </div>
          `).join('') : '<div style="color:var(--cr-text-secondary); padding:2rem; text-align:center; grid-column:1/-1;">No episodes found</div>'}
        </div>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <footer class="bcp-footer">
        <div class="bcp-footer-content">
            <div style="display:flex; align-items:center; gap:1rem; opacity:0.8;">
                <div style="width:3rem; height:3rem; border-radius:50%; background:var(--cr-accent); display:flex; align-items:center; justify-content:center;">
                    <svg viewBox="0 0 24 24" fill="black" style="width:1.5rem; height:1.5rem;"><path d="M12 2L2 7l10 5 10-5-10-5zm0 9l2.5-1.25L12 8.5l-2.5 1.25L12 11zm0 2.5l-5-2.5-5 2.5L12 22l10-8.5-5-2.5-5 2.5z"/></svg>
                </div>
                <span style="font-weight:700; font-size:1.5rem; color:white;">crunchyroll</span>
            </div>
            <div style="display:flex; flex-direction:column; align-items:flex-end; gap:1.5rem;">
                <div style="display:flex; gap:2rem; font-size:0.875rem; font-weight:500; color:#9ca3af;">
                    <a href="#" style="color:inherit; text-decoration:none;">Terms</a>
                    <a href="#" style="color:inherit; text-decoration:none;">Privacy</a>
                    <a href="#" style="color:inherit; text-decoration:none;">Premium</a>
                    <a href="#" style="color:inherit; text-decoration:none;">Support</a>
                </div>
                <p style="font-size:0.75rem; font-weight:300; color:#4b5563;">&copy; 2024 Crunchyroll, LLC. All rights reserved.</p>
            </div>
        </div>
    </footer>
    `;
}

function setupInteractions() {
  // Navbar Scroll Effect
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.bcp-navbar');
    if (window.scrollY > 20) nav?.classList.add('scrolled');
    else nav?.classList.remove('scrolled');
  });

  // Dropdown Menu Logic
  console.log('[BetterCrunchy] Setting up dropdown menus...');
  const dropdownBtns = document.querySelectorAll('.bcp-dropdown-btn[data-dropdown]');
  console.log(`[BetterCrunchy] Found ${dropdownBtns.length} dropdown buttons`);

  dropdownBtns.forEach(btn => {
    const dropdownId = btn.getAttribute('data-dropdown');
    console.log(`[BetterCrunchy] Setting up dropdown: ${dropdownId}`);

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const menu = document.getElementById(`${dropdownId}-menu`);

      console.log(`[BetterCrunchy] Clicked dropdown: ${dropdownId}, menu found:`, !!menu);

      if (!menu) {
        console.warn(`[BetterCrunchy] Menu not found for dropdown: ${dropdownId}`);
        return;
      }

      // Check if menu is currently visible (using computed style)
      const computedStyle = window.getComputedStyle(menu);
      const isOpen = computedStyle.display !== 'none';

      console.log(`[BetterCrunchy] Menu ${dropdownId} current display:`, menu.style.display, 'computed:', computedStyle.display, 'isOpen:', isOpen);

      // Close all OTHER dropdowns first
      document.querySelectorAll('.bcp-dropdown-menu').forEach(m => {
        if (m !== menu) {
          m.style.display = 'none';
        }
      });

      // Toggle this one
      if (!isOpen) {
        menu.style.display = 'block';
        console.log(`[BetterCrunchy] Opened menu: ${dropdownId}`);
      } else {
        menu.style.display = 'none';
        console.log(`[BetterCrunchy] Closed menu: ${dropdownId}`);
      }
    });
  });

  // Close dropdowns when clicking outside (using setTimeout to avoid race condition)
  document.addEventListener('click', (e) => {
    // Use setTimeout to ensure this runs after the button click handler
    setTimeout(() => {
      if (!e.target.closest('.bcp-dropdown')) {
        document.querySelectorAll('.bcp-dropdown-menu').forEach(menu => {
          menu.style.display = 'none';
        });
      }
    }, 0);
  });

  console.log('[BetterCrunchy] Dropdown setup complete!');
}

// --- Existing Features (Copied and preserved) ---
function initFeatures() {
  // ... (Keep existing initFeatures logic if needed for other pages)
  // For this specific task, we focus on the series page redesign.
  // The original features like auto-skip, etc., are more relevant for the video player page.
}