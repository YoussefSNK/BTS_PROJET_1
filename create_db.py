import sqlite3

connection = sqlite3.connect('database.db')

with open('schema.sql') as f:
    connection.executescript(f.read())

cur = connection.cursor()

cur.execute("INSERT INTO user (login, password) VALUES (?, ?)",('admin', 'password'))
cur.execute("INSERT INTO user (login, password) VALUES (?, ?)",('salecon', 'G_R!xjZs7RC3C*.'))


cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Genesect', 1.0, 2, 2, 'Genesect.png', 0))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Lancer', 1.0, 2, 2, 'Lancer.png', 0))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Kindred', 1.0, 2, 2, 'Kindred.png', 1))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Air Man', 1.0, 2, 2, 'Air Man.png', 1))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Papyrus', 1.0, 2, 2, 'Papyrus.png', 2))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Diego Brando', 1.0, 2, 2, 'Diego Brando.png', 2))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Paco Lovelantes', 1.0, 2, 2, 'Paco Lovelantes.png', 3))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Inkling Boy', 1.0, 2, 2, 'Inkling Boy.png', 3))


connection.commit()
connection.close()
