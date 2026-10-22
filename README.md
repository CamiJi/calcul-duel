# ⚡ Le Duel des Tables

Jeu de calcul mental **Papa vs Champion** — un écran entre vous deux, chacun son papier,
chaque joueur **son propre chronomètre**. Le handicap est le cœur du jeu : le champion
dispose de plus de temps, mais peut aussi **battre l'avantage de papa** grâce au bonus
rapidité.

## Les règles

1. On choisit les **tables** (1 à 10), le nombre d'exercices, le temps de papa et
   l'avantage du champion (×1,5 à ×4).
2. La manche démarre : chacun reçoit **sa propre pile d'exercices**, les deux chronos
   tournent en parallèle. On écrit la réponse **sur son papier**, puis on tape
   « J'ai fini ! » (ou le chrono tombe à zéro).
3. **Vérification ensemble** : l'app révèle la bonne réponse, chacun compare avec son
   papier et marque ✅ bonne ou ❌ fausse dans son écran.
4. Écran de résultats, palmarès, et bouton **Revanche !**

### Points

| Règle | Points |
|---|---|
| Bonne réponse | +1 |
| ⚡ Le champion finit dans le temps de papa | +1 bonus |
| 🔥 3 bonnes d'affilée | +1 |
| 💥 Réponse fausse (optionnel) | −1 |

Réglages, préférences et palmarès sont gardés dans le `localStorage` du navigateur.

## Développement

```bash
npm install
npm run dev      # serveur de dev local (http://localhost:5173)
npm run build    # tsc + build Vite vers dist/
npm run preview  # sert le build de production
```

Stack : **Vite + TypeScript vanilla + Tailwind CSS v4**. Aucun backend, aucun framework
JS — le state de partie vit en mémoire, les records en `localStorage`. Effets sonores
générés en Web Audio (zéro asset), lecture à voix haute via SpeechSynthesis.

## Déploiement sur GitHub Pages

1. Créer le repo sur GitHub perso (ex. `calcul-duel`), **public** ( Pages free tier ),
2. Pousser la branche `main` :
   ```bash
   git init && git add . && git commit -m "Première version du Duel des Tables"
   git remote add origin git@github.com:<ton-user>/calcul-duel.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Source : GitHub Actions**.
4. Le workflow `.github/workflows/deploy.yml` build et déploie à chaque push sur `main`.

Le `base: './'` de Vite rend le site compatible avec une project page
(`https://<user>.github.io/calcul-duel/`) sans configuration selon le nom de repo.

## Pistes d'évolution

- Mode expert : tables 11-12, carrés, divisions.
- Historique des manches (graphique des scores dans le temps).
- Saisie de la réponse au clavier en option (vérification automatique).
- Séries de manches au « meilleur des 3 » avec score cumulé.
- Export/impression des exercices d'une manche pour rejouer hors écran.
