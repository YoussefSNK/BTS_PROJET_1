# à corriger avant de s'en servir


import unittest
from datetime import datetime
from io import BytesIO
from PIL import Image
import os
import tempfile
from unittest.mock import patch, MagicMock
from flask import Flask, session
from werkzeug.datastructures import FileStorage

from BTS_PROJET_1 import app

class TestGenerateMosaic(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True
        app.config['UPLOAD_FOLDER'] = tempfile.mkdtemp()

        with self.app.session_transaction() as sess:
            sess['authentifie'] = True
            sess['user_id'] = 1 

    def tearDown(self):
        for root, dirs, files in os.walk(app.config['UPLOAD_FOLDER'], topdown=False):
            for file in files:
                os.remove(os.path.join(root, file))
            for dir in dirs:
                os.rmdir(os.path.join(root, dir))

    @patch('sqlite3.connect')
    def test_generate_mosaic_success(self, mock_connect):
        mock_cursor = MagicMock()
        mock_connect.return_value.cursor.return_value = mock_cursor

        form_data = {
            'liste': '1',
            'ratio': '16/9',
            'height': '1000'
        }

        mock_cursor.execute.return_value.fetchone.return_value = (1920, 1080)

        mock_cursor.execute.return_value.fetchall.return_value = [('image1.png',), ('image2.png',)]

        with patch('PIL.Image.open') as mock_open:
            mock_img = MagicMock(spec=Image.Image)
            mock_img.size = (1920, 1080)  
            mock_open.return_value.__enter__.return_value = mock_img

            response = self.app.post('/generate_mosaic', data=form_data)

            self.assertEqual(response.status_code, 302)

            mosaic_files = os.listdir(app.config['UPLOAD_FOLDER'])
            self.assertEqual(len(mosaic_files), 1)  
            mosaic_filename = mosaic_files[0]

            mock_cursor.execute.assert_any_call(
                'INSERT INTO image (nom, ratio, largeur, hauteur, image_link, user_id) VALUES (?, ?, ?, ?, ?, ?)',
                (mosaic_filename, '16/9', 1777, 1000, mosaic_filename, 1)  # Vérifiez les valeurs insérées
            )

    @patch('sqlite3.connect')
    def test_generate_mosaic_invalid_ratio(self, mock_connect):
        mock_cursor = MagicMock()
        mock_connect.return_value.cursor.return_value = mock_cursor

        form_data = {
            'liste': '1',
            'ratio': 'invalid_ratio',
            'height': '1000'
        }

        response = self.app.post('/generate_mosaic', data=form_data)

        self.assertEqual(response.status_code, 400)

        mock_cursor.execute.assert_not_called()
        self.assertFalse(os.listdir(app.config['UPLOAD_FOLDER']))

if __name__ == '__main__':
    unittest.main()

