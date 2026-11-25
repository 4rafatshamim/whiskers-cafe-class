/* ==========================================================
   cat.js  -  the fun stuff
   1. a heart pops up wherever you click or tap
   2. the cat buddy that follows your mouse
   3. small safety nets: missing photos / videos
   ========================================================== */

// Some people turn on "reduce motion" in their settings. We respect that.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Keep the existing photos and clips, but show the designed fallback if an asset fails.
document.querySelectorAll('.menu-illustration img, .cat-avatar img, .staff-avatar img').forEach(function (img) {
  function useFallback() {
    img.hidden = true;
    const fallback = img.parentElement.querySelector('.avatar-fallback');
    if (fallback) fallback.hidden = false;
  }
  img.addEventListener('error', useFallback, { once: true });
  if (img.complete && img.naturalWidth === 0) useFallback();
});

document.querySelectorAll('.video-frame video').forEach(function (video) {
  const frame = video.closest('.video-frame');
  video.addEventListener('error', function () { frame.classList.add('is-missing'); });
  video.addEventListener('loadeddata', function () { frame.classList.remove('is-missing'); });
});


// ---------- 1. HEARTS ON CLICK ----------
function makeHeart(x, y) {
  const heart = document.createElement('span');   // make a new <span>
  heart.className = 'pet-heart';                  // the CSS makes it float up and fade
  heart.textContent = '♥';
  heart.style.left = x - 9 + 'px';                // put it where we clicked
  heart.style.top = y - 14 + 'px';
  document.body.appendChild(heart);               // put it on the page
  setTimeout(function () { heart.remove(); }, 1100);   // clean up after 1.1 seconds
}

if (!reduceMotion) {
  document.addEventListener('pointerdown', function (event) {
    makeHeart(event.clientX, event.clientY);
  });
}

