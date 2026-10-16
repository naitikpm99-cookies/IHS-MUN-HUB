# IHS MUN HUB: what every line of code does

This guide walks through the three code files of the website, line by line.
Read it with the real file open next to it, so you can match each row to a line of code.

## How the pieces fit together

| File | Job | Think of it as |
|---|---|---|
| `index.html` | The content and structure: headings, text, buttons, sections | The skeleton |
| `css/style.css` | Colors, fonts, spacing, layout, animations | The skin and clothes |
| `js/main.js` | Behavior: opening the mobile menu, effects while scrolling | The muscles |
| `images/hero-photo.jpg` | The photo shown in the red hero section | A picture file |

The browser opens `index.html` first. Inside it, two lines tell the browser to also load the CSS and the JS file.

**Three things to know before you start**

- **HTML** is made of *tags* like `<p>text</p>`. Most tags open (`<p>`) and close (`</p>`). Tags can sit inside other tags, and that nesting is the structure of the page.
- **Attributes** go inside the opening tag: `<a href="#about">`. Here `href` is the attribute name and `"#about"` is its value.
- **CSS** is written as `selector { property: value; }`. The selector says *what* to style, and each `property: value;` line says *how*.

---

# Part 1: `index.html`

## The head (information for the browser)

| Code | What it does |
|---|---|
| `<!DOCTYPE html>` | Tells the browser "this is a modern HTML5 page". Always the first line. |
| `<html lang="en">` | Opens the whole page. `lang="en"` says the language is English, which helps screen readers and translators. |
| `<head>` | Opens the part of the page that holds settings. Nothing in here is shown on screen. |
| `<meta charset="UTF-8">` | Lets the page show all characters properly (like `·` and `©`). Without it you get garbled symbols. |
| `<meta name="viewport" content="width=device-width, initial-scale=1">` | Makes the page fit a phone screen instead of showing a tiny zoomed-out desktop page. |
| `<title>IHS MUN HUB</title>` | The text on the browser tab. |
| `<!-- Fonts -->` | A comment. Browsers ignore it. It is a note for humans. |
| `<link rel="preconnect" href="https://fonts.googleapis.com">` | Tells the browser to start connecting to Google Fonts early so fonts load faster. |
| `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>` | Same idea for the server that holds the actual font files. `crossorigin` is required for that server. |
| `<link href="https://fonts.googleapis.com/css2?family=DM+Sans...&display=swap" rel="stylesheet">` | Loads two fonts: DM Sans (body text) and Playfair Display (headings). `display=swap` shows plain text first and swaps in the font when ready. |
| `<link rel="stylesheet" href="css/style.css">` | Loads *our* CSS file. `href` is the path to it: the `css` folder, then `style.css`. |
| `<script src="js/main.js" defer></script>` | Loads our JavaScript file. `defer` means "wait until the whole page is built before running", so the script can find its elements. |
| `</head>` | Closes the head. |

## The body: header

| Code | What it does |
|---|---|
| `<body>` | Opens the visible part of the page. |
| `<header class="top">` | The top bar of the site. `class="top"` is a label the CSS uses to style it (`.top` in the CSS). |
| `<div class="wrap bar">` | A box (`div`) that holds the bar's content. It has two classes: `wrap` (limits the width) and `bar` (lines things up in a row). |
| `<a class="logo" href="#">IHS <span>MUN</span> HUB</a>` | The logo, which is a link (`a`). `href="#"` means "jump to the top of this page". The `<span>` wraps just the word MUN so the CSS can color it yellow. |
| `<button class="burger" id="burger" aria-label="Open menu" aria-expanded="false" aria-controls="nav">` | The three-line menu button shown on phones. `id="burger"` is a unique name JavaScript uses to find it. The three `aria-` attributes describe the button to screen readers: what it does, whether the menu is open, and which element it controls. |
| `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">` | Opens a small drawing (SVG). `viewBox` is the drawing's own coordinate grid (24 by 24). `fill="none"` means no fill color, `stroke="currentColor"` draws lines in the text color, `stroke-width` is line thickness, `stroke-linecap="round"` rounds the line ends, and `aria-hidden` hides the decoration from screen readers. |
| `<path d="M3 6h18M3 12h18M3 18h18"/>` | The three lines. `M3 6` means "move to x=3, y=6", and `h18` means "draw a horizontal line 18 units long". Repeated for the three rows. |
| `</svg>` and `</button>` | Close the drawing and the button. |
| `<nav id="nav" aria-label="Main">` | The navigation menu. `id="nav"` lets JavaScript find it. `aria-label` names it for screen readers. |
| `<a href="#about">About</a>` | A link. `#about` jumps to the element with `id="about"` further down the page. The next four links work the same way for conferences, committees, resources and contact. |
| `<a class="btn" href="#conference">Register</a>` | A link styled as a yellow button (`class="btn"`). |
| `</nav>`, `</div>`, `</header>` | Close the menu, the content box and the header. |

## The hero (red section with the photo)

