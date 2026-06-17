-- Migration 12: cria tabela highlights (banners de destaque no dashboard)
USE DB_Hub_Apps;

CREATE TABLE highlights (
  id          VARCHAR(36)   NOT NULL PRIMARY KEY,
  title       VARCHAR(255)  NOT NULL,
  description TEXT,
  badge_text  VARCHAR(50)   DEFAULT 'NOVIDADE',
  cta_label   VARCHAR(100)  DEFAULT 'Explorar Agora',
  cta_url     VARCHAR(500),
  image_url   VARCHAR(500)  NOT NULL,
  is_active   TINYINT(1)    NOT NULL DEFAULT 1,
  sort_order  INT           NOT NULL DEFAULT 0,
  created_by  VARCHAR(128)  NOT NULL,
  created_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
