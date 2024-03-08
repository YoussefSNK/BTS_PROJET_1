import sqlite3

connection = sqlite3.connect('database.db')

with open('schema.sql') as f:
    connection.executescript(f.read())

cur = connection.cursor()

cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Genesect', 'Pokémon', 'char/Genesect.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Lancer', 'Deltarune', 'char/Lancer.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Kindred', 'League of Legends', 'char/Kindred.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Air Man', 'Megaman', 'char/Air Man.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Papyrus', 'Undertale', 'char/Papyrus.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Diego Brando', 'Steel Ball Run', 'char/Diego Brando.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Paco Lovelantes', 'Jojolands', 'char/Paco Lovelantes.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Inkling Boy', 'Splatoon', 'char/Inkling Boy.png'))

connection.commit()
connection.close()
