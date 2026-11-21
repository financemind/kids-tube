/* Games for Noyan, played with the four colour keys of the TV remote (or by
   touch). None needs reading, none has a score, losing or a prize: a wrong
   press only makes the picture wobble gently and wait. Each game uses today's
   watch time and ends by itself (see beginGame in index.html).
   - balloons: pop the balloon of the colour you press (in index.html);
   - colors:   a big thing comes up (apple, leaf, sun, fish…): press its colour;
   - count:    1 to 4 apples: press the key with that many dots;
   - feed:     four animals, one is hungry: press its colour to feed it;
   - simon:    the circles light up in a row: press the same row back;
   - car:      a little car on a road, played with the colour keys or with a
               parent's phone as a controller (control.html): red/left and
               green/right change lane, yellow honks; stars to catch, cones
               just make it wobble (no crash, no losing);
   - pet:      a little dinosaur of his own to look after: red feeds it,
               green plays ball, yellow cleans up, blue puts it to sleep.
   The picker shows the five games: red/green move, yellow opens. Every
   picture is drawn (SVG): the TV browser shows emoji without colour. */

const KEY_COLORS = ["red", "green", "yellow", "blue"]; // left to right on the remote
const ROUNDS = 10; // rounds in a game, then a cheer and back home

/* ---- Pictures ---- */
const face = (cx, cy, k = 1, ink = "#1d2b4f") => `<g transform="translate(${cx} ${cy}) scale(${k})">
  <circle cx="-9" cy="-3" r="4" fill="${ink}"/><circle cx="9" cy="-3" r="4" fill="${ink}"/>
  <circle cx="-7.5" cy="-4.5" r="1.4" fill="#fff"/><circle cx="10.5" cy="-4.5" r="1.4" fill="#fff"/>
  <path d="M-8 6 Q0 13 8 6" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/></g>`;
