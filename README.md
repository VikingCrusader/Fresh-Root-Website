# FreshRoots Cooperative

Course project (semestral work): a web marketplace connecting local farmers near Prague with consumers.
It has two sides: a shop and account for customers, and a portal for farmers.

## Files

| File | What it is |
|---|---|
| `FreshRoots_Cooperative.html` | Main app (single page, hash routing) |
| `login.html` | Log in / register for customers and farmers |
| `presentation.html` | Interactive slide deck for Exercises 3–4 (← → keys, F = full screen) |
| `i18n.js` | All UI text in 5 languages (EN, CS, DE, 简体中文, 繁體中文) |
| `data.js` | Demo farms, products, stock, demo accounts and seed orders |
| `script.js` | App logic (cart, filters, map, checkout, account, farmer portal) |
| `style.css` | Styles (responsive) |
| `_backup_original/` | The original paper-prototype version |

## Routes

| Route | Page |
|---|---|
| `#/home`, `#/browse`, `#/map`, `#/farm/:id` | Shop |
| `#/cart`, `#/checkout`, `#/order/:id` | Cart and checkout |
| `#/account/orders`, `/follows`, `/messages`, `/profile` | Customer account |
| `#/farmer/overview`, `/products`, `/orders`, `/messages` | Farmer portal |

## Demo logins

| Role | E-mail | Password |
|---|---|---|
| Customer | `anna@example.com` | `demo123` |
| Farmer (Green Valley Farm) | `hello@greenvalley.example` | `farm123` |

Every farm can log in with its own e-mail (shown on the farm page) and `farm123`.

Shortcuts without typing a password, used by the slide deck:
`FreshRoots_Cooperative.html?demo=customer#/account` and `FreshRoots_Cooperative.html?demo=farmer#/farmer`.

## Run

Open `FreshRoots_Cooperative.html` or `presentation.html` in a browser. No build step and no server needed.
All data (cart, stock, orders, messages, accounts, language) is stored in the browser's `localStorage`.
Use **Reset demo data** in the farmer portal to restore the starting state before a presentation.

> Demo only: passwords are stored in plain text in the browser. A real product would use a server and hashed passwords.