| Code | What it does |
|---|---|
| `<main>` | Wraps the main content of the page (everything between header and footer). |
| `<section class="hero" id="about">` | A section of the page. `class="hero"` is for CSS, and `id="about"` is the target of the "About" link. |
| `<img class="hero__photo" src="images/hero-photo.jpg" width="2000" height="1333" alt="...">` | Shows the photo. `src` is the file path. `width` and `height` tell the browser the photo's shape before it loads, so the page does not jump around. `alt` describes the photo for screen readers and shows if the image fails to load. |
| `<div class="wrap hero__content">` | A box for the hero's text, limited in width by `wrap`. |
| `<div class="hero__text">` | An inner box so the text can be kept to a readable width. |
| `<p class="eyebrow">Model United Nations · [School name]</p>` | The small yellow label above the heading. `p` means paragraph. |
| `<h1>Where students become <em>delegates.</em></h1>` | The main heading (`h1`, there should only be one per page). `<em>` marks the word "delegates." so the CSS can turn it yellow. |
| `<p class="lead">...</p>` | The intro sentence under the heading. Replace the text in brackets with your own. |
| `<div class="cta-row">` | A row that holds the two buttons ("cta" means call to action). |
| `<a class="btn" href="#join">Join the club</a>` | The yellow button. It jumps to the section with `id="join"`. |
| `<a class="btn ghost" href="#conference">Upcoming conference</a>` | The outlined button. It has two classes: `btn` (shape) and `ghost` (see-through style). |
| `</div></div></section>` | Close the button row, the text box, the content box and the section. |

## The stats strip (yellow bar)

| Code | What it does |
|---|---|
| `<section class="stats" aria-label="At a glance">` | The yellow strip. `aria-label` names it for screen readers because it has no visible heading. |
| `<div class="wrap">` | Content box. |
| `<div><b>[00]</b><span>Members</span></div>` | One stat. `<b>` is the big bold number and `<span>` is the small label. The next three lines repeat this for Conferences attended, Awards and Committees. Change `[00]` to real numbers. |

## Next conference

| Code | What it does |
|---|---|
| `<section class="block" id="conference">` | A normal content section (`block` gives it padding). The "Conferences" links jump here. |
| `<div class="wrap conf">` | Content box. `conf` makes it a two-column layout. |
| `<div class="ph" role="img" aria-label="...">[CONFERENCE POSTER / IMAGE]</div>` | A striped placeholder box (`ph`) standing in for a poster. `role="img"` plus `aria-label` tell screen readers it is a picture. Replace it with a real `<img>` later. |
| `<div>` | Opens the right-hand column. |
| `<p class="eyebrow">Next conference</p>` | Small yellow label. |
| `<h2>[Conference name]</h2>` | A section heading. `h2` is smaller than `h1`. |
| `<ul class="meta">` | An unordered list (bullet list), styled by the CSS as a row. |
| `<li>[Date]</li>`, `<li>[Venue]</li>`, `<li>Register by [deadline]</li>` | The list items (`li`). Each one gets a small yellow square in front of it from the CSS. |
| `</ul>` | Closes the list. |
| `<p>[Short description...]</p>` | Paragraph about the conference. |
| `<a class="btn" href="#join">Register now</a>` | Button that jumps to the Join section. |
| `</div></div></section>` | Close the right column, the content box and the section. |

## Committees

| Code | What it does |
|---|---|
| `<section class="block alt" id="committees">` | A section. `alt` gives it the light pink background so sections alternate in color. |
| `<div class="head">` | The title row of the section. |
| `<div><p class="eyebrow">Debate</p><h2>Committees</h2></div>` | The label and heading, grouped together so they stay side by side as one unit. |
| `<a href="#">See all committees</a>` | A link on the right of the title row. `#` is a placeholder. Point it to a real page later. |
| `<div class="grid3">` | The box that arranges the cards in a grid (3 across on desktop). |
| `<article class="card">` | One card. `article` is the right tag for a self-contained piece of content. |
| `<div class="ph">[IMAGE]</div>` | Striped image placeholder at the top of the card. |
| `<span class="tag">GA</span>` | A small black label with yellow text (GA means General Assembly). |
| `<h3>[General Assembly]</h3>` | The card title (`h3` is a third-level heading). |
| `<p>[Topic and difficulty level.]</p>` | Card description. |
| `<a class="more" href="#">Read the background guide</a>` | Link pinned to the bottom of the card. |
| `</article>` | Closes the card. |

The next two cards (Security Council with tag `SC`, Crisis committee with tag `CRISIS`) are built exactly the same way. Only the text changes. The section then closes with `</div></div></section>`.

## News and resources

This section is built the same way as Committees: a `section` with `id="resources"`, a `head` row ("Learn" / "News and resources" / "All updates" link), and a `grid3` holding three cards with the tags `NEWS`, `GUIDE` and `RECAP`. These cards have no "more" link.

## Join

| Code | What it does |
|---|---|
| `<section class="join" id="join">` | The dark call-to-action section. The "Join" buttons jump here. |
| `<div class="wrap">` | Content box. |
| `<h2>Ready to take the floor?</h2>` | Heading (yellow, from the CSS). |
| `<p>[Short invitation...]</p>` | Invitation text. |
| `<a class="btn" href="#contact">Join IHS MUN HUB</a>` | Button that jumps to the footer contact area. |
| `</div></section></main>` | Close the box, the section and the main content. |

## Footer

