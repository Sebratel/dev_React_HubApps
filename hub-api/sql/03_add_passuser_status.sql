-- Migration 03: adiciona pass_user e status à tabela apps
USE DB_Hub_Apps;

ALTER TABLE apps
  ADD COLUMN pass_user TINYINT(1) NOT NULL DEFAULT 0 AFTER pass_token,
  ADD COLUMN status ENUM('active','maintenance','novo') NOT NULL DEFAULT 'active' AFTER is_active;

-- Sincroniza is_active → status para registros existentes
UPDATE apps SET status = CASE WHEN is_active = 1 THEN 'active' ELSE 'maintenance' END;
