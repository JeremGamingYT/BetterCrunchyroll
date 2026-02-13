@echo off
REM ============================================================================
REM BetterCrunchyroll - Exemples d'Utilisation des Scripts (Windows)
REM 
REM Ce fichier montre comment utiliser les scripts de récupération de données
REM sur Windows
REM ============================================================================

setlocal enabledelayedexpansion

cd /d "%~dp0.."

set "SCRIPTS_DIR=%cd%\scripts"
set "DATA_DIR=%cd%\Data"

cls

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║     BetterCrunchyroll - Exemples d'Utilisation       ║
echo ║     (Windows PowerShell Recommandé)                  ║
echo ╚══════════════════════════════════════════════════════╝
echo.

if "%1"=="" (
    echo Utilisation: fetch-data-example.bat [option]
    echo.
    echo Options:
    echo   1   Tester les APIs
    echo   2   Récupérer les données (simple^)
    echo   3   Récupérer des séries spécifiques
    echo   4   Récupérer avec ratings
    echo   5   Tester sans sauvegarder (Dry-Run^)
    echo   6   Synchroniser depuis l'extension
    echo   7   Automation (Planificateur de tâches^)
    echo   8   Backup des données
    echo   9   Serveur proxy personnalisé
    echo   10  Pipeline complet
    echo   all Afficher tous les exemples
    echo.
    echo Exemples:
    echo   fetch-data-example.bat 1
    echo   fetch-data-example.bat all
    echo.
    goto :end
)

REM ============================================================================
REM Exemple 1: Tester les APIs
REM ============================================================================
if "%1"=="1" (
    cls
    echo Exemple 1: Tester les APIs Crunchyroll
    echo ========================================
    echo.
    echo Commande:
    echo   node "%SCRIPTS_DIR%\test-crunchyroll-api.js"
    echo.
    echo Ce que ça fait:
    echo   √ Teste l'authentification Crunchyroll
    echo   √ Teste l'endpoint getSeries.md
    echo   √ Teste l'endpoint getRating.md
    echo   √ Affiche un résumé coloré
    echo.
    echo.
    pause
    node "%SCRIPTS_DIR%\test-crunchyroll-api.js"
    goto :end
)

REM ============================================================================
REM Exemple 2: Récupérer les données (simple)
REM ============================================================================
if "%1"=="2" (
    cls
    echo Exemple 2: Récupérer les données (simple)
    echo ==========================================
    echo.
    echo Prérequis:
    echo   1. Démarrer le serveur (npm run dev^)
    echo.
    echo Commande:
    echo   node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js"
    echo.
    echo Ce que ça fait:
    echo   √ Récupère les séries existantes dans Data\series\
    echo   √ Met à jour les fichiers series.json
    echo.
    echo.
    pause
    node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js"
    goto :end
)

REM ============================================================================
REM Exemple 3: Récupérer des séries spécifiques
REM ============================================================================
if "%1"=="3" (
    cls
    echo Exemple 3: Récupérer des séries spécifiques
    echo =============================================
    echo.
    echo Commande:
    echo   node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" ^
    echo     --series G0XHWM1JP,G1XHJV0G7
    echo.
    echo Ce que ça fait:
    echo   √ Récupère seulement les séries spécifiées
    echo   √ Sauvegarde dans Data\series\{ID}\
    echo.
    echo.
    pause
    node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" --series G0XHWM1JP,G1XHJV0G7
    goto :end
)

