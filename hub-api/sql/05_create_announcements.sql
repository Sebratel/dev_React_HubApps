-- Migration 05: tabela de avisos (announcements)
USE DB_Hub_Apps;

CREATE TABLE IF NOT EXISTS announcements (
  id               VARCHAR(36)                                    NOT NULL PRIMARY KEY,
  title            VARCHAR(255)                                   NOT NULL,
  body             TEXT,
  type             ENUM('info','warning','urgent','success')      NOT NULL DEFAULT 'info',
  is_active        TINYINT(1)                                     NOT NULL DEFAULT 1,
  created_by       VARCHAR(128)                                   NOT NULL,
  -- JSON array de perfis que enxergam o aviso (vazio = todos)
  allowed_profiles JSON                                           NOT NULL DEFAULT ('[]'),
  created_at       DATETIME                                       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME                                       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_announcements_active (is_active),
  INDEX idx_announcements_created_at (created_at)
);
