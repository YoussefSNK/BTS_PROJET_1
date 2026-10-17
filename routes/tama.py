"""Tama : application monopage de gestion de perles + son API JSON.

La page (/) charge toutes les donnees de l'utilisateur via /api/bootstrap, puis
chaque modification passe par un endpoint dedie qui renvoie l'etat a jour.
Une quantite inconnue est stockee a -1 en base et exposee comme `null` en JSON.
"""
from functools import wraps
from math import gcd
import os
import re
import sqlite3
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify, redirect, render_template, request, session, url_for
from PIL import Image
from werkzeug.utils import secure_filename

from routes.color_metrics import DEFAULT_METRIC, METRICS, nearest_finder


tama_bp = Blueprint('tama_bp', __name__)

DB_PATH = 'database/database.db'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
DITHERING_TYPES = ('none', 'floyd_steinberg', 'atkinson', 'ordered')
UNKNOWN_QUANTITY = -1
HISTORY_LIMIT = 500
# Deux modifications successives de la meme couleur, sans note, a moins de
# MERGE_WINDOW secondes d'intervalle, ne forment qu'une ligne d'historique.
MERGE_WINDOW = 30


# ---------- utilitaires ----------

def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def api_login_required(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        if not session.get('authentifie'):
            return jsonify(error='Non connecté'), 401
        return view(*args, **kwargs)
    return wrapper


def error(message, status=400):
    return jsonify(error=message), status


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def upload_path(filename):
    return os.path.join(current_app.config['UPLOAD_FOLDER'], filename)


def image_url(filename):
    """URL de l'image avec sa date de modification, pour contourner le cache apres un remplacement."""
    try:
        version = int(os.path.getmtime(upload_path(filename)))
    except OSError:
        version = 0
    return url_for('static', filename=f'images/{filename}') + f'?v={version}'


def save_upload(file, prefix):
    extension = os.path.splitext(file.filename)[1].lower()
    filename = secure_filename(f'{prefix}{extension}')
    file.save(upload_path(filename))
    return filename


def remove_upload(filename):
    """Supprime un fichier televerse par l'app (model_* / recipe_*), jamais autre chose."""
    if filename and re.match(r'^(model|recipe)_[\w.-]+$', filename):
        try:
            os.remove(upload_path(filename))
        except OSError:
            pass


def image_size(filename):
    try:
        with Image.open(upload_path(filename)) as img:
            return img.size
    except OSError:
        return 1, 1


def quantity_out(value):
    return None if value == UNKNOWN_QUANTITY else value


def timestamp_ms(created_at):
    # SQLite CURRENT_TIMESTAMP est en UTC, au format "YYYY-MM-DD HH:MM:SS".
    dt = datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S').replace(tzinfo=timezone.utc)
    return int(dt.timestamp() * 1000)


def get_file():
    file = request.files.get('image')
    if not file or file.filename == '':
        return None, error('Aucune image sélectionnée')
    if not allowed_file(file.filename):
        return None, error('Format de fichier non autorisé')
    return file, None


# ---------- analyse d'une recette ----------

def block_size(lines):
    """Taille commune des blocs de lignes identiques consecutives (1 si l'image n'est pas agrandie)."""
    size = len(lines)
    for i in range(1, len(lines)):
        if lines[i] != lines[i - 1]:
            size = gcd(size, i)
            if size == 1:
                break
    return max(size, 1)


def analyse_recipe(path, palette, detect_scale=True, metric=DEFAULT_METRIC):
    """Retourne (largeur, hauteur, {code: quantite}) en perles.

    Une recette est souvent exportee agrandie (chaque perle = un carre de N x N pixels) :
    on detecte ce facteur, on ramene l'image a une perle par pixel, puis chaque couleur
    est associee a la couleur la plus proche de la palette. Les pixels transparents sont ignores.
    `detect_scale=False` pour une image deja a une perle par pixel (recette generee par l'app).
    `metric` : distance utilisee (voir routes/color_metrics.py).
    """
    with Image.open(path) as source:
        img = source.convert('RGBA')
    width, height = img.size
    row_bytes = img.tobytes()
    rows = [row_bytes[y * width * 4:(y + 1) * width * 4] for y in range(height)]
    col_bytes = img.transpose(Image.Transpose.TRANSPOSE).tobytes()
    cols = [col_bytes[x * height * 4:(x + 1) * height * 4] for x in range(width)]
    bx, by = (block_size(cols), block_size(rows)) if detect_scale else (1, 1)
    if bx > 1 or by > 1:
        img = img.resize((width // bx, height // by), Image.Resampling.NEAREST)
        width, height = img.size

    nearest = nearest_finder(
        [(code, tuple(int(hex_code[i:i + 2], 16) for i in (1, 3, 5))) for code, hex_code in palette], metric)
    counts = {}
    for count, (r, g, b, a) in img.getcolors(maxcolors=width * height) or []:
        if a < 128:
            continue
        code = nearest((r, g, b))
        counts[code] = counts.get(code, 0) + count
    return width, height, counts


# ---------- serialisation ----------

def short_list_name(name):
    match = re.search(r'\(([^)]+)\)', name)
    label = match.group(1) if match else name
    return label[:1].upper() + label[1:]


def palettes_json(cursor):
    pals = []
    for lst in cursor.execute('SELECT id, nom FROM ColorList ORDER BY id').fetchall():
        colors = [
            {'code': c['code'], 'name': c['name_fr'] or c['name'], 'en': c['name'], 'hex': c['hex'].upper()}
            for c in cursor.execute('SELECT code, name, name_fr, hex FROM Colors WHERE list_id = ?', (lst['id'],))
        ]
        pals.append({'id': lst['id'], 'name': lst['nom'], 'short': short_list_name(lst['nom']), 'colors': colors})
    return pals


def stock_json(cursor, user_id, codes=None):
    query = 'SELECT code, quantity FROM UserBeads WHERE user_id = ?'
    params = [user_id]
    if codes is not None:
        query += f' AND code IN ({",".join("?" * len(codes))})'
        params += list(codes)
    return {row['code']: quantity_out(row['quantity']) for row in cursor.execute(query, params)}


def history_json(cursor, user_id):
    rows = cursor.execute('''
        SELECT id, code, old_quantity, new_quantity, note, undone, created_at
        FROM PearlHistory WHERE user_id = ?
        ORDER BY created_at DESC, id DESC LIMIT ?
    ''', (user_id, HISTORY_LIMIT)).fetchall()
    return [{
        'id': row['id'], 'code': row['code'], 'from': quantity_out(row['old_quantity']),
        'to': quantity_out(row['new_quantity']), 'note': row['note'], 'undone': bool(row['undone']),
        'date': timestamp_ms(row['created_at']),
    } for row in rows]


def model_json(cursor, row):
    width, height = image_size(row['image_path'])
    tags = [t['tag'] for t in cursor.execute('SELECT tag FROM ModelTag WHERE model_id = ? ORDER BY tag', (row['id'],))]
    return {'id': row['id'], 'name': row['nom'], 'tags': tags, 'src': image_url(row['image_path']),
            'ow': width, 'oh': height, 'created': row['id']}


def recipe_json(cursor, row):
    width, height = row['width'], row['height']
    if not width or not height:
        # Recette creee avant la refonte : on se rabat sur la taille de l'image.
        width, height = image_size(row['image_path'])
    counts = {c['code']: c['quantity'] for c in cursor.execute(
        'SELECT code, quantity FROM RecipeColors WHERE recipe_id = ?', (row['id'],))}
    stock_only = row['stock_only']
    return {'id': row['id'], 'modelId': row['model_id'], 'pal': row['list_id'], 'dith': row['dithering_type'],
            'src': image_url(row['image_path']), 'w': width, 'h': height, 'counts': counts,
            # Origine : None pour les recettes creees avant que l'app ne l'enregistre.
            'source': row['source'], 'metric': row['metric'],
            'stockOnly': None if stock_only is None else bool(stock_only)}


def owned_model(cursor, model_id, user_id):
    return cursor.execute('SELECT * FROM Model WHERE id = ? AND user_id = ?', (model_id, user_id)).fetchone()


def delete_recipe_rows(cursor, recipe):
    cursor.execute('DELETE FROM RecipeColors WHERE recipe_id = ?', (recipe['id'],))
    cursor.execute('DELETE FROM Recipe WHERE id = ?', (recipe['id'],))
    remove_upload(recipe['image_path'])


def delete_model_rows(cursor, model):
    for recipe in cursor.execute('SELECT * FROM Recipe WHERE model_id = ?', (model['id'],)).fetchall():
        delete_recipe_rows(cursor, recipe)
    cursor.execute('DELETE FROM ModelTag WHERE model_id = ?', (model['id'],))
    cursor.execute('DELETE FROM Model WHERE id = ?', (model['id'],))
    remove_upload(model['image_path'])


# ---------- page ----------

@tama_bp.route('/app')
def app_page():
    """Point d'entree de l'application (aussi servi sur / par __init__.py)."""
    if not session.get('authentifie'):
        return redirect(url_for('login_form'))
    return render_template('tama.html')


# ---------- API ----------

@tama_bp.route('/api/bootstrap')
@api_login_required
def bootstrap():
    user_id = session['user_id']
    conn = connect()
    cursor = conn.cursor()
    user = cursor.execute('SELECT login FROM user WHERE id = ?', (user_id,)).fetchone()
    models = [model_json(cursor, row) for row in
              cursor.execute('SELECT * FROM Model WHERE user_id = ? ORDER BY id', (user_id,)).fetchall()]
    recipes = [recipe_json(cursor, row) for row in cursor.execute('''
        SELECT r.* FROM Recipe r JOIN Model m ON r.model_id = m.id WHERE m.user_id = ? ORDER BY r.id
    ''', (user_id,)).fetchall()]
    data = {
        'user': {'login': user['login'] if user else ''},
        'pals': palettes_json(cursor),
        'stock': stock_json(cursor, user_id),
        'hist': history_json(cursor, user_id),
        'models': models,
        'recipes': recipes,
    }
    conn.close()
    return jsonify(data)


@tama_bp.route('/api/stock', methods=['POST'])
@api_login_required
def update_stock():
    """Body : {"changes": [{"code": "H18", "to": 1200 | null}], "note": "..."}"""
    user_id = session['user_id']
    payload = request.get_json(silent=True) or {}
    changes = payload.get('changes') or []
    note = str(payload.get('note') or '')[:120]

    conn = connect()
    cursor = conn.cursor()
    known_codes = {row['code'] for row in cursor.execute('SELECT DISTINCT code FROM Colors')}
    touched = []
    for change in changes:
        code, to = change.get('code'), change.get('to')
        if code not in known_codes:
            conn.close()
            return error(f'Code inconnu : {code}')
        if to is None:
            new_quantity = UNKNOWN_QUANTITY
        elif isinstance(to, int) and not isinstance(to, bool) and to >= 0:
            new_quantity = to
        else:
            conn.close()
            return error(f'Quantité invalide pour {code}')

        row = cursor.execute('SELECT quantity FROM UserBeads WHERE user_id = ? AND code = ?', (user_id, code)).fetchone()
        old_quantity = row['quantity'] if row else 0
        if new_quantity == old_quantity:
            continue
        cursor.execute('''
            INSERT INTO UserBeads (user_id, code, quantity) VALUES (?, ?, ?)
            ON CONFLICT(user_id, code) DO UPDATE SET quantity = excluded.quantity
        ''', (user_id, code, new_quantity))
        touched.append(code)

        last = cursor.execute('''
            SELECT id, code, note, undone, created_at >= datetime('now', ?) AS recent
            FROM PearlHistory WHERE user_id = ? ORDER BY id DESC LIMIT 1
        ''', (f'-{MERGE_WINDOW} seconds', user_id)).fetchone()
        if (not note and len(changes) == 1 and last and last['code'] == code
                and not last['note'] and not last['undone'] and last['recent']):
            cursor.execute('UPDATE PearlHistory SET new_quantity = ?, created_at = CURRENT_TIMESTAMP WHERE id = ?',
                           (new_quantity, last['id']))
        else:
            cursor.execute('''
                INSERT INTO PearlHistory (user_id, code, old_quantity, new_quantity, note)
                VALUES (?, ?, ?, ?, ?)
            ''', (user_id, code, old_quantity, new_quantity, note))

    conn.commit()
    result = {'stock': stock_json(cursor, user_id, touched) if touched else {}, 'hist': history_json(cursor, user_id)}
    conn.close()
    return jsonify(result)


@tama_bp.route('/api/history/<int:hist_id>/undo', methods=['POST'])
@api_login_required
def undo_history(hist_id):
    user_id = session['user_id']
    conn = connect()
    cursor = conn.cursor()
    entry = cursor.execute('SELECT * FROM PearlHistory WHERE id = ? AND user_id = ?', (hist_id, user_id)).fetchone()
    if entry is None:
        conn.close()
        return error('Mouvement introuvable', 404)
    if entry['undone']:
        conn.close()
        return error('Mouvement déjà annulé')

    row = cursor.execute('SELECT quantity FROM UserBeads WHERE user_id = ? AND code = ?',
                         (user_id, entry['code'])).fetchone()
    current = row['quantity'] if row else 0
    cursor.execute('''
        INSERT INTO UserBeads (user_id, code, quantity) VALUES (?, ?, ?)
        ON CONFLICT(user_id, code) DO UPDATE SET quantity = excluded.quantity
    ''', (user_id, entry['code'], entry['old_quantity']))
    cursor.execute('UPDATE PearlHistory SET undone = 1 WHERE id = ?', (hist_id,))
    cursor.execute('''
        INSERT INTO PearlHistory (user_id, code, old_quantity, new_quantity, note)
        VALUES (?, ?, ?, ?, 'Annulation')
    ''', (user_id, entry['code'], current, entry['old_quantity']))
    conn.commit()
    result = {'stock': stock_json(cursor, user_id, [entry['code']]), 'hist': history_json(cursor, user_id)}
    conn.close()
    return jsonify(result)


@tama_bp.route('/api/models', methods=['POST'])
@api_login_required
def create_model():
    user_id = session['user_id']
    name = request.form.get('name', '').strip()
    if not name:
        return error("Merci d'indiquer un nom de modèle.")
    file, err = get_file()
    if err:
        return err

    conn = connect()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO Model (user_id, nom, image_path) VALUES (?, ?, '')", (user_id, name))
    model_id = cursor.lastrowid
    filename = save_upload(file, f'model_{model_id}')
    cursor.execute('UPDATE Model SET image_path = ? WHERE id = ?', (filename, model_id))
    conn.commit()
    model = model_json(cursor, owned_model(cursor, model_id, user_id))
    conn.close()
    return jsonify(model)


@tama_bp.route('/api/models/<int:model_id>', methods=['PATCH'])
@api_login_required
def update_model(model_id):
    user_id = session['user_id']
    payload = request.get_json(silent=True) or {}
    conn = connect()
    cursor = conn.cursor()
    if owned_model(cursor, model_id, user_id) is None:
        conn.close()
        return error('Modèle introuvable', 404)

    if 'name' in payload:
        name = str(payload['name']).strip()
        if name:
            cursor.execute('UPDATE Model SET nom = ? WHERE id = ?', (name[:120], model_id))
    if 'tags' in payload:
        tags = {str(t).strip().lower()[:40] for t in payload['tags'] or [] if str(t).strip()}
        cursor.execute('DELETE FROM ModelTag WHERE model_id = ?', (model_id,))
        cursor.executemany('INSERT INTO ModelTag (model_id, tag) VALUES (?, ?)', [(model_id, t) for t in tags])
    conn.commit()
    model = model_json(cursor, owned_model(cursor, model_id, user_id))
    conn.close()
    return jsonify(model)


@tama_bp.route('/api/models/<int:model_id>/image', methods=['POST'])
@api_login_required
def replace_model_image(model_id):
    user_id = session['user_id']
    file, err = get_file()
    if err:
        return err
    conn = connect()
    cursor = conn.cursor()
    model = owned_model(cursor, model_id, user_id)
    if model is None:
        conn.close()
        return error('Modèle introuvable', 404)

    filename = save_upload(file, f'model_{model_id}')
    if filename != model['image_path']:
        remove_upload(model['image_path'])
    cursor.execute('UPDATE Model SET image_path = ? WHERE id = ?', (filename, model_id))
    conn.commit()
    result = model_json(cursor, owned_model(cursor, model_id, user_id))
    conn.close()
    return jsonify(result)


@tama_bp.route('/api/models/<int:model_id>', methods=['DELETE'])
@api_login_required
def delete_model(model_id):
    user_id = session['user_id']
    conn = connect()
    cursor = conn.cursor()
    model = owned_model(cursor, model_id, user_id)
    if model is None:
        conn.close()
        return error('Modèle introuvable', 404)
    delete_model_rows(cursor, model)
    conn.commit()
    conn.close()
    return jsonify(ok=True)


@tama_bp.route('/api/recipes', methods=['POST'])
@api_login_required
def create_recipe():
    """Ajoute une recette a un modele.

    Formulaire : model_id, list_id, dith, metric, image, et
    - source=generated + stock_only=1|0 : recette produite par le generateur (une perle par pixel).
      Elle remplace la recette generee ayant exactement les memes reglages (palette, dithering,
      distance, couleurs possedees ou toutes) ; d'autres reglages s'ajoutent a cote.
    - source=imported (defaut) : image deposee, analysee avec la distance `metric`. Elle s'ajoute.
    - replace_id (optionnel) : recette du meme modele a remplacer explicitement.
    - keep_existing=1 (optionnel) : ajoute sans remplacer, meme si une recette a les memes reglages
      (le stock a pu changer depuis : memes reglages, couleurs differentes).
    """
    user_id = session['user_id']
    model_id = request.form.get('model_id', type=int)
    list_id = request.form.get('list_id', type=int)
    dithering = request.form.get('dith')
    source = request.form.get('source') or 'imported'
    metric = request.form.get('metric') or DEFAULT_METRIC
    replace_id = request.form.get('replace_id', type=int)
    keep_existing = request.form.get('keep_existing') == '1'
    if source not in ('generated', 'imported'):
        return error('Origine de recette invalide.')
    stock_only = None
    if source == 'generated':
        if request.form.get('stock_only') not in ('0', '1'):
            return error('Préciser stock_only pour une recette générée.')
        stock_only = int(request.form['stock_only'])
    if metric not in METRICS:
        return error('Méthode de distance invalide.')
    if dithering not in DITHERING_TYPES:
        return error('Type de dithering invalide.')
    file, err = get_file()
    if err:
        return err

    conn = connect()
    cursor = conn.cursor()
    if owned_model(cursor, model_id, user_id) is None:
        conn.close()
        return error('Modèle introuvable', 404)
    palette = [(row['code'], row['hex']) for row in
               cursor.execute('SELECT code, hex FROM Colors WHERE list_id = ?', (list_id,))]
    if not palette:
        conn.close()
        return error('Liste de couleurs invalide.')

    replaced = []
    if replace_id:
        replaced = cursor.execute('SELECT * FROM Recipe WHERE id = ? AND model_id = ?', (replace_id, model_id)).fetchall()
        if not replaced:
            conn.close()
            return error('Recette à remplacer introuvable', 404)
    elif source == 'generated' and not keep_existing:
        replaced = cursor.execute('''
            SELECT * FROM Recipe WHERE model_id = ? AND list_id = ? AND dithering_type = ?
              AND source = 'generated' AND metric = ? AND stock_only = ?
        ''', (model_id, list_id, dithering, metric, stock_only)).fetchall()
    for old in replaced:
        delete_recipe_rows(cursor, old)

    cursor.execute('''
        INSERT INTO Recipe (model_id, list_id, dithering_type, image_path, source, metric, stock_only)
        VALUES (?, ?, ?, '', ?, ?, ?)
    ''', (model_id, list_id, dithering, source, metric, stock_only))
    recipe_id = cursor.lastrowid
    filename = save_upload(file, f'recipe_{recipe_id}')
    try:
        width, height, counts = analyse_recipe(upload_path(filename), palette, detect_scale=source != 'generated', metric=metric)
    except OSError:
        conn.rollback()
        conn.close()
        remove_upload(filename)
        return error("Impossible de lire l'image.")

    cursor.execute('UPDATE Recipe SET image_path = ?, width = ?, height = ? WHERE id = ?',
                   (filename, width, height, recipe_id))
    cursor.executemany('INSERT INTO RecipeColors (recipe_id, code, quantity) VALUES (?, ?, ?)',
                       [(recipe_id, code, qty) for code, qty in counts.items()])
    conn.commit()
    recipe = recipe_json(cursor, cursor.execute('SELECT * FROM Recipe WHERE id = ?', (recipe_id,)).fetchone())
    conn.close()
    return jsonify(recipe)


@tama_bp.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
@api_login_required
def delete_recipe(recipe_id):
    """Supprime une recette. Le modele est conserve, meme sans recette (on peut en regenerer)."""
    user_id = session['user_id']
    conn = connect()
    cursor = conn.cursor()
    recipe = cursor.execute('''
        SELECT r.* FROM Recipe r JOIN Model m ON r.model_id = m.id WHERE r.id = ? AND m.user_id = ?
    ''', (recipe_id, user_id)).fetchone()
    if recipe is None:
        conn.close()
        return error('Recette introuvable', 404)

    delete_recipe_rows(cursor, recipe)
    conn.commit()
    conn.close()
    return jsonify(ok=True)