| Code | What it does |
|---|---|
| `<footer id="contact">` | The bottom of the page. `id="contact"` is where the "Contact" links jump. |
| `<div class="wrap">` | Content box, laid out in a row by the CSS. |
| `<a class="logo" href="#">IHS MUN HUB</a>` | The logo again, in white. |
| `<div>[email] · [Instagram]</div>` | Contact details placeholder. |
| `<div class="links">` | A group of footer links. |
| `<a href="#about">About</a>` and the other three | Footer links to the page sections. |
| `<div>© [Year] IHS MUN HUB</div>` | Copyright line. Replace `[Year]`. |
| `</footer></body></html>` | Close the footer, the visible page and the whole document. |

---

# Part 2: `css/style.css`

## CSS words you will see again and again

| Word | Meaning |
|---|---|
| **Selector** | The part before `{ }`. It picks what to style. `.btn` means "everything with `class="btn"`", `#nav` means "the element with `id="nav"`", and a bare word like `body` means every `<body>` tag. |
| **Comma between selectors** | `h1, h2, h3 { }` means "apply this to all three". |
| **`.a .b`** | A space means "`.b` inside `.a`". |
| **`.a.b`** | No space means "an element with both classes". |
| **`a > b`** | `b` that is a direct child of `a`. |
| **`::before` / `::after`** | A decoration the browser adds before or after an element. It needs `content: ""` to appear. |
| **`:hover`** | Applies while the mouse is over the element. |
| **`px`** | A pixel, the basic screen unit. |
| **`padding`** | Space *inside* an element, between its edge and its content. |
| **`margin`** | Space *outside* an element, pushing other things away. |
| **`gap`** | Space between the items of a flex or grid layout. |
| **`%`** | A share of the parent's size. For example, `width: 50%` is half the width of the box it sits in. |
| **Shorthand** | `padding: 10px 20px` means 10px top and bottom, 20px left and right. |

## 1. Variables

| Code | What it does |
|---|---|
| `/* ... */` | A comment. Browsers ignore it. |
| `:root {` | `:root` is the top of the page. Variables defined here can be used everywhere. |
| `--maroon: #7A1425;` | Creates a variable named `--maroon` holding a color. `#7A1425` is a hex color code (red, green, blue in base 16). |
| `--maroon-d` | A darker maroon, used for stripes and the footer. |
| `--yellow`, `--black` | The yellow and near-black used across the site. |
| `--bg: #ffffff;` | Page background color (white). |
| `--fg: #141010;` | "Foreground", the main text color. |
| `--muted: #5b5252;` | Softer grey-brown for secondary text. |
| `--alt: #F7F0F0;` | Light pink background for alternating sections. |
| `--card: #ffffff;` | Card background. |
| `--line: #e3d6d6;` | Thin border color. |
| `--accent: #7A1425;` | Color for small highlights like links and labels. |
| `}` | Ends the rule. |
| `@media (prefers-color-scheme: dark) {` | "Only do this if the visitor's device is in dark mode." |
| `:root { --bg: #141010; ... }` | Inside it, the same variables get dark values: dark background, white text, dark cards, and yellow as the accent color (maroon would be hard to see on dark). Because the whole site uses variables, this one block recolors everything. |

To use a variable later you write `var(--maroon)`. Change a color once at the top and it changes everywhere.

## 2. Base

| Code | What it does |
|---|---|
| `*, *::before, *::after {` | `*` means "everything". This targets every element and its `::before`/`::after` decorations. |
| `box-sizing: border-box;` | Makes `width` include padding and border. Without this, a 300px box with padding becomes wider than 300px, which breaks layouts. |
| `html {` | Styles the whole document. |
| `scroll-behavior: smooth;` | Clicking a `#link` glides to the section instead of jumping. |
| `scroll-padding-top: 80px;` | When jumping to a section, stop 80px early so the sticky header does not cover the title. |
| `body {` | Styles everything visible. |
| `margin: 0;` | Removes the browser's default gap around the page. |
| `background: var(--bg);` | Page background, from the variable. |
| `color: var(--fg);` | Default text color. |
| `font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif;` | A font list. The browser uses the first one it has, falling back down the list. |
| `line-height: 1.55;` | Line spacing: 1.55 times the font size, which is comfortable to read. |
| `h1, h2, h3 {` | All three heading levels. |
| `margin: 0;` | Removes the default space above and below headings. |
| `font-family: 'Playfair Display', Georgia, serif;` | Headings use the elegant serif font. |
| `line-height: 1.1;` | Tight line spacing suits big headings. |
| `a { color: inherit; }` | Links take the text color of their parent instead of default blue. |
| `a:focus-visible, button:focus-visible {` | Applies when someone navigates with the keyboard (Tab key) and lands on a link or button. |
| `outline: 3px solid var(--yellow);` | Draws a yellow ring so keyboard users can see where they are. |
| `outline-offset: 3px;` | Moves the ring 3px away from the element. |

## 3. Layout helpers

