import json
from flask import Blueprint, jsonify, render_template, request, redirect, url_for, flash
import sqlite3
from itertools import product, combinations

skinteam_bp = Blueprint('skinteam_bp', __name__)


DATABASE = "database/database.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


@skinteam_bp.route('/champions')
def list_champions():
    conn = get_db_connection()
    champions = conn.execute("SELECT * FROM champion").fetchall()

    champion_roles = {}
    for champion in champions:
        roles = conn.execute("""
            SELECT role.id, role.nom, role.image_url
            FROM role
            JOIN champion_role ON role.id = champion_role.role_id
            WHERE champion_role.champion_id = ?
        """, (champion["id"],)).fetchall()
        champion_roles[champion["id"]] = roles

    roles = conn.execute("SELECT * FROM role").fetchall()
    conn.close()
    return render_template("skinteam/champions.html", champions=champions, champion_roles=champion_roles, roles=roles)

@skinteam_bp.route('/champions/<int:champion_id>/toggle_role/<int:role_id>', methods=['POST'])
def toggle_champion_role(champion_id, role_id):
    conn = get_db_connection()
    existing = conn.execute(
        "SELECT * FROM champion_role WHERE champion_id = ? AND role_id = ?",
        (champion_id, role_id)
    ).fetchone()
    
    if existing:
        conn.execute(
            "DELETE FROM champion_role WHERE champion_id = ? AND role_id = ?",
            (champion_id, role_id)
        )
        action = 'removed'
    else:
        conn.execute(
            "INSERT INTO champion_role (champion_id, role_id) VALUES (?, ?)",
            (champion_id, role_id)
        )
        action = 'added'
    
    conn.commit()
    conn.close()
    return jsonify({'status': 'success', 'action': action})



@skinteam_bp.route('/themes')
def list_themes():
    conn = get_db_connection()

    themes = conn.execute("SELECT * FROM theme").fetchall()

    theme_skins = {}
    for theme in themes:
        skins = conn.execute("""
            SELECT skin.* 
            FROM skin 
            JOIN skin_theme ON skin.id = skin_theme.skin_id
            WHERE skin_theme.theme_id = ?
        """, (theme["id"],)).fetchall()
        theme_skins[theme["id"]] = skins

    conn.close()
    return render_template("skinteam/themes.html", themes=themes, theme_skins=theme_skins)

@skinteam_bp.route('/themes/create', methods=["GET", "POST"])
def create_theme():
    if request.method == "POST":
        nom = request.form["nom"]
        image_url = request.form["image_url"]
        conn = get_db_connection()
        conn.execute("INSERT INTO theme (nom, image_url) VALUES (?, ?)", (nom, image_url))
        conn.commit()
        conn.close()
        return redirect(url_for("skinteam_bp.list_themes"))
    return render_template("skinteam/create_theme.html")

@skinteam_bp.route('/themes/<int:theme_id>/assign_skins', methods=["GET", "POST"])
def assign_skins(theme_id):
    conn = get_db_connection()

    if request.method == "POST":
        selected_skins = request.form.getlist("skins")

        # Effacer les skins déjà assignés à ce thème
        conn.execute("DELETE FROM skin_theme WHERE theme_id = ?", (theme_id,))

        # Insérer les nouveaux liens
        for skin_id in selected_skins:
            conn.execute("INSERT INTO skin_theme (skin_id, theme_id) VALUES (?, ?)", (skin_id, theme_id))

        conn.commit()
        conn.close()
        return redirect(url_for("skinteam_bp.list_themes"))

    else:
        # Récupérer le thème
        theme = conn.execute("SELECT * FROM theme WHERE id = ?", (theme_id,)).fetchone()

        # Récupérer les skins déjà assignés
        assigned_skins = conn.execute("""
            SELECT skin.*
            FROM skin
            JOIN skin_theme ON skin.id = skin_theme.skin_id
            WHERE skin_theme.theme_id = ?
        """, (theme_id,)).fetchall()

        # Récupérer tous les skins disponibles
        all_skins = conn.execute("SELECT * FROM skin").fetchall()

        conn.close()
        return render_template("skinteam/assign_skins.html", theme=theme, assigned_skins=assigned_skins, all_skins=all_skins)
    
@skinteam_bp.route('/user/<int:user_id>/skins', methods=['GET', 'POST'])
def user_skins(user_id):
    conn = get_db_connection()

    if request.method == 'POST' and 'skins' in request.form:
        selected_skins = request.form.getlist('skins')

        # Supprimer les anciennes associations
        conn.execute('DELETE FROM utilisateur_skin WHERE utilisateur_id = ?', (user_id,))
        
        # Ajouter les nouvelles associations
        for skin_id in selected_skins:
            conn.execute('INSERT INTO utilisateur_skin (utilisateur_id, skin_id) VALUES (?, ?)', (user_id, skin_id))

        conn.commit()
        conn.close()
        return redirect(url_for('skinteam_bp.user_skins', user_id=user_id))


    # Méthode GET : récupération des skins de l'utilisateur et de la liste complète
    owned_skins = conn.execute('''
        SELECT skin.* FROM skin
        JOIN utilisateur_skin ON skin.id = utilisateur_skin.skin_id
        WHERE utilisateur_skin.utilisateur_id = ?
    ''', (user_id,)).fetchall()
    all_skins = conn.execute('SELECT * FROM skin').fetchall()
    conn.close()
    
    return render_template('skinteam/user_skins.html', user_id=user_id, owned_skins=owned_skins, all_skins=all_skins)

