#!/bin/bash

##############################################################################
# BetterCrunchyroll - Exemples d'Utilisation des Scripts
# 
# Ce fichier montre comment utiliser les scripts de récupération de données
# pour l'extension BetterCrunchyroll
#
# À adapter selon votre système d'exploitation et vos besoins
##############################################################################

set -e  # Exit on error

# Couleurs pour la sortie
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="$PROJECT_DIR/scripts"
DATA_DIR="$PROJECT_DIR/Data"

echo -e "${BLUE}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     BetterCrunchyroll - Exemples d'Utilisation       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

##############################################################################
# Exemple 1: Tester les APIs Crunchyroll
##############################################################################
example_test_api() {
    echo -e "${GREEN}📋 Exemple 1: Tester les APIs${NC}"
    echo "Commande:"
    echo -e "  ${YELLOW}node $SCRIPTS_DIR/test-crunchyroll-api.js${NC}"
    echo ""
    echo "Ce que ça fait:"
    echo "  ✓ Teste l'authentification Crunchyroll"
    echo "  ✓ Teste l'endpoint getSeries.md"
    echo "  ✓ Teste l'endpoint getRating.md"
    echo "  ✓ Affiche un résumé coloré"
    echo ""
}

##############################################################################
# Exemple 2: Récupérer les données (simple)
##############################################################################
example_fetch_simple() {
    echo -e "${GREEN}📥 Exemple 2: Récupérer les données (simple)${NC}"
    echo "Commande:"
    echo -e "  ${YELLOW}node $SCRIPTS_DIR/fetch-crunchyroll-data-proxy.js${NC}"
    echo ""
    echo "Prérequis:"
    echo "  ✓ Serveur Next.js en cours d'exécution (npm run dev)"
    echo ""
    echo "Ce que ça fait:"
    echo "  ✓ Récupère les séries existantes dans Data/series/"
    echo "  ✓ Met à jour les fichiers series.json"
    echo ""
}

##############################################################################
# Exemple 3: Récupérer des séries spécifiques
##############################################################################
example_fetch_specific() {
    echo -e "${GREEN}🎯 Exemple 3: Récupérer des séries spécifiques${NC}"
    echo "Commande:"
    echo -e "  ${YELLOW}node $SCRIPTS_DIR/fetch-crunchyroll-data-proxy.js --series G0XHWM1JP,G1XHJV0G7${NC}"
    echo ""
    echo "Ce que ça fait:"
    echo "  ✓ Récupère seulement les séries spécifiées"
    echo "  ✓ Sauvegarde dans Data/series/{ID}/"
    echo ""
}

##############################################################################
# Exemple 4: Recupérer les ratings
##############################################################################
example_fetch_with_ratings() {
    echo -e "${GREEN}⭐ Exemple 4: Récupérer les données avec ratings${NC}"
    echo "Commande:"
    echo -e "  ${YELLOW}node $SCRIPTS_DIR/fetch-crunchyroll-data-proxy.js \\${NC}"
    echo -e "    ${YELLOW}--series G0XHWM1JP,G1XHJV0G7 \\${NC}"
    echo -e "    ${YELLOW}--rating \\${NC}"
    echo -e "    ${YELLOW}--account-id a1b2c3d4-e5f6-4g7h-8i9j-0k1l2m3n4o5p${NC}"
    echo ""
    echo "Ce que ça fait:"
    echo "  ✓ Récupère les infos des séries"
    echo "  ✓ Récupère les ratings utilisateur"
    echo "  ✓ Sauvegarde les ratings dans Data/rating-true/"
    echo ""
    echo "Comment obtenir account-id:"
    echo "  1. Ouvrir la console (F12) sur Crunchyroll"
    echo "  2. Exécuter: window.__BCR_ACCOUNT_ID__"
    echo "  3. Copier la valeur"
    echo ""
}