| Code | What it does |
|---|---|
| `.wrap {` | The class used on content boxes all over the page. |
| `max-width: 1200px;` | Never wider than 1200px, so text does not stretch across huge monitors. |
| `margin: 0 auto;` | 0 above and below, `auto` left and right, which centers the box. |
| `padding: 0 24px;` | 24px of breathing room on the left and right edges. |
| `.eyebrow {` | The small uppercase label above headings. |
| `display: flex;` | Turns the element into a flex container so its contents sit in a row. |
| `align-items: center;` | Centers items vertically within the row. |
| `gap: 12px;` | 12px between the line and the text. |
| `margin: 0 0 12px;` | 0 top, 0 sides, 12px bottom. |
| `color: var(--accent);` | Uses the accent color. |
| `font-size: 13px;` | Small text. |
| `font-weight: 700;` | Bold (400 is normal, 700 is bold). |
| `letter-spacing: 0.14em;` | Spreads the letters apart. `em` is relative to the font size. |
| `text-transform: uppercase;` | Shows the text in capitals without retyping it. |
| `.eyebrow::before {` | Adds a decoration in front of the label. |
| `content: "";` | Required for `::before` to exist. An empty string means "no text". |
| `flex-shrink: 0;` | Stops the line from being squashed when the text wraps on a small phone. |
| `width: 28px; height: 3px;` | Makes it a small horizontal bar. |
| `background: currentColor;` | Fills the bar with the same color as the text. |

## 4. Buttons

| Code | What it does |
|---|---|
| `.btn {` | The yellow button style. |
| `display: inline-flex;` | Sits in a line with text like an inline element, but uses flex inside. |
| `align-items: center; justify-content: center;` | Centers the label vertically and horizontally. |
| `min-height: 48px;` | At least 48px tall, an easy size to tap on a phone. |
| `padding: 0 28px;` | 28px left and right inside the button. |
| `background: var(--yellow);` | Yellow fill. |
| `color: var(--black);` | Black text. |
| `border: 2px solid var(--yellow);` | A yellow outline. The same color as the fill, so the border can change color on its own variants. |
| `border-radius: 4px;` | Slightly rounded corners. |
| `font: 700 16px 'DM Sans', sans-serif;` | Font shorthand: weight, size and family in one line. |
| `text-decoration: none;` | Removes the link underline. |
| `cursor: pointer;` | Shows the hand cursor on hover. |
| `transition: background 0.15s, color 0.15s, transform 0.15s, box-shadow 0.15s;` | Instead of changing instantly on hover, these four properties animate smoothly over 0.15 seconds. |
| `.btn:hover {` | While the mouse is over a button: |
| `background: var(--black); color: var(--yellow);` | Colors flip: black fill, yellow text. |
| `transform: translateY(-2px);` | Lifts the button 2px up. |
| `box-shadow: 0 8px 18px rgba(0, 0, 0, 0.25);` | Adds a soft shadow below. The values are: right 0, down 8px, blur 18px, color. `rgba(0,0,0,0.25)` is black at 25% opacity. |
| `.btn.ghost {` | A button with *both* classes: the see-through version. |
| `background: transparent; color: #fff; border-color: #fff;` | No fill, white text, white outline. |
| `.btn.ghost:hover { background: #fff; color: var(--maroon); }` | On hover it fills white with maroon text. |

## 5. Header

| Code | What it does |
|---|---|
| `.top {` | The header bar. |
| `position: sticky;` | The bar scrolls with the page until it reaches its `top` position, then sticks there. |
| `top: 0;` | Stick at the very top of the window. |
| `z-index: 40;` | Stacking order. A higher number sits in front of lower numbers, so the header stays above the content. |
| `background: var(--black); color: #fff;` | Black bar with white text. |
| `border-bottom: 3px solid var(--yellow);` | The yellow line under the header. |
| `transition: box-shadow 0.3s;` | The shadow fades in over 0.3 seconds. |
| `.top.scrolled { box-shadow: 0 6px 20px rgba(0, 0, 0, 0.45); }` | A shadow that appears when the header has the class `scrolled`. JavaScript adds that class after you scroll. |
| `.bar {` | The row inside the header. |
| `display: flex; align-items: center;` | Items in a row, vertically centered. |
| `justify-content: space-between;` | Pushes the logo to the left and the menu to the right. |
| `gap: 16px; min-height: 68px;` | Minimum space between items, and the header's height. |
| `.logo {` | Logo text style. |
| `font: 900 22px 'Playfair Display', Georgia, serif;` | Extra bold, 22px, serif. |
| `letter-spacing: 0.02em; text-decoration: none;` | Slightly spread, no underline. |
| `.logo span { color: var(--yellow); }` | The word "MUN" inside the logo is yellow. |
| `nav {` | The menu. |
| `display: flex; align-items: center; gap: 26px;` | Links in a row with 26px between them. |
| `nav a:not(.btn) {` | Every link in the menu *except* the Register button. |
| `position: relative;` | Makes this link the reference point for the underline drawn with `::after`. |
| `padding: 10px 0;` | Makes the link taller, so it is easier to click. |
| `font-size: 15px; font-weight: 500;` | Medium weight text. |
| `text-decoration: none;` | No underline by default. |
| `nav a:not(.btn)::after {` | The yellow underline, drawn as a decoration. |
| `content: "";` | Needed for the decoration to exist. |
| `position: absolute;` | Placed relative to the link (because the link is `relative`). |
| `left: 0; bottom: 4px; width: 100%; height: 2px;` | Full-width line 4px above the bottom of the link, 2px thick. |
| `background: var(--yellow);` | Yellow. |
| `transform: scaleX(0);` | Squashed to 0 width, so invisible at first. |
| `transform-origin: left;` | The line grows from the left edge. |
| `transition: transform 0.25s;` | Growth animates over 0.25 seconds. |
| `nav a:not(.btn):hover { color: var(--yellow); }` | Link turns yellow on hover. |
| `nav a:not(.btn):hover::after { transform: scaleX(1); }` | The line grows to full width on hover. |
| `nav .btn { min-height: 44px; padding: 0 20px; }` | The Register button is a little smaller than other buttons. |
| `.burger {` | The mobile menu button. |
| `display: none;` | Hidden on desktop. The mobile section below shows it. |
| `width: 44px; height: 44px;` | A comfortable tap size. |
| `background: none; border: 0; color: #fff; cursor: pointer;` | Removes the default button look, white icon, hand cursor. |

