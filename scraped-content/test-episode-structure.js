// TEST SCRIPT - Copier/coller dans la console Chrome sur la page Crunchyroll
// Ceci va afficher la structure exacte des 3 premiers épisodes

console.log('=== DIAGNOSTIC DES ÉPISODES ===');

const allCards = Array.from(document.querySelectorAll('[class*="playable-card"]'));
console.log(`\n📊 Total playable cards: ${allCards.length}`);

const episodeCards = allCards.filter(card => {
    const link = card.querySelector('a[href*="/watch/"]');
    return !!link;
});

console.log(`✅ Cards avec /watch/ link: ${episodeCards.length}\n`);

// Analyser les 3 premiers
episodeCards.slice(0, 3).forEach((card, i) => {
    console.log(`\n━━━ ÉPISODE ${i + 1} ━━━`);

    // Lien
    const link = card.querySelector('a[href*="/watch/"]');
    console.log(`🔗 Link: ${link?.href}`);

    // Tous les h1-h6
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(tag => {
        const el = card.querySelector(tag);
        if (el) console.log(`${tag.toUpperCase()}: "${el.textContent.trim()}"`);
    });

    // Tous les spans
    const spans = Array.from(card.querySelectorAll('span'));
    console.log(`\n📝 Spans (${spans.length}):`);
    spans.slice(0, 10).forEach((span, idx) => {
        const text = span.textContent.trim();
        if (text && text.length < 100) {
            console.log(`  ${idx}: "${text}"`);
        }
    });

    // Image
    const img = card.querySelector('img');
    if (img) {
        console.log(`\n🖼️ IMG src: ${img.src?.substring(0, 100)}...`);
        console.log(`   srcset: ${img.srcset?.substring(0, 100)}...`);
    }

    // Data attributes
    console.log(`\n📋 Data attributes:`);
    Array.from(card.attributes).forEach(attr => {
        if (attr.name.startsWith('data-')) {
            console.log(`  ${attr.name}: ${attr.value}`);
        }
    });

    // Classes
    console.log(`\n🎨 Classes: ${card.className}`);

    console.log(`\n📦 HTML Preview (first 300 chars):`);
    console.log(card.outerHTML.substring(0, 300) + '...');
});

console.log('\n✅ Diagnostic terminé!');
