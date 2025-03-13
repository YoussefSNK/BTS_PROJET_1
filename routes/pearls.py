from flask import Blueprint, render_template, request, redirect, url_for, session, flash, current_app
import sqlite3, os, math

from werkzeug.utils import secure_filename
from collections import Counter
from PIL import Image


pearl_bp = Blueprint('pearl_bp', __name__)


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS





def get_color_histogram(image):
    colors = image.getdata()
    color_counts = Counter(colors)
    return color_counts

def detect_colors(image_path):
    img = Image.open(image_path).convert("RGB")
    current_histogram = get_color_histogram(img)
    hex_color_counts = {
        "#{:02x}{:02x}{:02x}".format(r, g, b): count
        for (r, g, b), count in current_histogram.items()
    }
    return hex_color_counts

def decomposition_facteurs_premiers(n):
    """Retourne la décomposition en facteurs premiers d'un nombre n."""
    facteurs = []
    diviseur = 2
    while diviseur * diviseur <= n:
        while n % diviseur == 0:
            facteurs.append(diviseur)
            n //= diviseur
        diviseur += 1
    if n > 1:
        facteurs.append(n)
    return facteurs

def remove_common_elements(d: dict) -> dict:
    """
    Pour le dictionnaire d, la fonction parcourt la première liste associée à la première clé.
    Pour chaque entier n de cette liste, si n est présent dans toutes les autres listes,
    alors on retire de chaque liste le nombre minimal d'occurrences de n parmi toutes.
    
    Exemple :
      'H70': [2, 2, 3, 3, 3, 3, 3, 5, 7],
      'H106': [2, 2, 2, 3, 3, 3, 3, 23],
      'H77': [2, 2, 2, 3, 3, 3, 3, 7, 23]
    
    devient
    
      'H70': [3, 5, 7],
      'H106': [2, 23],
      'H77': [2, 7, 23]
    """
    # Récupérer la liste des clés du dictionnaire
    keys = list(d.keys())
    if not keys:
        return d  # dictionnaire vide
    
    # Clé de référence : la première
    base_key = keys[0]
    
    # Pour chaque valeur unique de la première liste
    for n in set(d[base_key]):
        # Vérifier que n est présent dans toutes les autres listes
        if all(n in d[k] for k in keys[1:]):
            # Calculer le nombre minimal d'occurrences de n dans toutes les listes
            min_occurrences = min(lst.count(n) for lst in d.values())
            # Supprimer min_occurrences de n dans chaque liste
            for key in keys:
                for _ in range(min_occurrences):
                    d[key].remove(n)
    return d

def produit_listes(dictionnaire: dict[str, list[int]]) -> dict[str, int]:
    return {cle: math.prod(valeurs) for cle, valeurs in dictionnaire.items()}

def somme_valeurs(dictionnaire: dict[str, int]) -> int:
    return sum(dictionnaire.values())

@pearl_bp.route('/add_image', methods=['GET', 'POST'])
def add_image():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM Colors')
        colors = cursor.fetchall()
        conn.close()

        if request.method == 'POST':
            if 'image' not in request.files:
                flash('No file part')
                return redirect(request.url)
            file = request.files['image']
            if file.filename == '':
                flash('No selected file')
                return redirect(request.url)
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)

                description = request.form.get('description')

                # Ajouter l'image à la base de données
                conn = sqlite3.connect('database/database.db')
                cursor = conn.cursor()
                cursor.execute('INSERT INTO Images (user_id, image_path, description) VALUES (?, ?, ?)', 
                               (user_id, file_path, description))
                image_id = cursor.lastrowid

                # Détecter les couleurs dans l'image
                detected_colors = detect_colors(file_path)
                dict_decomposition = {
                    couleur: decomposition_facteurs_premiers(valeur)
                    for couleur, valeur in detected_colors.items()
                }
                dict_sans_communs = remove_common_elements(dict_decomposition.copy())
                dict_produit = produit_listes(dict_sans_communs)
                detected_colors = dict_produit

                for color in colors:
                    color_id = color[0]
                    color_hex = color[3]
                    quantity = detected_colors.get(color_hex, 0)
                    print(f"Color ID: {color_id}, Color Hex: {color_hex}, Quantity: {quantity}")  # Debugging output
                    if quantity > 0:
                        cursor.execute('INSERT INTO ImageColors (image_id, color_id, quantity) VALUES (?, ?, ?)', 
                                       (image_id, color_id, quantity))

                conn.commit()
                conn.close()

                return redirect(url_for('ModelList'))

        return render_template('add_model.html', colors=colors)
    else:
        return redirect('/')


