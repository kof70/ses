#!/bin/bash

# Script pour corriger le conflit entre react-native-worklets et react-native-reanimated
# Usage: chmod +x fix-worklets-conflict.sh && ./fix-worklets-conflict.sh

set -e

echo "🔧 Correction du conflit worklets/reanimated..."

# Vérifier si nous sommes dans un projet React Native
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté dans le répertoire racine du projet"
    exit 1
fi

# Supprimer react-native-worklets qui cause le conflit
echo "📦 Suppression de react-native-worklets..."
npm uninstall react-native-worklets

# Nettoyer le cache
echo "🧹 Nettoyage du cache..."
rm -rf node_modules package-lock.json .expo .expo-shared node_modules/.cache

# Réinstaller les dépendances
echo "📦 Réinstallation des dépendances..."
npm install --no-fund --no-audit

# Préparer le projet
echo "🔧 Préparation du projet..."
npx expo install --fix

echo "✅ Conflit corrigé ! Vous pouvez maintenant construire l'APK."
echo ""
echo "Pour construire l'APK :"
echo "npx eas build --platform android --local"
