from flask import Blueprint, render_template, request, redirect, url_for
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

    # Récupérer les rôles associés à chaque champion
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


@skinteam_bp.route('/champions/<int:champion_id>/update_roles', methods=["POST"])
def update_champion_roles(champion_id):
    conn = get_db_connection()
    
    selected_roles = request.form.getlist("roles")
    conn.execute("DELETE FROM champion_role WHERE champion_id = ?", (champion_id,))

    for role_id in selected_roles:
        conn.execute("INSERT INTO champion_role (champion_id, role_id) VALUES (?, ?)", (champion_id, role_id))

    conn.commit()
    conn.close()

    return redirect(url_for("skinteam_bp.list_champions"))


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

    if request.method == 'POST':
        selected_skins = request.form.getlist('skins')

        # Supprimer les anciennes associations
        conn.execute('DELETE FROM utilisateur_skin WHERE utilisateur_id = ?', (user_id,))
        
        # Ajouter les nouvelles associations
        for skin_id in selected_skins:
            conn.execute('INSERT INTO utilisateur_skin (utilisateur_id, skin_id) VALUES (?, ?)', (user_id, skin_id))

        conn.commit()
        conn.close()
        return redirect(url_for('skinteam_bp.user_skins', user_id=user_id))

    else:
        # Récupérer les skins possédés par l'utilisateur
        owned_skins = conn.execute('''
            SELECT skin.* FROM skin
            JOIN utilisateur_skin ON skin.id = utilisateur_skin.skin_id
            WHERE utilisateur_skin.utilisateur_id = ?
        ''', (user_id,)).fetchall()

        # Récupérer tous les skins disponibles
        all_skins = conn.execute('SELECT * FROM skin').fetchall()
        conn.close()
        
        return render_template('skinteam/user_skins.html', user_id=user_id, owned_skins=owned_skins, all_skins=all_skins)


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

            all_skins = [user_skins[uid] for uid in user_ids]
            possible_teams = product(*all_skins)
            
            for team in possible_teams:
                themes = {skin['theme_id'] for skin in team}
                roles = {skin['role_id']: skin for skin in team}

                if len(themes) == 1 and len(roles) == 5:  
                    theme_id = next(iter(themes))  
                    theme_name = next(skin['theme_name'] for skin in team)
                    
                    structured_team = {
                        "TOP": roles.get(1),
                        "JUNGLE": roles.get(2),
                        "MID": roles.get(3),
                        "ADC": roles.get(4),
                        "SUPP": roles.get(5),
                    }
                    
                    if theme_id not in grouped_teams:
                        grouped_teams[theme_id] = {"theme_name": theme_name, "teams": []}
                    
                    grouped_teams[theme_id]["teams"].append(structured_team)

    conn.close()
    
    return render_template("skinteam/team_combinations.html", user_ids=user_ids, grouped_teams=grouped_teams, users=users)
