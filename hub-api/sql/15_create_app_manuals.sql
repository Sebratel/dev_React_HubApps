-- Migration 15: create app_manuals table
-- One manual per app (wikiUrl + pdfUrl), admin-managed

CREATE TABLE IF NOT EXISTS app_manuals (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  app_id      VARCHAR(36)   NOT NULL,
  wiki_url    VARCHAR(2048) DEFAULT NULL,
  pdf_url     VARCHAR(2048) DEFAULT NULL,
  description VARCHAR(512)  DEFAULT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  created_by  VARCHAR(128)  NOT NULL,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  CONSTRAINT fk_app_manuals_app FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE,
  UNIQUE KEY uq_app_manual_app (app_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
