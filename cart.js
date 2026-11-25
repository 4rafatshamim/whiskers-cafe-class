/* ==========================================================
   cart.js  -  the pre-order cart
   Works on index.html (the "Add to order" buttons + the 🛒 badge)
   and on order.html (the full cart and the WhatsApp message).
   ========================================================== */

// ---------- 1. SETTINGS (they live in config.js) ----------
const CONFIG = window.WHISKERS_CONFIG || {};
const WHATSAPP_NUMBER = CONFIG.whatsapp || '';
const CAFE_NAME = CONFIG.name || 'Whiskers Café';
const BACKEND_URL = CONFIG.backendUrl || '';     // the Google Apps Script link. Empty = WhatsApp-only mode
const MAX_QTY = 10;

// ---------- 2. THE CART ----------
// The cart is just an object that says how many of each item we have.
// Example:  { latte: 2, matcha: 1 }   means 2 lattes and 1 matcha.
let cart = {};
let renderOrderPage = null;   // order.html fills this in, so other code can redraw that page

// Only restore known menu items with whole-number quantities from 1 to 10.
const knownItemIds = new Set(Array.from(document.querySelectorAll('[data-add], .order-item[data-id]'))
  .map(function (element) { return element.dataset.add || element.dataset.id; }));
try {
  const savedCart = JSON.parse(localStorage.getItem('whiskers-cart')) || {};
  if (savedCart && typeof savedCart === 'object' && !Array.isArray(savedCart)) {
    Object.keys(savedCart).forEach(function (id) {
      const qty = savedCart[id];
      if (knownItemIds.has(id) && Number.isInteger(qty) && qty >= 1 && qty <= MAX_QTY) cart[id] = qty;
    });
  }
} catch (error) {
  cart = {};
}

function saveCart() {
  try {
    localStorage.setItem('whiskers-cart', JSON.stringify(cart));
  } catch (error) {
    // storage blocked: the cart still works until the page closes
  }
}

// add up how many items are in the cart
function countItems() {
  let total = 0;
  Object.keys(cart).forEach(function (id) {
    total += cart[id];
  });
  return total;
}

// update the little number on the 🛒 in the menu bar
function updateBadge() {
  const badge = document.querySelector('[data-cart-count]');
  if (!badge) return;
  const count = countItems();
  badge.textContent = count;
  badge.hidden = count === 0;      // hide the badge when the cart is empty
}

// ---------- 3. "ADD TO ORDER" BUTTONS (index.html) ----------
const addButtons = document.querySelectorAll('[data-add]');
let menuAvailability = Object.create(null);
let menuStatusReady = !BACKEND_URL;
let menuStatusInFlight = false;

function updateAddButton(button) {
  const available = menuAvailability[button.dataset.add];
  if (!menuStatusReady) {
    button.disabled = true;
    button.textContent = 'Checking availability…';
  } else if (available === false) {
    button.disabled = true;
    button.textContent = 'Sold out today';
  } else {
    button.disabled = false;
    button.textContent = button.dataset.label;
  }
}

addButtons.forEach(function (button) {
  button.dataset.label = button.textContent.trim(); // keep the original label for stock changes
  updateAddButton(button);
  button.addEventListener('click', function () {
    const id = button.dataset.add;
    if (!knownItemIds.has(id)) return;
    if (!menuStatusReady) return;               // don't allow clicks before the first stock check
    if (menuAvailability[id] === false) {
      updateAddButton(button);
      return;
    }
    const oldText = button.dataset.label;
    if ((cart[id] || 0) >= MAX_QTY) {
      button.textContent = 'Limit: 10 per item';
      setTimeout(function () { updateAddButton(button); }, 1100);
      return;
    }
    cart[id] = (cart[id] || 0) + 1;
    saveCart();
    updateBadge();

    button.textContent = 'Added ♥';
    setTimeout(function () { updateAddButton(button); }, 1000);
  });
});

// ---------- 4. THE ORDER PAGE (order.html) ----------
const orderList = document.querySelector('.order-list');

