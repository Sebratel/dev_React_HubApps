-- ============================================================
-- Sprint 2.5 — Índices compostos
-- DB: DB_Hub_Apps
-- ============================================================


-- apps: query principal WHERE is_active = 1 ORDER BY name
ALTER TABLE apps
  ADD INDEX idx_active_name (is_active, name);

-- users: ORDER BY name nas listagens admin
ALTER TABLE users
  ADD INDEX idx_name (name);

-- audit_logs: query por usuário + ordem cronológica (substitui uso independente dos dois índices)
ALTER TABLE audit_logs
  ADD INDEX idx_user_created (user_id, created_at DESC);

-- audit_logs: query por action + ordem cronológica (filtro admin)
ALTER TABLE audit_logs
  ADD INDEX idx_action_created (action, created_at DESC);

-- access_requests: query por status + ordem cronológica (filtro admin)
ALTER TABLE access_requests
  ADD INDEX idx_status_created (status, created_at DESC);
