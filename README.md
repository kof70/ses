# SecureGuard Pro - Application Mobile de Sécurité

Une application mobile complète développée avec React Native (Expo) pour la gestion et le suivi des agents de sécurité.

## 📱 Installation Rapide

### Prérequis
- Node.js 18+ installé
- Un smartphone (iOS ou Android)
- Compte Expo (gratuit) - [Créer un compte](https://expo.dev/signup)

### Étapes d'installation

1. **Installer Expo CLI globalement**
```bash
npm install -g @expo/cli
```

2. **Se connecter à Expo**
```bash
expo login
```

3. **Configurer Supabase**
   - Créez un projet sur [Supabase](https://supabase.com)
   - Copiez `.env.example` vers `.env`
   - Remplissez vos clés Supabase dans `.env`

4. **Installer les dépendances**
```bash
npm install
```

5. **Lancer l'application**
```bash
npm start
```

6. **Tester sur votre téléphone**
   - Installez l'app "Expo Go" sur votre téléphone
   - Scannez le QR code affiché dans le terminal

### Alternative: Build de développement

Pour une expérience plus native, créez un build de développement :

```bash
# Pour Android
eas build --profile development --platform android

# Pour iOS (nécessite un compte Apple Developer)
eas build --profile development --platform ios
```

## 🚀 Fonctionnalités

### 👮‍♂️ Agent de Sécurité
- **Authentification sécurisée** avec email/mot de passe
- **Gestion des horaires** - Enregistrement des heures d'arrivée et de départ
- **QR Code personnel** pour identification par les clients
- **Alerte SOS** avec géolocalisation automatique
- **Réception d'annonces** de l'administration en temps réel
- **Gestion du statut** (Disponible, En mission, Indisponible)

### 👤 Client/Particulier
- **Scanner QR Code** pour vérifier le statut des agents
- **Historique des scans** avec détails des agents vérifiés
- **Alerte SOS d'urgence** notifiant admin et agents
- **Interface intuitive** pour une utilisation rapide

### 🔧 Administrateur
- **Tableau de bord complet** avec statistiques en temps réel
- **Gestion des agents** - Activation/désactivation des comptes
- **Suivi des alertes SOS** avec géolocalisation
- **Diffusion d'annonces** ciblées (agents, clients, ou tous)
- **Monitoring système** et gestion des utilisateurs

## 🛠 Technologies Utilisées

- **Frontend**: React Native avec Expo
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Notifications**: Expo Push Notifications
- **Scanner**: Expo Barcode Scanner
- **UI**: NativeWind (Tailwind CSS pour React Native)
- **Navigation**: React Navigation v6
- **Géolocalisation**: Expo Location

## 📱 Architecture

```
src/
├── contexts/          # Contextes React (Auth, Supabase, Notifications)
├── navigation/        # Configuration de navigation par rôle
├── screens/          # Écrans organisés par rôle utilisateur
│   ├── auth/         # Connexion et inscription
│   ├── agent/        # Interface agent de sécurité
│   ├── client/       # Interface client
│   └── admin/        # Interface administrateur
├── lib/              # Configuration Supabase et types
└── components/       # Composants réutilisables
```

## 🗄 Base de Données

### Tables Principales
- **users**: Profils utilisateurs avec rôles
- **agents**: Données spécifiques aux agents (horaires, QR code, zone)
- **clients**: Historique des scans et données client
- **sos_alerts**: Alertes SOS avec géolocalisation
- **annonces**: Annonces diffusées par l'administration

### Sécurité
- **Row Level Security (RLS)** activé sur toutes les tables
- **Politiques d'accès** basées sur les rôles utilisateurs
- **Authentification JWT** via Supabase Auth

## 🚀 Installation et Configuration

### Prérequis
- Node.js 18+
- Expo CLI
- Compte Supabase

### Configuration

1. **Cloner le projet**
```bash
git clone <repository-url>
cd secureguard-mobile
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration Supabase**
- Créer un projet Supabase
- Exécuter le script SQL de migration dans l'éditeur SQL
- Mettre à jour les variables dans `src/lib/supabase.ts`:
```typescript
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

4. **Lancer l'application**
```bash
npm start
```

## 📋 Configuration Supabase

### 1. Créer les tables
Exécutez le fichier `supabase/migrations/create_secureguard_schema.sql` dans l'éditeur SQL de Supabase.

### 2. Configurer l'authentification
- Activez l'authentification par email/mot de passe
- Désactivez la confirmation par email (optionnel pour le développement)

### 3. Configurer les notifications push
- Ajoutez votre certificat FCM/APNs dans les paramètres du projet

## 🔐 Rôles et Permissions

### Agent
- Lecture/écriture de ses propres données
- Réception des annonces destinées aux agents
- Création d'alertes SOS

### Client
- Lecture des données agents (pour scanning)
- Gestion de son historique de scans
- Création d'alertes SOS

### Admin
- Accès complet à toutes les données
- Gestion des utilisateurs et agents
- Création et diffusion d'annonces
- Gestion des alertes SOS

## 📱 Déploiement

### Build de développement
```bash
expo start
```

### Build de production
```bash
# Android
expo build:android

# iOS
expo build:ios
```

### Publication sur les stores
```bash
expo submit:android
expo submit:ios
```

## 🔧 Personnalisation

### Couleurs et thème
Modifiez les couleurs dans `tailwind.config.js`:
```javascript
colors: {
  primary: {
    900: '#1e3a8a', // Bleu principal
    // ...
  }
}
```

### Notifications
Configurez les notifications dans `src/contexts/NotificationContext.tsx`

### Base de données
Ajoutez de nouvelles tables ou modifiez le schéma dans les migrations Supabase

## 🐛 Dépannage

### Problèmes courants

1. **Erreur de permissions caméra**
   - Vérifiez les permissions dans `app.json`
   - Testez sur un appareil physique

2. **Problèmes de connexion Supabase**
   - Vérifiez les URLs et clés API
   - Contrôlez les politiques RLS

3. **Notifications non reçues**
   - Vérifiez la configuration FCM/APNs
   - Testez sur appareil physique

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! Veuillez :
1. Fork le projet
2. Créer une branche feature
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📞 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Contacter l'équipe de développement

---

**SecureGuard Pro** - Solution complète de sécurité mobile 🛡️