if (orderList) {                              // only run this part on order.html
  const summaryList = document.querySelector('#summary-list');
  const summaryEmpty = document.querySelector('#summary-empty');
  const totalEl = document.querySelector('#order-total');
  const form = document.querySelector('#order-form');
  const preview = document.querySelector('#order-preview');
  const message = document.querySelector('#order-message');
  const rows = document.querySelectorAll('.order-item');

  // Draw everything on the page from the cart (runs every time the cart changes)
  function render() {
    let total = 0;
    summaryList.innerHTML = '';

    rows.forEach(function (row) {
      const id = row.dataset.id;
      const name = row.dataset.name;
      const price = Number(row.dataset.price);   // data-price is text, so turn it into a number
      const qty = cart[id] || 0;

      row.querySelector('output').textContent = qty;   // the number between − and +
      row.querySelector('[data-dec]').disabled = qty === 0;
      row.querySelector('[data-inc]').disabled = qty >= MAX_QTY || row.classList.contains('is-soldout') || (BACKEND_URL && !menuStatusReady);

      if (qty > 0) {
        total = total + qty * price;
        summaryList.innerHTML += '<li><span>' + qty + ' × ' + name + '</span><span>₹' + (qty * price) + '</span></li>';
      }
    });

    summaryEmpty.hidden = countItems() > 0;
    totalEl.textContent = '₹' + total;
    updateBadge();
  }

  // One click listener for all the + and − buttons ("event delegation")
  orderList.addEventListener('click', function (event) {
    const button = event.target.closest('button');
    if (!button) return;

    const id = button.closest('.order-item').dataset.id;
    if (button.hasAttribute('data-inc') && (cart[id] || 0) < MAX_QTY && !button.disabled) {
      cart[id] = (cart[id] || 0) + 1;
    }
    if (button.hasAttribute('data-dec') && cart[id] > 0) {
      cart[id] = cart[id] - 1;
      if (cart[id] === 0) delete cart[id];      // remove it from the cart at zero
    }
    saveCart();
    render();
  });

  document.querySelector('#clear-order').addEventListener('click', function () {
    cart = {};
    saveCart();
    preview.hidden = true;
    render();
  });

  // Build the order as plain text (used for the WhatsApp message and the preview)
  function buildMessage() {
    let text = 'Hi ' + CAFE_NAME + '! New pre-order 🐾\n';
    text += 'Name: ' + form.elements.customer.value + '\n';
    text += 'Phone: ' + form.elements.phone.value + '\n';
    text += 'Pickup: today at ' + form.elements.pickup.value + '\n\nItems:\n';
    let total = 0;
    rows.forEach(function (row) {
      const qty = cart[row.dataset.id] || 0;
      if (qty > 0) {
        const price = Number(row.dataset.price);
        total = total + qty * price;
        text += '- ' + qty + ' x ' + row.dataset.name + ' (₹' + (qty * price) + ')\n';
      }
    });
    text += '\nTotal: ₹' + total + ' (pay at pickup)';
    if (form.elements.notes.value) text += '\nNotes: ' + form.elements.notes.value;
    return text;
  }

  function showMessage(text, kind) {
    message.textContent = text;
    message.dataset.kind = kind || '';
    message.hidden = false;
  }

  // Basic checks before we send anything (the server checks again, never trust the browser)
  function formIsValid() {
    if (countItems() === 0) { showMessage('Your order is empty. Add something yummy first 🍪', 'warn'); return false; }
    if (!form.elements.customer.value.trim()) { showMessage('Please enter your name.', 'error'); return false; }
    const phone = form.elements.phone.value.replace(/\D/g, '').slice(-10);   // keep the last 10 digits
    if (!/^[6-9][0-9]{9}$/.test(phone)) { showMessage('Please enter a valid 10-digit mobile number.', 'error'); return false; }
    return true;
  }

  // MAIN WAY: send the order to the Google Sheet through the backend
  form.addEventListener('submit', function (event) {
    event.preventDefault();                     // stop the page from reloading
    if (!formIsValid()) return;

    if (!BACKEND_URL) { sendOnWhatsApp(); return; }   // no backend set up: use WhatsApp instead

    const items = [];
    for (const id in cart) items.push({ id: id, qty: cart[id] });   // the items array contains IDs and quantities, never prices
    const button = document.querySelector('#place-btn');
    const originalButtonText = button.textContent;
    button.disabled = true;                      // stops accidental double clicks
    button.textContent = 'Placing order…';
    form.setAttribute('aria-busy', 'true');
    showMessage('Placing your order…', '');

    fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // plain text avoids a CORS pre-check with Apps Script
      body: JSON.stringify({
        name: form.elements.customer.value.trim(),
        phone: form.elements.phone.value,
        time: form.elements.pickup.value,
        notes: form.elements.notes.value.trim(),
        items: items
      })
    })
      .then(function (response) {
        if (!response.ok) throw new Error('The server returned an error.');
        return response.json();
      })
      .then(function (result) {
        if (result.ok) {
          cart = {};
          saveCart();
          render();
          showMessage('✅ Order ' + result.orderNumber + ' placed! Total ₹' + result.total + '. Show this number at the counter and pay at pickup.', '');
        } else {
          showMessage(result.error || 'Something went wrong. Please try again.', 'error');
          loadMenuStatus();                      // maybe an item just sold out, refresh
        }
      })
      .catch(function () {
        showMessage('Could not reach the server. Your cart is still saved. Please try again or use the WhatsApp option.', 'error');
      })
      .then(function () {
        button.disabled = false;
        button.textContent = originalButtonText;
        form.removeAttribute('aria-busy');
      });
  });

  // BACKUP WAY: open WhatsApp with the order text (also the only way if there is no backend)
  function sendOnWhatsApp() {
    if (!formIsValid()) return;
    const text = buildMessage();
    preview.textContent = text;                 // show the message on the page (great for a demo)
    preview.hidden = false;
    if (WHATSAPP_NUMBER) {
      // encodeURIComponent makes the text safe to put inside a link
      window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text), '_blank');
      showMessage('Opening WhatsApp. Press send there to place your order.', '');
    } else {
      showMessage('Demo mode: add the café WhatsApp number in config.js to send this for real.', 'warn');
    }
  }
  document.querySelector('#whatsapp-btn').addEventListener('click', sendOnWhatsApp);

  renderOrderPage = render;
  render();
}

