-- ============================================================
-- Sebratel Hub — Schema MySQL
-- O banco é criado/selecionado pelo runner via DB_NAME
-- (ver sql/run-migrations.js). Não fixar o nome aqui.
-- ============================================================

-- ─── users ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            VARCHAR(128)  NOT NULL PRIMARY KEY,  -- Firebase Auth UID
  email         VARCHAR(255)  NOT NULL UNIQUE,
  name          VARCHAR(255)  NOT NULL,
  photo_url     TEXT,
  profile       VARCHAR(50)   NOT NULL DEFAULT '',   -- employee | user | third_party | ''
  team          VARCHAR(100),
  is_active     TINYINT(1)    NOT NULL DEFAULT 0,
  is_admin      TINYINT(1)    NOT NULL DEFAULT 0,
  permissions   JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  last_login    DATETIME,
  online        TINYINT(1)    NOT NULL DEFAULT 0,
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── apps ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS apps (
  id                VARCHAR(128)  NOT NULL PRIMARY KEY,
  name              VARCHAR(255)  NOT NULL,
  description       TEXT,
  url               TEXT          NOT NULL,
  icon_url          TEXT,
  pass_token        TINYINT(1)    NOT NULL DEFAULT 0,
  is_active         TINYINT(1)    NOT NULL DEFAULT 1,
  allowed_profiles  JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  allowed_users     JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  allowed_teams     JSON          NOT NULL DEFAULT (JSON_ARRAY()),
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── audit_logs ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          VARCHAR(128)  NOT NULL PRIMARY KEY,
  user_id     VARCHAR(128)  NOT NULL,
  user_name   VARCHAR(255)  NOT NULL,
  action      VARCHAR(100)  NOT NULL,   -- LOGIN | LOGOUT | APP_OPEN | etc.
  details     TEXT,
  ip_address  VARCHAR(45),
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id  (user_id),
  INDEX idx_action   (action),
  INDEX idx_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─── access_requests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_requests (
  id           VARCHAR(128)  NOT NULL PRIMARY KEY,
  user_id      VARCHAR(128)  NOT NULL,
  app_id       VARCHAR(128)  NOT NULL,
  app_name     VARCHAR(255)  NOT NULL,
  reason       TEXT,
  status       ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  reviewed_by  VARCHAR(128),
  reviewed_at  DATETIME,
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_app_id  (app_id),
  INDEX idx_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