// ---------- 2. THE CAT BUDDY ----------
// Only on computers with a real mouse (not phones) and when motion is allowed.
const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (hasMouse && !reduceMotion) {

  // 2a. Build the cat. Its looks live in an SVG (a drawing made of code).
  const pet = document.createElement('span');
  pet.className = 'pet';
  pet.setAttribute('aria-hidden', 'true');   // screen readers should skip decoration
  pet.dataset.state = 'idle';                // the CSS changes the cat's pose based on this
  pet.innerHTML = `
    <span class="pet-bubble"></span>
    <span class="pet-zzz">z z z</span>
    <span class="pet-flip">
    <svg viewBox="0 0 90 82" xmlns="http://www.w3.org/2000/svg">
    <ellipse class="pet-shadow" cx="45" cy="78" rx="28" ry="4"/>
    <path class="pet-tail" d="M68 62 C 86 60, 88 40, 78 30"/>
    <path class="pet-tail-inner" d="M68 62 C 86 60, 88 40, 78 30"/>
    <g class="pet-leg pet-leg-a"><rect class="pet-fur" x="28" y="64" width="11" height="12" rx="5"/></g>
    <g class="pet-leg pet-leg-b"><rect class="pet-fur" x="51" y="64" width="11" height="12" rx="5"/></g>
    <g class="pet-body-group">
    <ellipse class="pet-fur" cx="45" cy="60" rx="25" ry="16"/>
    <path class="pet-paw-up pet-fur" d="M58 56 q6 -10 2 -18" style="stroke:#dcc7a8;stroke-width:8"/>
    </g>
    <g class="pet-head">
    <path class="pet-fur" d="M24 30 L26 8 L40 20 Z"/>
    <path class="pet-fur" d="M66 30 L64 8 L50 20 Z"/>
    <path class="pet-inner-ear" d="M28 24 L28.5 14 L35 20 Z"/>
    <path class="pet-inner-ear" d="M62 24 L61.5 14 L55 20 Z"/>
    <ellipse class="pet-fur" cx="45" cy="36" rx="23" ry="19"/>
    <g class="pet-eyes">
    <ellipse class="pet-eye" cx="36" cy="36" rx="2.6" ry="3.6"/>
    <ellipse class="pet-eye" cx="54" cy="36" rx="2.6" ry="3.6"/>
    </g>
    <path class="pet-eye-closed" d="M32 37 q4 4 8 0 M50 37 q4 4 8 0"/>
    <ellipse class="pet-cheek" cx="29" cy="44" rx="5" ry="2.8"/>
    <ellipse class="pet-cheek" cx="61" cy="44" rx="5" ry="2.8"/>
    <path class="pet-nose" d="M42.5 42 h5 l-2.5 3 z"/>
    <path class="pet-mouth" d="M45 45 v2 M45 47 q-3 3 -6 0 M45 47 q3 3 6 0"/>
    <ellipse class="pet-yawn" cx="45" cy="50" rx="4" ry="5"/>
    </g>
    </svg>
    </span>`;
  document.body.appendChild(pet);

  const bubble = pet.querySelector('.pet-bubble');   // the little speech bubble

  // 2b. The on/off button
  const toggle = document.createElement('button');
  toggle.className = 'pet-toggle';
  toggle.type = 'button';
  toggle.textContent = '🐾 Cat buddy: on';
  toggle.addEventListener('click', function () {
    const isOff = document.body.classList.toggle('pet-off');
    toggle.textContent = isOff ? '🐾 Cat buddy: off' : '🐾 Cat buddy: on';
  });
  document.body.appendChild(toggle);

  // 2c. Variables the cat needs to remember
  let x = -120, y = window.innerHeight - 110;   // where the cat is (starts off-screen, left)
  let targetX = x, targetY = y;                 // where the cat wants to go (near the mouse)
  let lastMove = performance.now();             // when the cat last moved (for sleeping)
  let nextAction = performance.now() + 4000;    // when to do the next random action
  let shown = false;                            // has the mouse moved yet?

  // 2d. Little helpers
  function say(text) {                          // show a speech bubble for 1.8 seconds
    bubble.textContent = text;
    bubble.classList.add('show');
    setTimeout(function () { bubble.classList.remove('show'); }, 1800);
  }

  function doAction(name, ms) {                 // turn on a CSS animation for a while
    pet.classList.add('act-' + name);           // e.g. act-yawn, act-stretch
    setTimeout(function () { pet.classList.remove('act-' + name); }, ms);
  }

  function randomIdleAction() {                 // pick one random thing for the cat to do
    const pick = Math.floor(Math.random() * 5);
    if (pick === 0) { doAction('yawn', 1600); say('*yaaawn*'); }
    if (pick === 1) { doAction('stretch', 1800); }
    if (pick === 2) { doAction('groom', 1800); }
    if (pick === 3) { doAction('wiggle', 1400); }
    if (pick === 4) { say('mrrp!'); }
  }

  // 2e. Listen to the mouse
  document.addEventListener('pointermove', function (event) {
    targetX = event.clientX + 40 - 46;          // stay a little to the side of the mouse
    targetY = event.clientY + 18 - 41;
    lastMove = performance.now();
    if (!shown) {                               // first time the mouse moves: say hi
      shown = true;
      pet.classList.add('is-visible');
      doAction('entrance', 1300);
      setTimeout(function () { say('hi! welcome ♡'); }, 1400);
    }
  });

  document.addEventListener('pointerdown', function () {
    doAction('hop', 500);                       // hop when you click
  });

  // 2f. The animation loop. This function runs about 60 times a second.
  function frame(now) {
    if (shown) {
      const dx = targetX - x;
      const dy = targetY - y;
      const distance = Math.hypot(dx, dy);      // straight-line distance to the target

      if (distance > 14) {
        // far away: walk toward the mouse, a little faster the farther it is
        const speed = Math.min(7, 1.2 + distance * 0.045);
        x = x + (dx / distance) * speed;
        y = y + (dy / distance) * speed;
        pet.classList.toggle('facing-left', dx < 0);   // turn to face the way we walk
        pet.dataset.state = 'walk';
        lastMove = now;
        nextAction = now + 4000;
      } else {
        // close enough: stand, then sit, then sleep the longer the mouse is still
        const stillFor = now - lastMove;
        if (stillFor > 14000) pet.dataset.state = 'sleep';
        else if (stillFor > 5000) pet.dataset.state = 'sit';
        else pet.dataset.state = 'idle';

        if (now > nextAction && pet.dataset.state !== 'sleep') {
          randomIdleAction();
          nextAction = now + 5000 + Math.random() * 4000;
        }
      }
    }
    pet.style.transform = 'translate3d(' + Math.round(x) + 'px, ' + Math.round(y) + 'px, 0)';
    requestAnimationFrame(frame);               // ask the browser to run frame() again
  }
  requestAnimationFrame(frame);
}

// ---------- 3. SAFETY NETS ----------
// If a photo file is missing, hide the broken image so the emoji / drawing shows instead.
document.querySelectorAll('.menu-illustration img, .cat-avatar img, .staff-avatar img').forEach(function (img) {
  img.addEventListener('error', function () { img.hidden = true; });
  if (img.complete && img.naturalWidth === 0) img.hidden = true;   // it already failed before this ran
});

// If a video file is missing, show the "add your video" note instead.
document.querySelectorAll('.video-frame source').forEach(function (source) {
  source.addEventListener('error', function () {
    source.closest('.video-frame').classList.add('is-missing');
  });
});