@skinteam_bp.route('/user/<int:user_id>/skins/upload', methods=['POST'])
def upload_user_skins(user_id):
    file = request.files.get('skins_file')
    if not file:
        flash("Aucun fichier fourni", "error")
        return redirect(url_for('skinteam_bp.user_skins', user_id=user_id))
    
    try:
        json_data = json.load(file)
    except Exception as e:
        flash("Erreur lors du traitement du fichier JSON", "error")
        return redirect(url_for('skinteam_bp.user_skins', user_id=user_id))
    
    conn = get_db_connection()
    # Supprimer les associations existantes pour l'utilisateur
    conn.execute('DELETE FROM utilisateur_skin WHERE utilisateur_id = ?', (user_id,))
    
    # Parcourir la liste JSON et ajouter chaque skin si "owned" est True
    for skin in json_data:
        if skin.get('ownership', {}).get('owned', False):
            skin_id = skin.get('id')
            cursor = conn.execute('SELECT id FROM skin WHERE id = ?', (skin_id,))
            if cursor.fetchone():
                conn.execute('INSERT INTO utilisateur_skin (utilisateur_id, skin_id) VALUES (?, ?)', (user_id, skin_id))
            else:
                print(f"Skin with id {skin_id} not found in database.")
    
    conn.commit()
    conn.close()
    return redirect(url_for('skinteam_bp.user_skins', user_id=user_id))

@skinteam_bp.route('/team_combinations', methods=["GET", "POST"])
def team_combinations():
    user_ids = []
    grouped_teams = {}
    conn = get_db_connection()
    users = conn.execute("SELECT id, login FROM user").fetchall()
    
    if request.method == "POST":
        user_ids = [request.form.get(f'user{i}') for i in range(1, 6)]
        user_ids = [int(uid) for uid in user_ids if uid]
        
        if len(user_ids) == 5:
            user_skins = {}
            for user_id in user_ids:
                skins = conn.execute("""
                    SELECT skin.id, skin.nom, skin.image_url, skin.champion_id, 
                           theme.id as theme_id, theme.nom as theme_name, 
                           role.id as role_id, role.nom as role_name
                    FROM utilisateur_skin
                    JOIN skin ON utilisateur_skin.skin_id = skin.id
                    JOIN skin_theme ON skin.id = skin_theme.skin_id
                    JOIN theme ON skin_theme.theme_id = theme.id
                    JOIN champion_role ON skin.champion_id = champion_role.champion_id
                    JOIN role ON champion_role.role_id = role.id
                    WHERE utilisateur_skin.utilisateur_id = ?
                """, (user_id,)).fetchall()
                
                user_skins[user_id] = [dict(skin) | {"owner": user_id} for skin in skins]  

            theme_user_skins = {}
            for user_id, skins in user_skins.items():
                for skin in skins:
                    theme_id = skin['theme_id']
                    if theme_id not in theme_user_skins:
                        theme_user_skins[theme_id] = {}
                    if user_id not in theme_user_skins[theme_id]:
                        theme_user_skins[theme_id][user_id] = []
                    theme_user_skins[theme_id][user_id].append(skin)
            
            valid_themes = { theme_id: skins_by_user 
                             for theme_id, skins_by_user in theme_user_skins.items()
                             if all(user_id in skins_by_user for user_id in user_ids) }
            aggregated = {}
            roles_order = [("TOP", 1), ("JUNGLE", 2), ("MID", 3), ("ADC", 4), ("SUPP", 5)]
            for theme_id, skins_by_user in valid_themes.items():
                skins_lists = [skins_by_user[user_id] for user_id in user_ids]
                possible_teams = product(*skins_lists)
            
                for team in possible_teams:
                    champions = set()
                    roles_map = {}
                    valid_team = True
                    for skin in team:
                        role_id = skin['role_id']
                        if role_id in roles_map:
                            valid_team = False
                            break
                        roles_map[role_id] = skin
                        champions.add(skin['champion_id'])
                    
                    if not valid_team or len(champions) != 5:
                        continue
                    
                    structured_team = {}
                    for role_name, role_id in roles_order:
                        structured_team[role_name] = roles_map.get(role_id)

                    composition_key = tuple(structured_team[role_name]['champion_id'] for role_name, _ in roles_order)
                    
                    theme_name = structured_team["TOP"]["theme_name"]
                    
                    if theme_id not in aggregated:
                        aggregated[theme_id] = {"theme_name": theme_name, "teams": {}}
                    
                    if composition_key not in aggregated[theme_id]["teams"]:
                        aggregated[theme_id]["teams"][composition_key] = {
                            role_name: [structured_team[role_name]] for role_name, _ in roles_order
                        }
                    else:
                        for role_name, _ in roles_order:
                            skin = structured_team[role_name]
                            if skin["id"] not in [s["id"] for s in aggregated[theme_id]["teams"][composition_key][role_name]]:
                                aggregated[theme_id]["teams"][composition_key][role_name].append(skin)
            
            final_grouped_teams = {}
            for theme_id, data in aggregated.items():
                teams_list = list(data["teams"].values())
                final_grouped_teams[theme_id] = {"theme_name": data["theme_name"], "teams": teams_list}
            
            grouped_teams = final_grouped_teams

    conn.close()
    
    return render_template("skinteam/team_combinations.html", user_ids=user_ids, grouped_teams=grouped_teams, users=users)
