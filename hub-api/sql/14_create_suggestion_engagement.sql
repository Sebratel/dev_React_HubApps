
-- Votos de apoio / não-apoio às sugestões (1 por usuário por sugestão)
CREATE TABLE IF NOT EXISTS suggestion_votes (
  suggestion_id VARCHAR(36)  NOT NULL,
  user_id       VARCHAR(128) NOT NULL,
  user_name     VARCHAR(255) NOT NULL,
  value         TINYINT      NOT NULL, -- 1 = apoia, -1 = não apoia
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (suggestion_id, user_id),
  INDEX idx_sv_suggestion (suggestion_id),
  CONSTRAINT fk_sv_suggestion FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Comentários nas sugestões
CREATE TABLE IF NOT EXISTS suggestion_comments (
  id            VARCHAR(36)  NOT NULL PRIMARY KEY,
  suggestion_id VARCHAR(36)  NOT NULL,
  user_id       VARCHAR(128) NOT NULL,
  user_name     VARCHAR(255) NOT NULL,
  body          TEXT         NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_sc_suggestion (suggestion_id),
  CONSTRAINT fk_sc_suggestion FOREIGN KEY (suggestion_id) REFERENCES suggestions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
