-- Migration 11: adiciona card_color à tabela apps
USE DB_Hub_Apps;

ALTER TABLE apps
  ADD COLUMN card_color VARCHAR(20) NULL DEFAULT NULL AFTER icon_url;
