"""
Migration ponctuelle : ajoute la table PearlHistory (historique des changements
de stock de perles), sans toucher aux tables existantes.

A executer une seule fois, depuis la racine du projet : python database/migrate_pearl_history.py
"""
import shutil
import sqlite3

DB_PATH = 'database/database.db'

shutil.copy(DB_PATH, DB_PATH + '.bak')
print(f"Backup cree : {DB_PATH}.bak")

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.executescript('''
CREATE TABLE IF NOT EXISTS PearlHistory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    old_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user (id)
);
''')

conn.commit()
conn.close()

print("Migration terminee : table PearlHistory creee.")
