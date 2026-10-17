"""Migration pour la refonte "Tama" (idempotente, peut etre relancee sans risque).

- PearlHistory : ajoute `note` (origine du mouvement) et `undone` (mouvement annule).
- Recipe : ajoute `width` / `height` (dimensions en perles), et l'origine de la recette :
  `source` (generated / imported), `metric` (distance utilisee), `stock_only` (1 = couleurs possedees,
  0 = toutes). Vides pour les recettes creees avant : on ne sait pas comment elles ont ete faites.
- Colors : ajoute `name_fr` et le remplit pour les codes Hama connus.
- ModelTag : nouvelle table des tags de modeles.

Usage : python database/migrate_tama.py
"""
import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'database.db')

NAMES_FR = {
    1: 'Blanc', 2: 'Crème', 3: 'Jaune', 4: 'Orange', 5: 'Rouge', 6: 'Rose', 7: 'Violet', 8: 'Bleu',
    9: 'Bleu clair', 10: 'Vert', 11: 'Vert clair', 12: 'Marron', 13: 'Rouge transparent',
    14: 'Jaune transparent', 15: 'Bleu transparent', 16: 'Vert transparent', 17: 'Gris', 18: 'Noir',
    19: 'Transparent', 20: 'Brun rouge', 21: 'Brun clair', 22: 'Rouge foncé', 24: 'Violet translucide',
    26: 'Rose mat', 27: 'Beige', 28: 'Vert foncé', 29: 'Grenat', 30: 'Bourgogne', 31: 'Turquoise',
    32: 'Fuchsia néon', 33: 'Cerise', 34: 'Jaune néon', 35: 'Rouge néon', 36: 'Bleu néon',
    37: 'Vert néon', 38: 'Orange néon', 42: 'Vert fluo', 43: 'Jaune pastel', 44: 'Rouge pastel',
    45: 'Violet pastel', 46: 'Bleu pastel', 47: 'Vert pastel', 48: 'Rose pastel', 49: 'Azur',
    60: 'Brun ourson', 70: 'Gris clair', 71: 'Gris foncé', 75: 'Fauve', 76: 'Nougat',
    77: 'Blanc nuageux', 78: 'Pêche clair', 79: 'Abricot', 82: 'Prune', 83: 'Bleu pétrole',
    84: 'Vert olive', 95: 'Rose poudré', 96: 'Lilas pastel', 97: 'Bleu glace', 98: 'Menthe pastel',
    101: 'Eucalyptus', 102: 'Vert forêt', 103: 'Jaune clair', 104: 'Citron vert', 105: 'Abricot clair',
    106: 'Lavande claire', 107: 'Lavande', 108: 'Aubergine', 109: 'Gris nuage', 110: 'Matcha',
    111: 'Blush foncé', 112: 'Blush', 113: 'Aqua', 114: 'Rouge cerise', 115: 'Vert vif',
    116: 'Bleu minuit', 117: 'Gris taupe', 118: 'Rouge marron', 119: 'Bleu ciel',
}


def columns(cursor, table):
    return {row[1] for row in cursor.execute(f'PRAGMA table_info({table})')}


def add_column(cursor, table, definition):
    name = definition.split()[0]
    if name not in columns(cursor, table):
        cursor.execute(f'ALTER TABLE {table} ADD COLUMN {definition}')
        print(f'+ {table}.{name}')


def migrate(db_path=DB_PATH):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    add_column(cursor, 'PearlHistory', "note TEXT NOT NULL DEFAULT ''")
    add_column(cursor, 'PearlHistory', 'undone INTEGER NOT NULL DEFAULT 0')
    add_column(cursor, 'Recipe', 'width INTEGER NOT NULL DEFAULT 0')
    add_column(cursor, 'Recipe', 'height INTEGER NOT NULL DEFAULT 0')
    add_column(cursor, 'Recipe', 'source TEXT')
    add_column(cursor, 'Recipe', 'metric TEXT')
    add_column(cursor, 'Recipe', 'stock_only INTEGER')
    add_column(cursor, 'Colors', 'name_fr TEXT')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ModelTag (
            model_id INTEGER NOT NULL,
            tag TEXT NOT NULL,
            FOREIGN KEY (model_id) REFERENCES Model (id),
            PRIMARY KEY (model_id, tag)
        )
    ''')

    for code, in cursor.execute('SELECT DISTINCT code FROM Colors').fetchall():
        digits = ''.join(ch for ch in code if ch.isdigit())
        name_fr = NAMES_FR.get(int(digits)) if digits else None
        if name_fr:
            cursor.execute('UPDATE Colors SET name_fr = ? WHERE code = ? AND name_fr IS NULL', (name_fr, code))

    conn.commit()
    conn.close()
    print('Migration Tama OK')


if __name__ == '__main__':
    migrate()
