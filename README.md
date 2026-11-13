# whiskers café (class version) 🐾

a cozy cat café website for phagwara, punjab. plain html, css and a little javascript, no frameworks. it has a menu, cat tv, the cats, the staff (saurav, varun, arafat), and a pre-order page so people can skip the queue. orders are saved in a google sheet (with a whatsapp backup), and staff log in on a staff page to mark items sold out.

this is the class version: simple code, plus a small google sheet backend (`backend/Code.gs`).

## open it

double click `index.html`. keep all the files together in one folder or stuff breaks (no colors, no cat, etc).

## what's in the folder

- `index.html` the main page (menu, cat tv, cats, about + staff, visit)
- `order.html` the pre-order page (cart + pickup form)
- `styles.css` all the looks: colors, layout, the css cat, phone layout, cat animations
- `cat.js` the hearts on click + the cat that follows your mouse (every block has comments)
- `cart.js` the cart, sending the order to the backend, whatsapp backup, sold-out buttons (every block has comments)
- `config.js` the settings: café name, whatsapp number, backend link
- `staff.html` + `staff.js` the staff page: login, sold-out buttons, order status
- `backend/Code.gs` the google apps script that talks to the google sheet, `backend/SETUP.md` the steps
- `404.html` the "page not found" page, `favicon.svg` the tiny cat in the tab
- `assets/` where photos and videos go

## before presenting (quick to-do)

1. set up the backend with `backend/SETUP.md` and paste its link into `config.js` (`backendUrl`)
2. add photos and videos (names below). nothing breaks if they're missing
3. change the made-up email in the visit section of `index.html`
4. read the staff stories, change anything that isn't true

## photo + video names

**menu** (`assets/images/menu/`): `latte.jpg`, `strawberry-cake.jpg`, `paw-cookies.jpg`, `matcha.jpg`, `mochi.jpg`, `waffles.jpg`

**cats** (`assets/images/cats/`): `mochi.jpg`, `tofu.jpg`, `peaches.jpg`, `mellow.jpg`, `carrie.jpg`, `kai.jpg`

**staff** (`assets/images/staff/`): `saurav.jpg`, `varun.jpg`, `arafat.jpg`

**videos** (`assets/videos/`): `cat1.mp4`, `cat2.mp4`, `cat3.mp4`

keep photos small (under ~150 KB, squoosh.app helps) and videos a few MB. use your own photos or free ones from unsplash / pexels / pixabay, not random pinterest pics.

## how the pre-order works

people add stuff on the menu (or `order.html`), type name, phone and pickup time, and press **place pre-order**. the website sends only item ids + quantities to the backend, which checks everything, works out the total from the prices in the google sheet, saves a row in the **Orders** tab and emails the café. the customer gets an order number. payment is at pickup. if the backend is down, the **whatsapp** button sends the same order as a message.

## staff page

`staff.html` (link in the footer): staff log in (3 accounts, passwords stored as a salted hash in the **Staff** tab), tap **mark sold out** on an item (the customer pages update within a minute) and change order status (New, Preparing, Ready, Picked up, Cancelled).

## the cat buddy

only shows on a computer with a mouse and a wide screen. it appears when you first move the mouse, follows you, sits and falls asleep if you stop, and does random cat stuff (yawn, stretch, groom, wiggle). `🐾 Cat buddy` button turns it off. clicking anywhere pops a heart. if someone has "reduce motion" on, the cat and hearts are off.

## putting it online

github pages: push the folder to a github repo, then repo **Settings → Pages → Deploy from branch → main / root**. you get a link like `https://username.github.io/repo-name/`. (vercel or netlify also work, drag the folder in.)

never put real passwords in the repo. the staff passwords are typed only inside the apps script editor.

## photo credits

- add where the photos are from here once you pick them
