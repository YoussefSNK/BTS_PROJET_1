import sqlite3

connection = sqlite3.connect('database.db')

with open('schema.sql') as f:
    connection.executescript(f.read())

cur = connection.cursor()

cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Genesect', 'Pokémon', 'Genesect.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Lancer', 'Deltarune', 'Lancer.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Kindred', 'League of Legends', 'Kindred.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Air Man', 'Megaman', 'Air Man.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Papyrus', 'Undertale', 'Papyrus.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Diego Brando', 'Steel Ball Run', 'Diego Brando.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Paco Lovelantes', 'Jojolands', 'Paco Lovelantes.png'))
cur.execute("INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)",('Inkling Boy', 'Splatoon', 'Inkling Boy.png'))

connection.commit()
connection.close()
