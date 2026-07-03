-- Adiciona coluna de heartbeat para rastreamento de presença online

ALTER TABLE users ADD COLUMN last_heartbeat DATETIME DEFAULT NULL;
ALTER TABLE users ADD INDEX idx_heartbeat (last_heartbeat);
