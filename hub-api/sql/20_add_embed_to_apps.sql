-- Migration 20: adiciona embed à tabela apps
-- embed = 1 → o Hub abre o app dentro dele (iframe em /app/:id) em vez de uma aba nova.
-- O app embutido precisa permitir o Hub como ancestral (CSP frame-ancestors).

ALTER TABLE apps
  ADD COLUMN embed TINYINT(1) NOT NULL DEFAULT 0 AFTER pass_user;
