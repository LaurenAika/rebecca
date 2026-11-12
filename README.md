# Rebecca’s Saves

A small recipe-box website of saved recipes, articles, memes, and notes. It is plain HTML, CSS, and JavaScript, with no build step. Open `index.html` through a local web server (or the GitHub Pages address) and the box loads `data/items.json`.

Paths are relative, so the site works from a subpath such as `/rebecca/`.

## Updating the saves

Everything Rebecca sees is in [`data/items.json`](data/items.json). That is the only file you need to edit to add, remove, or change a card.

Each item is one object:

| Field | Meaning |
| --- | --- |
| `id` | A unique short name, such as `lemon-herb-roast-chicken`. |
| `type` | One of `recipe`, `article`, `meme`, or `note`. |
| `title` | The card heading. |
| `summary` | A sentence or two. The card shows the first line; the detail page shows all of it. |
| `note` | Optional personal reminder, shown as a yellow tag (for example `show Mom`). Use `""` to leave it off. |
| `date_saved` | The day it was saved, as `YYYY-MM-DD`. It is shown like “Nov 8”. |
| `url` | The original link. It opens from the button on the detail page, in a new tab. |
| `image` | A picture in this repo, such as `images/lemon-herb-roast-chicken.svg`. |

The box opens on Recent, which lists every save with the newest day first. If two saves share a day, the one lower in this file comes first. Recipes, Articles, Memes, and Notes each show only that type, newest first. Search looks through the tab that is open: everything from Recent, or just that type from the others. Save the file and refresh. While the phone or laptop is online, a refresh shows the edit. Offline, the box shows the last version that was opened.

Pictures are drawings in `images/`. Add another SVG or a small PNG and point `image` at it. Do not use hotlinked photos.

Tapping a card opens it inside the box. The address looks like `#item/lemon-herb-roast-chicken`, so it can be shared, and the phone’s back gesture returns to the list. Back also keeps the tab and the search as they were. The big button on that page opens `url`.

The type on the page is Fraunces and Nunito, included under the SIL Open Font License. See `fonts/OFL-Fraunces.txt` and `fonts/OFL-Nunito.txt`.

## Publishing

GitHub Actions deploys the site to GitHub Pages on every push to `main`.

Before the first deploy, set **Settings → Pages → Source** to **GitHub Actions**. Nothing in this repo turns that setting on for you.

After that, pushing to `main` publishes the site. For this repository the address will look like `https://<github-username>.github.io/rebecca/`.

## On a phone

In Safari, open the site, tap Share, then **Add to Home Screen**. The icon is named **Recipe Box** and opens full screen, like a small app. The same icon can be installed on a laptop from the browser’s install prompt.
