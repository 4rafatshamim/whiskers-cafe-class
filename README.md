# Whiskers Café — class project

Whiskers Café is a student website prototype for a cat-café concept in Phagwara, Punjab. It brings together a customer-facing menu and pre-order flow with a small staff dashboard for order status and menu availability. It is an academic prototype, not a claim that a physical café is operating at this address.

The front end uses HTML, CSS and vanilla JavaScript. A Google Apps Script web app provides the optional backend and uses Google Sheets to store orders and menu availability. No front-end framework is used.

## Open the website

Keep the project folder structure intact. Open `index.html` to view the home page. The customer order workflow and staff dashboard need the Google Apps Script backend to be deployed and connected through `config.js`; see `backend/SETUP.md`.

## What's included

- `index.html` — home page, menu, cat videos, cat profiles, staff section and visit details
- `order.html` — pre-order page with item quantities, customer details and pickup time
- `styles.css` — colour system, page layout, responsive styles and animations
- `cat.js` — pointer-following cat buddy, click effects and media fallbacks
- `cart.js` — cart state, local storage, order submission, WhatsApp fallback and availability checks
- `config.js` — café name, WhatsApp number and Apps Script URL
- `staff.html` and `staff.js` — staff login, menu availability controls and order-status updates
- `backend/Code.gs` — Apps Script order processing and staff actions
- `backend/SETUP.md` — Google Sheet and web-app setup instructions
- `404.html` and `favicon.svg` — not-found page and browser-tab icon
- `assets/images/` and `assets/videos/` — the supplied photographs, video clips and video preview frames

## Media included

- 6 cat photographs in `assets/images/cats/`
- 6 menu photographs in `assets/images/menu/`
- 3 cat video clips in `assets/videos/`
- 3 JPEG poster frames in `assets/videos/`, each extracted from its matching supplied MP4
- 3 team portraits in `assets/images/staff/`

The supplied photo bytes and MP4 video bytes have been preserved. The photo file extensions were corrected to match their actual formats (WebP and GIF); the images were not recompressed or replaced. The cat-photo cards no longer place the old illustrated eyes, nose or ears over the photographs. If a cat photo fails to load, the matching initial is shown instead. Menu cards fall back to their emoji illustrations.

Three team portraits are included in `assets/images/staff/`: `saurav.jpg`, `arafat.jpg` and `varun.jpg`. The staff cards are displayed in the order Saurav, Arafat and Varun. If a portrait fails to load, the matching initial is shown instead.

The video players show a preview frame before playback, start muted, and allow visitors to turn sound on using the player controls. The clips themselves have not been edited.

## Before the class demo

1. Follow `backend/SETUP.md` to configure the Google Sheet, staff accounts and Apps Script web app.
2. Check the café contact details and backend URL in `config.js` before publishing or sharing the site.
3. Replace the placeholder `OWNER_EMAIL` in `backend/Code.gs` with the intended notification address, then deploy the updated Apps Script.
4. Confirm that the deployed Apps Script URL matches the version in `config.js`.
5. Test one order and one staff availability change in a controlled test sheet before recording. Do not use a live sheet with real customer data for rehearsal.
6. Keep the full project folder together when moving it to another computer or hosting service.

If the backend is not connected, explain that the site is being shown in prototype mode. The WhatsApp option can prepare an order message when the number is configured, but it does not save an order to the Google Sheet.

## How pre-ordering works

A customer adds menu items to the cart, then enters a name, phone number, pickup time and optional note. The cart is stored in the browser with `localStorage`, so it remains available when moving between the home and order pages. The browser checks saved cart entries and limits each menu item to 10.

When the customer submits an order, the browser sends the customer's name, phone number, pickup time, optional notes, and an array of menu item IDs and quantities to the Apps Script backend. It does not send prices. The backend reads the current prices and availability from the `Menu` sheet, checks the order, calculates the total itself and saves the order in the `Orders` sheet. An email notification is attempted using the address configured in `backend/Code.gs`; the order is still saved if that email attempt fails. Payment is made at pickup. The site does not process online payments.

The backend checks the phone number, same-day pickup time, opening window (10:00–18:45), 15-minute preparation notice, Monday closure, item availability and the maximum quantity of 10 per item. These checks run on the server as well as the basic checks in the browser.

If the backend is unavailable or not configured, the customer can use the WhatsApp option to prepare an order message instead. This fallback does not create a Google Sheets order.

## Staff dashboard

The staff page is linked from the website footer. The page itself is a static file; staff data and management actions require a valid login token. After the Google Sheet and staff accounts are set up, staff can:

- view recent orders and their details
- change an order's status (New, Preparing, Ready, Picked up or Cancelled)
- mark menu items as sold out or available again

The customer pages check menu availability about every 12 seconds, and when the visitor returns to the tab. The backend also checks availability again when an order is submitted. The staff page refreshes its data periodically while it is open.

The current login implementation stores a salted SHA-256 password hash rather than a plain-text password, uses a session token configured for six hours, and temporarily blocks a username after five failed password attempts. This is a class-project implementation, not production-grade authentication: SHA-256 is a fast general-purpose hash, not a dedicated password-hashing function such as Argon2id or bcrypt. Do not reuse important passwords or expose staff credentials in the repository.

## The cat buddy

The cat buddy is an SVG created by the JavaScript. On devices with a mouse-like pointer, it follows the pointer and changes pose after the pointer stays still: it sits after roughly five seconds and sleeps after roughly fourteen seconds. Pointer taps/clicks create a small heart effect. The reduced-motion preference is respected, and the pointer-following cat is not run on touch-only devices.

## Hosting

The front end can be hosted on Vercel, Netlify or GitHub Pages. The Google Apps Script backend is deployed separately as a web app. Follow `backend/SETUP.md` for the backend setup. Do not commit real staff passwords or other private credentials to GitHub.

## Current limitations

- Orders are for same-day pickup only.
- Payment is collected at pickup; there is no online payment gateway.
- There are no customer accounts or order-history page.
- Google Sheets is used as the project's lightweight data store.
- This is an academic prototype and should be tested and hardened before any real commercial use.

## Photo credits

The three staff portraits were supplied by the team for this class project. Add source and licence details for the cat and menu photographs here, and check their usage terms before publishing the site; an image being available online does not automatically mean it is free to reuse.