##############################################################################
# Exemple 5: Tester sans sauvegarder (dry-run)
##############################################################################
example_dry_run() {
    echo -e "${GREEN}🧪 Exemple 5: Tester sans sauvegarder (Dry-Run)${NC}"
    echo "Commande:"
    echo -e "  ${YELLOW}node $SCRIPTS_DIR/fetch-crunchyroll-data-proxy.js --dry-run${NC}"
    echo ""
    echo "Ce que ça fait:"
    echo "  ✓ Teste les requêtes API"
    echo "  ✓ Affiche ce qui serait sauvegardé"
    echo "  ✗ NE sauvegarde RIEN"
    echo ""
    echo "Utile pour:"
    echo "  • Vérifier les données avant de les sauvegarder"
    echo "  • Debugger les erreurs API"
    echo "  • Valider la configuration"
    echo ""
}

##############################################################################
# Exemple 6: Synchroniser depuis l'extension
##############################################################################
example_sync_extension() {
    echo -e "${GREEN}🌐 Exemple 6: Synchroniser depuis l'extension${NC}"
    echo "Procédure:"
    echo "  1. Charger l'extension sur Crunchyroll"
    echo "  2. Attendre l'interception du token"
    echo "  3. Ouvrir la console (F12)"
    echo "  4. Coller et exécuter:"
    echo ""
    echo -e "  ${YELLOW}// Récupérer les infos du token${NC}"
    echo -e "  ${YELLOW}window.__BCR_DataSync__.getTokenInfo()${NC}"
    echo ""
    echo -e "  ${YELLOW}// Synchroniser les données${NC}"
    echo -e "  ${YELLOW}await window.__BCR_DataSync__.initialize(${NC}"
    echo -e "  ${YELLOW}    ['G0XHWM1JP', 'G1XHJV0G7'],${NC}"
    echo -e "  ${YELLOW}    {${NC}"
    echo -e "  ${YELLOW}        includeRatings: true,${NC}"
    echo -e "  ${YELLOW}        includeBrowse: false${NC}"
    echo -e "  ${YELLOW}    }${NC}"
    echo -e "  ${YELLOW})${NC}"
    echo ""
}

##############################################################################
# Exemple 7: Automation - Cronjob
##############################################################################
example_automation() {
    echo -e "${GREEN}🔄 Exemple 7: Automatisation (Cronjob)${NC}"
    echo "Linux/Mac - Crontab:"
    echo "  # Exécuter chaque jour à midi"
    echo -e "  ${YELLOW}0 12 * * * cd $PROJECT_DIR && node $SCRIPTS_DIR/fetch-crunchyroll-data-proxy.js${NC}"
    echo ""
    echo "Pour éditer crontab:"
    echo -e "  ${YELLOW}crontab -e${NC}"
    echo ""
    echo "Windows - Task Scheduler:"
    echo "  1. Ouvrir Task Scheduler"
    echo "  2. Créer une nouvelle tâche"
    echo "  3. Action: C:\\Program Files\\nodejs\\node.exe"
    echo "  4. Arguments: $SCRIPTS_DIR\\fetch-crunchyroll-data-proxy.js"
    echo "  5. Planifier quotidiennement"
    echo ""
}

##############################################################################
# Exemple 8: Backup automatique
##############################################################################
example_backup() {
    echo -e "${GREEN}💾 Exemple 8: Backup des données${NC}"
    echo "Commande:"
    echo -e "  ${YELLOW}cp -r $DATA_DIR $DATA_DIR.backup.$(date +%Y-%m-%d)${NC}"
    echo ""
    echo "Script complet avec récupération + backup:"
    echo ""
    cat <<'EOF'
#!/bin/bash
set -e
cd /path/to/project
echo "Récupération des données..."
node scripts/fetch-crunchyroll-data-proxy.js
echo "Backup..."
cp -r Data Data.backup.$(date +%Y-%m-%d)
echo "Fait!"
EOF
    echo ""
}

