-- Migra sugestões do schema Hub (suggestions*) para as tabelas legadas
-- compartilhadas com a plataforma de splitters (platform_suggestion*).

INSERT INTO platform_suggestions (
  title, description, sector, category, status,
  author_uid, author_email, author_name, author_photo_url
)
SELECT
  s.title,
  COALESCE(NULLIF(TRIM(s.body), ''), s.title),
  COALESCE(NULLIF(TRIM(s.app_name), ''), 'Hub Geral'),
  CASE s.type
    WHEN 'feature'     THEN 'Funcionalidade'
    WHEN 'improvement' THEN 'Melhoria'
    WHEN 'bug'         THEN 'Bug'
    ELSE 'Outro'
  END,
  CASE s.status
    WHEN 'pending'   THEN 'open'
    WHEN 'in_review' THEN 'in_progress'
    WHEN 'done'      THEN 'done'
    WHEN 'rejected'  THEN 'rejected'
    ELSE 'open'
  END,
  s.user_id,
  COALESCE(u.email, ''),
  s.user_name,
  u.photo_url
FROM suggestions s
LEFT JOIN users u ON u.id = s.user_id
WHERE NOT EXISTS (
  SELECT 1
  FROM platform_suggestions p
  WHERE p.title = s.title
    AND p.author_uid = s.user_id
    AND p.created_at >= DATE_SUB(s.created_at, INTERVAL 1 MINUTE)
    AND p.created_at <= DATE_ADD(s.created_at, INTERVAL 1 MINUTE)
);

DROP TABLE IF EXISTS suggestion_votes;
DROP TABLE IF EXISTS suggestion_comments;
DROP TABLE IF EXISTS suggestions;
