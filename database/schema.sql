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

DROP TABLE IF EXISTS liste;
CREATE TABLE liste (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    largeur INTEGER NOT NULL,
    hauteur INTEGER NOT NULL,
    user_id INTEGER NOT NULL
);

DROP TABLE IF EXISTS little_image;
CREATE TABLE little_image (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_link TEXT NOT NULL,
    liste_id INTEGER NOT NULL

);

DROP TABLE IF EXISTS Colors;
CREATE TABLE Colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    hex TEXT NOT NULL
);


DROP TABLE IF EXISTS UserBeads;
CREATE TABLE UserBeads (
    user_id INTEGER NOT NULL,
    color_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user (id),
    FOREIGN KEY (color_id) REFERENCES Colors (id),
    PRIMARY KEY (user_id, color_id)
);

DROP TABLE IF EXISTS Images;
CREATE TABLE Images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (user_id) REFERENCES user (id)
);

DROP TABLE IF EXISTS ImageColors;
CREATE TABLE ImageColors (
    image_id INTEGER NOT NULL,
    color_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (image_id) REFERENCES Images (id),
    FOREIGN KEY (color_id) REFERENCES Colors (id),
    PRIMARY KEY (image_id, color_id)
);