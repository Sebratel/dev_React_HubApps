
CREATE TABLE IF NOT EXISTS suggestions (
  id         VARCHAR(36)                                         NOT NULL PRIMARY KEY,
  app_id     VARCHAR(128)                                        DEFAULT NULL,
  app_name   VARCHAR(255)                                        DEFAULT NULL,
  user_id    VARCHAR(128)                                        NOT NULL,
  user_name  VARCHAR(255)                                        NOT NULL,
  title      VARCHAR(255)                                        NOT NULL,
  body       TEXT                                                DEFAULT NULL,
  type       ENUM('feature','bug','improvement','other')         NOT NULL DEFAULT 'other',
  status     ENUM('pending','in_review','done','rejected')       NOT NULL DEFAULT 'pending',
  admin_note TEXT                                                DEFAULT NULL,
  created_at DATETIME                                            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME                                            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_suggestions_user   (user_id),
  INDEX idx_suggestions_status (status),
  INDEX idx_suggestions_app    (app_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
