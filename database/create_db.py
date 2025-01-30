import sqlite3

connection = sqlite3.connect('database/database.db')

try:
    with open('database/schema.sql') as f:
        connection.executescript(f.read())

    cur = connection.cursor()

    cur.execute("INSERT INTO user (login, password) VALUES (?, ?)",('admin', 'password'))
    cur.execute("INSERT INTO user (login, password) VALUES (?, ?)",('salecon', 'G_R!xjZs7RC3C*.'))


    cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Genesect', 1.0, 2, 2, 'Genesect.png', 0))
    cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Lancer', 1.0, 2, 2, 'Lancer.png', 0))
    cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Kindred', 1.0, 2, 2, 'Kindred.png', 1))
    cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Air Man', 1.0, 2, 2, 'Air Man.png', 1))
    cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Papyrus', 1.0, 2, 2, 'Papyrus.png', 2))
    cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Diego Brando', 1.0, 2, 2, 'Diego Brando.png', 2))
    cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Paco Lovelantes', 1.0, 2, 2, 'Paco Lovelantes.png', 3))
    cur.execute("INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)",('Inkling Boy', 1.0, 2, 2, 'Inkling Boy.png', 3))

    cur.execute("INSERT INTO liste (nom, largeur, hauteur, user_id) VALUES (?, ?, ?, ?)",('Pokémon', 204, 204, 2))

    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H01", "White", "#eceded"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H02", "Cream", "#f0e8b9"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H03", "Yellow", "#f0b901"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H04", "Orange", "#e64f27"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H05", "Red", "#b63136"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H06", "Pink", "#e1889f"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H07", "Purple", "#694a82"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H08", "Blue", "#2c4690"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H09", "Light Blue", "#305cb0"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H10", "Green", "#256847"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H11", "Light green", "#49ae89"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H12", "Brown", "#534137"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H17", "Grey", "#83888a"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H18", "Black", "#2e2f31"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H20", "Reddish Brown", "#7f332a"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H21", "Light Brown", "#a5693f"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H22", "Dark Red", "#a52d36"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H26", "Flesh", "#de9b90"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H27", "Beige", "#deb48b"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H28", "Dark Green", "#363f38"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H29", "Claret", "#b9395e"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H30", "Burgundy", "#592f38"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H31", "Turquoise", "#6797ae"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H33", "Cerise", "#ff3956"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H43", "Pastel Yellow", "#f0ea37"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H44", "Pastel Red", "#ee6972"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H45", "Pastel Purple", "#886db9"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H46", "Pastel Blue", "#629ed7"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H47", "Pastel Green", "#83cb70"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H48", "Pastel Pink", "#cf70b7"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H49", "Azure", "#4998bc"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H60", "Teddybear Brown", "#f49422"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H70", "Light Grey", "#b6b6d4"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H71", "Dark Grey", "#464541"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H75", "Tan", "#bf7b4d"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H76", "Nougat", "#663317"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H77", "Kitt", "#ede7df"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H78", "Heller Pfirsich", "#ffc99a"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H79", "Apricot", "#f08643"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H82", "Pflaume", "#962f5c"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H83", "Petrol", "#0178a4"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H84", "Helle Olive", "#8b924c"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H95", "Pastell-Rose", "#f8cce0"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H96", "Pastell-Flieder", "#d4b1e3"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H97", "Pastell-Eisblau", "#a2d3fe"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H98", "Pastell-Mint", "#9adbb1"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H101", "Eucalyptus", "#a9c39b"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H102", "Waldgrün", "#356b2d"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H103", "Hellgelb", "#ffe660"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H104", "Lime", "#bcd122"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H105", "Helles Apricot", "#ffac78"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H106", "Heller Lavendel", "#ccc5ed"))
    cur.execute("INSERT INTO Colors (code, name, hex) VALUES (?, ?, ?)",("H107", "Lavendel", "#6a87c1"))

    cur.execute("INSERT INTO little_image (image_link, liste_id) VALUES (?, ?)",('LI1.png', 1))
    cur.execute("INSERT INTO little_image (image_link, liste_id) VALUES (?, ?)",('LI2.png', 1))
    cur.execute("INSERT INTO little_image (image_link, liste_id) VALUES (?, ?)",('LI3.png', 1))


    connection.commit()
    connection.close()


except sqlite3.OperationalError as e:
    print(f"An error occurred: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")