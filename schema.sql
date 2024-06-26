DROP TABLE IF EXISTS image;
CREATE TABLE image (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    ratio REAL NOT NULL,
    largeur INTEGER NOT NULL,
    hauteur INTEGER NOT NULL,
    image_link TEXT NOT NULL,
    user_id INTEGER NOT NULL
);

DROP TABLE IF EXISTS user;
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    -- created TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    login TEXT NOT NULL,
    password TEXT NOT NULL
);
