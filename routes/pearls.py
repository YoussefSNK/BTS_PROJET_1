from flask import Blueprint, render_template, request, redirect, url_for, session, flash, current_app
import sqlite3, os, math

from werkzeug.utils import secure_filename
from collections import Counter
from PIL import Image


pearl_bp = Blueprint('pearl_bp', __name__)


ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

DITHERING_TYPES = [
    ('none', 'Aucun'),
    ('floyd_steinberg', 'Floyd-Steinberg'),
    ('atkinson', 'Atkinson'),
    ('ordered', 'Ordonné (Bayer)'),
]
DITHERING_LABELS = dict(DITHERING_TYPES)
VALID_DITHERING_TYPES = {code for code, _ in DITHERING_TYPES}


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


def compute_recipe_colors(cursor, recipe_id, list_id, image_path):
    """Calcule et enregistre la répartition de couleurs d'une recette,
    par correspondance exacte entre les pixels de l'image et les hex de la liste choisie."""
    detected_colors = detect_colors(image_path)
    dict_decomposition = {
        couleur: decomposition_facteurs_premiers(valeur)
        for couleur, valeur in detected_colors.items()
    }
    dict_sans_communs = remove_common_elements(dict_decomposition.copy())
    detected_colors = produit_listes(dict_sans_communs)

    cursor.execute('SELECT code, hex FROM Colors WHERE list_id = ?', (list_id,))
    for code, hex_code in cursor.fetchall():
        quantity = detected_colors.get(hex_code, 0)
        if quantity > 0:
            cursor.execute('INSERT INTO RecipeColors (recipe_id, code, quantity) VALUES (?, ?, ?)',
                            (recipe_id, code, quantity))


def save_uploaded_file(file, prefix):
    """Enregistre le fichier dans UPLOAD_FOLDER et retourne juste son nom de fichier
    (pas le chemin complet), pour rester independant de l'OS et du contexte de rendu."""
    extension = os.path.splitext(file.filename)[1]
    filename = secure_filename(f"{prefix}{extension}")
    upload_folder = current_app.config['UPLOAD_FOLDER']
    file.save(os.path.join(upload_folder, filename))
    return filename


@pearl_bp.route('/add_image', methods=['GET', 'POST'])
def add_image():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()

        if request.method == 'POST':
            color_lists = {row[0] for row in cursor.execute('SELECT id FROM ColorList').fetchall()}
            list_id = request.form.get('list_id', type=int)
            dithering_type = request.form.get('dithering_type')
            model_id = request.form.get('model_id', type=int)

            if list_id not in color_lists:
                flash("Liste de couleurs invalide.")
                return redirect(request.url)
            if dithering_type not in VALID_DITHERING_TYPES:
                flash("Type de dithering invalide.")
                return redirect(request.url)

            cursor.execute('SELECT id FROM Model WHERE id = ? AND user_id = ?', (model_id, user_id))
            if cursor.fetchone() is None:
                flash("Modèle introuvable. Créez d'abord un modèle avec son image originale.")
                return redirect(request.url)

            if 'image' not in request.files or request.files['image'].filename == '':
                flash('Aucune image sélectionnée')
                return redirect(request.url)
            file = request.files['image']
            if not (file and allowed_file(file.filename)):
                flash('Format de fichier non autorisé')
                return redirect(request.url)

            cursor.execute('''
                INSERT INTO Recipe (model_id, list_id, dithering_type, image_path)
                VALUES (?, ?, ?, '')
            ''', (model_id, list_id, dithering_type))
            recipe_id = cursor.lastrowid

            filename = save_uploaded_file(file, f"recipe_{recipe_id}")

            cursor.execute('UPDATE Recipe SET image_path = ? WHERE id = ?', (filename, recipe_id))
            disk_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)
            compute_recipe_colors(cursor, recipe_id, list_id, disk_path)

            conn.commit()
            conn.close()

            return redirect(url_for('pearl_bp.model_detail', model_id=model_id))

        cursor.execute('SELECT id, nom, image_path FROM Model WHERE user_id = ? ORDER BY nom', (user_id,))
        models = cursor.fetchall()
        cursor.execute('SELECT id, nom FROM ColorList ORDER BY id')
        color_lists = cursor.fetchall()
        conn.close()

        return render_template('pearl/add_model.html', models=models, color_lists=color_lists,
                                dithering_types=DITHERING_TYPES)
    else:
        return redirect('/')


