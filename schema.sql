DROP TABLE IF EXISTS perso;
CREATE TABLE perso (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    nom TEXT NOT NULL,
    licence TEXT NOT NULL,
    image TEXT NOT NULL
);
