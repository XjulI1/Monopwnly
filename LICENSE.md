MIT License

Copyright (c) 2026 Xavier J.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## Exceptions : données des cartes

### Carte classique

Les fichiers du dossier `data/maps/classic/` ne sont **pas** couverts par la licence MIT ci-dessus.
Ils proviennent d'un projet tiers et gardent leurs propres licences :

- `territories.json` et `sea-routes.json` (géométrie de la carte) sont dérivés de
  [`Risk_board.svg`](https://commons.wikimedia.org/wiki/File:Risk_board.svg) de **Gr0gmint** et
  distribués sous licence [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/). Toute
  copie ou modification doit conserver cette attribution et rester sous la même licence.
- `board.json` et `continent-labels.json` proviennent du projet
  [RISK](https://github.com/kopy-kat/risk) de Konrad Kopp, sous licence MIT
  (Copyright (c) 2026 Konrad Kopp).

Le détail de la provenance et le texte de ces licences figurent dans
[`data/maps/classic/SOURCE.md`](data/maps/classic/SOURCE.md) et
[`data/maps/classic/LICENSE-map-geometry.md`](data/maps/classic/LICENSE-map-geometry.md).

### Carte de France

Les fichiers du dossier `data/maps/france/` ne sont pas non plus couverts par la licence MIT. Leurs
contours sont dérivés des limites départementales de l'**IGN** (ADMIN EXPRESS COG, édition 2018),
reprises de la version simplifiée du projet
[france-geojson](https://github.com/gregoiredavid/france-geojson), et sont distribués sous la
[Licence Ouverte / Open Licence version 2.0](https://www.data.gouv.fr/pages/legal/licences/etalab-2.0)
d'Etalab, qui impose de mentionner la source et la date de mise à jour :

> Source : IGN, ADMIN EXPRESS COG, édition 2018 ; simplification par le projet france-geojson.

Le détail figure dans [`data/maps/france/SOURCE.md`](data/maps/france/SOURCE.md).

## Marque

« RISK » est une marque de Hasbro. Ce projet personnel n'est ni affilié à Hasbro ni approuvé par
Hasbro, et n'utilise aucune de ses illustrations. La licence MIT ne confère aucun droit sur cette
marque.
