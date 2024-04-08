import sqlite3

connection = sqlite3.connect('database.db')

with open('schema.sql') as f:
    connection.executescript(f.read())

cur = connection.cursor()

cur.execute("INSERT INTO user (login, password) VALUES (?, ?)",('admin', 'password'))


cur.execute("INSERT INTO perso (nom, licence, image, user_id) VALUES (?, ?, ?, ?)",('Genesect', 'Pokémon', 'Genesect.png', 0))
cur.execute("INSERT INTO perso (nom, licence, image, user_id) VALUES (?, ?, ?, ?)",('Lancer', 'Deltarune', 'Lancer.png', 0))
cur.execute("INSERT INTO perso (nom, licence, image, user_id) VALUES (?, ?, ?, ?)",('Kindred', 'League of Legends', 'Kindred.png', 1))
cur.execute("INSERT INTO perso (nom, licence, image, user_id) VALUES (?, ?, ?, ?)",('Air Man', 'Megaman', 'Air Man.png', 1))
cur.execute("INSERT INTO perso (nom, licence, image, user_id) VALUES (?, ?, ?, ?)",('Papyrus', 'Undertale', 'Papyrus.png', 2))
cur.execute("INSERT INTO perso (nom, licence, image, user_id) VALUES (?, ?, ?, ?)",('Diego Brando', 'Steel Ball Run', 'Diego Brando.png', 2))
cur.execute("INSERT INTO perso (nom, licence, image, user_id) VALUES (?, ?, ?, ?)",('Paco Lovelantes', 'Jojolands', 'Paco Lovelantes.png', 3))
cur.execute("INSERT INTO perso (nom, licence, image, user_id) VALUES (?, ?, ?, ?)",('Inkling Boy', 'Splatoon', 'Inkling Boy.png', 3))


connection.commit()
connection.close()
