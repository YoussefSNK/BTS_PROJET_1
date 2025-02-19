import requests
import sqlite3

# URL de l'API DDragon
URL = "https://ddragon.leagueoflegends.com/cdn/14.1.1/data/fr_FR/championFull.json"
IMG_URL_TEMPLATE = "https://ddragon.leagueoflegends.com/cdn/img/champion/loading/{}_{}.jpg"

# Connexion à la base SQLite
conn = sqlite3.connect("database/database.db")
cursor = conn.cursor()

def fetch_champions():
    response = requests.get(URL)
    if response.status_code != 200:
        print("Erreur lors de la récupération des données")
        return None
    return response.json()["data"]

def insert_champion(champion):
    cursor.execute("""
        INSERT INTO champion (id, nom, titre, image_url) VALUES (?, ?, ?, ?)
    """, (champion["key"], champion["name"], champion["title"], f"https://ddragon.leagueoflegends.com/cdn/14.1.1/img/champion/{champion['image']['full']}"))

def insert_skin(skin, champion_name, champion_id):
    skin_image_url = IMG_URL_TEMPLATE.format(champion_name, skin["num"])
    cursor.execute("""
        INSERT INTO skin (id, nom, champion_id, image_url) VALUES (?, ?, ?, ?)
    """, (skin["id"], skin["name"], champion_id, skin_image_url))


def insert_roles():    
    roles = [
        ("Top", "static/assets/Position_Gold-Top.png"),
        ("Jungle", "static/assets/Position_Gold-Jungle.png"),
        ("Mid", "static/assets/Position_Gold-Mid.png"),
        ("ADC", "static/assets/Position_Gold-Bot.png"),
        ("Support", "static/assets/Position_Gold-Support.png"),
    ]
    cursor.executemany("INSERT INTO role (nom, image_url) VALUES (?, ?)", roles)

def main():
    champions = fetch_champions()
    if not champions:
        return
    
    for champ_name, champ_data in champions.items():
        insert_champion(champ_data)
        for skin in champ_data["skins"]:
            insert_skin(skin, champ_name, champ_data["key"])
    
    insert_roles()

    conn.commit()
    conn.close()
    print("Importation terminée avec succès !")

if __name__ == "__main__":
    main()
