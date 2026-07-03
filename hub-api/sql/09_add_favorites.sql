-- Migration 09: adiciona coluna de favoritos de apps por usuário

ALTER TABLE users ADD COLUMN favorites JSON NOT NULL DEFAULT (JSON_ARRAY());
