-- Migration 16: expande image_url de VARCHAR(500) para MEDIUMTEXT
-- Necessário porque imagens podem ser armazenadas como base64 (até ~500 KB)
ALTER TABLE highlights MODIFY COLUMN image_url MEDIUMTEXT NOT NULL;