## 6. Hero (the red section with the photo)

| Code | What it does |
|---|---|
| `.hero {` | The red section. |
| `position: relative;` | Lets the photo be positioned *inside* this section. |
| `overflow: hidden;` | Anything that sticks out of the section is cut off. |
| `background: var(--maroon); color: #fff;` | Maroon background, white text. |
| `.hero__photo {` | The photo. |
| `position: absolute;` | Takes the photo out of the normal flow so it can sit behind the text. |
| `top: 0; right: 0;` | Pinned to the top-right corner of the section. |
| `width: 68%; height: 100%;` | Covers 68% of the width and the full height. |
| `object-fit: cover;` | Fills the box and crops the extra, without stretching the photo. |
| `object-position: 30% center;` | Chooses which part of the photo survives the crop. 30% from the left, centered vertically. |
| `mix-blend-mode: lighten;` | **The "darker becomes transparent" effect.** For each pixel the browser compares the photo and the maroon behind it and keeps the lighter one. Dark parts of the photo vanish into maroon. Bright parts (flags, lights) stay. |
| `-webkit-mask-image: linear-gradient(...)` | The same line again with the `-webkit-` prefix, for older Safari and Chrome. |
| `mask-image: linear-gradient(to right, transparent 0%, rgba(0, 0, 0, 0.5) 25%, #000 65%);` | **The gradient fade.** A mask decides which parts of the photo show: black shows, transparent hides. This one goes from invisible on the left edge (0%), to half visible (25%), to fully visible (65%). So the photo melts into the red. |
| `animation: fade-in 1.6s ease both;` | Runs the `fade-in` animation (defined in part 11) over 1.6 seconds, easing in and out. `both` keeps the start and end states. |
| `.hero__content {` | The text area. |
| `position: relative; z-index: 1;` | Puts the text in front of the photo. The photo is positioned, so the text needs to be too. |
| `padding-top: 110px; padding-bottom: 110px;` | Space above and below the text, which makes the section tall. |
| `.hero__text { max-width: 600px; }` | Keeps the text in a narrow column on the left. |
| `.hero .eyebrow { color: var(--yellow); }` | The label inside the hero is yellow. |
| `.hero h1 {` | The big heading. |
| `font-size: clamp(40px, 6vw, 78px);` | Responsive size: never smaller than 40px, never larger than 78px, and in between it is 6% of the window width. |
| `font-weight: 900;` | Extra bold. |
| `text-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);` | A soft dark glow behind the letters so they stay readable over the photo. |
| `.hero h1 em { color: var(--yellow); font-style: normal; }` | The word "delegates." is yellow. `em` is normally italic, so `normal` turns that off. |
| `.hero .lead {` | The intro sentence. |
| `max-width: 520px;` | Narrow line length. |
| `margin: 24px 0 32px;` | 24px above, 32px below. |
| `color: #f3dfe2; font-size: 19px;` | Soft pink-white text, slightly bigger. |
| `.cta-row {` | The button row. |
| `display: flex; flex-wrap: wrap; gap: 12px;` | Buttons side by side, wrapping to a new line on narrow screens. |
| `.hero__text > * {` | Every direct child of the text box (label, heading, lead, buttons). |
| `animation: fade-up 0.8s ease both;` | Each one slides up and fades in on page load. |
| `.hero__text > :nth-child(2) { animation-delay: 0.10s; }` | The 2nd child starts 0.1s later. The 3rd and 4th are delayed 0.2s and 0.3s, so the pieces appear one after another. |

## 7. Stats (yellow strip)

| Code | What it does |
|---|---|
| `.stats { background: var(--yellow); color: var(--black); }` | Yellow bar with black text. |
| `.stats .wrap {` | The content box *inside* the stats strip. |
| `display: grid;` | Uses CSS Grid, a layout system for rows and columns. |
| `grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));` | "Make as many columns as fit, each at least 160px wide, and share any leftover space equally (`1fr`)." So 4 columns on desktop and 2 on a phone, with no extra code. |
| `gap: 24px;` | Space between columns. |
| `padding-top: 36px; padding-bottom: 36px;` | Space above and below. |
| `text-align: center;` | Centers the text. |
| `.stats b {` | The big numbers. |
| `display: block;` | Puts the number on its own line above the label. |
| `font: 900 44px 'Playfair Display', Georgia, serif;` | Extra bold, 44px, serif. |
| `.stats span {` | The labels under the numbers. |
| `font-size: 14px; font-weight: 700;` | Small and bold. |
| `letter-spacing: 0.06em; text-transform: uppercase;` | Slightly spaced capitals. |

