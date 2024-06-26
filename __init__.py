from flask import Flask, render_template_string, render_template, jsonify, request, redirect, url_for, session
from flask import json
from werkzeug.utils import secure_filename
#from flask_uploads import UploadSet, configure_uploads, IMAGES
from urllib.request import urlopen
import sqlite3
import os


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
        cursor.execute('SELECT nom, ratio, largeur, hauteur, image FROM image WHERE user_id = ?', (user_id,))
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
    # Récupération des données du formulaire
    nom = request.form['nom']
    licence = request.form['licence']
    file = request.files['file']
    # Connexion à la base de données
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM perso ORDER BY id DESC LIMIT 1;')
    data = cursor.fetchone()
    max_id = data[0] if data else 0
    # Vérification de l'image et enregistrement si elle est valide
    if file and allowed_file(file.filename):
        extension = file.filename[-4:]
        filename = secure_filename(f"{max_id + 1}{extension}")
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    # Exécution de la requête SQL pour insérer un nouveau personnage
    cursor.execute('INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)', (nom, licence, filename))
    conn.commit()
    conn.close()
    return redirect('/poster_list')






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
    cursor.execute('SELECT * FROM perso WHERE id = ?', (post_id,))
    data = cursor.fetchall()
    conn.close()
    # Rendre le template HTML et transmettre les données
    return render_template('read_data.html', data=data)



@app.route('/max_id')
def recherche_id_max():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM perso ORDER BY id DESC LIMIT 1;')
    data = cursor.fetchall()
    conn.close()
    return data


@app.route('/private')
def hello_world():
    return render_template('hello.html')

                                                                                                                                       
if __name__ == "__main__":
  app.run(debug=True)