REM ============================================================================
REM Exemple 4: Récupérer avec ratings
REM ============================================================================
if "%1"=="4" (
    cls
    echo Exemple 4: Récupérer les données avec ratings
    echo ==============================================
    echo.
    echo Commande:
    echo   node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" ^
    echo     --series G0XHWM1JP,G1XHJV0G7 ^
    echo     --rating ^
    echo     --account-id YOUR_ACCOUNT_UUID
    echo.
    echo Ce que ça fait:
    echo   √ Récupère les infos des séries
    echo   √ Récupère les ratings utilisateur
    echo   √ Sauvegarde les ratings dans Data\rating-true\
    echo.
    echo Comment obtenir account-id:
    echo   1. Ouvrir la console (F12) sur Crunchyroll
    echo   2. Exécuter: window.__BCR_ACCOUNT_ID__
    echo   3. Copier la valeur
    echo.
    echo.
    pause
    goto :end
)

REM ============================================================================
REM Exemple 5: Tester sans sauvegarder (Dry-Run)
REM ============================================================================
if "%1"=="5" (
    cls
    echo Exemple 5: Tester sans sauvegarder (Dry-Run)
    echo ============================================
    echo.
    echo Commande:
    echo   node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" --dry-run
    echo.
    echo Ce que ça fait:
    echo   √ Teste les requêtes API
    echo   √ Affiche ce qui serait sauvegardé
    echo   ✗ NE sauvegarde RIEN
    echo.
    echo Utile pour:
    echo   · Vérifier les données avant de les sauvegarder
    echo   · Debugger les erreurs API
    echo   · Valider la configuration
    echo.
    echo.
    pause
    node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" --dry-run
    goto :end
)

REM ============================================================================
REM Exemple 6: Synchroniser depuis l'extension
REM ============================================================================
if "%1"=="6" (
    cls
    echo Exemple 6: Synchroniser depuis l'extension
    echo ===========================================
    echo.
    echo Procédure:
    echo   1. Charger l'extension sur Crunchyroll
    echo   2. Attendre l'interception du token
    echo   3. Ouvrir la console (F12)
    echo   4. Coller le code suivant:
    echo.
    echo   // Récupérer les infos du token
    echo   window.__BCR_DataSync__.getTokenInfo()
    echo.
    echo   // Synchroniser les données
    echo   await window.__BCR_DataSync__.initialize(
    echo       ['G0XHWM1JP', 'G1XHJV0G7'],
    echo       {
    echo           includeRatings: true,
    echo           includeBrowse: false
    echo       }
    echo   )
    echo.
    echo.
    pause
    goto :end
)

REM ============================================================================
REM Exemple 7: Automation (Planificateur de tâches)
REM ============================================================================
if "%1"=="7" (
    cls
    echo Exemple 7: Automation (Planificateur de tâches)
    echo ==============================================
    echo.
    echo Pour automatiser la récupération des données:
    echo.
    echo 1. Ouvrir le Planificateur de tâches
    echo    (Win + R, puis "taskschd.msc"^)
    echo.
    echo 2. Action ^> Créer une tâche de base
    echo.
    echo 3. Configuration:
    echo    - Nom: BetterCrunchyroll Data Fetch
    echo    - Programme: C:\Program Files\nodejs\node.exe
    echo    - Arguments: "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js"
    echo    - Répertoire de départ: "%cd%"
    echo.
    echo 4. Planifier l'exécution (ex: tous les jours à midi^)
    echo.
    echo Alternative avec PowerShell:
    echo   $trigger = New-JobTrigger -Daily -At 12:00PM
    echo   $action = New-ScheduledJobOption -RunElevated
    echo   Register-ScheduledJob -Name "Fetch CrunchyRoll" ^
    echo     -ScriptBlock { ^
    echo       cd "%cd%" ^
    echo       node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" ^
    echo     } -Trigger $trigger -ScheduledJobOption $action
    echo.
    echo.
    pause
    goto :end
)

