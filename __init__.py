from flask import Flask, render_template_string, render_template, jsonify, request, redirect, url_for, session
from flask import json
from werkzeug.utils import secure_filename
#from flask_uploads import UploadSet, configure_uploads, IMAGES
from urllib.request import urlopen
import sqlite3
import os
from PIL import Image


app = Flask(__name__)                                                                                                                  
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'  # Clé secrète pour les sessions

# Fonction pour créer une clé "authentifie" dans la session utilisateur
def est_authentifie():
    return session.get('authentifie')

################################### Code de Boris

# Répertoire où les images téléchargées seront sauvegardées
UPLOAD_FOLDER = './static/images'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Extensions d'images autorisées
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS



@app.route('/', methods=['GET'])
def return_home():
    if 'authentifie' in session and session['authentifie']:
        return render_template('home.html')
    else:
        return redirect(url_for('authentification'))



@app.route('/sign_up', methods=['GET'])
def formulaire_client():
    return render_template('signup.html')

@app.route('/sign_up', methods=['POST'])
def enregistrer_client():
    login = request.form['login']
    password = request.form['password']

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO user (login, password) VALUES (?, ?)', (login, password))
    conn.commit()
    conn.close()
    user = verify_credentials(login, password)
    if user:
        session['authentifie'] = True
        session['user_id'] = user[0]  # Assuming user ID is the first column in your user table
        return redirect(url_for('ReadBDD'))
    
    return redirect('/')  # Rediriger vers la page d'accueil après l'enregistrement

@app.route('/sign_in', methods=['GET', 'POST'])
def authentification():
    if request.method == 'POST':
        login = request.form['login']
        password = request.form['password']
        user = verify_credentials(login, password)
        if user:
            session['authentifie'] = True
            session['user_id'] = user[0]  # Assuming user ID is the first column in your user table
            return redirect('/')
        else:
            return render_template('signin.html', error=True)
    return render_template('signin.html', error=False)

@app.route('/sign_out', methods=['GET'])
def deconnexion_utilisateur():
    session['authentifie'] = False
    session['user_id'] = ""  # Assuming user ID is the first column in your user table
    return redirect('/')


@app.route('/poster_list')
def ReadBDD():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT nom, ratio, largeur, hauteur, image_link, id FROM image WHERE user_id = ?', (user_id,))
        data = cursor.fetchall()
        conn.close()

        return render_template('read_data.html', data=data)
    else:
        return redirect('/')






@app.route('/upload_poster', methods=['GET'])
def formulaire_perso():
    return render_template('new_poster_form.html')

