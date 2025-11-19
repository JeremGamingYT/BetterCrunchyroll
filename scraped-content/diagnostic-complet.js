/**
 * DIAGNOSTIC COMPLET - COPIER/COLLER DANS LA CONSOLE DE CHROME
 * Sur la page Darling in the Franxx ou une autre série Crunchyroll
 */

console.log('🔍 === DIAGNOSTIC COMPLET DES ÉPISODES CRUNCHYROLL ===\n');

// 1. Vérifier la présence d'éléments
console.log('📦 1. RECHERCHE D'ÉLÉMENTS');
const allCards = document.querySelectorAll('[class*="playable-card"]');
const listCards = document.querySelectorAll('[class*="erc-list-card"]');
const watchLinks = document.querySelectorAll('a[href*="/watch/"]');

console.log(`   [class*="playable-card"]: ${allCards.length}`);
console.log(`   [class*="erc-list-card"]: ${listCards.length}`);
console.log(`   a[href*="/watch/"]: ${watchLinks.length}`);

// 2. Analyse d'une carte complète
if (watchLinks.length > 0) {
    console.log('\n📋 2. STRUCTURE DE LA PREMIÈRE CARTE D\'ÉPISODE');
    const firstCard = watchLinks[0].closest('[class*="card"]') || watchLinks[0].closest('div');

    console.log('   🔗 Link:', watchLinks[0].href);
    console.log('   📝 Classes de la carte:', firstCard?.className || 'N/A');

    // Chercher tous les textes
    const h1 = firstCard?.querySelector('h1');
    const h2 = firstCard?.querySelector('h2');
    const h3 = firstCard?.querySelector('h3');
    const h4 = firstCard?.querySelector('h4');

    console.log('\n   📄 TITRES DANS LA CARTE:');
    if (h1) console.log(`      H1: "${h1.textContent.trim()}"`);
    if (h2) console.log(`      H2: "${h2.textContent.trim()}"`);
    if (h3) console.log(`      H3: "${h3.textContent.trim()}"`);
    if (h4) console.log(`      H4: "${h4.textContent.trim()}"`);

    // Chercher tous les spans
    const spans = firstCard?.querySelectorAll('span') || [];
    console.log(`\n   📝 SPANS (${spans.length} trouvés, montrant les 15 premiers):`);
    Array.from(spans).slice(0, 15).forEach((span, i) => {
        const text = span.textContent.trim();
        if (text && text.length < 80) {
            console.log(`      [${i}] "${text}"`);
        }
    });

    // Image
    const img = firstCard?.querySelector('img');
    console.log('\n   🖼️  IMAGE:');
    if (img) {
        console.log(`      src: ${img.src?.substring(0, 100)}...`);
        console.log(`      srcset: ${img.srcset?.substring(0, 100)}...`);
    } else {
        console.log('      Aucune image trouvée');
    }

    // data-t attributes
    console.log('\n   🏷️  DATA ATTRIBUTES:');
    const elementsWithDataT = firstCard?.querySelectorAll('[data-t]') || [];
    elementsWithDataT.forEach(el => {
        console.log(`      [${el.tagName}] data-t="${el.getAttribute('data-t')}" -> "${el.textContent?.trim().substring(0, 50)}..."`);
    });

    // HTML complet (tronqué)
    console.log('\n   💻 HTML (premiers 500 caractères):');
    console.log(firstCard?.outerHTML.substring(0, 500) + '...\n');
}

// 3. Test du scraper actuel
console.log('\n🧪 3. TEST DU SCRAPER ACTUEL');
const cardsWithLinks = Array.from(allCards).filter(card => {
    return card.querySelector('a[href*="/watch/"]');
});

console.log(`   Cartes avec lien /watch/: ${cardsWithLinks.length}`);

if (cardsWithLinks.length > 0) {
    console.log('\n   📊 ANALYSE DES 3 PREMIÈRES CARTES:');

    cardsWithLinks.slice(0, 3).forEach((card, i) => {
        const link = card.querySelector('a[href*="/watch/"]');
        const url = new URL(link.href);
        const episodeMatch = url.pathname.match(/\/watch\/([^\/]+)/);

        // Chercher titre
        const h4 = card.querySelector('h4');
        const h3 = card.querySelector('h3');
        const titleElement = h4 || h3;

        // Chercher numéro d'épisode
        const numberElement = card.querySelector('[data-t*="episode"]') ||
            card.querySelector('[class*="episode"][class*="number"]');

        // Chercher durée
        const timeElement = Array.from(card.querySelectorAll('span')).find(span => {
            const text = span.textContent.trim();
            return /^\d+m$/.test(text) || /^\d+:\d+$/.test(text);
        });

        console.log(`\n   Épisode ${i + 1}:`);
        console.log(`      URL: ${link.href}`);
        console.log(`      ID: ${episodeMatch?.[1]}`);
        console.log(`      Titre (h4/h3): "${titleElement?.textContent.trim() || 'NON TROUVÉ'}"`);
        console.log(`      Numéro: "${numberElement?.textContent.trim() || 'NON TROUVÉ'}"`);
        console.log(`      Durée: "${timeElement?.textContent.trim() || 'NON TROUVÉE'}"`);
    });
}

console.log('\n✅ === FIN DU DIAGNOSTIC ===');
console.log('\n📤 Copiez TOUS ces résultats et envoyez-les moi pour que je puisse corriger le scraper !');