const THINGS = {
  apple: ["red", `<path d="M50 30 C30 10 5 30 15 60 C22 85 40 92 50 85 C60 92 78 85 85 60 C95 30 70 10 50 30 Z" fill="#e63946"/>
    <path d="M50 30 Q52 15 60 8" stroke="#6b4423" stroke-width="5" fill="none" stroke-linecap="round"/>
    <ellipse cx="66" cy="15" rx="10" ry="5" fill="#3aa655" transform="rotate(-30 66 15)"/>
    <ellipse cx="30" cy="45" rx="5" ry="9" fill="#fff" opacity=".45"/>${face(50, 58, 1.1)}`],
  heart: ["red", `<path d="M50 88 C10 60 5 30 28 20 C40 15 50 25 50 32 C50 25 60 15 72 20 C95 30 90 60 50 88 Z" fill="#e63946"/>${face(50, 48, 1.1)}`],
  leaf: ["green", `<path d="M12 88 C12 40 45 10 90 10 C90 56 60 88 12 88 Z" fill="#2a9d4b"/>
    <path d="M12 88 Q50 52 82 18" stroke="#1d6b33" stroke-width="4" fill="none" stroke-linecap="round"/>${face(56, 50, 1)}`],
  tree: ["green", `<rect x="43" y="70" width="14" height="24" rx="4" fill="#8a5a3b"/><path d="M50 4 L88 74 L12 74 Z" fill="#2a9d4b"/>${face(50, 52, 1)}`],
  sun: ["yellow", `${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6;
      return `<line x1="${50 + Math.cos(a) * 34}" y1="${50 + Math.sin(a) * 34}" x2="${50 + Math.cos(a) * 46}" y2="${50 + Math.sin(a) * 46}" stroke="#f6c90e" stroke-width="7" stroke-linecap="round"/>`; }).join("")}
    <circle cx="50" cy="50" r="28" fill="#f6c90e"/>${face(50, 52, 1.1)}`],
  star: ["yellow", `<path d="M50 6 L62 36 L94 38 L69 58 L77 90 L50 72 L23 90 L31 58 L6 38 L38 36 Z" fill="#f6c90e" stroke="#e0a800" stroke-width="3" stroke-linejoin="round"/>${face(50, 54, .95)}`],
  fish: ["blue", `<path d="M78 50 L98 30 L98 70 Z" fill="#2f7fe0"/><ellipse cx="46" cy="50" rx="38" ry="26" fill="#2f7fe0"/>
    <circle cx="26" cy="44" r="6" fill="#fff"/><circle cx="25" cy="44" r="3.5" fill="#1d2b4f"/>
    <path d="M12 56 Q18 60 22 56" stroke="#1d2b4f" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M44 34 Q54 50 44 66" stroke="#1b5fb8" stroke-width="4" fill="none" stroke-linecap="round"/>`],
  drop: ["blue", `<path d="M50 6 C50 6 14 50 14 64 A36 36 0 0 0 86 64 C86 50 50 6 50 6 Z" fill="#2f7fe0"/>
    <ellipse cx="34" cy="58" rx="5" ry="9" fill="#fff" opacity=".5"/>${face(50, 66, 1.05)}`],
};
const thingSvg = (name, cls = "") => `<svg class="${cls}" viewBox="0 0 100 100">${THINGS[name][1]}</svg>`;
// Animals for the feeding game: mouth shut or wide open (hungry).
function animal(kind, open) {
  const mouth = (x, y, w) => open
    ? `<ellipse cx="${x}" cy="${y + 3}" rx="${w}" ry="${w * .8}" fill="#5b1a2a"/><ellipse cx="${x}" cy="${y + w * .5}" rx="${w * .6}" ry="${w * .3}" fill="#ff7d93"/>`
    : `<path d="M${x - w} ${y} Q${x} ${y + w} ${x + w} ${y}" stroke="#1d2b4f" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  const eyes = (y, d = 13) => `<circle cx="${50 - d}" cy="${y}" r="5" fill="#1d2b4f"/><circle cx="${50 + d}" cy="${y}" r="5" fill="#1d2b4f"/>
    <circle cx="${51.5 - d}" cy="${y - 1.5}" r="1.7" fill="#fff"/><circle cx="${51.5 + d}" cy="${y - 1.5}" r="1.7" fill="#fff"/>`;
  if (kind === "cat") return `<path d="M22 36 L28 6 L46 26 Z M78 36 L72 6 L54 26 Z" fill="#f4a261"/><circle cx="50" cy="52" r="34" fill="#f4a261"/>
    ${eyes(46)}<circle cx="50" cy="58" r="3.5" fill="#d1495b"/>
    <g stroke="#7a4a2a" stroke-width="2"><line x1="20" y1="58" x2="38" y2="60"/><line x1="20" y1="66" x2="38" y2="64"/><line x1="80" y1="58" x2="62" y2="60"/><line x1="80" y1="66" x2="62" y2="64"/></g>${mouth(50, 68, 9)}`;
  if (kind === "frog") return `<circle cx="30" cy="26" r="14" fill="#57c84d"/><circle cx="70" cy="26" r="14" fill="#57c84d"/>
    <ellipse cx="50" cy="58" rx="40" ry="30" fill="#57c84d"/><circle cx="30" cy="26" r="8" fill="#fff"/><circle cx="70" cy="26" r="8" fill="#fff"/>
    <circle cx="31" cy="27" r="4.5" fill="#1d2b4f"/><circle cx="69" cy="27" r="4.5" fill="#1d2b4f"/>${mouth(50, 62, 16)}`;
  if (kind === "chick") return `<circle cx="50" cy="54" r="36" fill="#ffd23f"/><path d="M46 18 Q50 6 54 18" stroke="#f4b400" stroke-width="4" fill="none"/>${eyes(46)}
    ${open ? `<path d="M40 60 L60 60 L50 52 Z M40 64 L60 64 L50 76 Z" fill="#f77f00"/>` : `<path d="M41 60 L59 60 L50 70 Z" fill="#f77f00"/>`}`;
  return `<path d="M80 54 L98 36 L98 72 Z" fill="#4ea8de"/><ellipse cx="48" cy="54" rx="38" ry="28" fill="#4ea8de"/>
    <circle cx="34" cy="46" r="6" fill="#fff"/><circle cx="33" cy="46" r="3.5" fill="#1d2b4f"/>${mouth(22, 60, 7)}`;
}
const ANIMALS = ["cat", "frog", "chick", "fish"]; // on the red, green, yellow, blue mats
const CHEER = `<svg viewBox="0 0 200 200">${Array.from({ length: 22 }, (_, i) => {
  const a = i / 22 * 6.28, r = 60 + (i % 3) * 22, c = ["#e63946", "#2a9d4b", "#f6c90e", "#2f7fe0"][i % 4];
  return `<rect class="conf" style="animation-delay:${(i % 5) * .08}s" x="${100 + Math.cos(a) * r - 5}" y="${100 + Math.sin(a) * r - 5}" width="10" height="10" rx="2" fill="${c}" transform="rotate(${i * 33} ${100 + Math.cos(a) * r} ${100 + Math.sin(a) * r})"/>`; }).join("")}
  <path d="M100 40 L114 78 L154 80 L122 104 L134 144 L100 120 L66 144 L78 104 L46 80 L86 78 Z" fill="#f6c90e" stroke="#e0a800" stroke-width="4" stroke-linejoin="round"/>${face(100, 96, 1.4)}</svg>`;
window.CHEER_SVG = CHEER;

/* ---- Styles ---- */
document.head.insertAdjacentHTML("beforeend", `<style>
.picker { position: absolute; top: 0; right: 0; bottom: 0; left: 0; display: flex; flex-wrap: wrap; align-content: center; justify-content: center;
  gap: clamp(14px, 3vw, 34px); padding: 80px 24px 24px; direction: ltr; }
.picker button { width: clamp(150px, 27vw, 300px); aspect-ratio: 4 / 3; border-radius: 26px; border: 6px solid #fff; background: #fff; cursor: pointer;
  box-shadow: 0 8px 0 rgba(29, 43, 79, .18); position: relative; padding: 0; }
.picker button svg { position: absolute; left: 8%; top: 8%; width: 84%; height: 84%; }
.picker button:focus, .picker button:hover { outline: 7px solid #2f7fe0; outline-offset: 3px; transform: scale(1.05); }
.game.pick .keys { display: none; }
.board { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: flex; align-items: center; justify-content: center; direction: ltr; }
.board .big { width: min(56vh, 70vw); height: min(56vh, 70vw); }
.board .row { display: flex; gap: clamp(8px, 2vw, 24px); }
.board .row svg { width: min(22vh, 20vw); height: min(22vh, 20vw); }
.dance { animation: dance .9s ease-in-out; transform-origin: 50% 90%; }
@keyframes dance { 0%, 100% { transform: rotate(0) scale(1); } 20% { transform: rotate(-12deg) scale(1.1); } 40% { transform: rotate(12deg) scale(1.15); }
  60% { transform: rotate(-8deg) scale(1.1); } 80% { transform: rotate(6deg) scale(1.05); } }
.nope { animation: nope .5s ease-in-out; }
@keyframes nope { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-10px); } 75% { transform: translateX(10px); } }
.hop { animation: hop .4s ease-out; }
@keyframes hop { 50% { transform: translateY(-30px); } }
.newone { animation: grow .45s cubic-bezier(.3, 1.6, .5, 1); }
@keyframes grow { from { transform: scale(0); } }
.game.count .k { position: relative; }
.game.count .k b { position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #fff; }
.feedrow { display: flex; gap: clamp(10px, 3vw, 40px); align-items: flex-end; }
.feedrow .pet { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.feedrow .pet svg { width: min(24vh, 19vw); height: min(24vh, 19vw); overflow: visible; }
.feedrow .mat { width: min(20vh, 16vw); height: 18px; border-radius: 9px; }
.feedrow .hungry svg { animation: wiggle .8s ease-in-out infinite; }
@keyframes wiggle { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg) scale(1.05); } }
.feedrow .eat svg { animation: chomp .25s ease-in-out 4; }
@keyframes chomp { 50% { transform: scale(1.12, .9); } }
.food { position: absolute; width: 34px; height: 34px; border-radius: 50%; background: #f77f00; box-shadow: inset -5px -5px 0 rgba(0, 0, 0, .15); transition: all .5s ease-in; }
.simonrow { display: flex; gap: clamp(14px, 3vw, 40px); }
.simonrow i { display: block; width: min(24vh, 18vw); height: min(24vh, 18vw); border-radius: 50%; opacity: .35; border: 6px solid #fff; transition: opacity .15s, transform .15s; cursor: pointer; }
.simonrow i.on { opacity: 1; transform: scale(1.12); }
.cheer svg { width: min(60vh, 70vw); height: auto; display: block; overflow: visible; }
.cheer .conf { animation: conf 1.2s ease-out both; transform-box: fill-box; transform-origin: center; }
@keyframes conf { from { opacity: 0; transform: translate(0, 40px) scale(.2); } }
</style>`);

/* ---- Sounds (made in the browser, like the balloon pops) ---- */
const NOTES = { red: 523, green: 659, yellow: 784, blue: 1047 };
function tune(freqs, gap = 0.12, vol = 0.16) { const a = audioCtx(); if (a) freqs.forEach((f, i) => bell(a, f, a.currentTime + 0.02 + i * gap, 0.8, vol)); }
const happy = () => tune([523, 659, 784, 1047]);
const softNo = () => tune([247], 0.1, 0.07);

/* ---- Picker ---- */
const PICK = [
  ["balloons", `<svg viewBox="0 0 120 70">${[["#e63946", 22], ["#2a9d4b", 48], ["#f6c90e", 74], ["#2f7fe0", 100]].map(([c, x], i) =>
    `<g transform="translate(${x} ${i % 2 ? 30 : 24})"><path d="M0 17 Q-2 30 3 40" stroke="#5b6b86" stroke-width="1" fill="none"/>
     <ellipse cx="0" cy="0" rx="11" ry="14" fill="${c}"/><ellipse cx="-4" cy="-5" rx="3" ry="4" fill="#fff" opacity=".6"/></g>`).join("")}</svg>`],
  ["colors", `<svg viewBox="0 0 200 100"><g transform="translate(0 0) scale(.5)">${THINGS.apple[1]}</g><g transform="translate(50 50) scale(.5)">${THINGS.leaf[1]}</g>
    <g transform="translate(100 0) scale(.5)">${THINGS.sun[1]}</g><g transform="translate(150 50) scale(.5)">${THINGS.fish[1]}</g></svg>`],
  ["count", `<svg viewBox="0 0 200 100">${[0, 1, 2].map((i) => `<g transform="translate(${20 + i * 55} 10) scale(.5)">${THINGS.apple[1]}</g>`).join("")}
    ${[0, 1, 2].map((i) => `<circle cx="${70 + i * 30}" cy="88" r="7" fill="#1d2b4f"/>`).join("")}</svg>`],
  ["feed", `<svg viewBox="0 0 200 100"><g transform="translate(10 5) scale(.8)">${animal("chick", true)}</g><g transform="translate(100 5) scale(.8)">${animal("frog", false)}</g></svg>`],
  ["pet", `<svg viewBox="0 0 200 150">${dinoSvg({ mood: "happy" })}</svg>`],
  ["car", `<svg viewBox="0 0 200 150"><rect x="55" y="0" width="90" height="150" fill="#5d6675"/>
    <g fill="#fff">${[10, 50, 90, 130].map((y) => `<rect x="97" y="${y}" width="6" height="22" rx="3"/>`).join("")}</g>
    <rect x="0" y="0" width="55" height="150" fill="#a8cf8e"/><rect x="145" y="0" width="55" height="150" fill="#a8cf8e"/>
    <g transform="translate(100 98) scale(.9)">${carSvg()}</g>${carStar(70, 26, 14)}</svg>`],
  ["simon", `<svg viewBox="0 0 200 100">${["#e63946", "#2a9d4b", "#f6c90e", "#2f7fe0"].map((c, i) => `<circle cx="${30 + i * 47}" cy="50" r="20" fill="${c}" opacity="${i === 1 ? 1 : .4}"/>`).join("")}</svg>`],
];
const PICK_VID = { balloons: "game", colors: "game-colors", count: "game-count", feed: "game-feed", simon: "game-simon", pet: "game-pet", car: "game-car" };
function showPicker() {
  if (!canWatch()) return renderGrid();
  playingId = null; playingCat = null;
  $("home").hidden = true; $("game").hidden = false; $("game").className = "game pick";
  const box = document.createElement("div");
  box.className = "picker";
  for (const [kind, art] of PICK) {
    const b = document.createElement("button");
    b.setAttribute("aria-label", kind);
    b.innerHTML = art;
    b.onclick = () => playGame(kind);
    box.appendChild(b);
  }
  $("sky").innerHTML = "";
  $("sky").appendChild(box);
  box.firstChild.focus({ preventScroll: true });
}
function playGame(kind) {
  document.querySelectorAll(".keys .k").forEach((k) => { k.innerHTML = ""; }); // the dots belong to the counting game only
  if (kind === "balloons") return startGame();
  if (!beginGame(kind, PICK_VID[kind])) return;
  ({ colors: colorsRound, count: countRound, feed: feedRound, simon: simonStart, pet: petStart, car: carStart })[kind]();
}
const later = (fn, ms) => { if (game) game.timers.push(setTimeout(() => { if (game) fn(); }, ms)); };
const pickOther = (n, last) => { let x; do x = Math.floor(Math.random() * n); while (x === last && n > 1); return x; };
function nextRound(fn) { if (++game.rounds >= ROUNDS) later(() => endGame(true), 1000); else later(fn, 1300); }

// Every colour key (or tap on a dot) in a game comes here.
function gameColor(c) {
  if (!$("game").classList.contains("pick") && !game) return;
  if ($("game").classList.contains("pick")) { // picker: red/green move, yellow opens
    const list = [...document.querySelectorAll(".picker button")];
    let at = list.indexOf(document.activeElement);
    if (c === "yellow") return (list[at] || list[0]).click();
    at = Math.max(0, Math.min(list.length - 1, at < 0 ? 0 : at + (c === "red" ? -1 : c === "green" ? 1 : 0)));
    list[at].focus({ preventScroll: true });
    return;
  }
  if (game.kind === "balloons") return popColor(c);
  if (game.busy) return;
  ({ colors: colorsKey, count: countKey, feed: feedKey, simon: simonKey, pet: petKey, car: carKey })[game.kind](c);
}

/* ---- Find the colour ---- */
function colorsRound() {
  const names = Object.keys(THINGS);
  game.at = pickOther(names.length, game.at);
  game.thing = names[game.at];
  $("sky").innerHTML = `<div class="board">${thingSvg(game.thing, "big newone")}</div>`;
}
function colorsKey(c) {
  const el = document.querySelector(".board .big");
  if (!el) return;
  el.classList.remove("nope", "newone", "dance"); void el.offsetWidth;
  if (THINGS[game.thing][0] !== c) { el.classList.add("nope"); softNo(); return; }
  game.busy = true; el.classList.add("dance"); happy();
  later(() => { game.busy = false; }, 1300);
  nextRound(colorsRound);
}

/* ---- Count to 4 ---- */
const DOTS = [[[0, 0]], [[-11, 0], [11, 0]], [[-12, 8], [12, 8], [0, -11]], [[-11, -11], [11, -11], [-11, 11], [11, 11]]];
function countRound() {
  document.querySelectorAll(".keys .k").forEach((k, i) => {
    k.innerHTML = DOTS[i].map(([x, y]) => `<b style="left:calc(50% + ${x}px - 5px);top:calc(50% + ${y}px - 5px)"></b>`).join("");
  });
  game.n = pickOther(4, game.n - 1) + 1;
  $("sky").innerHTML = `<div class="board"><div class="row">${Array.from({ length: game.n }, () => thingSvg("apple", "newone")).join("")}</div></div>`;
}
function countKey(c) {
  const row = document.querySelector(".board .row");
  if (!row) return;
  if (KEY_COLORS.indexOf(c) + 1 !== game.n) { row.classList.remove("nope"); void row.offsetWidth; row.classList.add("nope"); softNo(); return; }
  // Right: the apples hop one by one, each with a higher note (one, two, three…).
  game.busy = true;
  [...row.children].forEach((ap, i) => later(() => { ap.classList.remove("newone", "hop"); void ap.getBoundingClientRect(); ap.classList.add("hop"); tune([[523, 659, 784, 1047][i]], 0, 0.18); }, i * 380));
  later(() => { game.busy = false; }, game.n * 380 + 900);
  if (++game.rounds >= ROUNDS) later(() => endGame(true), game.n * 380 + 1000);
  else later(countRound, game.n * 380 + 900);
}

/* ---- Feed the animals ---- */
function feedRound() {
  game.hungry = pickOther(4, game.hungry);
  $("sky").innerHTML = `<div class="board"><div class="feedrow">${ANIMALS.map((a, i) => `<div class="pet${i === game.hungry ? " hungry" : ""}">
    <svg viewBox="0 0 100 100">${animal(a, i === game.hungry)}</svg><i class="mat" style="background:${BALLOON[KEY_COLORS[i]]}"></i></div>`).join("")}</div></div>`;
}
function feedKey(c) {
  const pets = [...document.querySelectorAll(".feedrow .pet")], i = KEY_COLORS.indexOf(c);
  if (!pets.length) return;
  if (i !== game.hungry) { const p = pets[game.hungry]; p.classList.remove("nope"); void p.offsetWidth; p.classList.add("nope"); softNo(); return; }
  game.busy = true;
  // A ball of food flies from the bottom into the open mouth, then it chews and smiles.
  const r = pets[i].querySelector("svg").getBoundingClientRect(), food = document.createElement("i");
  food.className = "food"; food.style.left = r.left + r.width / 2 - 17 + "px"; food.style.top = innerHeight - 60 + "px";
  $("sky").appendChild(food);
  requestAnimationFrame(() => requestAnimationFrame(() => { food.style.top = r.top + r.height * .62 + "px"; food.style.transform = "scale(.5)"; }));
  later(() => {
    food.remove();
    pets[i].classList.remove("hungry"); pets[i].classList.add("eat");
    pets[i].querySelector("svg").innerHTML = animal(ANIMALS[i], false);
    tune([392, 523, 392, 523], 0.13, 0.14);
  }, 550);
  later(() => { game.busy = false; }, 1500);
  if (++game.rounds >= ROUNDS) later(() => endGame(true), 1700); else later(feedRound, 1600);
}

/* ---- Repeat after me ---- */
function simonStart() {
  game.len = 2; game.seq = [];
  $("sky").innerHTML = `<div class="board"><div class="simonrow">${KEY_COLORS.map((c) => `<i data-c="${c}" style="background:${BALLOON[c]}"></i>`).join("")}</div></div>`;
  document.querySelectorAll(".simonrow i").forEach((d) => d.onclick = () => gameColor(d.dataset.c));
  simonNew();
}
function simonNew() {
  game.seq = Array.from({ length: game.len }, (_, i, arr) => KEY_COLORS[Math.floor(Math.random() * 4)]);
  later(simonShow, 900);
}
function flash(c, ms = 450) {
  const d = document.querySelector(`.simonrow i[data-c="${c}"]`);
  if (!d) return;
  d.classList.add("on"); tune([NOTES[c]], 0, 0.2);
  setTimeout(() => d.classList.remove("on"), ms);
}
function simonShow() { // play the row; the child's turn starts after the last one
  game.busy = true; game.got = 0;
  game.seq.forEach((c, i) => later(() => flash(c), i * 750));
  later(() => { game.busy = false; }, game.seq.length * 750);
}
function simonKey(c) {
  flash(c, 300);
  if (c !== game.seq[game.got]) { // wrong: no losing, the same row is shown again
    game.busy = true; later(() => { softNo(); later(simonShow, 900); }, 350);
    return;
  }
  if (++game.got < game.seq.length) return;
  game.busy = true;
  later(happy, 400);
  game.len = Math.min(5, game.len + 1);
  if (++game.rounds >= 6) later(() => endGame(true), 1600); else later(simonNew, 1100);
}

/* ---- The little dinosaur ----
   A dinosaur of his own (our own drawing), kept on this device from day to
   day. It shows what it wants in a bubble over its head (an apple, a ball, a
   moon) or by a little poo on the grass. Red feeds it, green plays ball,
   yellow cleans up, blue puts it to sleep. Doing what it asked makes it
   dance; doing something else is fine too, it just shakes its head or plays.
   It never gets ill, sad for long or dies. With care it grows: an egg the very
   first time (any key cracks it), then baby, then bigger. */
const PET_STAGES = [0, 25, 80]; // care needed for baby, child, big dinosaur
/* The dinosaur, drawn flat like a picture book: soft greens, a peach belly,
   a darker shade on its underside, spots, big eyes with lashes and brows, a
   little blush. Facing right, in a 200 x 150 box, standing on y = 146. */
function dinoColors() { return { body: "#7cc08f", shade: "#63a777", dark: "#4f8c63", belly: "#f3dcae", bellyShade: "#e6c993", spike: "#f2a65a", spikeShade: "#d98a43",
  ink: "#24324f", mouth: "#4a1a2e", tongue: "#e7848f", blush: "#f2a0a6" }; } // a function declaration: the game picker draws a dinosaur before this line runs
function dinoSvg({ mood = "happy", stage = 2, eyes = "open", mouth = "smile" } = {}) {
  const k = [0.66, 0.82, 1][stage] ?? 1, D = dinoColors(), er = stage === 0 ? 12.5 : 11;
  const eye = (x, y) => eyes === "shut"
    ? `<path d="M${x - 9} ${y + 1} Q${x} ${y + 9} ${x + 9} ${y + 1}" stroke="${D.ink}" stroke-width="3.2" fill="none" stroke-linecap="round"/>`
    : `<circle cx="${x}" cy="${y}" r="${er}" fill="#fff" stroke="${D.dark}" stroke-width="2.4"/>
       <circle cx="${x + 3}" cy="${y + 1.5}" r="${er * .58}" fill="#14182a"/><circle cx="${x + 5.2}" cy="${y - 1.5}" r="${er * .2}" fill="#fff"/>
       <g stroke="${D.ink}" stroke-width="2" stroke-linecap="round"><line x1="${x - 6}" y1="${y - er + 1}" x2="${x - 9}" y2="${y - er - 4}"/>
       <line x1="${x}" y1="${y - er}" x2="${x}" y2="${y - er - 6}"/><line x1="${x + 6}" y1="${y - er + 1}" x2="${x + 9}" y2="${y - er - 4}"/></g>`;
  const brow = (x, y) => `<path d="M${x - 6} ${y} Q${x} ${y - 5} ${x + 6} ${y}" stroke="${D.ink}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  const m = mouth === "open" ? `<path d="M150 74 Q162 72 172 70 Q170 86 158 86 Q150 85 150 74 Z" fill="${D.mouth}"/><path d="M153 82 Q160 78 167 81 Q163 87 157 86 Z" fill="${D.tongue}"/>`
    : mouth === "chew" ? `<path d="M151 76 Q160 71 170 73" stroke="${D.ink}" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="174" cy="68" r="2" fill="${D.shade}"/>`
    : mouth === "no" ? `<path d="M152 77 Q160 74 169 75" stroke="${D.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`
    : `<path d="M150 72 Q160 82 171 71" stroke="${D.ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
  // Spikes along the back (none for the baby), each with a darker side.
  const spikes = stage === 0 ? [] : stage === 1 ? [[70, 68, 7], [90, 63, 8], [110, 66, 7]] : [[56, 74, 10], [74, 64, 12], [94, 60, 13], [114, 63, 12], [130, 70, 9]];
  const sp = spikes.map(([x, y, h]) => `<path d="M${x - h * .85} ${y + 4} Q${x - 1} ${y - h * 1.7} ${x} ${y - h * 1.6} Q${x + 1} ${y - h * 1.7} ${x + h * .85} ${y + 4} Z" fill="${D.spike}"/>
    <path d="M${x} ${y - h * 1.6} Q${x + 1} ${y - h * 1.7} ${x + h * .85} ${y + 4} L${x + h * .2} ${y + 4} Z" fill="${D.spikeShade}"/>`).join("");
  const leg = (x, back) => `<path d="M${x - 11} 118 Q${x - 13} 140 ${x - 10} 145 L${x + 11} 145 Q${x + 13} 138 ${x + 11} 118 Z" fill="${back ? D.shade : D.body}"/>
    ${[x - 7, x, x + 7].map((t) => `<ellipse cx="${t}" cy="144" rx="3.2" ry="2.4" fill="${D.belly}"/>`).join("")}`;
  return `<g transform="translate(${100 - 100 * k} ${150 - 150 * k}) scale(${k})">
    <ellipse cx="96" cy="146" rx="${62}" ry="6" fill="#3c4a2a" opacity=".16"/>
    ${leg(72, true)}${leg(116, true)}
    <path d="M50 104 C30 110 14 104 4 84 C10 84 22 96 52 92 Z" fill="${D.body}"/>
    <path d="M4 84 C14 104 30 110 50 104 L48 99 C30 103 16 98 4 84 Z" fill="${D.shade}"/>
    ${sp}
    <ellipse cx="92" cy="100" rx="50" ry="36" fill="${D.body}"/>
    <path d="M43 106 Q92 136 141 104 Q138 128 92 136 Q50 134 43 106 Z" fill="${D.shade}"/>
    ${stage === 2 ? `<g fill="${D.shade}"><ellipse cx="68" cy="84" rx="6" ry="4"/><ellipse cx="86" cy="76" rx="5" ry="3.4"/><ellipse cx="62" cy="100" rx="4" ry="3"/><ellipse cx="104" cy="80" rx="3.5" ry="2.6"/></g>`
      : stage === 1 ? `<g fill="${D.shade}"><ellipse cx="72" cy="86" rx="4.5" ry="3"/><ellipse cx="90" cy="80" rx="3.5" ry="2.4"/></g>` : ""}
    <ellipse cx="100" cy="110" rx="30" ry="20" fill="${D.belly}"/>
    <path d="M72 116 Q100 134 128 114 Q122 129 100 130 Q80 129 72 116 Z" fill="${D.bellyShade}"/>
    <path d="M86 104 Q92 102 98 104 M88 112 Q96 110 104 112" stroke="${D.bellyShade}" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${leg(84, false)}${leg(122, false)}
    <path d="M118 78 Q126 92 120 108 L134 104 Q142 88 136 72 Z" fill="${D.body}"/>
    <path d="M126 98 Q138 104 142 94" stroke="${D.shade}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="143" cy="98" r="3.5" fill="${D.belly}"/>
    <ellipse cx="144" cy="58" rx="${stage === 0 ? 33 : 30}" ry="${stage === 0 ? 31 : 28}" fill="${D.body}"/>
    <ellipse cx="160" cy="70" rx="22" ry="16" fill="${D.body}"/>
    <path d="M128 80 Q150 92 178 74 Q172 88 154 89 Q138 89 128 80 Z" fill="${D.shade}"/>
    <circle cx="176" cy="64" r="1.8" fill="${D.dark}"/><circle cx="170" cy="62" r="1.8" fill="${D.dark}"/>
    <ellipse cx="132" cy="68" rx="6" ry="3.6" fill="${D.blush}" opacity=".7"/>
    ${m}
    <g class="blink">${eye(136, 44)}${eye(160, 44)}</g>
    ${eyes === "shut" ? "" : brow(134, 44 - er - 13) + brow(160, 44 - er - 13)}
    ${stage === 0 ? `<path d="M116 40 L123 28 L131 37 L139 24 L147 35 L155 24 L163 36 L171 30 Q168 12 144 10 Q119 12 116 40 Z" fill="#fbf2dc" stroke="#e3cf9f" stroke-width="2.4" stroke-linejoin="round"/>
      <ellipse cx="132" cy="20" rx="3" ry="2" fill="#a8d0a8"/><ellipse cx="152" cy="16" rx="2.4" ry="1.8" fill="#a8d0a8"/>` : ""}
    ${mood === "love" ? `<path d="M182 22 C176 11 162 18 170 29 L182 41 L194 29 C202 18 188 11 182 22 Z" fill="#e05a5a"/><path d="M174 21 Q176 17 180 18" stroke="#fff" stroke-width="2" fill="none" opacity=".7"/>` : ""}
  </g>`;
}
const EGG = `<g><ellipse cx="100" cy="146" rx="40" ry="5" fill="#3c4a2a" opacity=".16"/>
  <path d="M100 40 C70 40 56 82 56 106 C56 130 76 146 100 146 C124 146 144 130 144 106 C144 82 130 40 100 40 Z" fill="#fbf2dc"/>
  <path d="M120 52 C136 70 144 92 144 106 C144 130 124 146 100 146 C118 140 132 126 132 104 C132 84 126 66 120 52 Z" fill="#eedcb0"/>
  <ellipse cx="80" cy="76" rx="9" ry="7" fill="#a8d0a8"/><ellipse cx="114" cy="98" rx="11" ry="8" fill="#a8d0a8"/><ellipse cx="86" cy="122" rx="7" ry="5" fill="#a8d0a8"/>
  <ellipse cx="78" cy="68" rx="6" ry="12" fill="#fff" opacity=".6" transform="rotate(-20 78 68)"/></g>`;
const CRACK = `<path d="M60 96 L74 88 L84 101 L98 88 L110 102 L124 90 L140 98" stroke="#9a7a3a" stroke-width="3.6" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
// A beach ball in soft colours, with a shine.
const BALL = `<circle cx="50" cy="50" r="30" fill="#f4efe2"/>
  <path d="M50 20 Q30 36 32 72 A30 30 0 0 1 50 20 Z" fill="#e07a5f"/><path d="M50 20 Q70 36 68 72 A30 30 0 0 0 50 20 Z" fill="#5b9bd5"/>
  <path d="M32 72 Q50 82 68 72 A30 30 0 0 1 32 72 Z" fill="#f2c45a"/><circle cx="50" cy="50" r="30" fill="none" stroke="#c9bfa6" stroke-width="2"/>
  <ellipse cx="40" cy="34" rx="7" ry="4" fill="#fff" opacity=".7" transform="rotate(-30 40 34)"/>`;
const NEED_ICON = {
  food: `<g transform="translate(18 14) scale(.64)">${THINGS.apple[1]}</g>`,
  play: BALL,
  sleep: `<path d="M58 22 A26 26 0 1 0 74 64 A20 20 0 1 1 58 22 Z" fill="#f6c90e"/><text x="64" y="34" font-size="20" font-weight="700" fill="#2f7fe0" font-family="sans-serif">z</text>`,
};
document.head.insertAdjacentHTML("beforeend", `<style>
.petroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; overflow: hidden; transition: background .8s; }
.petroom .garden { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
.petroom .shade { position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; transition: background .8s; }
.petroom.evening .shade { background: linear-gradient(rgba(255, 140, 90, .32), rgba(120, 80, 160, .22)); }
.petroom.night .shade { background: rgba(11, 18, 48, .72); }
.petroom .dino .blink, .pethud .blink { animation: blink 4.5s infinite; transform-box: fill-box; transform-origin: center; }
@keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
.pethud { position: absolute; top: 18px; left: 50%; transform: translateX(-50%); display: flex; gap: clamp(16px, 4vw, 48px); align-items: center; direction: ltr; z-index: 2; }
.pethud .hearts svg { width: min(9vh, 7vw); height: min(9vh, 7vw); }
.pethud .grow { display: flex; align-items: flex-end; gap: 8px; background: rgba(255, 255, 255, .8); border-radius: 22px; padding: 8px 16px; }
.pethud .grow svg { flex: none; width: min(14vh, 11vw); height: min(10.5vh, 8.25vw); }
.pethud .grow svg.not { opacity: .25; filter: grayscale(1); }
.pethud .gbar { flex: none; width: min(10vh, 8vw); height: 14px; border-radius: 7px; background: #dfe7f1; margin-bottom: 16px; overflow: hidden; }
.pethud .gbar .fill { height: 14px; background: #f6c90e; border-radius: 7px; }
.pethud .hearts { display: flex; gap: 4px; }
.petroom .grass { position: absolute; left: -10%; right: -10%; bottom: -60px; height: 34%; border-radius: 50% 50% 0 0; background: #8fd16f; }
.petroom .dino { position: absolute; left: 50%; bottom: 6%; width: min(62vh, 58vw); height: min(46.5vh, 43.5vw); transform: translateX(-50%); overflow: visible; }
.petroom .dino.bob { animation: petbob 2.2s ease-in-out infinite; }
@keyframes petbob { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-8px); } }
.petroom .dino.jump { animation: petjump .45s ease-out 3; }
@keyframes petjump { 50% { transform: translateX(-50%) translateY(-60px); } }
.petroom .dino.dance { animation: petdance 1s ease-in-out; }
@keyframes petdance { 25% { transform: translateX(-50%) rotate(-8deg) scale(1.06); } 75% { transform: translateX(-50%) rotate(8deg) scale(1.06); } }
.petroom .dino.shake { animation: petshake .5s ease-in-out; }
@keyframes petshake { 25% { transform: translateX(calc(-50% - 10px)); } 75% { transform: translateX(calc(-50% + 10px)); } }
.petroom .dino.wobble { animation: petshake .4s ease-in-out infinite; }
.petroom .bubble { position: absolute; left: calc(50% + min(14vh, 13vw)); bottom: calc(6% + min(44vh, 41vw)); width: min(17vh, 15vw); height: min(17vh, 15vw);
  border-radius: 50%; background: #fff; box-shadow: 0 6px 0 rgba(29, 43, 79, .12); animation: grow .4s cubic-bezier(.3, 1.6, .5, 1); }
.petroom .bubble svg { width: 100%; height: 100%; }
.petroom .bubble::after { content: ""; position: absolute; left: 4%; bottom: -10%; width: 20%; height: 20%; border-radius: 50%; background: #fff; }
.petroom .poo { position: absolute; left: 18%; bottom: 7%; width: min(11vh, 10vw); height: min(11vh, 10vw); animation: grow .4s; }
.petroom .poo .fly { animation: wiggle 1s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.petroom .thing { position: absolute; transition: all .55s ease-in; }
.petroom .zz { position: absolute; left: calc(50% + 10vw); top: 34%; z-index: 3; font: 700 min(8vh, 7vw)/1 Fredoka, sans-serif; color: #f6c90e; animation: zz 2s ease-out infinite; }
@keyframes zz { from { opacity: 0; transform: translateY(20px); } 50% { opacity: 1; } to { opacity: 0; transform: translateY(-40px); } }
.petroom .spark { position: absolute; width: 18px; height: 18px; border-radius: 50%; background: radial-gradient(#fff, #bde7ff); animation: bit .9s ease-out forwards; }
</style>`);
const POO = `<svg viewBox="0 0 100 100"><ellipse cx="52" cy="92" rx="36" ry="5" fill="#3c4a2a" opacity=".16"/>
  <path d="M18 90 Q8 72 30 66 Q24 50 46 46 Q42 28 60 22 Q62 38 70 44 Q88 48 82 66 Q98 72 88 90 Z" fill="#8f6142"/>
  <path d="M60 22 Q62 38 70 44 Q88 48 82 66 Q98 72 88 90 L70 90 Q84 76 72 66 Q82 52 66 48 Q60 38 60 22 Z" fill="#78503a"/>
  <path d="M30 70 Q40 66 50 70 M40 52 Q48 48 56 52" stroke="#a87a58" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="42" cy="76" r="4.5" fill="#fff"/><circle cx="60" cy="76" r="4.5" fill="#fff"/><circle cx="43" cy="77" r="2.6" fill="#14182a"/><circle cx="61" cy="77" r="2.6" fill="#14182a"/>
  <path d="M45 84 Q52 89 59 84" stroke="#14182a" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <g class="fly"><ellipse cx="82" cy="16" rx="5" ry="3.4" fill="#24324f"/><ellipse cx="79" cy="11" rx="4.5" ry="2.6" fill="#d8ecff" opacity=".9"/><ellipse cx="86" cy="11" rx="4.5" ry="2.6" fill="#d8ecff" opacity=".9"/></g></svg>`;
// One dinosaur for the child: kept on this device and synced, and the most
// looked-after one on any device (others.pet, from the server) wins.
/* The garden, in layers like a picture book: soft sky and clouds, far hills,
   big leafy bushes in olive and teal, a tree with a striped trunk, a sandy
   meadow with little spots, flowers and pebbles in front. */
function leaves(x, y, s, colors, n = 7) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = -70 + (140 / (n - 1)) * i, h = 1 - Math.abs(a) / 140;
    out.push(`<path transform="translate(${x} ${y}) rotate(${a}) scale(${s * (0.75 + 0.35 * h)})" d="M0 0 C22 -34 22 -86 0 -120 C-22 -86 -22 -34 0 0 Z" fill="${colors[i % colors.length]}"/>`);
  }
  return out.join("");
}
function gardenSvg() {
  const flower = (x, y, c) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="7" ry="11" cy="-10" transform="rotate(${a})" fill="${c}"/>`).join("")}<circle r="6" fill="#f7d774"/></g>
    <path d="M${x} ${y + 6} Q${x + 2} ${y + 24} ${x - 2} ${y + 40}" stroke="#7a9a5a" stroke-width="3" fill="none"/>`;
  return `<svg class="garden" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
  <defs><linearGradient id="gardenSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9dbe0"/><stop offset="1" stop-color="#e5f0e6"/></linearGradient></defs>
  <rect width="1600" height="900" fill="url(#gardenSky)"/>
  <circle cx="1180" cy="150" r="64" fill="#f8e7ad" opacity=".85"/>
  <g fill="#fff" opacity=".75"><ellipse cx="260" cy="120" rx="90" ry="26"/><ellipse cx="320" cy="100" rx="60" ry="30"/><ellipse cx="900" cy="80" rx="70" ry="20"/><ellipse cx="950" cy="66" rx="44" ry="22"/></g>
  <path d="M0 520 Q260 400 560 470 Q860 380 1160 460 Q1400 410 1600 470 L1600 900 L0 900 Z" fill="#a9cdbf"/>
  <path d="M0 580 Q320 500 640 560 Q980 490 1300 560 Q1460 530 1600 560 L1600 900 L0 900 Z" fill="#94bfae"/>
  ${leaves(150, 640, 1.5, ["#6f8f5a", "#7f9f66", "#5f7f4f"])}${leaves(420, 650, 1.2, ["#4f7a6a", "#5f8a78"])}
  ${leaves(1180, 640, 1.6, ["#8fb99f", "#7aa88c", "#a3c7b0"])}${leaves(1460, 650, 1.3, ["#6f8f5a", "#87a56c"])}
  <g transform="translate(330 120)">
  <path d="M1012 540 L1040 250 L1086 250 L1092 540 Z" fill="#9c7a4e"/><path d="M1060 250 L1086 250 L1092 540 L1066 540 Z" fill="#87683f"/>
  ${[320, 390, 460].map((y) => `<path d="M${1036 - (y - 250) * 0.08} ${y} L${1088 + (y - 250) * 0.01} ${y - 14} L${1089 + (y - 250) * 0.01} ${y - 2} L${1035 - (y - 250) * 0.08} ${y + 12} Z" fill="#c9a46a"/>`).join("")}
  ${leaves(1062, 270, 1.5, ["#6f9a5e", "#5f8a50", "#87b072"], 9)}
  </g>
  ${leaves(760, 660, 1.0, ["#a7c4a0", "#8fb99f"])}
  <path d="M0 640 Q400 590 800 630 Q1200 600 1600 640 L1600 900 L0 900 Z" fill="#ece0b6"/>
  <path d="M0 780 Q500 740 900 770 Q1300 750 1600 780 L1600 900 L0 900 Z" fill="#ddcf9e"/>
  <g fill="#f6eccb">${[[120, 700], [340, 680], [620, 720], [980, 690], [1260, 720], [1480, 700], [460, 820], [1120, 830]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="8"/>`).join("")}</g>
  ${flower(90, 760, "#f2a0a6")}${flower(1500, 770, "#c9a6e0")}${flower(1380, 820, "#f2a0a6")}${flower(240, 830, "#f7c58a")}
  <g fill="#c8b98a"><ellipse cx="300" cy="790" rx="16" ry="9"/><ellipse cx="322" cy="796" rx="10" ry="6"/><ellipse cx="1300" cy="770" rx="14" ry="8"/></g>
