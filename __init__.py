from flask import Flask, render_template, request, redirect, url_for, session
from werkzeug.utils import secure_filename
#from flask_uploads import UploadSet, configure_uploads, IMAGES
from urllib.request import urlopen
import sqlite3
import os
from PIL import Image

from datetime import datetime

app = Flask(__name__)                                                                                                                  
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'  # Clé secrète pour les sessions

# Fonction pour créer une clé "authentifie" dans la session utilisateur
def est_authentifie():
    return session.get('authentifie')


UPLOAD_FOLDER = './static/images'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

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

    conn = sqlite3.connect('database/database.db')
    cursor = conn.cursor()
    cursor.execute('INSERT INTO user (login, password) VALUES (?, ?)', (login, password))
    conn.commit()
    conn.close()
    user = verify_credentials(login, password)
    if user:
        session['authentifie'] = True
        session['user_id'] = user[0] 
        return redirect(url_for('ReadBDD'))
    
    return redirect('/')

@app.route('/sign_in', methods=['GET', 'POST'])
def authentification():
    if request.method == 'POST':
        login = request.form['login']
        password = request.form['password']
        user = verify_credentials(login, password)
        if user:
            session['authentifie'] = True
            session['user_id'] = user[0] 
            return redirect('/')
        else:
            return render_template('signin.html', error=True)
    return render_template('signin.html', error=False)

@app.route('/sign_out', methods=['GET'])
def deconnexion_utilisateur():
    session['authentifie'] = False
    session['user_id'] = "" 
    return redirect('/')


@app.route('/poster_list')
def ReadBDD():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')

        conn = sqlite3.connect('database/database.db')
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

    conn = sqlite3.connect('database/database.db')
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

            conn = sqlite3.connect('database/database.db')
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

        conn = sqlite3.connect('database/database.db')
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

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT image_link, id FROM little_image WHERE liste_id = ?', (liste_id,))
        data = cursor.fetchall()
        conn.close()
        return render_template('list_page.html', data=data, liste_id=liste_id)
    else:
        return redirect('/')


@app.route('/add_list', methods=['POST'])
def add_list():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')
        nom = request.form['nom']
        largeur = request.form['largeur']
        hauteur = request.form['hauteur']

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()
        cursor.execute('INSERT INTO liste (nom, largeur, hauteur, user_id) VALUES (?, ?, ?, ?)', (nom, largeur, hauteur, user_id))
        conn.commit()
        conn.close()

        return redirect('/poster_creator')
    else:
        return redirect('/')




@app.route('/delete_image/<int:image_id>', methods=['POST'])
def delete_image(image_id):
    if 'authentifie' in session and session['authentifie']:
        conn = sqlite3.connect('database/database.db')
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

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()
        cursor.execute('SELECT largeur, hauteur FROM liste WHERE id = ?', (liste_id,))
        dimensions = cursor.fetchone()
        list_width, list_height = dimensions if dimensions else (None, None)

        if not list_width or not list_height:
            return "Dimensions de la liste introuvables.", 400

        cursor.execute('SELECT id FROM little_image ORDER BY id DESC LIMIT 1;')
        max_id_data = cursor.fetchone()
        max_id = max_id_data[0] if max_id_data else 0

        files = request.files.getlist('files')
        for file in files:
            if file and allowed_file(file.filename):
                max_id += 1
                new_filename = f"LI{max_id}.png"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], new_filename)

                file.stream.seek(0) 
                img = Image.open(file.stream)
                
                if img.width != list_width or img.height != list_height:
                    #le cas où ça marche pas
                    return redirect(url_for('see_list', liste_id=liste_id))

                img.save(file_path)

                cursor.execute('INSERT INTO little_image (image_link, liste_id) VALUES (?, ?)', (new_filename, liste_id))
        
        conn.commit()
        conn.close()
        
        return redirect(url_for('see_list', liste_id=liste_id))
    else:
        return redirect('/')



# LA GIGA FONCTION

@app.route('/generate_mosaic', methods=['POST'])
def generate_mosaic():
    if 'authentifie' in session and session['authentifie']:
        user_id = session.get('user_id')
        liste_id = request.form['liste']
        ratio = request.form['ratio']
        height = int(request.form['height'])

        try:
            width = int(height * (eval(ratio)))
        except:
            return "Le ratio est invalide. Utilisez un format comme '16/9'.", 400

        conn = sqlite3.connect('database/database.db')
        cursor = conn.cursor()

        cursor.execute('SELECT largeur, hauteur FROM liste WHERE id = ? AND user_id = ?', (liste_id, user_id))
        list_dimensions = cursor.fetchone()

        if list_dimensions:
            list_width, list_height = list_dimensions

            num_images_x = width // list_width #images par ligne
            num_images_y = height // list_height#images par colonne

            ecart_horizontal = (width%list_width)//(num_images_x+2)
            ecart_vertical = (height%list_height)//(num_images_y+2)

            mosaic = Image.new('RGB', (width, height))
            cursor.execute('SELECT image_link FROM little_image WHERE liste_id = ?', (liste_id,))
            images = cursor.fetchall()

            if not images:
                conn.close()
                return "Aucune image trouvée dans la liste sélectionnée.", 400

            image_count = 0
            for y in range(num_images_y):
                for x in range(num_images_x):
                    if image_count < len(images):
                        img_path = os.path.join(app.config['UPLOAD_FOLDER'], images[image_count][0])
                        with Image.open(img_path) as img:
                            mosaic.paste(img, (x * list_width + (x+1)*ecart_horizontal, y * list_height + (y+1)*ecart_vertical))
                        image_count += 1

            mosaic_filename = "Mosaïque" + str(datetime.now().year)  + "-" + str(datetime.now().month) + "-" + str(datetime.now().day) + "-" + str(datetime.now().hour) + "-" + str(datetime.now().minute) + "-" + str(datetime.now().second)+".png"       
            mosaic_path = os.path.join(app.config['UPLOAD_FOLDER'], mosaic_filename)

            mosaic.save(mosaic_path)

            cursor.execute('INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                           (mosaic_filename, ratio, width, height, mosaic_filename, user_id))
            conn.commit()

            conn.close()

            return redirect(f"/static/images/{mosaic_filename}")
        else:
            conn.close()
            return "Liste non trouvée ou vous n'avez pas la permission d'accéder à cette liste.", 400
    else:
        return redirect('/')
    

def verify_credentials(username, password):
    conn = sqlite3.connect('database/database.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM user WHERE login = ? AND password = ?', (username, password,))
    user = cursor.fetchone()
    conn.close()
    return user


if __name__ == '__main__':
    app.run(debug=True)




# -----------------------------------------------------------------------
# -----------------------------------------------------------------------
# -----------------------------------------------------------------------
# -----------------------------------------------------------------------
# -----------------------------------------------------------------------

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return f'Image téléchargée: <img src="{url_for("static", filename="images/" + filename)}" />'
# -------------------------------------------------------
# -------------------------------------------------------





                                                                                                                                       
if __name__ == "__main__":
  app.run(debug=True)
