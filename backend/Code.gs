/**
 * Whiskers Café: backend (Google Apps Script)
 *
 * The website talks to this script, and this script reads/writes the Google Sheet.
 *   Website  ->  this script  ->  Google Sheet (tabs: Orders, Menu, Staff)
 *
 * It does 3 jobs:
 *   1. Menu:    tell the website which items are available       (doGet)
 *   2. Orders:  check an order, save it as a row, email the owner (placeOrder)
 *   3. Staff:   login, mark items sold out, change order status  (staffAction)
 *
 * Setup steps are in SETUP.md.
 */

// ---------- settings ----------
var OWNER_EMAIL = 'owner@example.com';       // CHANGE THIS: new-order emails go here
var TIMEZONE = 'Asia/Kolkata';
var OPEN_MINS = 10 * 60;                     // pickup from 10:00
var LAST_PICKUP_MINS = 18 * 60 + 45;         // last pickup 18:45
var PREP_MINS = 15;                          // same-day orders need 15 minutes notice
var CLOSED_DAY = 1;                          // Monday (1 = Monday ... 7 = Sunday)
var MAX_QTY = 10;                            // max of one item per order
var STATUSES = ['New', 'Preparing', 'Ready', 'Picked up', 'Cancelled'];
var ORDER_HEADERS = ['Received', 'Order ID', 'Order #', 'Status', 'Name', 'Phone', 'Pickup date', 'Pickup time', 'Items', 'Total (₹)', 'Notes'];

// Starting menu: [id, name, price, available]. After setup() the "Menu" sheet is the boss.
var DEFAULT_MENU = [
  ['latte', 'Cloud Cat Latte', 180, true],
  ['strawberry-cake', 'Strawberry Daydream', 220, true],
  ['paw-cookies', 'Paw-print Cookies', 120, true],
  ['matcha', 'Purrfect Matcha', 190, true],
  ['mochi', 'Meowchi Bites', 160, true],
  ['waffles', 'Whisker Waffles', 210, true]
];

// ---------- entry points ----------

// GET = the website asks "which items are available?"
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'menu') return json({ ok: true, items: readMenu() });
  return json({ ok: true, service: 'whiskers' });
}

// POST = the website sends an order, or staff do something.
// Do not lock every request: logins and read-only dashboard requests can run together.
// Shared-sheet writes acquire a short lock inside placeOrder() or setCell().
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) return json(fail('Request was empty.'));
    var data = JSON.parse(e.postData.contents);
    var action = String(data.action || 'order');
    if (action === 'order') return json(placeOrder(data));
    return json(staffAction(action, data));
  } catch (err) {
    Logger.log('doPost error: ' + err);
    return json(fail('Something went wrong. Please try again or use WhatsApp.'));
  }
}

// ---------- 2. ORDERS ----------
function placeOrder(data) {
  var name = clean(data.name, 40);
  if (!name) return fail('Please enter your name.');

  var phone = String(data.phone || '').replace(/\D/g, '').slice(-10);
  if (!/^[6-9][0-9]{9}$/.test(phone)) return fail('Please enter a valid 10-digit mobile number.');

  // Check pickup time before acquiring the sheet lock.
  var now = new Date();
  var today = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
  var nowMins = toMins(Utilities.formatDate(now, TIMEZONE, 'HH:mm'));
  if (Number(Utilities.formatDate(now, TIMEZONE, 'u')) === CLOSED_DAY) return fail('We are closed on Mondays. Please order on another day.');
  var time = String(data.time || '');
  if (!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time)) return fail('Please choose a pickup time.');
  var mins = toMins(time);
  if (mins < OPEN_MINS || mins > LAST_PICKUP_MINS) return fail('Pickup is between 10:00 and 18:45.');
  if (mins < nowMins + PREP_MINS) return fail('Please give us about ' + PREP_MINS + ' minutes. Pick a later time.');
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 20) return fail('Your order is empty.');

  var lock = LockService.getScriptLock();
  var orderNumber = '';
  var lines = [];
  var total = 0;
  try {
    // Serialize only the availability check and order-row write. Staff availability
    // changes use the same lock, so a sold-out item cannot slip through this check.
    if (!lock.tryLock(10000)) return fail('The order system is busy. Please try again in a moment.');

    var menu = readMenu();
    for (var i = 0; i < data.items.length; i++) {
      var item = findItem(menu, String(data.items[i].id));
      var qty = Number(data.items[i].qty);
      if (!item) return fail('One item is not on our menu any more. Please refresh the page.');
      if (!item.available) return fail('Sorry, ' + item.name + ' is sold out today. Please remove it.');
      if (!(qty >= 1 && qty <= MAX_QTY) || Math.floor(qty) !== qty) return fail('Please keep each item between 1 and ' + MAX_QTY + '.');
      lines.push(qty + ' x ' + item.name);
      total += qty * item.price;               // total is calculated on the server
    }

    var sheet = sheetByName('Orders');
    orderNumber = 'W' + (1000 + sheet.getLastRow());
    sheet.appendRow([Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd HH:mm:ss'), Utilities.getUuid().slice(0, 8), orderNumber, 'New',
                     name, phone, today, time, lines.join(', '), total, clean(data.notes, 200)]);
  } catch (err) {
    Logger.log('placeOrder error: ' + err);
    return fail('Could not save the order. Please try again or use WhatsApp.');
  } finally {
    try { lock.releaseLock(); } catch (x) { /* lock was not acquired */ }
  }

  // Email can take several seconds. Send it AFTER releasing the sheet lock so it
  // does not hold up staff logins, dashboard reads, or other sheet updates.
  try {
    MailApp.sendEmail(OWNER_EMAIL, 'New pre-order ' + orderNumber + ' for ' + time,
      name + ' (' + phone + ')\nPickup today at ' + time + '\n' + lines.join('\n') + '\nTotal: Rs ' + total + ' (pay at pickup)');
  } catch (mailError) { Logger.log('Order email failed: ' + mailError); }

  return { ok: true, orderNumber: orderNumber, total: total };
}