##############################################################################
# Exemple 9: Serveur proxy personnalisé
##############################################################################
example_custom_host() {
    echo -e "${GREEN}🌍 Exemple 9: Serveur proxy personnalisé${NC}"
    echo "Commande:"
    echo -e "  ${YELLOW}node $SCRIPTS_DIR/fetch-crunchyroll-data-proxy.js \\${NC}"
    echo -e "    ${YELLOW}--localhost http://votre-serveur.com:3000${NC}"
    echo ""
    echo "Utile pour:"
    echo "  • Utiliser un serveur distant"
    echo "  • Développement multi-environnement"
    echo "  • Proxy corporate"
    echo ""
}

##############################################################################
# Exemple 10: Pipeline complet
##############################################################################
example_full_pipeline() {
    echo -e "${GREEN}🔗 Exemple 10: Pipeline complet${NC}"
    echo ""
    echo "Étape 1: Tester les APIs"
    echo -e "  ${YELLOW}node $SCRIPTS_DIR/test-crunchyroll-api.js${NC}"
    echo ""
    echo "Étape 2: Démarrer le serveur (terminal 1)"
    echo -e "  ${YELLOW}npm run dev${NC}"
    echo ""
    echo "Étape 3: Tester avec dry-run (terminal 2)"
    echo -e "  ${YELLOW}node $SCRIPTS_DIR/fetch-crunchyroll-data-proxy.js --dry-run${NC}"
    echo ""
    echo "Étape 4: Récupérer les données"
    echo -e "  ${YELLOW}node $SCRIPTS_DIR/fetch-crunchyroll-data-proxy.js${NC}"
    echo ""
    echo "Étape 5: Vérifier les données"
    echo -e "  ${YELLOW}ls -la $DATA_DIR/series/${NC}"
    echo ""
    echo "Étape 6: Compiler l'extension"
    echo -e "  ${YELLOW}npm run build:extension${NC}"
    echo ""
}

# Afficher le menu
main() {
    echo "Choisissez un exemple (1-10) ou 'all' pour tous:"
    echo ""
    echo "  1) Tester les APIs"
    echo "  2) Récupérer les données (simple)"
    echo "  3) Récupérer des séries spécifiques"
    echo "  4) Récupérer avec ratings"
    echo "  5) Tester sans sauvegarder (Dry-Run)"
    echo "  6) Synchroniser depuis l'extension"
    echo "  7) Automatisation (Cronjob)"
    echo "  8) Backup des données"
    echo "  9) Serveur proxy personnalisé"
    echo "  10) Pipeline complet"
    echo "  all) Afficher tous les exemples"
    echo ""
    echo "Note: Ce fichier est informatif"
    echo "Consultez docs/SCRIPTS_GUIDE.md pour la documentation complète"
    echo ""
}

# Afficher les exemples
if [ "$#" -eq 0 ]; then
    main
    echo -e "${YELLOW}Usage: ./scripts/README.md [1-10|all]${NC}"
else
    case $1 in
        1) example_test_api ;;
        2) example_fetch_simple ;;
        3) example_fetch_specific ;;
        4) example_fetch_with_ratings ;;
        5) example_dry_run ;;
        6) example_sync_extension ;;
        7) example_automation ;;
        8) example_backup ;;
        9) example_custom_host ;;
        10) example_full_pipeline ;;
        all)
            example_test_api
            example_fetch_simple
            example_fetch_specific
            example_fetch_with_ratings
            example_dry_run
            example_sync_extension
            example_automation
            example_backup
            example_custom_host
            example_full_pipeline
            ;;
        *)
            echo -e "${RED}Option invalide: $1${NC}"
            main
            exit 1
            ;;
    esac
fi

echo ""
echo -e "${GREEN}✅ Consultez docs/SCRIPTS_GUIDE.md pour plus de détails${NC}"
echo ""
