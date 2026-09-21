-- Tabela para agendamento manual de perguntas do quiz por semana
-- O admin pode fixar exatamente 5 perguntas para uma semana específica,
-- sobrepondo a seleção determinística por RNG.

CREATE TABLE IF NOT EXISTS quiz_schedule (
  week_start   DATE     NOT NULL,
  question_ids JSON     NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (week_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
