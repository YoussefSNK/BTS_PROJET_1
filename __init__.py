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





@app.route('/')
def ReadBDD():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM perso WHERE user_id = ?', (user_id,))
        data = cursor.fetchall()
        conn.close()

        return render_template('read_data.html', data=data)
    else:
        return redirect(url_for('authentification'))



@app.route('/sign_in', methods=['GET', 'POST'])
def authentification():
    if request.method == 'POST':
        login = request.form['login']
        password = request.form['password']
        user = verify_credentials(login, password)
        if user:
            session['authentifie'] = True
            session['user_id'] = user[0]  # Assuming user ID is the first column in your user table
            return redirect(url_for('ReadBDD'))
        else:
            return render_template('signin.html', error=True)
    return render_template('signin.html', error=False)

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



@app.route('/upload', methods=['POST'])
def upload_file():
    # Vérifie si la requête POST contient un fichier
    if 'file' not in request.files:
        return redirect(request.url)
    file = request.files['file']
    # Vérifie si aucun fichier n'a été sélectionné
    if file.filename == '':
        return redirect(request.url)
    # Récupère la valeur de l'ID maximal
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM perso ORDER BY id DESC LIMIT 1;')
    data = cursor.fetchone()
    conn.close()
    max_id = data[0] if data else 0  # Si aucune donnée n'est retournée, max_id = 0


    #ici on insert into avec le user, le nom du fichier
    if file and allowed_file(file.filename):
        extension = file.filename[-4:]
        filename = secure_filename(f"{max_id + 1}{extension}")
        print("log nul", file.filename)
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        return redirect(url_for('uploaded_file', filename=filename))
    else:
        return "Format de fichier non pris en charge."






@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return f'Image téléchargée: <img src="{url_for("static", filename="images/" + filename)}" />'



################################################

#empecher deux users d'avoir le même username






@app.route('/enregistrer_perso', methods=['POST'])
def enregistrer_perso():
    nom = request.form['nom']
    licence = request.form['licence']

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute('INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)', (nom, licence, "Genesect.png"))
    conn.commit()
    conn.close()
    return redirect('/')

@app.route('/enregistrer_et_uploader', methods=['GET'])
def formulaire_perso():
    return render_template('formulaire_ajout_image.html')


@app.route('/enregistrer_et_uploader', methods=['POST'])
def enregistrer_et_uploader():
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
    return redirect('/')  # Rediriger vers la page d'accueil après l'enregistrement

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
