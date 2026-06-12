-- Migration 09: adiciona coluna de favoritos de apps por usuário
USE DB_Hub_Apps;

ALTER TABLE users ADD COLUMN favorites JSON NOT NULL DEFAULT (JSON_ARRAY());