// run once when the page loads so the badge shows the saved cart
updateBadge();

// ---------- 5. SOLD-OUT ITEMS (live from the Google Sheet) ----------
// Customer pages check availability on load, about every 12 seconds, and when
// the visitor returns to the tab. The backend still validates every order.
function applyMenuStatus(items) {
  items.forEach(function (item) {
    menuAvailability[item.id] = item.available === true;
    const soldOut = !menuAvailability[item.id];

    document.querySelectorAll('[data-add="' + item.id + '"]').forEach(function (button) {
      updateAddButton(button);
    });

    document.querySelectorAll('.order-item[data-id="' + item.id + '"]').forEach(function (row) {
      row.classList.toggle('is-soldout', soldOut);
      const title = row.querySelector('.order-info h3');
      if (!title) return;
      let tag = title.querySelector('.soldout-tag');
      if (soldOut && !tag) {
        tag = document.createElement('span');
        tag.className = 'soldout-tag';
        tag.textContent = 'Sold out today';
        title.appendChild(tag);
      } else if (!soldOut && tag) {
        tag.remove();
      }
    });

    // Remove unavailable items from a saved cart. If staff restore an item later,
    // the Add to Order button and quantity controls become available again.
    if (soldOut && cart[item.id]) {
      delete cart[item.id];
      saveCart();
    }
  });

  menuStatusReady = true;
  addButtons.forEach(updateAddButton);
  updateBadge();
  if (renderOrderPage) renderOrderPage();
}

function loadMenuStatus() {
  if (!BACKEND_URL || menuStatusInFlight) return Promise.resolve();
  menuStatusInFlight = true;

  const separator = BACKEND_URL.indexOf('?') === -1 ? '?' : '&';
  const url = BACKEND_URL + separator + 'action=menu&_=' + Date.now();
  return fetch(url, { cache: 'no-store' })
    .then(function (response) {
      if (!response.ok) throw new Error('Could not load menu availability.');
      return response.json();
    })
    .then(function (data) {
      if (!data || !data.ok || !Array.isArray(data.items)) throw new Error('Invalid menu response.');
      applyMenuStatus(data.items);
    })
    .catch(function () {
      // If the status endpoint is temporarily unavailable, let the page remain usable.
      // The backend performs the authoritative stock check when an order is submitted.
      if (!menuStatusReady) {
        menuStatusReady = true;
        addButtons.forEach(updateAddButton);
        if (renderOrderPage) renderOrderPage();
      }
    })
    .then(function () {
      menuStatusInFlight = false;
    });
}

loadMenuStatus();
setInterval(loadMenuStatus, 12000);
window.addEventListener('focus', loadMenuStatus);
document.addEventListener('visibilitychange', function () {
  if (!document.hidden) loadMenuStatus();
});
