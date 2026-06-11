-- Seed 04: apps iniciais da Sebratel
-- INSERT IGNORE garante idempotência (não duplica se rodar novamente)
USE DB_Hub_Apps;

INSERT IGNORE INTO apps
  (id, name, url, description, icon_url, pass_token, pass_user, is_active, status, allowed_profiles, allowed_users, allowed_teams)
VALUES
  (
    'app-carnes-sebratel',
    'Aplicativo Carnês',
    'https://app-carnes-sebratel.web.app',
    'Aplicativo dos Carnês da Sebratel',
    '📨',
    0, 0, 1, 'active',
    '["infraestrutura","tecnica"]',
    '[]', '[]'
  ),
  (
    'app-splitters-sebratel',
    'Listagem Splitters',
    'https://app-splitters-sebratel.web.app/',
    'Todos os splitters cadastrados',
    '👥',
    1, 0, 1, 'active',
    '["infraestrutura","tecnica","atendimento","comercial","users"]',
    '[]', '[]'
  ),
  (
    'app-projetos-sebratel',
    'Gestão de Projetos',
    'https://projetos.sebratel.com.br',
    'Acompanhamento de projetos internos',
    '📊',
    0, 0, 1, 'active',
    '["infraestrutura","comercial"]',
    '[]', '[]'
  ),
  (
    'app-chamados-sebratel',
    'Controle de Chamados',
    'https://chamados.sebratel.com.br',
    'Gestão de chamados e suporte técnico',
    '🎫',
    0, 0, 0, 'maintenance',
    '["tecnica","atendimento"]',
    '[]', '[]'
  );