</svg>`;
}
function petLoad() {
  const a = mine.pet || {}, b = (others && others.pet) || {};
  return (b.care || 0) > (a.care || 0) ? b : a;
}
function petSave() { mine.pet = { care: game.care, hatched: game.hatched, last: Date.now() }; save("pet", JSON.stringify(mine.pet)); }
const petStage = (care) => (care >= PET_STAGES[2] ? 2 : care >= PET_STAGES[1] ? 1 : 0);
function petStart() {
  const p = petLoad();
  Object.assign(game, { care: p.care || 0, hatched: !!p.hatched, needs: [], poo: false, cracks: 0, mood: "happy", eyes: "open", mouth: "smile" });
  const away = Date.now() - (p.last || 0);
  const evening = new Date().getHours() >= 19;
  $("sky").innerHTML = `<div class="petroom${evening ? " evening" : ""}" id="petroom">${gardenSvg()}<div class="shade"></div><div class="pethud" id="pethud"></div>
    <svg class="dino" id="dino" viewBox="0 0 200 150"></svg></div>`;
  if (!game.hatched) { petDraw(); return; }
  // Back after a while: hungry, and maybe a poo to clean up. In the evening it is sleepy first.
  game.needs.push(evening ? "sleep" : away > 3600e3 ? "food" : ["food", "play", "sleep"][Math.floor(Math.random() * 3)]);
  if (away > 1800e3 || Math.random() < 0.4) game.poo = true;
  petDraw();
  petLater();
}
function petLater() { // every 20-30 seconds it wants something new (two at most at once)
  later(() => {
    if (game.busy || game.needs.length + (game.poo ? 1 : 0) >= 2) return petLater();
    const r = Math.random();
    if (r < 0.25 && !game.poo) game.poo = true;
    else { const n = ["food", "play", "sleep"].filter((x) => !game.needs.includes(x)); game.needs.push(n[Math.floor(Math.random() * n.length)]); }
    petDraw(); tune([392, 330], 0.15, 0.09);
    petLater();
  }, 20000 + Math.random() * 10000);
}
function petDraw() {
  const room = $("petroom"), dino = $("dino");
  if (!room) return;
  if (!game.hatched) {
    dino.setAttribute("viewBox", "0 0 200 150");
    dino.innerHTML = EGG + (game.cracks ? CRACK : "");
    dino.setAttribute("class", "dino wobble");
    return;
  }
  dino.innerHTML = dinoSvg({ mood: game.mood, stage: petStage(game.care), eyes: game.eyes, mouth: game.mouth });
  petHud();
  if (!game.busy) dino.setAttribute("class", "dino bob");
  room.querySelectorAll(".bubble, .poo").forEach((x) => x.remove());
  if (game.needs.length && !game.busy) room.insertAdjacentHTML("beforeend", `<div class="bubble"><svg viewBox="0 0 100 100">${NEED_ICON[game.needs[0]]}</svg></div>`);
  if (game.poo) room.insertAdjacentHTML("beforeend", `<div class="poo">${POO}</div>`);
}
/* Top of the screen, pictures only: three hearts (all red = it has all it
   wants) and the growth bar: baby, child and big dinosaur, with a yellow bar
   filling up towards the next one. */
const HEART = (on) => `<svg viewBox="0 0 100 100"><path d="M50 88 C10 60 5 30 28 20 C40 15 50 25 50 32 C50 25 60 15 72 20 C95 30 90 60 50 88 Z" fill="${on ? "#e63946" : "#dfe7f1"}" stroke="#fff" stroke-width="6"/></svg>`;
function petHud() {
  const hud = $("pethud");
  if (!hud || !game.hatched) return;
  const full = Math.max(0, 3 - game.needs.length - (game.poo ? 1 : 0)), st = petStage(game.care);
  const next = PET_STAGES[st + 1], from = PET_STAGES[st];
  const bar = (i) => `<div class="gbar"><div class="fill" style="width:${i < st ? 100 : i > st || !next ? 0 : Math.round(100 * (game.care - from) / (next - from))}%"></div></div>`;
  hud.innerHTML = `<div class="hearts">${[0, 1, 2].map((i) => HEART(i < full)).join("")}</div>
    <div class="grow">${[0, 1, 2].map((i) => `<svg class="${i > st ? "not" : ""}" viewBox="0 0 200 150">${dinoSvg({ stage: i })}</svg>${i < 2 ? bar(i) : ""}`).join("")}</div>`;
}
function petAnim(cls, ms) {
  const d = $("dino");
  d.setAttribute("class", "dino"); void d.getBoundingClientRect();
  d.setAttribute("class", "dino " + cls);
  later(() => { game.busy = false; game.mouth = "smile"; game.eyes = "open"; game.mood = "happy"; petDraw(); }, ms);
}
function petDone(need) { // did what it wanted: a dance, a tune, and it grows a little
  const before = petStage(game.care);
  game.needs = game.needs.filter((n) => n !== need);
  game.care++; petSave();
  game.mood = "love";
  if (petStage(game.care) > before) { tune([523, 659, 784, 1047, 1319], 0.14, 0.18); burst(14); later(() => burst(14), 400); } else happy();
  petHud();
}
function burst(n) {
  const room = $("petroom"), r = $("dino").getBoundingClientRect();
  for (let i = 0; i < n; i++) {
    const b = document.createElement("i");
    b.className = "bit";
    b.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;background:${["#e63946", "#2a9d4b", "#f6c90e", "#2f7fe0"][i % 4]}`;
    const a = i / n * 6.28, dist = 90 + Math.random() * 80;
    b.style.setProperty("--dx", Math.cos(a) * dist + "px"); b.style.setProperty("--dy", Math.sin(a) * dist + "px");
    room.appendChild(b); setTimeout(() => b.remove(), 900);
  }
}
function flyThing(svg, from, toEl, size) { // a picture flies from the bottom to the dinosaur's mouth
  const room = $("petroom"), r = toEl.getBoundingClientRect(), el = document.createElement("div");
  el.className = "thing"; el.innerHTML = svg;
  el.style.cssText = `width:${size}px;height:${size}px;left:${from}px;top:${innerHeight - 40}px`;
  room.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => { el.style.left = r.left + r.width * 0.7 - size / 2 + "px"; el.style.top = r.top + r.height * 0.4 + "px"; el.style.transform = "scale(.6)"; }));
  later(() => el.remove(), 600);
  return el;
}
function petKey(c) {
  if (!game.hatched) { // the egg: three presses and it hatches
    game.cracks++;
    tune([660 + game.cracks * 80], 0, 0.15);
    petDraw();
    if (game.cracks >= 3) {
      game.hatched = true; game.busy = true; petSave();
      later(() => { burst(16); tune([523, 659, 784, 1047], 0.12, 0.18); game.needs = ["food"]; petAnim("dance", 1200); petLater(); }, 300);
    }
    return;
  }
  game.busy = true;
  $("petroom").querySelectorAll(".bubble").forEach((x) => x.remove());
  const dino = $("dino");
  if (c === "red") { // food
    if (!game.needs.includes("food")) { game.mouth = "no"; petDraw(); softNo(); return petAnim("shake", 700); }
    game.mouth = "open"; petDraw();
    flyThing(`<svg viewBox="0 0 100 100">${THINGS.apple[1]}</svg>`, innerWidth * 0.2, dino, 70);
    later(() => { game.mouth = "chew"; petDraw(); tune([392, 523, 392, 523], 0.13, 0.12); }, 600);
    later(() => petDone("food"), 1300);
    return petAnim("dance", 2200);
  }
  if (c === "green") { // play ball: always fine, it loves it
    const ball = flyThing(`<svg viewBox="0 0 100 100">${NEED_ICON.play}</svg>`, innerWidth * 0.8, dino, 60);
    ball.style.transition = "all .45s ease-out";
    game.mouth = "open"; petDraw();
    if (game.needs.includes("play")) later(() => petDone("play"), 700); else later(happy, 700);
    return petAnim("jump", 1500);
  }
  if (c === "yellow") { // clean up: sparkles, and the poo is gone
    const room = $("petroom");
    for (let i = 0; i < 12; i++) {
      const sp = document.createElement("i");
      sp.className = "spark";
      sp.style.cssText = `left:${(game.poo ? 18 : 40) + Math.random() * 14}%;bottom:${8 + Math.random() * 14}%`;
      sp.style.setProperty("--dx", (Math.random() - .5) * 120 + "px"); sp.style.setProperty("--dy", -60 - Math.random() * 80 + "px");
      room.appendChild(sp); setTimeout(() => sp.remove(), 950);
    }
    tune([1047, 1319, 1568], 0.08, 0.1);
    if (game.poo) { game.poo = false; later(() => { game.care++; petSave(); game.mood = "love"; happy(); petDraw(); }, 500); }
    return petAnim("dance", 1300);
  }
  // blue: bedtime: the room goes dark, it closes its eyes and snores, then wakes up rested
  const room = $("petroom");
  room.classList.add("night"); game.eyes = "shut"; petDraw();
  room.insertAdjacentHTML("beforeend", `<div class="zz">z z z</div>`);
  tune([523, 392, 330, 262], 0.35, 0.1);
  later(() => {
    room.classList.remove("night"); room.querySelector(".zz")?.remove();
    if (game.needs.includes("sleep")) petDone("sleep"); else happy();
  }, 3600);
  return petAnim("", 4000);
}

/* ---- The car game ----
   Seen from above, like the old video-game car races but drawn softly: a road
   with three lanes runs down the screen, trees and flowers pass on the grass.
   The child moves the little red car left and right to catch stars; a cone
   only makes the car wobble and say "boing". No crash, no losing.
   It can be played with the colour keys, by touch, or with a parent's phone
   (control.html): the TV gets a one-time ticket and opens a stream, and each
   press on the phone arrives here within a moment. */
function carSvg(lights = false) { // a top-down car with a friendly face on the windscreen, nose up, centred on 0 0
  return `<g>
    <ellipse cx="0" cy="44" rx="30" ry="7" fill="#1f2a1a" opacity=".22"/>
    <rect x="-34" y="-34" width="12" height="22" rx="5" fill="#2b2b33"/><rect x="22" y="-34" width="12" height="22" rx="5" fill="#2b2b33"/>
    <rect x="-34" y="16" width="12" height="22" rx="5" fill="#2b2b33"/><rect x="22" y="16" width="12" height="22" rx="5" fill="#2b2b33"/>
    <path d="M-26 -36 Q-26 -50 0 -50 Q26 -50 26 -36 L28 34 Q28 44 0 44 Q-28 44 -28 34 Z" fill="#e05545"/>
    <path d="M8 -50 Q26 -50 26 -36 L28 34 Q28 44 6 44 Q20 40 20 30 L18 -36 Q18 -46 8 -50 Z" fill="#c4433a"/>
    <path d="M-18 -24 Q0 -32 18 -24 L16 -6 Q0 -10 -16 -6 Z" fill="#bfe3f2"/>
    <circle cx="-7" cy="-17" r="4" fill="#fff"/><circle cx="7" cy="-17" r="4" fill="#fff"/><circle cx="-6" cy="-16.5" r="2.3" fill="#14182a"/><circle cx="8" cy="-16.5" r="2.3" fill="#14182a"/>
    <path d="M-5 -11 Q0 -8 5 -11" stroke="#14182a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    <rect x="-16" y="0" width="32" height="22" rx="6" fill="#e86a5a"/><path d="M-14 26 Q0 30 14 26 L14 32 Q0 36 -14 32 Z" fill="#bfe3f2" opacity=".8"/>
    <circle cx="-18" cy="-46" r="4.5" fill="${lights ? "#fff6a8" : "#ffe9a8"}"/><circle cx="18" cy="-46" r="4.5" fill="${lights ? "#fff6a8" : "#ffe9a8"}"/>
    ${lights ? `<path d="M-22 -50 L-34 -90 L-6 -90 Z M22 -50 L34 -90 L6 -90 Z" fill="#fff6a8" opacity=".35"/>` : ""}
    <rect x="-24" y="40" width="10" height="4" rx="2" fill="#a83a31"/><rect x="14" y="40" width="10" height="4" rx="2" fill="#a83a31"/>
  </g>`;
}
function carStar(x, y, r) {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 5 * i - Math.PI / 2, d = i % 2 ? r * .48 : r;
    return `${(x + Math.cos(a) * d).toFixed(1)},${(y + Math.sin(a) * d).toFixed(1)}`; }).join(" ");
  return `<polygon points="${pts}" fill="#f6c90e" stroke="#e0a800" stroke-width="${r * .12}" stroke-linejoin="round"/>
    <circle cx="${x - r * .2}" cy="${y - r * .05}" r="${r * .09}" fill="#24324f"/><circle cx="${x + r * .2}" cy="${y - r * .05}" r="${r * .09}" fill="#24324f"/>
    <path d="M${x - r * .18} ${y + r * .18} Q${x} ${y + r * .32} ${x + r * .18} ${y + r * .18}" stroke="#24324f" stroke-width="${r * .08}" fill="none" stroke-linecap="round"/>`;
}
const CONE = `<svg viewBox="0 0 100 100"><ellipse cx="50" cy="90" rx="34" ry="7" fill="#1f2a1a" opacity=".2"/><rect x="18" y="78" width="64" height="12" rx="4" fill="#e8742a"/>
  <path d="M38 14 Q50 6 62 14 L76 80 L24 80 Z" fill="#f28c38"/><path d="M50 8 Q58 9 62 14 L76 80 L58 80 Z" fill="#d9702a"/>
  <path d="M33 38 L67 38 L70 52 L30 52 Z" fill="#fff6e6"/></svg>`;
const SIDE = [ // things on the grass that pass by
  (k) => `<svg viewBox="0 0 100 100" style="width:${k}px;height:${k}px"><ellipse cx="50" cy="92" rx="30" ry="6" fill="#1f2a1a" opacity=".18"/><rect x="44" y="60" width="12" height="32" rx="4" fill="#8a6a44"/>
    <circle cx="50" cy="42" r="30" fill="#6f9a5e"/><circle cx="34" cy="50" r="18" fill="#87b072"/><circle cx="64" cy="34" r="16" fill="#5f8a50"/></svg>`,
  (k) => `<svg viewBox="0 0 100 100" style="width:${k * .7}px;height:${k * .7}px"><ellipse cx="50" cy="70" rx="40" ry="26" fill="#7aa88c"/><ellipse cx="34" cy="62" rx="22" ry="18" fill="#8fb99f"/><ellipse cx="66" cy="60" rx="20" ry="16" fill="#6a9a7c"/></svg>`,
  (k) => `<svg viewBox="0 0 60 60" style="width:${k * .4}px;height:${k * .4}px">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="8" ry="13" cy="-11" transform="translate(30 30) rotate(${a})" fill="#f2a0a6"/>`).join("")}<circle cx="30" cy="30" r="7" fill="#f7d774"/></svg>`,
];
document.head.insertAdjacentHTML("beforeend", `<style>
.carroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; overflow: hidden; background: #a8cf8e; }
/* Everything that moves is moved with transform only (no repainting), so a slow TV browser stays smooth:
   the grass dots, road lines and curbs are strips a little taller than the screen that slide down and jump back. */
.carroom .grassdots { position: absolute; top: -46px; left: 0; right: 0; bottom: 0; background-image: radial-gradient(#b8dba0 18%, transparent 20%); background-size: 46px 46px; will-change: transform; }
.carroom .road { position: absolute; top: -10%; bottom: -10%; left: 50%; width: var(--rw); transform: translateX(-50%); background: #5d6675;
  box-shadow: inset 10px 0 0 #4f5866, inset -10px 0 0 #4f5866; }
.carroom .curb { position: absolute; top: -60px; bottom: 0; width: 14px; background-image: repeating-linear-gradient(#e86a5a 0 30px, #fff6ea 30px 60px); will-change: transform; }
.carroom .curb.l { left: -14px; } .carroom .curb.r { right: -14px; }
.carroom .dash { position: absolute; top: -120px; bottom: 0; width: 8px; margin-left: -4px; background-image: repeating-linear-gradient(#fff 0 60px, transparent 60px 120px); opacity: .9; will-change: transform; }
.carroom .me { position: absolute; left: 0; bottom: 9%; width: var(--cw); height: calc(var(--cw) * 1.4); transition: transform .12s ease-out; will-change: transform; }
.carroom .me svg { width: 100%; height: 100%; overflow: visible; }
.carroom .me.bonk svg { animation: carbonk .5s ease-in-out; }
@keyframes carbonk { 25% { transform: rotate(-12deg); } 50% { transform: rotate(10deg); } 75% { transform: rotate(-5deg); } }
.carroom .me.honk svg { animation: carhonk .3s ease-in-out 2; }
@keyframes carhonk { 50% { transform: scale(1.08); } }
.carroom .item { position: absolute; top: 0; width: var(--iw); height: var(--iw); margin-left: calc(var(--iw) / -2); will-change: transform; }
.carroom .item svg { width: 100%; height: 100%; overflow: visible; }
.carroom .side { position: absolute; top: 0; will-change: transform; }
.carroom .note { position: absolute; font: 700 40px/1 Fredoka, sans-serif; color: #fff; text-shadow: 0 3px 0 rgba(0, 0, 0, .2); animation: zz 1s ease-out forwards; pointer-events: none; }
.carhud { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; background: rgba(255, 255, 255, .85);
  border-radius: 22px; padding: 6px 16px; font: 700 34px/1 Fredoka, sans-serif; color: #24324f; direction: ltr; z-index: 3; }
.carhud svg { width: 46px; height: 46px; }
.carqr { position: absolute; top: 16px; right: 16px; z-index: 3; background: #fff; border-radius: 18px; padding: 10px; display: grid; justify-items: center; gap: 4px;
  box-shadow: 0 6px 0 rgba(0, 0, 0, .15); font: 600 14px/1.3 Vazirmatn, sans-serif; color: #24324f; text-align: center; width: 150px; transition: opacity .6s; }
.carqr svg { width: 120px; height: 120px; }
.carqr.gone { opacity: 0; pointer-events: none; }
.game.car .keys .k.blue { visibility: hidden; }
</style>`);
function carStart() {
  const W = innerWidth, H = innerHeight - 120;
  const rw = Math.min(W * 0.62, H * 0.95), cw = rw / 3 * 0.62;
  Object.assign(game, { lane: 1, stars: 0, items: [], sides: [], off: 0, speed: H / 3.2, rw, cw, H, W, spawnIn: 0.8, sideIn: 0 });
  $("sky").innerHTML = `<div class="carroom" id="carroom" style="--rw:${rw}px;--cw:${cw}px;--iw:${cw * 0.8}px">
    <div class="grassdots" id="grassdots"></div>
    <div class="road" id="road"><i class="curb l" id="curbL"></i><i class="curb r" id="curbR"></i>
      <i class="dash" id="dash1" style="left:33.3%"></i><i class="dash" id="dash2" style="left:66.6%"></i></div>
    <div class="me" id="me"><svg viewBox="-40 -56 80 104">${carSvg()}</svg></div>
    <div class="carhud"><svg viewBox="0 0 40 40">${carStar(20, 21, 18)}</svg><span id="starCount">0</span></div>
    <div class="carqr" id="carqr">${window.qrSvg ? qrSvg(location.origin + "/control.html") : ""}<span>با گوشی بازی کنید: این کد را با دوربین گوشی بگیرید</span></div>
  </div>`;
  game.el = { room: $("carroom"), me: $("me"), road: $("road"), dash1: $("dash1"), dash2: $("dash2"), curbL: $("curbL"), curbR: $("curbR"), grass: $("grassdots") };
  carPlace();
  $("carroom").addEventListener("pointerdown", (e) => carKey(e.clientX < innerWidth / 2 ? "red" : "green"));
  game.raf = requestAnimationFrame(carFrame);
  carListen();
  later(() => { const q = $("carqr"); if (q && !game.padSeen) q.classList.add("gone"); }, 25000);
}
// Lanes: 0 (left), 1 (middle), 2 (right), as x positions on the screen.
const laneX = (i) => game.W / 2 + (i - 1) * game.rw / 3;
function carPlace() { const me = $("me"); if (me) me.style.transform = `translate3d(${laneX(game.lane) - game.cw / 2}px, 0, 0)`; }
function carKey(c) {
  if (c === "red" && game.lane > 0) { game.lane--; carPlace(); tune([440], 0, 0.06); }
  else if (c === "green" && game.lane < 2) { game.lane++; carPlace(); tune([494], 0, 0.06); }
  else if (c === "yellow") carHonk();
}
function carHonk() {
  const me = $("me");
  me.classList.remove("honk"); void me.offsetWidth; me.classList.add("honk");
  const a = audioCtx();
  if (a) [0, 0.22].forEach((d) => { const o = a.createOscillator(), g = a.createGain(); o.type = "square"; o.frequency.value = 392;
    g.gain.setValueAtTime(0.07, a.currentTime + d); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d + 0.18);
    o.connect(g); g.connect(a.destination); o.start(a.currentTime + d); o.stop(a.currentTime + d + 0.2); });
  const n = document.createElement("div");
  n.className = "note"; n.textContent = "♪ ♫";
  n.style.left = laneX(game.lane) + game.cw * 0.4 + "px"; n.style.bottom = "34%";
  $("carroom").appendChild(n); setTimeout(() => n.remove(), 1000);
}
function carFrame(t) {
  if (!game || game.kind !== "car") return;
  // Real time, even on a slow TV that draws few frames (no slow motion); only a long pause is cut short.
  const dt = Math.min(0.12, (t - (game.last || t)) / 1000); game.last = t;
  const v = game.speed * dt;
  game.off = (game.off + v) % 120;
  const tf = (el, y) => { el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`; };
  tf(game.el.dash1, game.off); tf(game.el.dash2, game.off);
  tf(game.el.curbL, game.off % 60); tf(game.el.curbR, game.off % 60); tf(game.el.grass, game.off % 46);
  const room = game.el.room;
  // New stars and cones from the top (no two cones in a row, never in every lane).
  game.spawnIn -= dt;
  if (game.spawnIn <= 0) {
    game.spawnIn = 1.1 + Math.random() * 0.7;
    const cone = Math.random() < 0.28 && !game.lastCone;
    game.lastCone = cone;
    const el = document.createElement("div");
    el.className = "item"; el.innerHTML = cone ? CONE : `<svg viewBox="0 0 40 40">${carStar(20, 21, 18)}</svg>`;
    const lane = Math.floor(Math.random() * 3);
    el.style.left = laneX(lane) + "px";
    room.insertBefore(el, game.el.me);
    game.items.push({ el, lane, y: -game.cw, cone });
  }
  game.sideIn -= dt;
  if (game.sideIn <= 0) { // trees, bushes and flowers on both sides
    game.sideIn = 0.8 + Math.random() * 0.8;
    const el = document.createElement("div"), k = game.cw * (1.5 + Math.random() * 0.7);
    el.className = "side"; el.innerHTML = SIDE[Math.floor(Math.random() * SIDE.length)](k);
    const left = Math.random() < 0.5, grass = (game.W - game.rw) / 2 - 20;
    el.style.left = (left ? 10 + Math.random() * Math.max(0, grass - k) : game.W - grass + Math.random() * Math.max(0, grass - k)) + "px";
    room.insertBefore(el, game.el.road);
    game.sides.push({ el, y: -k });
  }
  const carTop = game.H * 0.91 - game.cw * 1.4, carBottom = game.H * 0.91;
  for (const it of game.items) {
    it.y += v; tf(it.el, it.y);
    const mid = it.y + game.cw * 0.4;
    if (!it.hit && it.lane === game.lane && mid > carTop && mid < carBottom) {
      it.hit = true; it.el.remove();
      if (it.cone) { const me = $("me"); me.classList.remove("bonk"); void me.offsetWidth; me.classList.add("bonk"); tune([330, 262], 0.12, 0.08); }
      else { game.stars++; $("starCount").textContent = game.stars.toLocaleString("fa-IR"); tune([784, 1047], 0.08, 0.14); carSparkle(); }
    }
    if (it.y > game.H + 40) { it.hit = true; it.el.remove(); }
  }
  game.items = game.items.filter((x) => !x.hit);
  for (const sd of game.sides) { sd.y += v; tf(sd.el, sd.y); if (sd.y > game.H + 20) { sd.el.remove(); sd.gone = true; } }
  game.sides = game.sides.filter((x) => !x.gone);
  game.raf = requestAnimationFrame(carFrame);
}
function carSparkle() {
  const room = $("carroom"), x = laneX(game.lane), y = game.H * 0.91 - game.cw * 1.2;
  for (let i = 0; i < 10; i++) {
    const b = document.createElement("i");
    b.className = "bit"; b.style.cssText = `left:${x}px;top:${y}px;background:${["#f6c90e", "#fff", "#ffd8a8"][i % 3]}`;
    const a = i / 10 * 6.28, d = 50 + Math.random() * 50;
    b.style.setProperty("--dx", Math.cos(a) * d + "px"); b.style.setProperty("--dy", Math.sin(a) * d + "px");
    room.appendChild(b); setTimeout(() => b.remove(), 900);
  }
}
// The phone controller: a one-time ticket, then a stream of presses.
async function carListen() {
  if (typeof API === "undefined" || !API || !NT.token()) return;
  const r = await NT.call("/pad/ticket");
  if (!game || game.kind !== "car" || !r.ok) return;
  const es = new EventSource(NT.base + "/pad/listen?t=" + encodeURIComponent(r.body.ticket));
  game.stop = () => es.close();
  es.onmessage = (e) => {
    if (!game || game.kind !== "car") return es.close();
    let m = null;
    try { m = JSON.parse(e.data); } catch (err) { return; }
    if (!game.padSeen) { game.padSeen = true; const q = $("carqr"); if (q) q.classList.add("gone"); }
    carKey({ left: "red", right: "green", honk: "yellow" }[m.btn] || "");
  };
  es.onerror = () => { // the stream broke (e.g. the server restarted): a new ticket in a moment
    es.close();
    if (game && game.kind === "car") later(carListen, 3000);
  };
}
