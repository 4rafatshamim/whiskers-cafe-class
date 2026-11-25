/* Whiskers Café: staff.js
   Staff page: log in, mark items sold out / available, and update order status.
   Everything talks to the Google Apps Script backend (backend/Code.gs) with one function: call(). */
(function () {
  'use strict';
  var URL = (window.WHISKERS_CONFIG || {}).backendUrl || '';
  var KEY = 'whiskers-staff-token';
  var STATUSES = ['New', 'Preparing', 'Ready', 'Picked up', 'Cancelled'];
  var token = '';
  try { token = sessionStorage.getItem(KEY) || ''; } catch (e) { /* ignore */ }
  var timer = null;
  var loading = false;
  var $ = function (id) { return document.getElementById(id); };

  function say(text, kind) { var m = $('msg'); m.textContent = text || ''; m.dataset.kind = kind || ''; m.hidden = !text; }

  // one function for every request to the backend
  function call(body) {
    var payload = Object.assign({}, body, { token: token });
    return fetch(URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) })
      .then(function (response) {
        if (!response.ok) throw new Error('The server returned an error.');
        return response.json();
      })
      .then(function (res) {
        if (!res || typeof res.ok !== 'boolean') throw new Error('The server response was not understood.');
        if (res.code === 'AUTH') showLogin('Session ended. Please log in again.');
        return res;
      });
  }

  function showLogin(note) {
    token = ''; try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    clearInterval(timer);
    $('login-box').hidden = false; $('panel').hidden = true; say(note || '', note ? 'error' : '');
  }

  function el(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }

  function render(res) {
    $('hello').textContent = 'Hi ' + res.user + '!';
    var items = $('items'); items.textContent = '';
    res.items.forEach(function (m) {
      var row = el('div', null, 'staff-row' + (m.available ? '' : ' off'));
      row.appendChild(el('strong', m.name + ' (₹' + m.price + ')'));
      var b = el('button', m.available ? 'Mark sold out' : 'Mark available again', 'button ' + (m.available ? 'button-secondary' : 'button-primary'));
      b.type = 'button';
      b.addEventListener('click', function () {
        var nextAvailable = !m.available;
        b.disabled = true;
        call({ action: 'staffSetAvailable', id: m.id, available: nextAvailable }).then(function (r) {
          if (!r.ok) {
            say(r.error || 'Could not update availability.', 'error');
            b.disabled = false;
            return;
          }

          // Update this row immediately instead of reloading the entire dashboard.
          m.available = nextAvailable;
          row.classList.toggle('off', !m.available);
          b.textContent = m.available ? 'Mark sold out' : 'Mark available again';
          b.className = 'button ' + (m.available ? 'button-secondary' : 'button-primary');
          b.disabled = false;
          say('Availability saved. Customer pages check for changes about every 12 seconds.', '');
        }).catch(function () {
          b.disabled = false;
          say('Could not update availability. Check the connection and try again.', 'error');
        });
      });
      row.appendChild(b); items.appendChild(row);
    });
    var orders = $('orders'); orders.textContent = '';
    if (!res.orders.length) orders.appendChild(el('p', 'No orders yet.'));
    res.orders.forEach(function (o) {
      var row = el('div', null, 'staff-row');
      var info = el('div');
      info.appendChild(el('strong', o.number + ' · ' + o.name + ' · ' + o.phone));
      info.appendChild(el('small', o.date + ' ' + o.time + ' · ' + o.items + ' · ₹' + o.total + (o.notes ? ' · Note: ' + o.notes : '')));
      var sel = el('select'); sel.setAttribute('aria-label', 'Status of order ' + o.number);
      STATUSES.forEach(function (s) { var op = el('option', s); op.value = s; if (s === o.status) op.selected = true; sel.appendChild(op); });
      var savedStatus = o.status;
      sel.addEventListener('change', function () {
        var nextStatus = sel.value;
        sel.disabled = true;
        call({ action: 'staffSetStatus', orderId: o.orderId, status: nextStatus }).then(function (r) {
          if (r.ok) { savedStatus = nextStatus; say('Order status saved.', ''); }
          else { sel.value = savedStatus; say(r.error || 'Could not save the order status.', 'error'); }
        }).catch(function () {
          sel.value = savedStatus;
          say('Could not save the order status. Check the connection and try again.', 'error');
        }).then(function () { sel.disabled = false; });
      });
      row.appendChild(info); row.appendChild(sel); orders.appendChild(row);
    });
  }

  function load() {
    if (loading) return Promise.resolve();
    loading = true;
    return call({ action: 'staffData' }).then(function (res) {
      if (res && res.ok) { $('login-box').hidden = true; $('panel').hidden = false; render(res); }
    }).catch(function () {
      say('Could not reach the server. Check your internet.', 'error');
    }).then(function () {
      loading = false;
    });
  }

  function start() { load(); clearInterval(timer); timer = setInterval(function () { if (!document.hidden) load(); }, 30000); }

  $('login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    say('Signing in…', '');
    var loginButton = $('login-form').querySelector('button[type="submit"]');
    loginButton.disabled = true;
    call({ action: 'staffLogin', username: $('u').value, password: $('p').value }).then(function (res) {
      if (res && res.ok) { token = res.token; try { sessionStorage.setItem(KEY, token); } catch (err) { /* ignore */ } $('p').value = ''; start(); }
      else say((res && res.error) || 'Login failed.', 'error');
    }).catch(function () { say('Could not reach the server. Check your internet and try again.', 'error'); })
      .then(function () { loginButton.disabled = false; });
  });
  $('logout').addEventListener('click', function () { call({ action: 'staffLogout' }); showLogin(''); });

  if (!URL) { $('login-box').hidden = true; say('Backend not connected yet. Paste the Web app URL into config.js (see backend/SETUP.md).', 'error'); }
  else if (token) start();
})();