## 8. Sections

| Code | What it does |
|---|---|
| `section.block { padding: 88px 0; }` | Every `<section class="block">` gets 88px of space above and below. |
| `section.alt { background: var(--alt); }` | Sections with the `alt` class get the light pink background. |
| `.head {` | The title row above the cards. |
| `display: flex; flex-wrap: wrap;` | Title and link in a row, wrapping if there is no room. |
| `align-items: flex-end;` | Lines the link up with the bottom of the title. |
| `justify-content: space-between;` | Title on the left, link on the right. |
| `gap: 12px; margin-bottom: 36px;` | Space between them, and space below the row. |
| `.head h2 { font-size: clamp(30px, 4vw, 44px); }` | Responsive heading size (see `clamp` above). |
| `.head h2::after {` | The short yellow bar under each section title. |
| `content: ""; display: block;` | Creates the bar and puts it on its own line. |
| `width: 56px; height: 4px;` | Its size. |
| `margin-top: 14px; background: var(--yellow);` | Gap above the bar, yellow fill. |
| `.head a { color: var(--accent); font-weight: 700; }` | The "See all" link: accent color, bold. |
| `.ph {` | The striped placeholder boxes. |
| `display: flex; align-items: center; justify-content: center;` | Centers the text in the box both ways. |
| `padding: 16px;` | Space inside. |
| `background: repeating-linear-gradient(135deg, var(--maroon) 0 14px, var(--maroon-d) 14px 28px);` | Diagonal stripes. At a 135 degree angle it repeats 14px of maroon then 14px of dark maroon. |
| `color: #fff; border-radius: 4px;` | White text, rounded corners. |
| `font-size: 14px; font-weight: 500; text-align: center;` | Text style. |
| `.conf {` | The two-column conference layout. |
| `display: grid; grid-template-columns: 1fr 1fr;` | Two equal columns. |
| `gap: 56px; align-items: center;` | Space between columns, and the text is centered vertically next to the poster. |
| `.conf .ph { min-height: 340px; }` | The poster placeholder is at least 340px tall. |
| `.conf h2 { margin-bottom: 16px; font-size: clamp(32px, 4.4vw, 52px); }` | Conference title size and spacing. |
| `.conf p {` | The description. |
| `max-width: 480px; margin: 0 0 28px; color: var(--muted);` | Narrow width, space below, soft text color. |
| `.conf .btn { background: var(--maroon); border-color: var(--maroon); color: #fff; }` | In this section the button is maroon instead of yellow. |
| `.conf .btn:hover { ...yellow... }` | On hover it turns yellow with black text. |
| `.meta {` | The date, venue and deadline list. |
| `display: flex; flex-wrap: wrap; gap: 8px 20px;` | Items in a row. `8px 20px` means 8px between rows and 20px between columns. |
| `margin: 0 0 16px; padding: 0;` | Removes the list's default left indent. |
| `list-style: none; font-weight: 700;` | Removes the default bullets and makes the text bold. |
| `.meta li::before {` | A custom bullet in front of each item. |
| `content: ""; display: inline-block;` | Creates a small box that sits inline with the text. |
| `width: 8px; height: 8px; margin-right: 8px;` | A little square with a gap after it. |
| `background: var(--yellow); border: 1px solid var(--black);` | Yellow fill with a thin black outline. |

## 9. Cards

| Code | What it does |
|---|---|
| `.grid3 {` | The container holding the cards. |
| `display: grid;` | Grid layout. |
| `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));` | As many equal columns as fit, each at least 260px. Three on desktop, one on a phone. |
| `gap: 24px;` | Space between the cards. |
| `.card {` | One card. |
| `display: flex; flex-direction: column;` | Stacks the card's contents top to bottom. |
| `gap: 10px; padding: 24px;` | Space between the items, and space inside the card. |
| `background: var(--card);` | Card color (white, or dark in dark mode). |
| `border: 1px solid var(--line);` | Thin outline. |
| `border-top: 5px solid var(--maroon);` | A thick maroon strip on top, which overrides the top part of the border above. |
| `border-radius: 4px;` | Slightly rounded. |
| `transition: transform 0.25s, box-shadow 0.25s, border-top-color 0.25s;` | The hover effects animate smoothly. |
| `.card:hover {` | When the mouse is over a card: |
| `transform: translateY(-6px);` | The card lifts 6px. |
| `border-top-color: var(--yellow);` | The top strip turns yellow. |
| `box-shadow: 0 16px 32px rgba(20, 16, 16, 0.18);` | A big soft shadow appears under it. |
| `.card .ph { height: 130px; margin-bottom: 6px; }` | The image placeholder in a card is 130px tall. |
| `.card h3 { font-size: 22px; }` | Card title size. |
| `.card p { margin: 0; color: var(--muted); font-size: 15px; }` | Card text: no extra spacing, soft color, a bit smaller. |
| `.card a.more {` | The "Read the background guide" link. |
| `margin-top: auto;` | Pushes the link to the very bottom of the card, so links line up even when cards have different text lengths. |
| `padding-top: 8px; color: var(--accent); font-weight: 700;` | Space above, accent color, bold. |
| `.tag {` | The small label (GA, SC, NEWS). |
| `display: inline-block; align-self: flex-start;` | Only as wide as its text, aligned left (otherwise it would stretch across the card). |
| `padding: 4px 10px;` | Space inside. |
| `background: var(--black); color: var(--yellow);` | Black label with yellow text. |
| `border-radius: 2px;` | Barely rounded. |
| `font-size: 12px; font-weight: 700; letter-spacing: 0.1em;` | Small, bold, spaced. |

