-- Garante que a coluna description aceite textos longos.
-- A tabela foi criada pela plataforma legada com VARCHAR(N); expande para TEXT.
-- Idempotente: se já for TEXT ou MEDIUMTEXT, MySQL apenas re-confirma o tipo.

ALTER TABLE platform_suggestions
  MODIFY COLUMN description TEXT;