@pearl_bp.route('/add_model', methods=['POST'])
def create_model():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')
        model_nom = request.form.get('model_nom', '').strip()

        if not model_nom:
            flash("Merci d'indiquer un nom de modèle.")
            return redirect(url_for('pearl_bp.add_image'))

        if 'model_image' not in request.files or request.files['model_image'].filename == '':
            flash("Merci de fournir l'image originale du modèle.")
            return redirect(url_for('pearl_bp.add_image'))
        file = request.files['model_image']
        if not (file and allowed_file(file.filename)):
            flash('Format de fichier non autorisé')
            return redirect(url_for('pearl_bp.add_image'))

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()

        cursor.execute('INSERT INTO Model (user_id, nom, image_path) VALUES (?, ?, ?)',
                        (user_id, model_nom, ''))
        model_id = cursor.lastrowid

        filename = save_uploaded_file(file, f"model_{model_id}")
        cursor.execute('UPDATE Model SET image_path = ? WHERE id = ?', (filename, model_id))

        conn.commit()
        conn.close()

        return redirect(url_for('pearl_bp.model_detail', model_id=model_id))
    else:
        return redirect('/')


@pearl_bp.route('/model/<int:model_id>')
def model_detail(model_id):
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()

        cursor.execute('SELECT id, nom, image_path FROM Model WHERE id = ? AND user_id = ?', (model_id, user_id))
        model = cursor.fetchone()
        if model is None:
            conn.close()
            flash("Modèle introuvable.")
            return redirect(url_for('pearl_bp.add_image'))

        cursor.execute('SELECT id, nom FROM ColorList ORDER BY id')
        color_lists = cursor.fetchall()

        cursor.execute('SELECT id, list_id, dithering_type, image_path FROM Recipe WHERE model_id = ?', (model_id,))
        recipes_by_cell = {}
        for recipe_id, list_id, dithering_type, image_path in cursor.fetchall():
            recipes_by_cell.setdefault(list_id, {})[dithering_type] = (recipe_id, image_path)

        conn.close()

        return render_template('pearl/model_detail.html', model=model, color_lists=color_lists,
                                dithering_types=DITHERING_TYPES, recipes_by_cell=recipes_by_cell)
    else:
        return redirect('/')


@pearl_bp.route('/user_beads', methods=['GET', 'POST'])
def user_beads():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()

        cursor.execute('SELECT id, nom FROM ColorList ORDER BY id')
        color_lists = cursor.fetchall()
        if not color_lists:
            conn.close()
            return render_template('pearl/user_beads.html', colors=[], color_lists=[], current_list_id=None)

        if request.method == 'POST':
            code = request.form.get('code')
            list_id = request.form.get('list_id', type=int)
            quantity_str = request.form.get('quantity')
            if code and quantity_str is not None:
                try:
                    quantity = int(quantity_str)
                except ValueError:
                    flash("Veuillez entrer une valeur numérique valide.")
                    conn.close()
                    return redirect(url_for('pearl_bp.user_beads', list_id=list_id))
                cursor.execute('''
                    INSERT INTO UserBeads (user_id, code, quantity)
                    VALUES (?, ?, ?)
                    ON CONFLICT(user_id, code)
                    DO UPDATE SET quantity=excluded.quantity
                ''', (user_id, code, quantity))
                conn.commit()
            conn.close()
            return redirect(url_for('pearl_bp.user_beads', list_id=list_id))

        list_id = request.args.get('list_id', type=int)
        valid_list_ids = {row[0] for row in color_lists}
        if list_id not in valid_list_ids:
            list_id = color_lists[0][0]

        cursor.execute('''
            SELECT c.code, c.hex, c.name, ub.quantity
            FROM Colors c
            LEFT JOIN UserBeads ub ON c.code = ub.code AND ub.user_id = ?
            WHERE c.list_id = ?
            ORDER BY c.code
        ''', (user_id, list_id))
        colors = cursor.fetchall()
        conn.close()
        return render_template('pearl/user_beads.html', colors=colors, color_lists=color_lists,
                                current_list_id=list_id)
    else:
        return redirect('/')


