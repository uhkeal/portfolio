# Tariq Ebo — portfolio

My portfolio site. Plain HTML, CSS and a little JavaScript: no build step, no framework. Open `index.html` in a browser and it works.

## What's where

```
index.html            Home page (hero, work cards, about, contact)
work/
  waypoint.html       Waypoint case study
  myfinances.html     MyFinances case study
  soundshelf.html     SoundShelf project page
css/style.css         All the styles, in the order they appear on the page
js/main.js            Scroll fade-in, image lightbox, and the nav race
js/koi.js             The koi pond background (fish, cursor trail, click ripples)
assets/
  favicon.svg
  img/<project>/      Screens and diagrams for each project
```

## Editing

**Text.** Open the page's `.html` file and change the words. Nothing is generated; what you type is what shows.

**Colors and fonts.** The top of `css/style.css` has a short list of variables. `--accent` is the one loud color on the site (the italic word in the hero, the status dot, the arrows, the car). Change it once and it updates everywhere.

**Images.** Replace a file in `assets/img/` and keep the same name, or add a new file and point an `<img src="…">` at it. Always write an `alt` description.

**Add a project.**

1. Copy `work/soundshelf.html` (the simplest page) to `work/your-project.html` and edit it.
2. Put its images in `assets/img/your-project/`.
3. In `index.html`, copy one `<a class="card">…</a>` block inside the work grid and update the link, image and text.

**Transfermarkt.** Its card on the home page is a placeholder with no link. There is a comment above it in `index.html` that says how to switch it on when the case study is ready.

**After hours.** There is a hidden "After hours" section for video edits and animation in `index.html`, wrapped in an HTML comment. Remove the comment markers and add thumbnails to `assets/img/play/` to turn it on.

## The nav race

The two pixel cars are drawn by `setupRace()` in `js/main.js`. Hover the nav for a speed boost (DRS); click Resume for a pit stop. The numbers at the top of that section (`LAP_MS`, `DRS_SPEED`, …) control the speeds. To remove the race, delete the `setupRace();` line at the bottom of the file and the `<span class="lap-chip">` in each page's nav.

People who have "reduce motion" turned on see the cars parked and no fade-in animations.

## The koi pond

`js/koi.js` draws a koi on a canvas fixed behind every page. Moving the mouse leaves a trail in the water, clicking drops a ripple the fish swims over to, and clicking right beside the fish makes it dart away. The `KOI` list at the top of the file controls its size, speed, opacity, colors and how many fish there are; the patches use `--accent`. To remove it, delete the `<script src="js/koi.js">` line at the bottom of each page.

The pond is switched off for people who have "reduce motion" turned on.

## Hosting on GitHub Pages

1. On GitHub, open this repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick `main` and `/ (root)`, and save.
3. After a minute the site is live at `https://uhkeal.github.io/portfolio/`.

Every push to `main` updates the live site.

## Preview on your computer

Double-click `index.html`, or from this folder run:

```
python3 -m http.server 8000
```

and open <http://localhost:8000>.
