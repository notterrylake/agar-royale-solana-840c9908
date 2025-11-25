-- Add cell_radius column to track combined cell size for PvP collisions
ALTER TABLE players ADD COLUMN cell_radius REAL DEFAULT 20;