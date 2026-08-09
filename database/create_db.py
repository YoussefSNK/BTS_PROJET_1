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

    ancienne_liste = [
        ("H01", "White", "#eceded"), ("H02", "Cream", "#f0e8b9"), ("H03", "Yellow", "#f0b901"),
        ("H04", "Orange", "#e64f27"), ("H05", "Red", "#b63136"), ("H06", "Pink", "#e1889f"),
        ("H07", "Purple", "#694a82"), ("H08", "Blue", "#2c4690"), ("H09", "Light Blue", "#305cb0"),
        ("H10", "Green", "#256847"), ("H11", "Light green", "#49ae89"), ("H12", "Brown", "#534137"),
        ("H17", "Grey", "#83888a"), ("H18", "Black", "#2e2f31"), ("H20", "Reddish Brown", "#7f332a"),
        ("H21", "Light Brown", "#a5693f"), ("H22", "Dark Red", "#a52d36"), ("H26", "Flesh", "#de9b90"),
        ("H27", "Beige", "#deb48b"), ("H28", "Dark Green", "#363f38"), ("H29", "Claret", "#b9395e"),
        ("H30", "Burgundy", "#592f38"), ("H31", "Turquoise", "#6797ae"), ("H33", "Cerise", "#ff3956"),
        ("H43", "Pastel Yellow", "#f0ea37"), ("H44", "Pastel Red", "#ee6972"), ("H45", "Pastel Purple", "#886db9"),
        ("H46", "Pastel Blue", "#629ed7"), ("H47", "Pastel Green", "#83cb70"), ("H48", "Pastel Pink", "#cf70b7"),
        ("H49", "Azure", "#4998bc"), ("H60", "Teddybear Brown", "#f49422"), ("H70", "Light Grey", "#b6b6d4"),
        ("H71", "Dark Grey", "#464541"), ("H75", "Tan", "#bf7b4d"), ("H76", "Nougat", "#663317"),
        ("H77", "Kitt", "#ede7df"), ("H78", "Heller Pfirsich", "#ffc99a"), ("H79", "Apricot", "#f08643"),
        ("H82", "Pflaume", "#962f5c"), ("H83", "Petrol", "#0178a4"), ("H84", "Helle Olive", "#8b924c"),
        ("H95", "Pastell-Rose", "#f8cce0"), ("H96", "Pastell-Flieder", "#d4b1e3"), ("H97", "Pastell-Eisblau", "#a2d3fe"),
        ("H98", "Pastell-Mint", "#9adbb1"), ("H101", "Eucalyptus", "#a9c39b"), ("H102", "Waldgrün", "#356b2d"),
        ("H103", "Hellgelb", "#ffe660"), ("H104", "Lime", "#bcd122"), ("H105", "Helles Apricot", "#ffac78"),
        ("H106", "Heller Lavendel", "#ccc5ed"), ("H107", "Lavendel", "#6a87c1"),
    ]

    cur.execute("INSERT INTO ColorList (nom) VALUES (?)", ("Hama (ancienne liste)",))
    ancienne_liste_id = cur.lastrowid
    for code, name, hex_code in ancienne_liste:
        cur.execute("INSERT INTO Colors (list_id, code, name, hex) VALUES (?, ?, ?, ?)",
                    (ancienne_liste_id, code, name, hex_code))

    try:
        with open('colors.txt', encoding='utf-8') as colors_file:
            cur.execute("INSERT INTO ColorList (nom) VALUES (?)", ("Hama (liste précise)",))
            nouvelle_liste_id = cur.lastrowid
            for line in colors_file:
                line = line.strip()
                if not line:
                    continue
                hex_code, rest = line.split(',', 1)
                code, name = rest.strip().split(' ', 1)
                cur.execute("INSERT INTO Colors (list_id, code, name, hex) VALUES (?, ?, ?, ?)",
                            (nouvelle_liste_id, code.strip(), name.strip(' ()'), hex_code.strip()))
    except FileNotFoundError:
        pass

    cur.execute("INSERT INTO little_image (image_link, liste_id) VALUES (?, ?)",('LI1.png', 1))
    cur.execute("INSERT INTO little_image (image_link, liste_id) VALUES (?, ?)",('LI2.png', 1))
    cur.execute("INSERT INTO little_image (image_link, liste_id) VALUES (?, ?)",('LI3.png', 1))


    connection.commit()
    connection.close()


except sqlite3.OperationalError as e:
    print(f"An error occurred: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")