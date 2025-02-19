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


-- Suppression des tables existantes si elles existent déjà
DROP TABLE IF EXISTS skin_theme;
DROP TABLE IF EXISTS utilisateur_skin;
DROP TABLE IF EXISTS skin;
DROP TABLE IF EXISTS theme;
DROP TABLE IF EXISTS champion_role;
DROP TABLE IF EXISTS role;
DROP TABLE IF EXISTS champion;

-- Table Champion
CREATE TABLE champion (
    id INTEGER PRIMARY KEY, -- ID officiel du champion
    nom TEXT NOT NULL UNIQUE,
    titre TEXT NOT NULL,
    image_url TEXT NOT NULL
);

-- Table Rôle
CREATE TABLE role (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL UNIQUE,
    image_url TEXT NOT NULL
);

-- Table de liaison Champion ↔ Rôle (N:N)
CREATE TABLE champion_role (
    champion_id INTEGER NOT NULL,
    role_id INTEGER NOT NULL,
    FOREIGN KEY (champion_id) REFERENCES champion (id) ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES role (id) ON DELETE CASCADE,
    PRIMARY KEY (champion_id, role_id)
);

-- Table Skin
CREATE TABLE skin (
    id INTEGER PRIMARY KEY, -- ID officiel du skin
    nom TEXT NOT NULL,
    champion_id INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    FOREIGN KEY (champion_id) REFERENCES champion (id) ON DELETE CASCADE
);

-- Table Thème
CREATE TABLE theme (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL UNIQUE,
    image_url TEXT NOT NULL
);

-- Table de liaison Skin ↔ Thème (N:N)
CREATE TABLE skin_theme (
    skin_id INTEGER NOT NULL,
    theme_id INTEGER NOT NULL,
    FOREIGN KEY (skin_id) REFERENCES skin (id) ON DELETE CASCADE,
    FOREIGN KEY (theme_id) REFERENCES theme (id) ON DELETE CASCADE,
    PRIMARY KEY (skin_id, theme_id)
);

-- Table de liaison Utilisateur ↔ Skin (N:N)
CREATE TABLE utilisateur_skin (
    utilisateur_id INTEGER NOT NULL,
    skin_id INTEGER NOT NULL,
    FOREIGN KEY (utilisateur_id) REFERENCES user (id) ON DELETE CASCADE,
    FOREIGN KEY (skin_id) REFERENCES skin (id) ON DELETE CASCADE,
    PRIMARY KEY (utilisateur_id, skin_id)
);
