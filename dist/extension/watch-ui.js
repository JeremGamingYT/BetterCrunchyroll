// BetterCrunchyroll - Watch Page UI Module
// Injected directly into Crunchyroll watch pages as DOM elements

const WatchPageUI = (function () {
    'use strict';

    // Configuration
    const CONFIG = {
        accentColor: '#f97316',
        appUrl: 'http://localhost:3000'
    };

    // State
    let currentTab = 'episodes';
    let episodeData = null;
    let seriesData = null;

    // ===============================
    // HTML Templates
    // ===============================

    function createEpisodeInfoBar(episode, series, prevEpisode, nextEpisode) {
        return `
            <section class="bcr-episode-info">
                <div class="bcr-episode-info-inner">
                    <div class="bcr-nav-btn-container">
                        ${prevEpisode ? `
                            <a href="/fr/watch/${prevEpisode.id}" class="bcr-nav-btn bcr-nav-prev" data-episode-id="${prevEpisode.id}">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="15 18 9 12 15 6"></polyline>
                                </svg>
                                <span class="bcr-nav-text">Épisode précédent</span>
                            </a>
                        ` : `<div class="bcr-nav-placeholder">Premier épisode</div>`}
                    </div>
                    
                    <div class="bcr-episode-center">
                        <a href="/fr/series/${series.id}" class="bcr-series-link">
                            ${series.title}
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                        </a>
                        <h1 class="bcr-episode-title">
                            Épisode ${episode.episode_number || episode.episodeNumber}: ${episode.title}
                        </h1>
                    </div>
                    
                    <div class="bcr-nav-btn-container">
                        ${nextEpisode ? `
                            <a href="/fr/watch/${nextEpisode.id}" class="bcr-nav-btn bcr-nav-next" data-episode-id="${nextEpisode.id}">
                                <span class="bcr-nav-text">Épisode suivant</span>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="9 18 15 12 9 6"></polyline>
                                </svg>
                            </a>
                        ` : `<div class="bcr-nav-placeholder">Dernier épisode</div>`}
                    </div>
                </div>
            </section>
        `;
    }

    function createTabs(episodeCount) {
        return `
            <section class="bcr-tabs">
                <div class="bcr-tabs-inner">
                    <button class="bcr-tab bcr-tab-active" data-tab="episodes">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="8" y1="6" x2="21" y2="6"></line>
                            <line x1="8" y1="12" x2="21" y2="12"></line>
                            <line x1="8" y1="18" x2="21" y2="18"></line>
                            <line x1="3" y1="6" x2="3.01" y2="6"></line>
                            <line x1="3" y1="12" x2="3.01" y2="12"></line>
                            <line x1="3" y1="18" x2="3.01" y2="18"></line>
                        </svg>
                        Épisodes
                        <span class="bcr-tab-badge">${episodeCount}</span>
                    </button>
                    <button class="bcr-tab" data-tab="details">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        Détails
                    </button>
                    <button class="bcr-tab" data-tab="comments">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        Commentaires
                    </button>
                </div>
            </section>
        `;
    }

    function createEpisodeGrid(episodes, currentEpisodeId, bannerImage) {
        const episodeCards = episodes.map(ep => {
            const isCurrent = ep.id === currentEpisodeId;
            const thumbnail = ep.images?.thumbnail?.[0]?.[0]?.source || bannerImage || '';

            return `
                <a href="/fr/watch/${ep.id}" class="bcr-episode-card ${isCurrent ? 'bcr-episode-card-current' : ''}" data-episode-id="${ep.id}">
                    <div class="bcr-episode-thumb">
                        <img src="${thumbnail}" alt="${ep.title}" loading="lazy" />
                        <div class="bcr-episode-overlay">
                            <span class="bcr-episode-number ${isCurrent ? 'bcr-episode-number-current' : ''}">
                                E${ep.episode_number || ep.episodeNumber}
                            </span>
                            ${ep.is_premium_only ? `
                                <span class="bcr-premium-badge">
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M2.5 19h19v2h-19v-2zm21.33-9.5l-1.5-1.31-4.31 4.82-1.51 1.69-7.01-.01-1.5-1.69-4.31-4.82-1.5 1.31 7.32 8.01h7.01l7.32-8.01z"/>
                                    </svg>
                                </span>
                            ` : ''}
                            <span class="bcr-episode-duration">${ep.duration_ms ? Math.round(ep.duration_ms / 60000) : 24}m</span>
                        </div>
                        <div class="bcr-play-btn">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </div>
                        ${isCurrent ? '<div class="bcr-current-indicator"></div>' : ''}
                    </div>
                    <div class="bcr-episode-meta">
                        <p class="bcr-episode-card-title">${ep.title}</p>
                    </div>
                </a>
            `;
        }).join('');

        return `
            <section class="bcr-content" id="bcr-content">
                <div class="bcr-tab-content bcr-tab-content-active" data-content="episodes">
                    <div class="bcr-content-header">
                        <h2 class="bcr-section-title">
                            <span class="bcr-title-accent"></span>
                            Tous les épisodes
                        </h2>
                        <span class="bcr-episode-count">Saison 1 • ${episodes.length} épisodes</span>
                    </div>
                    <div class="bcr-episode-grid">
                        ${episodeCards}
                    </div>
                </div>
                
                <div class="bcr-tab-content" data-content="details">
                    <div class="bcr-details-container">
                        <div class="bcr-details-main">
                            <div class="bcr-details-section">
                                <h2 class="bcr-section-title">
                                    <span class="bcr-title-accent"></span>
                                    Description de l'épisode
                                </h2>
                                <p class="bcr-description" id="bcr-episode-description">
                                    Chargement...
                                </p>
                            </div>
                        </div>
                        <div class="bcr-details-sidebar">
                            <div class="bcr-info-card">
                                <h3 class="bcr-info-title">Informations</h3>
                                <div class="bcr-info-row">
                                    <span class="bcr-info-label">Épisode</span>
                                    <span class="bcr-info-value" id="bcr-ep-num">-</span>
                                </div>
                                <div class="bcr-info-row">
                                    <span class="bcr-info-label">Saison</span>
                                    <span class="bcr-info-value">1</span>
                                </div>
                                <div class="bcr-info-row">
                                    <span class="bcr-info-label">Durée</span>
                                    <span class="bcr-info-value" id="bcr-ep-duration">-</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="bcr-tab-content" data-content="comments">
                    <div class="bcr-comments-placeholder">
                        <div class="bcr-placeholder-icon">
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </div>
                        <h3 class="bcr-placeholder-title">Commentaires à venir</h3>
                        <p class="bcr-placeholder-text">Les commentaires seront bientôt disponibles.</p>
                    </div>
                </div>
            </section>
        `;
    }

    function createFooter() {
        return `
            <footer class="bcr-footer">
                <div class="bcr-footer-inner">
                    <span class="bcr-footer-text">BetterCrunchyroll</span>
                    <span class="bcr-footer-separator">•</span>
                    <span class="bcr-footer-text">Interface améliorée</span>
                </div>
            </footer>
        `;
    }

    // ===============================
    // Event Handlers
    // ===============================

    function setupEventListeners(container) {
        // Tab switching
        container.querySelectorAll('.bcr-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabId = e.currentTarget.dataset.tab;
                switchTab(tabId, container);
            });
        });

        // Episode navigation
        container.querySelectorAll('[data-episode-id]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const episodeId = e.currentTarget.dataset.episodeId;
                navigateToEpisode(episodeId);
            });
        });
    }

    function switchTab(tabId, container) {
        currentTab = tabId;

        // Update tab buttons
        container.querySelectorAll('.bcr-tab').forEach(tab => {
            tab.classList.toggle('bcr-tab-active', tab.dataset.tab === tabId);
        });

        // Update content
        container.querySelectorAll('.bcr-tab-content').forEach(content => {
            content.classList.toggle('bcr-tab-content-active', content.dataset.content === tabId);
        });
    }

    function navigateToEpisode(episodeId) {
        // Update URL
        const newUrl = `/fr/watch/${episodeId}`;
        window.history.pushState({}, '', newUrl);

        // Trigger page update via custom event
        window.dispatchEvent(new CustomEvent('bcr-navigate', {
            detail: { episodeId }
        }));

        // Trigger popstate to notify content script (no full reload needed)
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    // ===============================
    // Main Render Function
    // ===============================

    function render(episode, series, episodes, currentEpisodeId) {
        episodeData = episode;
        seriesData = series;

        const currentIndex = episodes.findIndex(ep => ep.id === currentEpisodeId);
        const prevEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
        const nextEpisode = currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;
        const bannerImage = series.images?.poster_wide?.[0]?.[0]?.source || '';

        const html = `
            <div id="bcr-ui" class="bcr-ui">
                ${createEpisodeInfoBar(episode, series, prevEpisode, nextEpisode)}
                ${createTabs(episodes.length)}
                ${createEpisodeGrid(episodes, currentEpisodeId, bannerImage)}
                ${createFooter()}
            </div>
        `;

        return html;
    }

    function updateDetails(episode) {
        const descEl = document.getElementById('bcr-episode-description');
        const numEl = document.getElementById('bcr-ep-num');
        const durEl = document.getElementById('bcr-ep-duration');

        if (descEl) descEl.textContent = episode.description || 'Aucune description disponible.';
        if (numEl) numEl.textContent = episode.episode_number || episode.episodeNumber || '-';
        if (durEl) durEl.textContent = `${episode.duration_ms ? Math.round(episode.duration_ms / 60000) : 24} min`;
    }

    // ===============================
    // Public API
    // ===============================

    return {
        render,
        updateDetails,
        setupEventListeners,
        switchTab,
        CONFIG
    };

})();

// Export for content script
if (typeof window !== 'undefined') {
    window.WatchPageUI = WatchPageUI;
}
