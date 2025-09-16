#!/bin/bash

# Script d'installation pour construire l'APK Android sur Ubuntu
# Usage: chmod +x setup-ubuntu-android-build.sh && ./setup-ubuntu-android-build.sh

set -e  # Arrêter le script en cas d'erreur

echo "🚀 Installation des outils pour construire l'APK Android sur Ubuntu"
echo "=================================================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérifier si le script est exécuté en tant que root
if [[ $EUID -eq 0 ]]; then
   print_error "Ce script ne doit pas être exécuté en tant que root"
   exit 1
fi

# Mettre à jour le système
print_status "Mise à jour du système Ubuntu..."
sudo apt update && sudo apt upgrade -y

# Installer les dépendances de base
print_status "Installation des dépendances de base..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release \
    build-essential \
    libssl-dev \
    libffi-dev \
    python3-dev \
    python3-pip \
    python3-venv \
    pkg-config \
    libc6-dev \
    libstdc++6 \
    zlib1g-dev \
    libncurses5-dev \
    libncursesw5-dev \
    libbz2-dev \
    libreadline-dev \
    libsqlite3-dev \
    libgdbm-dev \
    libdb5.3-dev \
    libexpat1-dev \
    liblzma-dev \
    tk-dev \
    libffi-dev \
    liblzma-dev

# Installer Node.js 18 (version recommandée pour React Native)
print_status "Installation de Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier l'installation de Node.js
NODE_VERSION=$(node --version)
print_success "Node.js installé: $NODE_VERSION"

# Installer npm globalement
sudo npm install -g npm@latest

# Installer Yarn (optionnel mais recommandé)
print_status "Installation de Yarn..."
sudo npm install -g yarn

# Installer Java 17 (requis pour Android)
print_status "Installation de Java 17..."
sudo apt install -y openjdk-17-jdk

# Configurer JAVA_HOME
echo 'export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64' >> ~/.bashrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.bashrc
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export PATH=$JAVA_HOME/bin:$PATH

# Vérifier l'installation de Java
JAVA_VERSION=$(java -version 2>&1 | head -n 1)
print_success "Java installé: $JAVA_VERSION"

# Installer Android SDK
print_status "Installation d'Android SDK..."
cd ~
mkdir -p android-sdk
cd android-sdk

# Télécharger Android Command Line Tools
ANDROID_CMD_TOOLS_VERSION="11076708"
wget -q https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMD_TOOLS_VERSION}_latest.zip
unzip -q commandlinetools-linux-${ANDROID_CMD_TOOLS_VERSION}_latest.zip
rm commandlinetools-linux-${ANDROID_CMD_TOOLS_VERSION}_latest.zip

