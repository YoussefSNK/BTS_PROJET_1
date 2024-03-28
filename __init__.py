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
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

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

@app.route('/form_upload')
def index():
    return render_template('form_upload.html')

################################################

@app.route('/lecture')
def lecture():
    if not est_authentifie():
        # Rediriger vers la page d'authentification si l'utilisateur n'est pas authentifié
        return redirect(url_for('authentification'))

  # Si l'utilisateur est authentifié
    return "<h2>Bravo, vous êtes authentifié</h2>"

@app.route('/authentification', methods=['GET', 'POST'])
def authentification():
    if request.method == 'POST':
        # Vérifier les identifiants
        if request.form['username'] == 'admin' and request.form['password'] == 'password': # password à cacher par la suite
            session['authentifie'] = True
            # Rediriger vers la route lecture après une authentification réussie
            return redirect(url_for('lecture'))
        else:
            # Afficher un message d'erreur si les identifiants sont incorrects
            return render_template('formulaire_authentification.html', error=True)

    return render_template('formulaire_authentification.html', error=False)







# @app.route('/enregistrer_perso', methods=['GET'])
# def formulaire_perso():
#     return render_template('formulaire.html')

@app.route('/enregistrer_perso', methods=['POST'])
def enregistrer_perso():
    nom = request.form['nom']
    licence = request.form['licence']

    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()

    cursor.execute('INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)', (nom, licence, "Genesect.png"))
    conn.commit()
    conn.close()
    return redirect('/consultation/')








@app.route('/enregistrer_et_uploader', methods=['GET'])
def formulaire_perso():
    return render_template('formulaire_ajout_image.html')


@app.route('/enregistrer_et_uploader', methods=['POST'])
def enregistrer_et_uploader():
    print("log 1")
    # Récupération des données du formulaire
    nom = request.form['nom']
    licence = request.form['licence']
    image = request.form['file']
    print("log 2")

    # Connexion à la base de données
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    print("log 3")

    # Exécution de la requête SQL pour insérer un nouveau personnage
    cursor.execute('INSERT INTO perso (nom, licence, image) VALUES (?, ?, ?)', (nom, licence, "placeholder"))
    print("log 4")
    conn.commit()
    print("log 4.5")

    # Récupération de l'ID du personnage nouvellement inséré
    cursor.execute('SELECT id FROM perso ORDER BY id DESC LIMIT 1;')
    data = cursor.fetchone()
    max_id = data[0] if data else 0
    print("log 5")

    # Vérification de l'image et enregistrement si elle est valide
    if image and allowed_file(image):
        print("log 5.1")
        extension = image[-4:]
        print("log 5.2")
        filename = secure_filename(f"{max_id}{extension}")
        print("log 5.3")
        image.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        print("log 5.4")
        # Mettre à jour le nom de l'image dans la base de données
        cursor.execute('UPDATE perso SET image = ? WHERE id = ?', (filename, max_id))
        print("log 5.5")
        conn.commit()
        print("log 6")
    else:
        print("log 7")
        # Supprimer l'entrée si aucune image valide n'est fournie
        cursor.execute('DELETE FROM perso WHERE id = ?', (max_id,))
        conn.commit()
        return "Erreur: Format de fichier non pris en charge."

    conn.close()
    return redirect('/consultation/')  # Rediriger vers la page d'accueil après l'enregistrement




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

@app.route('/consultation/')
def ReadBDD():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM perso;')
    data = cursor.fetchall()
    conn.close()
    return render_template('read_data.html', data=data)










@app.route('/max_id')
def recherche_id_max():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT id FROM perso ORDER BY id DESC LIMIT 1;')
    data = cursor.fetchall()
    conn.close()
    return data







@app.route('/')
def hello_world():
    return render_template('hello.html')

                                                                                                                                       
if __name__ == "__main__":
  app.run(debug=True)
