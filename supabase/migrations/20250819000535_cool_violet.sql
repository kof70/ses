/*
  # Schema SecureGuard Pro - Système de sécurité mobile

  1. Nouvelles tables
    - `users` - Profils utilisateurs avec rôles (agent, client, admin)
    - `agents` - Informations spécifiques aux agents de sécurité
    - `clients` - Informations spécifiques aux clients
    - `sos_alerts` - Alertes SOS déclenchées par agents ou clients
    - `annonces` - Annonces diffusées par l'administration

  2. Sécurité
    - Activation de RLS sur toutes les tables
    - Politiques d'accès basées sur les rôles utilisateurs
    - Restrictions d'accès selon le type d'utilisateur

  3. Fonctionnalités
    - Authentification multi-rôles
    - Gestion des horaires agents
    - Système d'alertes SOS avec géolocalisation
    - Diffusion d'annonces ciblées
    - Historique des scans clients
*/

-- Extension pour UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table des utilisateurs (profils étendus)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  nom text NOT NULL,
  role text NOT NULL CHECK (role IN ('agent', 'client', 'admin')),
  statut text NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif', 'inactif')),
  push_token text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des agents de sécurité
CREATE TABLE IF NOT EXISTS agents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  heure_arrivee timestamptz,
  heure_depart timestamptz,
  disponibilite text NOT NULL DEFAULT 'disponible' CHECK (disponibilite IN ('disponible', 'en_mission', 'indisponible')),
  zone_assignee text,
  qr_code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  historique_scans jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des alertes SOS
CREATE TABLE IF NOT EXISTS sos_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES agents(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('agent_sos', 'client_sos')),
  message text,
  statut text NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'resolu', 'annule')),
  latitude decimal(10, 8),
  longitude decimal(11, 8),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table des annonces
CREATE TABLE IF NOT EXISTS annonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titre text NOT NULL,
  contenu text NOT NULL,
  destinataires text NOT NULL DEFAULT 'tous' CHECK (destinataires IN ('tous', 'agents', 'clients')),
  created_by uuid REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activation de RLS sur toutes les tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE annonces ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour la table users
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all users"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update user status"
  ON users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques RLS pour la table agents
CREATE POLICY "Agents can read own data"
  ON agents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Agents can update own data"
  ON agents
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all agents"
  ON agents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Clients can read agents for scanning"
  ON agents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'client'
    )
  );

-- Politiques RLS pour la table clients
CREATE POLICY "Clients can read own data"
  ON clients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Clients can update own data"
  ON clients
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all clients"
  ON clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politiques RLS pour la table sos_alerts
CREATE POLICY "Users can create SOS alerts"
  ON sos_alerts
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (type = 'agent_sos' AND agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )) OR
    (type = 'client_sos' AND client_id IN (
      SELECT id FROM clients WHERE user_id = auth.uid()
    ))
  );

CREATE POLICY "Admins can read all SOS alerts"
  ON sos_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update SOS alerts"
  ON sos_alerts
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Agents can read SOS alerts"
  ON sos_alerts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'agent'
    )
  );

-- Politiques RLS pour la table annonces
CREATE POLICY "Admins can create annonces"
  ON annonces
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Users can read relevant annonces"
  ON annonces
  FOR SELECT
  TO authenticated
  USING (
    destinataires = 'tous' OR
    (destinataires = 'agents' AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'agent'
    )) OR
    (destinataires = 'clients' AND EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'client'
    )) OR
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers pour updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sos_alerts_updated_at BEFORE UPDATE ON sos_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_annonces_updated_at BEFORE UPDATE ON annonces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_statut ON users(statut);
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_disponibilite ON agents(disponibilite);
CREATE INDEX IF NOT EXISTS idx_agents_qr_code ON agents(qr_code);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_statut ON sos_alerts(statut);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_type ON sos_alerts(type);
CREATE INDEX IF NOT EXISTS idx_annonces_destinataires ON annonces(destinataires);
CREATE INDEX IF NOT EXISTS idx_annonces_created_by ON annonces(created_by);