// ---------- 3. STAFF ----------
// Login gives a random token (a long secret string) that lasts 6 hours. Every staff action must send it back.
function staffAction(action, data) {
  data = data || {};
  if (action === 'staffLogin') return staffLogin(data);

  if (!data.token) return { ok: false, code: 'AUTH', error: 'Please log in again.' };
  var user = CacheService.getScriptCache().get('sess_' + data.token);
  if (!user) return { ok: false, code: 'AUTH', error: 'Please log in again.' };

  if (action === 'staffData') return { ok: true, user: user, items: readMenu(), orders: recentOrders(40) };
  if (action === 'staffSetAvailable') return setCell('Menu', 1, String(data.id), 4, data.available === true);
  if (action === 'staffSetStatus') {
    if (STATUSES.indexOf(data.status) === -1) return fail('Unknown status.');
    return setCell('Orders', 2, String(data.orderId), 4, data.status);
  }
  if (action === 'staffLogout') { CacheService.getScriptCache().remove('sess_' + data.token); return { ok: true }; }
  return fail('Unknown action.');
}

function staffLogin(data) {
  var username = clean(data.username, 30).toLowerCase();
  var cache = CacheService.getScriptCache();
  if (Number(cache.get('fails_' + username) || 0) >= 5) return fail('Too many wrong tries. Wait 15 minutes.');   // stops password guessing

  var staffSheet = sheetByName('Staff');
  var lastRow = staffSheet.getLastRow();
  if (lastRow < 2) return fail('No staff accounts are configured yet.');
  // Read only the four account columns and skip the header row.
  var rows = staffSheet.getRange(2, 1, lastRow - 1, 4).getValues();
  for (var i = 0; i < rows.length; i++) {
    if (username && String(rows[i][0]).toLowerCase() === username &&
        hash(String(rows[i][1]), String(data.password || '')) === String(rows[i][2])) {
      var token = Utilities.getUuid() + Utilities.getUuid();
      cache.put('sess_' + token, String(rows[i][3] || username), 21600);   // 21600 seconds = 6 hours
      cache.remove('fails_' + username);
      return { ok: true, token: token, name: String(rows[i][3] || username) };
    }
  }
  cache.put('fails_' + username, String(Number(cache.get('fails_' + username) || 0) + 1), 900);
  return fail('Wrong username or password.');
}

// Passwords are never stored. We store hash(salt + password): a one-way scramble.
function hash(salt, password) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + password, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

// ---------- helpers ----------
function json(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function fail(message) { return { ok: false, error: message }; }
function toMins(t) { var p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); }
function clean(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max); }
function findItem(menu, id) { for (var i = 0; i < menu.length; i++) if (menu[i].id === id) return menu[i]; return null; }
function sheetByName(name) {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Missing sheet ' + name + '. Run setup() once.');
  return sh;
}

