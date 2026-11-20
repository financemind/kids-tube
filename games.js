/* Games for Noyan, played with the four colour keys of the TV remote (or by
   touch). None needs reading, none has a score, losing or a prize: a wrong
   press only makes the picture wobble gently and wait. Each game uses today's
   watch time and ends by itself (see beginGame in index.html).
   - balloons: pop the balloon of the colour you press (in index.html);
   - colors:   a big thing comes up (apple, leaf, sun, fish…): press its colour;
   - count:    1 to 4 apples: press the key with that many dots;
   - feed:     four animals, one is hungry: press its colour to feed it;
   - simon:    the circles light up in a row: press the same row back.
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
  ["simon", `<svg viewBox="0 0 200 100">${["#e63946", "#2a9d4b", "#f6c90e", "#2f7fe0"].map((c, i) => `<circle cx="${30 + i * 47}" cy="50" r="20" fill="${c}" opacity="${i === 1 ? 1 : .4}"/>`).join("")}</svg>`],
];
const PICK_VID = { balloons: "game", colors: "game-colors", count: "game-count", feed: "game-feed", simon: "game-simon" };
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
  ({ colors: colorsRound, count: countRound, feed: feedRound, simon: simonStart })[kind]();
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
  ({ colors: colorsKey, count: countKey, feed: feedKey, simon: simonKey })[game.kind](c);
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
