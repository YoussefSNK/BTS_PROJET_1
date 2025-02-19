from flask import Blueprint, render_template, request, redirect, url_for
import sqlite3

skinteam_bp = Blueprint('skinteam_bp', __name__)


DATABASE = "database/database.db"

def get_db_connection():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn


@skinteam_bp.route('/themes')
def list_themes():
    conn = get_db_connection()

    # Récupérer tous les thèmes
    themes = conn.execute("SELECT * FROM theme").fetchall()

    # Récupérer les skins associés à chaque thème
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
