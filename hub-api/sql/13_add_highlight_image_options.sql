ALTER TABLE highlights
  ADD COLUMN object_fit      VARCHAR(10)  NOT NULL DEFAULT 'cover'  AFTER image_url,
  ADD COLUMN object_position VARCHAR(20)  NOT NULL DEFAULT 'center' AFTER object_fit;
