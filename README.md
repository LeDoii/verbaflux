# Verbaflux

Exposition et entraînement à la gravure de la **bindrune Verbaflux**, une bindrune de traduction universelle imaginée pour le serveur de jeu de rôle Elixir RP.

**Outil fan-made d'exposition et d'entraînement, non affilié à l'équipe d'Elixir RP.** La bindrune présentée est un objet de background : elle n'octroie aucun bonus de jeu.

## Ce que fait le site

- **Exposition** : l'assemblage animé des quatre runes (Gebo, Mannaz, Ansuz, Laguz) et l'objet (médaillon et bracelet de cuir).
- **Entraînement** : on trace la bindrune sur une plaque de cuivre, on clique sur *Graver*, et on obtient un pourcentage de précision, avec le détail pour chaque rune.

## Comment le pourcentage est calculé

Le tracé est comparé au modèle point par point, sur sa ligne centrale :

- **couverture** : part du modèle recouverte par le tracé ;
- **précision** : part du tracé qui tombe bien sur le modèle (les traits en trop pénalisent) ;
- **score** : produit des deux. Il faut être complet et propre pour approcher 100 %.

Chaque point compte pleinement sous 4 px d'écart, plus du tout au-delà de 24 px (canevas de 720 px). Le calage automatique, activé par défaut, recentre et redimensionne le tracé sans corriger la rotation. Tout le calcul se fait dans le navigateur : rien n'est envoyé.

## Contenu du dépôt

- `docs/` : le site statique (GitHub Pages, branche `main`, dossier `/docs`).
  - `scoring.js` : le calcul de précision (module pur, testable sous Node).
  - `data.js` : la géométrie des quatre runes.
  - `app.js`, `index.html`, `style.css` : l'interface.
  - `fonts/` : Italiana et Crimson Pro (licence SIL OFL).
  - `img/` : visuels de l'objet.

Les runes ne sont présentées que par leur nom.

## Licence

Code : [MIT](LICENSE). Les polices Italiana et Crimson Pro (`docs/fonts/`) restent sous leur licence d'origine, la [SIL Open Font License 1.1](https://openfontlicense.org). Les illustrations de `docs/img/` sont des visuels du projet.
