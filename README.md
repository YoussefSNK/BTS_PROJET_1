# Poster Maker

## Introduction
Ce projet est une application web qui permet aux utilisateurs d'enregistrer des images pour en voir le ratio et choisir celle qui conviendrait le mieux pour une impression. Il utilise Flask et SQLite, et a été déployé en continu via une pipeline CI/CD.



## Fonctionnalités
- Inscription, Connexion, Déconnexion
- L'utilisateur peut téléverser une image à sa liste d'images
- La liste lui affiche les détails tels les dimensions et le ratio
- La liste peut être triée par dimension ou ratio
- L'utilisateur peut chercher à travers sa liste, les images se rapprochant le plus d'un ratio qu'il défini

- L'utilisateur peut créer des listes annexes comportant des petites images dans le but d'en faire une mosaïque, elles doivent toutes avoir la même taille
- L'utilisateur peut ensuite générer une mosaïque en sélectionnant un ratio, une hauteur, et l'une de ses listes de petites images
- La mosaïque est automatiquement ajoutée à sa liste d'image principale avec un nom unique basé sur le moment de la création 

- L'utilisateur peut supprimer n'importe quel image de sa liste principale ou de l'une des petites listes.


## Installation
- Clonez le dépôt
git clone https://github.com/YoussefSNK/BTS_PROJET_1.git
cd BTS_PROJET_1

Prérequis Techniques
- Python 3.x
- Flask : Framework web Python léger et puissant.
- Pillow (PIL) : Bibliothèque Python pour le traitement des images.
- SQLite : Système de gestion de base de données relationnelle.

Librairies utilisées
- Unittest pour les tests unitaires
- Os pour la gestion de fichier
- Sqlite pour la gestion de la base de données sqlite
- Pillow pour le traitement d'image (récupérer les dimensions et créer la mosaïque)

Architecture
- [/static] Contient tout ce qui est fichier media, script et css
- [/templates] Contient les vues
- [/database] Contient le modèle de la base de données, le script qui la rempli et le fichier de base de données

- Prochainement [/routes] pour stocker les fichiers qui s'occupent des routes


Outils :
- Versionning : Github
- Vérification de code : Sonarqube
- Convention de commit (au maximum)


## Lancement de l'Application
python __init__.py
python create_db.py
Puis aller à l'adresse https://localhost:5000