@pearl_bp.route('/image_availability', methods=['GET'])
def image_availability():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()

        cursor.execute('SELECT id, nom FROM ColorList ORDER BY id')
        color_lists = cursor.fetchall()

        filter_list_id = request.args.get('list_id', type=int)

        query = '''
            SELECT r.id, r.image_path, m.nom, r.dithering_type, cl.nom
            FROM Recipe r
            JOIN Model m ON r.model_id = m.id
            JOIN ColorList cl ON r.list_id = cl.id
            WHERE m.user_id = ?
        '''
        params = [user_id]
        if filter_list_id:
            query += ' AND r.list_id = ?'
            params.append(filter_list_id)

        cursor.execute(query, params)
        recipes = cursor.fetchall()

        cursor.execute('SELECT code, quantity FROM UserBeads WHERE user_id = ?', (user_id,))
        user_beads_stock = dict(cursor.fetchall())

        image_data = []

        for recipe_id, image_path, model_nom, dithering_type, list_nom in recipes:
            cursor.execute('''
                SELECT c.hex, c.name, rc.quantity, rc.code
                FROM RecipeColors rc
                JOIN Colors c ON c.list_id = (SELECT list_id FROM Recipe WHERE id = ?) AND c.code = rc.code
                WHERE rc.recipe_id = ?
            ''', (recipe_id, recipe_id))
            recipe_colors = cursor.fetchall()

            sufficient = True
            colors_status = []
            total_required = 0
            total_available = 0

            for hex_code, color_name, required_quantity, code in recipe_colors:
                user_quantity = user_beads_stock.get(code, 0)
                total_required += required_quantity
                total_available += min(user_quantity, required_quantity)
                if user_quantity < required_quantity:
                    sufficient = False
                colors_status.append((hex_code, color_name, required_quantity, user_quantity))

            completion_rate = round((total_available / total_required * 100), 1) if total_required > 0 else 0
            title = f"{model_nom} — {DITHERING_LABELS.get(dithering_type, dithering_type)} ({list_nom})"
            image_url = url_for('static', filename=f'images/{image_path}')
            image_data.append((image_url, title, colors_status, sufficient, completion_rate, total_required, recipe_id))

        conn.close()

        return render_template('pearl/image_availability.html', image_data=image_data,
                                color_lists=color_lists, filter_list_id=filter_list_id)
    else:
        return redirect('/')

@pearl_bp.route('/delete_image/<int:image_id>', methods=['POST'])
def delete_image(image_id):
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()

        cursor.execute('''
            SELECT r.model_id FROM Recipe r
            JOIN Model m ON r.model_id = m.id
            WHERE r.id = ? AND m.user_id = ?
        ''', (image_id, user_id))
        row = cursor.fetchone()

        model_id = row[0] if row else None
        model_deleted = False
        if row:
            cursor.execute('DELETE FROM RecipeColors WHERE recipe_id = ?', (image_id,))
            cursor.execute('DELETE FROM Recipe WHERE id = ?', (image_id,))

            cursor.execute('SELECT COUNT(*) FROM Recipe WHERE model_id = ?', (model_id,))
            if cursor.fetchone()[0] == 0:
                cursor.execute('DELETE FROM Model WHERE id = ?', (model_id,))
                model_deleted = True

            conn.commit()

        conn.close()

        if model_id and not model_deleted:
            return redirect(url_for('pearl_bp.model_detail', model_id=model_id))
    return redirect(url_for('pearl_bp.image_availability'))