## 10. Join and footer

| Code | What it does |
|---|---|
| `.join {` | The dark call-to-action section. |
| `background: radial-gradient(circle at 50% 0%, #3b1119 0%, var(--black) 65%);` | A circular gradient centered at the top. It starts as a dark red glow and fades into black by 65% of the way out. |
| `color: #fff; text-align: center;` | White, centered text. |
| `.join .wrap {` | The content box. |
| `display: flex; flex-direction: column; align-items: center;` | Stacks heading, text and button in a centered column. |
| `gap: 20px;` | Space between them. |
| `padding-top: 88px; padding-bottom: 88px;` | Generous space above and below. |
| `.join h2 { color: var(--yellow); font-size: clamp(32px, 5vw, 56px); }` | Yellow responsive heading. |
| `.join p { max-width: 520px; margin: 0; color: #d8cccc; }` | Narrow, light grey paragraph. |
| `footer {` | The bottom of the page. |
| `background: var(--maroon-d); color: #f3dfe2;` | Dark maroon with soft pink text. |
| `border-top: 4px solid var(--yellow);` | Yellow line at the top. |
| `font-size: 14px;` | Small text. |
| `footer .wrap {` | The footer's content box. |
| `display: flex; flex-wrap: wrap; justify-content: space-between;` | Three groups in a row, spread out, wrapping on small screens. |
| `gap: 24px; padding-top: 40px; padding-bottom: 40px;` | Spacing. |
| `footer .logo { color: #fff; font-size: 20px; }` | A slightly smaller white logo. |
| `footer .links { display: flex; flex-wrap: wrap; gap: 8px 24px; }` | Footer links in a row with space between. |
| `footer .links a { padding: 8px 0; }` | A taller click area. |
| `footer .links a:hover { color: var(--yellow); }` | Yellow on hover. |

## 11. Animations

| Code | What it does |
|---|---|
| `@keyframes fade-in {` | Defines an animation named `fade-in`. Keyframes say how it starts and how it ends. |
| `from { opacity: 0; }` | Start fully invisible. (`opacity` goes from 0 to 1.) |
| `to { opacity: 1; }` | End fully visible. |
| `@keyframes fade-up {` | A second animation, named `fade-up`. |
| `from { opacity: 0; transform: translateY(24px); }` | Start invisible and 24px lower than the final position. |
| `to { opacity: 1; transform: none; }` | End visible and in the normal position. |
| `.reveal {` | The starting look of elements that will fade in on scroll. JavaScript adds this class. |
| `opacity: 0; transform: translateY(28px);` | Invisible and a little low. |
| `transition: opacity 0.7s ease, transform 0.7s ease;` | When the class changes, glide to the new look over 0.7 seconds. |
| `.reveal.is-visible { opacity: 1; transform: none; }` | JavaScript adds `is-visible` when the element scrolls into view, so it fades in and moves up. |
| `@media (prefers-reduced-motion: reduce) {` | "If the visitor has asked their device to reduce motion", which is an accessibility setting. |
| `*, *::before, *::after {` | Every element. |
| `animation: none !important; transition: none !important;` | Turns off all animations and transitions. `!important` makes this win over other rules. |
| `.reveal { opacity: 1; transform: none; }` | Makes sure revealed elements are simply visible, not hidden. |

## 12. Mobile (screens narrower than 860px)

| Code | What it does |
|---|---|
| `@media (max-width: 860px) {` | Everything inside this block only applies when the window is 860px wide or less (tablets and phones). It overrides the earlier rules. |
| `.burger { display: inline-flex; align-items: center; justify-content: center; }` | Shows the menu button and centers the icon in it. |
| `nav {` | The menu becomes a dropdown. |
| `display: none;` | Hidden until the burger is tapped. |
| `position: absolute; top: 100%; left: 0; right: 0;` | Placed just under the header, stretched across the full width. |
| `flex-direction: column; align-items: stretch; gap: 0;` | Links stacked vertically, each full width. |
| `padding: 8px 24px 20px; background: var(--black);` | Spacing and a black background. |
| `border-bottom: 3px solid var(--yellow);` | Yellow line under the dropdown. |
| `nav.open { display: flex; }` | When JavaScript adds the `open` class, the menu appears. |
| `nav a:not(.btn) { padding: 14px 0; border-bottom: 1px solid #2c2222; }` | Taller links with thin dividers. |
| `nav a:not(.btn)::after { display: none; }` | No hover underline on touch screens. |
| `nav .btn { margin-top: 16px; }` | Space above the Register button. |
| `.hero__photo {` | Photo on mobile. |
| `width: 100%; opacity: 0.3;` | Covers the entire hero, but at 30% strength so the text stays readable. |
| `mask-image: linear-gradient(to bottom, #000 0%, transparent 100%);` | The fade now goes top to bottom instead of left to right. |
| `.hero__content { padding-top: 64px; padding-bottom: 64px; }` | Less vertical space on a phone. |
| `.conf { grid-template-columns: 1fr; }` | The conference section becomes one column. |
| `section.block { padding: 60px 0; }` | Less space between sections. |
| `}` | Ends the mobile block. |

