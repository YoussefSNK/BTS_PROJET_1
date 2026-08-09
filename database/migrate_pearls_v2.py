"""
Migration ponctuelle : bascule les tables perles (Colors/UserBeads/Images/ImageColors)
vers le nouveau schema ColorList/Colors/UserBeads/Model/Recipe/RecipeColors.

- Preserve le stock utilisateur (UserBeads) en le reindexant par code au lieu de color_id.
- Importe colors.txt comme deuxieme liste ("Hama (liste precise)").
- Les anciennes fiches Images/ImageColors sont abandonnees (pas de migration demandee).
- Ne touche a aucune autre table (user, image, liste, little_image, champion, ...).

A executer une seule fois, depuis la racine du projet : python database/migrate_pearls_v2.py
"""
import shutil
import sqlite3

DB_PATH = 'database/database.db'
COLORS_TXT = 'colors.txt'

shutil.copy(DB_PATH, DB_PATH + '.bak')
print(f"Backup cree : {DB_PATH}.bak")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

# 1. Capturer les donnees existantes avant de toucher au schema
cur.execute('SELECT id, code, name, hex FROM Colors ORDER BY id')
old_colors = cur.fetchall()
id_to_code = {row[0]: row[1] for row in old_colors}

cur.execute('SELECT user_id, color_id, quantity FROM UserBeads')
old_beads = cur.fetchall()

new_list_colors = []
with open(COLORS_TXT, encoding='utf-8') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        hex_code, rest = line.split(',', 1)
        code, name = rest.strip().split(' ', 1)
        new_list_colors.append((code.strip(), name.strip(' ()'), hex_code.strip()))

# 2. Recreer le schema des tables perles
cur.executescript('''
DROP TABLE IF EXISTS RecipeColors;
DROP TABLE IF EXISTS Recipe;
DROP TABLE IF EXISTS Model;
DROP TABLE IF EXISTS ImageColors;
DROP TABLE IF EXISTS Images;
DROP TABLE IF EXISTS UserBeads;
DROP TABLE IF EXISTS Colors;
DROP TABLE IF EXISTS ColorList;

CREATE TABLE ColorList (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT UNIQUE NOT NULL
);

CREATE TABLE Colors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    hex TEXT NOT NULL,
    FOREIGN KEY (list_id) REFERENCES ColorList (id),
    UNIQUE (list_id, code)
);

CREATE TABLE UserBeads (
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user (id),
    PRIMARY KEY (user_id, code)
);

CREATE TABLE Model (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    nom TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user (id)
);

CREATE TABLE Recipe (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER NOT NULL,
    list_id INTEGER NOT NULL,
    dithering_type TEXT NOT NULL CHECK (dithering_type IN ('none', 'floyd_steinberg', 'atkinson', 'ordered')),
    image_path TEXT NOT NULL,
    FOREIGN KEY (model_id) REFERENCES Model (id),
    FOREIGN KEY (list_id) REFERENCES ColorList (id)
);

CREATE TABLE RecipeColors (
    recipe_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (recipe_id) REFERENCES Recipe (id),
    PRIMARY KEY (recipe_id, code)
);
''')

# 3. Reinsertion des donnees
cur.execute("INSERT INTO ColorList (nom) VALUES (?)", ('Hama (ancienne liste)',))
old_list_id = cur.lastrowid
for _id, code, name, hex_code in old_colors:
    cur.execute('INSERT INTO Colors (list_id, code, name, hex) VALUES (?, ?, ?, ?)',
                (old_list_id, code, name, hex_code))

cur.execute("INSERT INTO ColorList (nom) VALUES (?)", ('Hama (liste précise)',))
new_list_id = cur.lastrowid
for code, name, hex_code in new_list_colors:
    cur.execute('INSERT INTO Colors (list_id, code, name, hex) VALUES (?, ?, ?, ?)',
                (new_list_id, code, name, hex_code))

skipped = 0
for user_id, color_id, quantity in old_beads:
    code = id_to_code.get(color_id)
    if code is None:
        skipped += 1
        continue
    cur.execute('''
        INSERT INTO UserBeads (user_id, code, quantity) VALUES (?, ?, ?)
        ON CONFLICT(user_id, code) DO UPDATE SET quantity = excluded.quantity
    ''', (user_id, code, quantity))

conn.commit()
conn.close()

print(f"Migration terminee : {len(old_colors)} couleurs (ancienne liste), "
      f"{len(new_list_colors)} couleurs (liste precise), "
      f"{len(old_beads) - skipped}/{len(old_beads)} lignes UserBeads reindexees.")
