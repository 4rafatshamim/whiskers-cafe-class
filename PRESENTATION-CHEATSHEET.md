# Presentation cheat sheet (Whiskers Café, class version)

Say things in your own words. This is just a map so you never freeze.

## The 30-second pitch
"I built a website for a cat café in Phagwara. Customers can browse the menu, meet the cats and staff, watch cat videos, and pre-order so they skip the queue. There's also a cat that follows your mouse around."

## Suggested 5-minute demo
1. **Open the home page.** Point at the pastel design and the CSS-drawn cat in the hero. "That cat is made only with CSS shapes."
2. **Shrink the browser window.** The layout rearranges for phones. "That's a media query."
3. **Move the mouse.** The cat walks in and follows you. Stop moving, wait: it sits, then sleeps. Click: a heart pops and the cat hops.
4. **Click "Add to order"** on two items. The 🛒 number goes up.
5. **Open the order page.** Use + and −, watch the total change, type a name, press send. Show the message it built.
6. **Scroll to the staff.** Read one funny story.

## What each file is, in plain English
- `index.html`: the words and structure of the main page.
- `order.html`: the same idea for the order page.
- `styles.css`: colours, layout and animations.
- `cat.js`: the cat and the hearts.
- `cart.js`: the cart, sending the order to the backend, the WhatsApp backup, sold-out buttons.
- `config.js`: settings in one place.
- `staff.html` / `staff.js`: the staff page.
- `backend/Code.gs`: the server code (Google Apps Script).

## HTML you should be able to explain
- **Semantic tags:** `header`, `nav`, `main`, `section`, `footer`, `figure`, `ul/li`. "They describe what each part *is*, not just how it looks. That helps screen readers and search engines."
- **Why lists for cards:** "The menu is a list of items, so it's a `ul` with `li`s."
- **`alt` text on images:** "So people using screen readers know what the picture shows."

## CSS you should be able to explain
- **Variables:** `--berry`, `--cream` at the top. "Change a colour once and it changes everywhere."
- **Flexbox:** used for the navigation bar and rows. **Grid:** used for the menu cards (`repeat(3, 1fr)` = three equal columns).
- **Media query:** `@media (max-width: 760px)`. "Below that width the layout switches to one column."
- **The CSS cat:** shapes using `border-radius`, `position: absolute` and `transform`.
- **Animations:** `@keyframes` for the cat's tail, blink, hop and the floating hearts.

## JavaScript, one idea at a time
1. **Find an element, react to a click:**
   `button.addEventListener('click', function () { ... })`
   "When the button is clicked, run this code."
2. **The cart is an object:** `{ latte: 2, matcha: 1 }`. Plus adds 1, minus subtracts 1.
3. **The total is a loop:** for each item, add `quantity × price`.
4. **localStorage:** "A tiny notebook in the browser so the cart survives changing pages."
5. **The WhatsApp message:** build a text string, then open `wa.me/number?text=...`. `encodeURIComponent` makes the text safe to put in a link.
6. **The cat:** "About 60 times a second the cat moves a little closer to your mouse. If you stop moving, it counts how long you've been still, then sits, then sleeps."
7. **Missing photos:** "If an image fails to load, we hide it so the emoji shows instead."

## Questions your teacher might ask (and answers)
- **"What if someone's phone doesn't have a mouse?"** "The cat only runs when there's a mouse. On phones it's hidden, but tapping still pops hearts."
- **"Is the order saved anywhere?"** "Yes, in a Google Sheet, through a small Apps Script backend. WhatsApp is only the backup."
- **"Why does the cart survive when you change pages?"** "localStorage."
- **"How do you stop someone ordering 1000 lattes?"** "There's a maximum of 10 per item. A real shop would also check on a server."
- **"What would you add next?"** "A backend to save orders, online payment, and live 'sold out' items."
- **"What was the hardest part?"** Pick one honestly: the cat's movement, or making the layout work on phones.
- **"How did you build it?"** Be ready to answer honestly, including any help you used, and check what your course allows.

## If something goes wrong in the demo
- Cat doesn't appear: move the mouse once; it only shows after the first move.
- No photos: expected, the emojis are the fallback.
- WhatsApp doesn't open: demo mode shows the message on the page, which is enough.

## The backend in plain English
Flow: **browser → Apps Script → Google Sheet.** The Sheet is our database, with 3 tabs: Orders, Menu, Staff.
- **fetch():** "The browser's way of sending a request to a server and reading the reply (as JSON)."
- **Order:** the browser sends only item ids and quantities. The server looks up prices in the Menu tab and works out the total. "Never trust the browser, someone could edit the price in dev tools."
- **Server checks:** valid phone, pickup time between 10:00 and 18:45, 15 minutes notice, closed Mondays, max 10 per item, not sold out.
- **Sold out:** staff tick it off on `staff.html`, which writes to the Menu tab. Customer pages ask the backend every 60 seconds and disable the button.
- **Login:** passwords are never stored. We store `hash(salt + password)`. A hash is a one-way scramble: you can check a password against it but can't get the password back. The salt is a random extra string so two people with the same password get different hashes.
- **Token:** after login the server gives a long random string that lasts 6 hours. Staff actions must send it, otherwise "please log in again".
- **5 wrong passwords** locks that username for 15 minutes (stops guessing).
- **LockService:** "Makes requests wait in line so two orders can't write the same row at once."

## More questions the teacher might ask
- **"Why Google Sheets as the database?"** "Free, no server to run, and the café owner can read it like a normal spreadsheet."
- **"What are the limits?"** "SHA-256 with salt is good but bcrypt is stronger and Apps Script doesn't have it. Email quota per day. Pickup is same-day only. No online payment."
- **"What if the backend is down?"** "The customer sees a message and the WhatsApp button sends the same order."
- **"What stops someone changing prices?"** "The server ignores prices from the browser and uses the sheet."

## Who explains what (suggested, change as you like)
| Person | Owns | Be ready to change live |
|---|---|---|
| Saurav | `index.html`, `order.html`, `styles.css`: structure, CSS, responsive | a colour, a heading, a menu item's text |
| Varun | `cart.js`, `cat.js`: cart, localStorage, order sending, sold-out buttons | the max per item, the order message text |
| Arafat | `backend/Code.gs`, `staff.js`: Sheet, validation, login | the opening hours, the max quantity, the lockout count |
Everyone must still understand the whole flow.