---

# Part 3: `js/main.js`

JavaScript makes the page *do* things. Lines that start with `//` or sit inside `/* */` are comments.

## 1. Mobile menu

| Code | What it does |
|---|---|
| `const burger = document.getElementById('burger');` | `const` creates a variable that will not be reassigned. `document` is the whole page, and `getElementById('burger')` finds the element with `id="burger"`. So `burger` now points to the menu button. |
| `const nav = document.getElementById('nav');` | Same for the menu. |
| `function setMenu(open) {` | Defines a reusable function named `setMenu`. `open` will be `true` or `false` when we call it. |
| `nav.classList.toggle('open', open);` | `classList` is the element's list of classes. `toggle('open', open)` adds the class `open` when `open` is `true`, and removes it when `false`. The CSS shows the menu when it has `open`. |
| `burger.setAttribute('aria-expanded', open);` | Updates the `aria-expanded` attribute so screen readers announce whether the menu is open. |
| `}` | Ends the function. |
| `burger.addEventListener('click', () => {` | "When the button is clicked, run this code." `() => { }` is an arrow function, a short way to write a function. |
| `setMenu(!nav.classList.contains('open'));` | `contains('open')` is true if the menu is open. The `!` flips it, so an open menu closes and a closed menu opens. |
| `});` | Ends the click handler. |
| `nav.addEventListener('click', (event) => {` | Listens for clicks anywhere inside the menu. `event` is information about what was clicked. |
| `if (event.target.tagName === 'A') {` | `event.target` is the exact thing clicked. `tagName === 'A'` checks it is a link. (`===` means "is exactly equal to".) |
| `setMenu(false);` | Closes the menu after a link is tapped. |
| `}` and `});` | End the `if` and the handler. |

## 2. Header shadow

| Code | What it does |
|---|---|
| `const header = document.querySelector('.top');` | `querySelector` finds the first element matching a CSS selector. Here, the header (`.top`). |
| `function updateHeader() {` | A function that decides whether the header has a shadow. |
| `header.classList.toggle('scrolled', window.scrollY > 10);` | `window.scrollY` is how many pixels you have scrolled down. If it is more than 10, the class `scrolled` is added (shadow on). Otherwise it is removed. |
| `window.addEventListener('scroll', updateHeader, { passive: true });` | Runs `updateHeader` every time you scroll. `passive: true` promises the browser we will not block scrolling, which keeps scrolling smooth. |
| `updateHeader();` | Runs it once right away, in case the page loads already scrolled. |

## 3. Fade in on scroll

| Code | What it does |
|---|---|
| `const revealTargets = document.querySelectorAll('.card, .conf > *, .head, .join .wrap > *');` | `querySelectorAll` finds *all* matches. This collects every card, every direct child of the conference box, every section title row and every item in the join box. |
| `if ('IntersectionObserver' in window) {` | Checks the browser supports `IntersectionObserver`, a tool that notices when elements enter the screen. Very old browsers skip the effect and show everything normally. |
| `const observer = new IntersectionObserver((entries) => {` | Creates the watcher. The function runs whenever watched elements change visibility, and `entries` is the list of changes. |
| `entries.forEach((entry) => {` | Loops through each change, one at a time. |
| `if (entry.isIntersecting) {` | True when that element is now on screen. |
| `entry.target.classList.add('is-visible');` | Adds `is-visible`, which makes the CSS fade it in. |
| `observer.unobserve(entry.target);` | Stops watching it, so the effect plays only once. |
| `}` `});` | End the `if` and the loop. |
| `}, { threshold: 0.15 });` | Settings: trigger when 15% of the element is visible. |
| `revealTargets.forEach((element) => {` | Loops over every target. |
| `element.classList.add('reveal');` | Gives it the starting (invisible) look. |
| `observer.observe(element);` | Tells the watcher to start watching it. |
| `});` and `}` | End the loop and the `if`. |

---

# Try it yourself

Small experiments are the fastest way to learn. Change one thing, save, refresh the browser.

1. In `style.css`, change `--maroon: #7A1425;` to another color and watch every red area change.
2. Change `width: 68%;` in `.hero__photo` to `100%` and see how far the photo spreads.
3. Replace `lighten` with `normal` in `mix-blend-mode` to see what the photo looks like without the blend effect.
4. In `.card:hover`, change `-6px` to `-20px` to exaggerate the lift.
5. In `index.html`, replace one `[IMAGE]` placeholder with `<img src="images/your-photo.jpg" alt="Describe it">`.
