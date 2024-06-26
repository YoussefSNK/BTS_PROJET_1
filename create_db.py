import sqlite3

connection = sqlite3.connect('database.db')

with open('schema.sql') as f:
    connection.executescript(f.read())

cur = connection.cursor()

cur.execute("INSERT INTO user (login, password) VALUES (?, ?)",('admin', 'password'))
cur.execute("INSERT INTO user (login, password) VALUES (?, ?)",('salecon', 'G_R!xjZs7RC3C*.'))


cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id, petite_image) VALUES (?, ?, ?, ?, ?, ?, ?)",('Genesect', 1.0, 2, 2, 'Genesect.png', 0, 0))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id, petite_image) VALUES (?, ?, ?, ?, ?, ?, ?)",('Lancer', 1.0, 2, 2, 'Lancer.png', 0, 0))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id, petite_image) VALUES (?, ?, ?, ?, ?, ?, ?)",('Kindred', 1.0, 2, 2, 'Kindred.png', 1, 0))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id, petite_image) VALUES (?, ?, ?, ?, ?, ?, ?)",('Air Man', 1.0, 2, 2, 'Air Man.png', 1, 0))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id, petite_image) VALUES (?, ?, ?, ?, ?, ?, ?)",('Papyrus', 1.0, 2, 2, 'Papyrus.png', 2, 0))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id, petite_image) VALUES (?, ?, ?, ?, ?, ?, ?)",('Diego Brando', 1.0, 2, 2, 'Diego Brando.png', 2, 0))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id, petite_image) VALUES (?, ?, ?, ?, ?, ?, ?)",('Paco Lovelantes', 1.0, 2, 2, 'Paco Lovelantes.png', 3, 0))
cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image, user_id, petite_image) VALUES (?, ?, ?, ?, ?, ?, ?)",('Inkling Boy', 1.0, 2, 2, 'Inkling Boy.png', 3, 0))


connection.commit()
connection.close()
