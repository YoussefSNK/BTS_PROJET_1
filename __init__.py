from flask import Flask, render_template, request, redirect, url_for, session
import sqlite3

from routes.skinteam import skinteam_bp
from routes.tama import tama_bp

app = Flask(__name__)                                                                                                                  
app.secret_key = b'_5#y2L"F4Q8z\n\xec]/'  # Clé secrète pour les sessions

# Fonction pour créer une clé "authentifie" dans la session utilisateur
def est_authentifie():
    return session.get('authentifie')


UPLOAD_FOLDER = './static/images'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

app.register_blueprint(skinteam_bp)
app.register_blueprint(tama_bp)



@app.route('/', methods=['GET'])
def return_home():
    if 'authentifie' in session and session['authentifie']:
        return render_template('tama.html')
    else:
        return redirect(url_for('login_form'))



@app.route('/sign_up', methods=['GET'])
def register_form():
    return render_template('signup.html')

@app.route('/sign_up', methods=['POST'])
def register_user():
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
        return redirect('/')

    return redirect('/')

@app.route('/sign_in', methods=['GET', 'POST'])
def login_form():
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










def verify_credentials(username, password):
    conn = sqlite3.connect('database/database.db')
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
# -------------------------------------------------------
# -------------------------------------------------------





                                                                                                                                       
if __name__ == "__main__":
  app.run(debug=True)