REM ============================================================================
REM Exemple 8: Backup des données
REM ============================================================================
if "%1"=="8" (
    cls
    echo Exemple 8: Backup des données
    echo =============================
    echo.
    echo Pour copier les données (backup):
    echo.
    echo   xcopy "%DATA_DIR%" "%DATA_DIR%.backup.%%date:~10,4%%%%date:~4,2%%%%date:~7,2%%" /E /I
    echo.
    echo Ou avec PowerShell:
    echo   Copy-Item -Path "%DATA_DIR%" -Destination ^
    echo     "%DATA_DIR%.backup.$(Get-Date -Format 'yyyy-MM-dd')" -Recurse
    echo.
    echo Script complet (batch):
    echo.
    @echo   @echo off
    @echo   cd /d "%cd%"
    @echo   echo Récupération des données...
    @echo   node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js"
    @echo   echo Backup...
    @echo   for /f "tokens=2-4 delims=/ " %%%%a in ('date /t') do (
    @echo       xcopy "%DATA_DIR%" "%DATA_DIR%.backup.%%%%c%%%%a%%%%b" /E /I
    @echo   ^)
    @echo   echo Fait!
    echo.
    echo.
    pause
    goto :end
)

REM ============================================================================
REM Exemple 9: Serveur proxy personnalisé
REM ============================================================================
if "%1"=="9" (
    cls
    echo Exemple 9: Serveur proxy personnalisé
    echo ======================================
    echo.
    echo Commande:
    echo   node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" ^
    echo     --localhost http://votre-serveur.com:3000
    echo.
    echo Utile pour:
    echo   · Utiliser un serveur distant
    echo   · Développement multi-environnement
    echo   · Proxy corporate
    echo.
    echo.
    pause
    goto :end
)

REM ============================================================================
REM Exemple 10: Pipeline complet
REM ============================================================================
if "%1"=="10" (
    cls
    echo Exemple 10: Pipeline complet
    echo ============================
    echo.
    echo Étape 1: Tester les APIs
    echo   node "%SCRIPTS_DIR%\test-crunchyroll-api.js"
    echo.
    echo Étape 2: Démarrer le serveur (PowerShell en tant qu'admin)
    echo   npm run dev
    echo.
    echo Étape 3: Test avec dry-run (autre terminal)
    echo   node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" --dry-run
    echo.
    echo Étape 4: Récupérer les données
    echo   node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js"
    echo.
    echo Étape 5: Vérifier les données
    echo   dir "%DATA_DIR%\series"
    echo.
    echo Étape 6: Compiler l'extension
    echo   npm run build:extension
    echo.
    echo.
    pause
    goto :end
)

REM ============================================================================
REM Afficher tous les exemples
REM ============================================================================
if "%1"=="all" (
    cls
    echo Exemple 1: Tester les APIs
    echo ========================================
    echo node "%SCRIPTS_DIR%\test-crunchyroll-api.js"
    echo.
    echo.
    pause
    
    cls
    echo Exemple 2: Récupérer les données
    echo ========================================
    echo node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js"
    echo.
    echo Prérequis: npm run dev
    echo.
    echo.
    pause
    
    cls
    echo Exemple 3: Séries spécifiques
    echo ========================================
    echo node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" --series G0XHWM1JP,G1XHJV0G7
    echo.
    echo.
    pause
    
    cls
    echo Exemple 4: Avec ratings
    echo ========================================
    echo node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" --rating --account-id YOUR_UUID
    echo.
    echo.
    pause
    
    cls
    echo Exemple 5: Dry-Run
    echo ========================================
    echo node "%SCRIPTS_DIR%\fetch-crunchyroll-data-proxy.js" --dry-run
    echo.
    echo.
    pause
    
    cls
    echo Exemple 6: Extension
    echo ========================================
    echo Dans la console Crunchyroll (F12):
    echo window.__BCR_DataSync__.getTokenInfo()
    echo await window.__BCR_DataSync__.initialize(['G0XHWM1JP'])
    echo.
    echo.
    pause
    
    cls
    echo Exemple 7-10 affichés - Consultez le fichier pour plus de détails
    echo.
    pause
)

:end
echo.
echo Consultez: docs\SCRIPTS_GUIDE.md pour la documentation complète
echo.
