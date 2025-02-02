from flask import Blueprint, render_template, request, session, redirect, current_app
import sqlite3, os
from werkzeug.utils import secure_filename
from PIL import Image




poster_bp = Blueprint('poster_bp', __name__)


@poster_bp.route('/poster_list')
def poster_list():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT nom, ratio, largeur, hauteur, image_link, id FROM image WHERE user_id = ?', (user_id,))
        data = cursor.fetchall()
        conn.close()

        return render_template('poster/poster_list.html', data=data)
    else:
        return redirect('/')

@poster_bp.route('/upload_poster', methods=['GET'])
def formulaire_perso():
    return render_template('poster/upload_poster.html')

@poster_bp.route('/upload_poster', methods=['POST'])
def upload_poster():
    nom = request.form['nom']
    file = request.files['file']

    conn = sqlite3.connect('database/database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM image ORDER BY id DESC LIMIT 1;')
    data = cursor.fetchone()
    max_id = data[0] if data else 0

    if file:
        upload_folder = current_app.config['UPLOAD_FOLDER']
        extension = os.path.splitext(file.filename)[1]
        filename = secure_filename(f"{max_id + 1}{extension}")
        file.save(os.path.join(upload_folder, filename))

        with Image.open(os.path.join(upload_folder, filename)) as img:
            largeur, hauteur = img.size
        ratio = largeur / hauteur

        cursor.execute('''
            INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (nom, ratio, largeur, hauteur, filename, session.get('user_id')))
        conn.commit()
    conn.close()
    return redirect('/poster_list')

@poster_bp.route('/delete_poster/<int:image_id>', methods=['POST'])
def delete_poster(image_id):
    if request.form.get('_method') == 'DELETE':
        if 'authentifie' in session and session['authentifie']:
            user_id = session.get('user_id')

            conn = sqlite3.connect('database/database.db')
            cursor = conn.cursor()
            cursor.execute('SELECT image_link FROM image WHERE id = ? AND user_id = ?', (image_id, user_id))
            data = cursor.fetchone()

            if data:
                upload_folder = current_app.config['UPLOAD_FOLDER']
                image_path = os.path.join(upload_folder, data[0])
                if os.path.exists(image_path):
                    os.remove(image_path)

                cursor.execute('DELETE FROM image WHERE id = ? AND user_id = ?', (image_id, user_id))
                conn.commit()

            conn.close()
            return redirect('/poster_list')
        else:
            return redirect('/')
    return 'Method Not Allowed', 405