// Find the row whose column `keyCol` equals `key` and write `value` into column `valueCol`.
function setCell(sheetName, keyCol, key, valueCol, value) {
  var lock = LockService.getScriptLock();
  try {
    if (!lock.tryLock(10000)) return fail('The system is busy. Please try again in a moment.');
    var sh = sheetByName(sheetName), last = sh.getLastRow();
    if (last < 2) return fail('Not found.');
    var from = Math.max(2, last - 299);                                   // look at the latest 300 rows
    var keys = sh.getRange(from, keyCol, last - from + 1, 1).getValues();
    for (var i = keys.length - 1; i >= 0; i--) {
      if (String(keys[i][0]).trim() === key) {
        sh.getRange(from + i, valueCol).setValue(value);
        return { ok: true };
      }
    }
    return fail('Not found.');
  } catch (err) {
    Logger.log('setCell error: ' + err);
    return fail('Could not save that change. Please try again.');
  } finally {
    try { lock.releaseLock(); } catch (x) { /* lock was not acquired */ }
  }
}

function readMenu() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Menu');
  if (!sh || sh.getLastRow() < 2) return DEFAULT_MENU.map(function (r) { return { id: r[0], name: r[1], price: r[2], available: r[3] }; });
  return sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().filter(function (r) { return String(r[0]).trim() && Number(r[2]) > 0; })
    .map(function (r) { return { id: String(r[0]).trim(), name: String(r[1]), price: Math.round(Number(r[2])), available: r[3] === true || String(r[3]).toUpperCase() === 'TRUE' }; });
}

function recentOrders(n) {
  var sh = sheetByName('Orders'), last = sh.getLastRow();
  if (last < 2) return [];
  var from = Math.max(2, last - n + 1);
  return sh.getRange(from, 1, last - from + 1, 11).getValues().reverse().map(function (r) {
    return { orderId: String(r[1]), number: String(r[2]), status: String(r[3]), name: String(r[4]), phone: String(r[5]),
             date: String(r[6]), time: String(r[7]), items: String(r[8]), total: Number(r[9]) || 0, notes: String(r[10]) };
  });
}

// ---------- run these from the editor ----------

/** Run once: creates the Orders, Menu and Staff tabs. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var orders = ss.getSheetByName('Orders') || ss.insertSheet('Orders');
  orders.getRange(1, 1, 1, ORDER_HEADERS.length).setValues([ORDER_HEADERS]).setFontWeight('bold').setBackground('#f6cbd0');
  orders.setFrozenRows(1);
  orders.getRange('A:C').setNumberFormat('@'); orders.getRange('E:I').setNumberFormat('@'); orders.getRange('K:K').setNumberFormat('@');
  orders.getRange(2, 4, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).build());
  var menu = ss.getSheetByName('Menu') || ss.insertSheet('Menu');
  if (menu.getLastRow() < 2) {
    menu.getRange(1, 1, 1, 4).setValues([['id (do not change)', 'Name', 'Price (₹)', 'Available today']]).setFontWeight('bold').setBackground('#f6cbd0');
    menu.getRange(2, 1, DEFAULT_MENU.length, 4).setValues(DEFAULT_MENU);
    menu.getRange(2, 4, DEFAULT_MENU.length, 1).insertCheckboxes();
  }
}

/** Run once: creates the 3 staff logins. Type the real passwords here ONLY inside the Apps Script editor, never on GitHub. */
function createStaffAccounts() {
  var people = [['saurav', 'CHANGE-ME-1', 'Saurav'], ['varun', 'CHANGE-ME-2', 'Varun'], ['arafat', 'CHANGE-ME-3', 'Arafat']];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName('Staff') || ss.insertSheet('Staff');
  if (sh.getLastRow() < 1) sh.getRange(1, 1, 1, 4).setValues([['Username', 'Salt', 'Password hash', 'Display name']]).setFontWeight('bold');
  sh.getRange('B:C').setNumberFormat('@');
  people.forEach(function (p) {
    if (/^CHANGE-ME/.test(p[1]) || String(p[1]).length < 8) throw new Error('Put real passwords in first (at least 8 characters).');
    var salt = Utilities.getUuid(), row = [p[0], salt, hash(salt, p[1]), p[2]], at = 0, rows = sh.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) if (String(rows[i][0]).toLowerCase() === p[0]) at = i + 1;
    sh.getRange(at || sh.getLastRow() + 1, 1, 1, 4).setValues([row]);
  });
}
