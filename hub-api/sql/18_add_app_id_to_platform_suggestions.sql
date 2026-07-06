-- Referência ao aplicativo Hub (apps.id) para filtrar sugestões por plataforma.
-- Ex.: splitters consome WHERE app_id = 'app-splitters-sebratel'.

ALTER TABLE platform_suggestions
  ADD COLUMN app_id VARCHAR(128) NULL AFTER sector,
  ADD INDEX idx_platform_suggestions_app_id (app_id);

-- Preenche app_id quando sector coincide com o nome do app no Hub.
UPDATE platform_suggestions s
INNER JOIN apps a ON a.name = s.sector
SET s.app_id = a.id
WHERE s.app_id IS NULL;