# Créer la structure de dossiers requise
mkdir -p cmdline-tools/latest
mv cmdline-tools/* cmdline-tools/latest/ 2>/dev/null || true

# Configurer ANDROID_HOME
ANDROID_HOME="$HOME/android-sdk"
echo "export ANDROID_HOME=$ANDROID_HOME" >> ~/.bashrc
echo "export ANDROID_SDK_ROOT=$ANDROID_HOME" >> ~/.bashrc
echo "export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH" >> ~/.bashrc
export ANDROID_HOME=$ANDROID_HOME
export ANDROID_SDK_ROOT=$ANDROID_HOME
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$PATH

# Accepter les licences Android
print_status "Acceptation des licences Android..."
yes | $ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --licenses

# Installer les composants Android SDK requis
print_status "Installation des composants Android SDK..."
$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager \
    "platform-tools" \
    "platforms;android-34" \
    "platforms;android-33" \
    "platforms;android-32" \
    "build-tools;34.0.0" \
    "build-tools;33.0.2" \
    "build-tools;32.0.0" \
    "ndk;27.1.12297006" \
    "cmake;3.22.1"

# Installer Expo CLI
print_status "Installation d'Expo CLI..."
sudo npm install -g @expo/cli

# Installer EAS CLI
print_status "Installation d'EAS CLI..."
sudo npm install -g eas-cli

# Installer Watchman (recommandé pour React Native)
print_status "Installation de Watchman..."
sudo apt install -y watchman

# Installer Gradle (si nécessaire)
print_status "Installation de Gradle..."
wget -q https://services.gradle.org/distributions/gradle-8.13-bin.zip
sudo unzip -q gradle-8.13-bin.zip -d /opt/
sudo ln -sf /opt/gradle-8.13/bin/gradle /usr/local/bin/gradle
rm gradle-8.13-bin.zip

# Configurer les variables d'environnement pour Gradle
echo "export GRADLE_HOME=/opt/gradle-8.13" >> ~/.bashrc
echo "export PATH=$GRADLE_HOME/bin:$PATH" >> ~/.bashrc

# Créer un script de configuration d'environnement
print_status "Création du script de configuration d'environnement..."
cat > ~/setup-android-env.sh << 'EOF'
#!/bin/bash
# Script de configuration de l'environnement Android

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export ANDROID_HOME=$HOME/android-sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export GRADLE_HOME=/opt/gradle-8.13

export PATH=$JAVA_HOME/bin:$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/platform-tools:$GRADLE_HOME/bin:$PATH

echo "Environnement Android configuré :"
echo "JAVA_HOME: $JAVA_HOME"
echo "ANDROID_HOME: $ANDROID_HOME"
echo "GRADLE_HOME: $GRADLE_HOME"
echo "Node version: $(node --version)"
echo "Java version: $(java -version 2>&1 | head -n 1)"
echo "Android SDK version: $($ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager --version 2>/dev/null || echo 'Non disponible')"
EOF

chmod +x ~/setup-android-env.sh

# Créer un script de build pour le projet
print_status "Création du script de build..."
cat > ~/build-android-apk.sh << 'EOF'
#!/bin/bash
# Script de build pour l'APK Android

set -e

# Charger l'environnement Android
source ~/setup-android-env.sh

# Aller dans le répertoire du projet
PROJECT_DIR="$1"
if [ -z "$PROJECT_DIR" ]; then
    echo "Usage: $0 <chemin_vers_le_projet>"
    echo "Exemple: $0 /path/to/secureguard-mobile"
    exit 1
fi

cd "$PROJECT_DIR"

echo "🚀 Construction de l'APK Android..."
echo "Répertoire du projet: $(pwd)"

# Nettoyer le cache
echo "🧹 Nettoyage du cache..."
rm -rf node_modules package-lock.json .expo .expo-shared node_modules/.cache

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install --no-fund --no-audit

# Préparer le projet
echo "🔧 Préparation du projet..."
npx expo install --fix

# Construire l'APK
echo "🏗️ Construction de l'APK..."
npx eas build --platform android --local

echo "✅ Build terminé ! L'APK se trouve dans le dossier android/app/build/outputs/apk/"
EOF

chmod +x ~/build-android-apk.sh

# Créer un script pour corriger le conflit worklets/reanimated
print_status "Création du script de correction des conflits..."
cat > ~/fix-worklets-conflict.sh << 'EOF'
#!/bin/bash
# Script pour corriger le conflit entre react-native-worklets et react-native-reanimated

set -e

PROJECT_DIR="$1"
if [ -z "$PROJECT_DIR" ]; then
    echo "Usage: $0 <chemin_vers_le_projet>"
    exit 1
fi

cd "$PROJECT_DIR"

echo "🔧 Correction du conflit worklets/reanimated..."

# Supprimer react-native-worklets qui cause le conflit
echo "Suppression de react-native-worklets..."
npm uninstall react-native-worklets

# Nettoyer et réinstaller
rm -rf node_modules package-lock.json
npm install --no-fund --no-audit

echo "✅ Conflit corrigé !"
EOF

chmod +x ~/fix-worklets-conflict.sh

# Afficher les informations finales
print_success "Installation terminée !"
echo ""
echo "📋 Résumé de l'installation :"
echo "=============================="
echo "✅ Node.js $(node --version)"
echo "✅ Java $(java -version 2>&1 | head -n 1)"
echo "✅ Android SDK installé dans: $ANDROID_HOME"
echo "✅ Expo CLI installé"
echo "✅ EAS CLI installé"
echo "✅ Gradle installé"
echo ""
echo "📝 Scripts créés :"
echo "=================="
echo "• ~/setup-android-env.sh - Configuration de l'environnement"
echo "• ~/build-android-apk.sh - Construction de l'APK"
echo "• ~/fix-worklets-conflict.sh - Correction du conflit worklets"
echo ""
echo "🚀 Pour construire votre APK :"
echo "=============================="
echo "1. Clonez votre projet :"
echo "   git clone <votre-repo> secureguard-mobile"
echo "   cd secureguard-mobile"
echo ""
echo "2. Corrigez le conflit worklets :"
echo "   ~/fix-worklets-conflict.sh ."
echo ""
echo "3. Construisez l'APK :"
echo "   ~/build-android-apk.sh ."
echo ""
echo "💡 Note: Redémarrez votre terminal ou exécutez 'source ~/.bashrc' pour charger les variables d'environnement."