@pearl_bp.route('/user_beads', methods=['GET', 'POST'])
def user_beads():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()

        # Récupérer toutes les couleurs disponibles
        cursor.execute('SELECT * FROM Colors')
        colors = cursor.fetchall()

        if request.method == 'POST':
            color_id = request.form.get('color_id')
            quantity_str = request.form.get('quantity')
            if color_id and quantity_str is not None:
                try:
                    quantity = int(quantity_str)
                except ValueError:
                    flash("Veuillez entrer une valeur numérique valide.")
                    return redirect(url_for('user_beads'))
                cursor.execute('''
                    INSERT INTO UserBeads (user_id, color_id, quantity)
                    VALUES (?, ?, ?)
                    ON CONFLICT(user_id, color_id)
                    DO UPDATE SET quantity=excluded.quantity
                ''', (user_id, color_id, quantity))
                conn.commit()

        # Récupérer les quantités actuelles de l'utilisateur
        cursor.execute('''
            SELECT c.id, c.hex, c.name, c.code, ub.quantity
            FROM Colors c
            LEFT JOIN UserBeads ub ON c.id = ub.color_id AND ub.user_id = ?
        ''', (user_id,))
        user_beads = cursor.fetchall()
        conn.close()
        return render_template('user_beads.html', colors=user_beads)
    else:
        return redirect('/')


@pearl_bp.route('/image_availability', methods=['GET'])
def image_availability():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()

        # Récupérer les images de l'utilisateur
        cursor.execute('''
            SELECT i.id, i.image_path, i.description
            FROM Images i
            WHERE i.user_id = ?
        ''', (user_id,))
        images = cursor.fetchall()

        image_data = []

        for image in images:
            image_id = image[0]
            image_path = image[1]
            description = image[2]
            
            # Récupérer les couleurs et quantités nécessaires pour l'image
            cursor.execute('''
                SELECT c.id, c.hex, c.name, ic.quantity
                FROM ImageColors ic
                JOIN Colors c ON ic.color_id = c.id
                WHERE ic.image_id = ?
            ''', (image_id,))
            image_colors = cursor.fetchall()

            # Récupérer les quantités actuelles de l'utilisateur pour ces couleurs
            user_colors = {}
            cursor.execute('''
                SELECT color_id, quantity
                FROM UserBeads
                WHERE user_id = ?
            ''', (user_id,))
            for row in cursor.fetchall():
                user_colors[row[0]] = row[1]

            # Vérifier si l'utilisateur a assez de perles pour chaque couleur
            sufficient = True
            colors_status = []
            total_required = 0
            total_available = 0
        
            for color in image_colors:
                color_id = color[0]
                hex_code = color[1]
                color_name = color[2]
                required_quantity = color[3]
                user_quantity = user_colors.get(color_id, 0)
                total_required += required_quantity
                total_available += min(user_quantity, required_quantity)  # Ne pas dépasser le requis
                if user_quantity < required_quantity:
                    sufficient = False
                colors_status.append((hex_code, color_name, required_quantity, user_quantity))

            # Calcul du pourcentage de perles possédées
            completion_rate = round((total_available / total_required * 100), 1) if total_required > 0 else 0
            image_data.append((image_path, description, colors_status, sufficient, completion_rate))

        conn.close()

        return render_template('image_availability.html', image_data=image_data)
    else:
        return redirect('/')