@app.route('/upload_poster', methods=['POST'])
def upload_poster():
    nom = request.form['nom']
    file = request.files['file']

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM image ORDER BY id DESC LIMIT 1;')
    data = cursor.fetchone()
    max_id = data[0] if data else 0

    if file and allowed_file(file.filename):
        extension = file.filename[-4:]
        filename = secure_filename(f"{max_id + 1}{extension}")
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        with Image.open(os.path.join(app.config['UPLOAD_FOLDER'], filename)) as img:
            largeur, hauteur = img.size
        ratio = largeur/hauteur

        cursor.execute('''
                INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (nom, ratio, largeur, hauteur, filename, session.get('user_id')))
        conn.commit()
    conn.close()
    return redirect('/poster_list')


@app.route('/delete_poster/<int:image_id>', methods=['POST'])
def delete_poster(image_id):
    if request.form.get('_method') == 'DELETE':
        if 'authentifie' in session and session['authentifie']:
            user_id = session.get('user_id')

            conn = sqlite3.connect('database.db')
            cursor = conn.cursor()
            cursor.execute('SELECT image_link FROM image WHERE id = ? AND user_id = ?', (image_id, user_id))
            data = cursor.fetchone()

            if data:
                image_path = os.path.join(app.config['UPLOAD_FOLDER'], data[0])
                if os.path.exists(image_path):
                    os.remove(image_path)

                cursor.execute('DELETE FROM image WHERE id = ? AND user_id = ?', (image_id, user_id))
                conn.commit()

            conn.close()
            return redirect('/poster_list')
        else:
            return redirect('/')
    return 'Method Not Allowed', 405





@app.route('/poster_creator')
def list_and_create():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT nom, largeur, hauteur, id FROM liste WHERE user_id = ?', (user_id,))
        data = cursor.fetchall()
        conn.close()

        return render_template('home_create_poster.html', data=data)
    else:
        return redirect('/')







@app.route('/poster_creator/<int:liste_id>', methods=['GET'])
def see_list(liste_id):
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT image_link, id FROM little_image WHERE liste_id = ?', (liste_id,))
        data = cursor.fetchall()
        conn.close()
        return render_template('list_page.html', data=data, liste_id=liste_id)
    else:
        return redirect('/')






@app.route('/delete_image/<int:image_id>', methods=['POST'])
def delete_image(image_id):
    if 'authentifie' in session and session['authentifie']:
        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute('DELETE FROM little_image WHERE id = ?', (image_id,))
        conn.commit()
        conn.close()
        return redirect(request.referrer)
    else:
        return redirect('/')





@app.route('/upload_images/<int:liste_id>', methods=['POST'])
def upload_images(liste_id):
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT largeur, hauteur FROM liste WHERE id = ?', (liste_id,))
        dimensions = cursor.fetchone()
        list_width, list_height = dimensions if dimensions else (None, None)

        if not list_width or not list_height:
            return "Dimensions de la liste introuvables.", 400

        # Obtenir l'ID maximum actuel de la table little_image
        cursor.execute('SELECT id FROM little_image ORDER BY id DESC LIMIT 1;')
        max_id_data = cursor.fetchone()
        max_id = max_id_data[0] if max_id_data else 0

        files = request.files.getlist('files')
        for file in files:
            if file and allowed_file(file.filename):
                # Incrémenter l'ID pour chaque nouvelle image
                max_id += 1
                new_filename = f"LI{max_id}.png"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)

                # Ouvrir l'image directement depuis le fichier uploadé
                file.stream.seek(0)  # Reset the file stream position to the beginning
                img = Image.open(file.stream)
                
                if img.width != list_width or img.height != list_height:
                    #le cas où ça marche pas
                    return redirect(url_for('see_list', liste_id=liste_id))

                # Enregistrer l'image si les dimensions sont correctes
                img.save(file_path)

                cursor.execute('INSERT INTO little_image (image_link, liste_id) VALUES (?, ?)', (new_filename, liste_id))
        
        conn.commit()
        conn.close()
        
        return redirect(url_for('see_list', liste_id=liste_id))
    else:
        return redirect('/')






def verify_credentials(username, password):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM user WHERE login = ? AND password = ?', (username, password,))
    user = cursor.fetchone()
    conn.close()
    return user

# -----------------------------------------------------------------------
# -----------------------------------------------------------------------
# -----------------------------------------------------------------------
# -----------------------------------------------------------------------
# -----------------------------------------------------------------------











@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return f'Image téléchargée: <img src="{url_for("static", filename="images/" + filename)}" />'



################################################

#empecher deux users d'avoir le même username


# -------------------------------------------------------
# ----------------------- Lecture -----------------------
# -------------------------------------------------------


@app.route('/fiche_perso/<int:post_id>')
def Readfiche(post_id):
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM image WHERE id = ?', (post_id,))
    data = cursor.fetchall()
    conn.close()
    # Rendre le template HTML et transmettre les données
    return render_template('read_data.html', data=data)



@app.route('/max_id')
def recherche_id_max():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM image ORDER BY id DESC LIMIT 1;')
    data = cursor.fetchall()
    conn.close()
    return data

@app.route('/max_id_little')
def recherche_id_max_little():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM little_image ORDER BY id DESC LIMIT 1;')
    data = cursor.fetchall()
    conn.close()
    return data

@app.route('/private')
def hello_world():
    return render_template('hello.html')

                                                                                                                                       
if __name__ == "__main__":
  app.run(debug=True)
