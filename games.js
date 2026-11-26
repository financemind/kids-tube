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
   - maze:     the little dinosaur walks through a hedge maze to an apple
               (arrow keys, or the colour keys with arrows on them);
   - puzzle:   a picture in four pieces: press the colour of each piece's place;
   - pairs:    four cards face down: turn two, find the two the same;
   - sizes:    four of a thing in four sizes: put them on the shelf, smallest first;
   - catch:    apples fall from a tree: move the basket left and right (phone too);
   - paint:    a drawing in parts: the blinking part takes the colour you press;
   - story:    three pictures of a little story: press them in order;
   - dress:    dress the dinosaur up: hat, glasses, scarf, and where it is;
   - cook:     make a sandwich layer by layer and feed it to the dinosaur;
   - photo:    an animal peeks from a bush: press its colour to take its photo;
   - climb:    climb a wall by picking the hold with the shape it wants;
   - music:    a xylophone: four bars, free play;
   - sounds:   a sound plays: press the animal that makes it;
   - bubbles:  slow bubbles: a colour pops the lowest bubble of that colour;
   - hide:     the dinosaur hides (tail peeking out): find it;
   - tower:    a block per key, and the dinosaur knocks the tall tower down;
   - train:    load each thing into the wagon of its colour, then toot toot;
   - album:    the stickers won by finishing games (not a game, a book);
   - pet:      a little dinosaur of his own to look after: red feeds it,
               green plays ball, yellow cleans up, blue puts it to sleep.
   The little dinosaur (pet) and the colour treasure hunt (hunt) have their own cards on
   the home screen, not in the picker.
   The picker shows the games: red/green move, yellow opens. Every
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
.picker { position: absolute; top: 0; right: 0; bottom: 0; left: 0; overflow-y: auto; display: flex; flex-wrap: wrap; align-content: safe center; justify-content: center;
  gap: clamp(10px, 1.8vw, 24px); padding: 76px 24px 24px; direction: ltr; }
.picker button { width: clamp(96px, 11.6vw, 210px); aspect-ratio: 4 / 3; border-radius: 26px; border: 6px solid #fff; background: #fff; cursor: pointer;
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
const softNo = () => { if (game) game.wrong = (game.wrong || 0) + 1; tune([247], 0.1, 0.07); }; // counted for the parents' report
/* Games with a right answer: at the end, how many he got right (rounds) and
   wrong (softNo) go to the parents' report. Pairs, maze and the dinosaur are
   left out: a wrong turn there is part of playing, not a mistake. */
window.SCORED = { colors: 1, count: 1, feed: 1, simon: 1, puzzle: 1, sizes: 1, story: 1, climb: 1, sounds: 1, hide: 1, train: 1 };

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
  ["car", `<svg viewBox="0 0 200 150"><rect x="55" y="0" width="90" height="150" fill="#5d6675"/>
    <g fill="#fff">${[10, 50, 90, 130].map((y) => `<rect x="97" y="${y}" width="6" height="22" rx="3"/>`).join("")}</g>
    <rect x="0" y="0" width="55" height="150" fill="#a8cf8e"/><rect x="145" y="0" width="55" height="150" fill="#a8cf8e"/>
    <g transform="translate(100 98) scale(.9)">${carSvg()}</g>${carStar(70, 26, 14)}</svg>`],
  ["maze", mazePickArt()],
  ["puzzle", puzzlePickArt()],
  ["pairs", pairsPickArt()],
  ["sizes", sizesPickArt()],
  ["catch", catchPickArt], ["paint", paintPickArt], ["story", storyPickArt], ["dress", dressPickArt],
  ["cook", cookPickArt], ["photo", photoPickArt], ["climb", climbPickArt],
  ["simon", `<svg viewBox="0 0 200 100">${["#e63946", "#2a9d4b", "#f6c90e", "#2f7fe0"].map((c, i) => `<circle cx="${30 + i * 47}" cy="50" r="20" fill="${c}" opacity="${i === 1 ? 1 : .4}"/>`).join("")}</svg>`],
  ["music", musicPickArt], ["sounds", soundsPickArt], ["bubbles", bubblesPickArt], ["hide", hidePickArt],
  ["tower", towerPickArt], ["train", trainPickArt], ["candles", candlesPickArt], ["tree", treePickArt],
  ["album", albumPickArt],
];
window.PICK_KINDS = PICK.map(([kind]) => kind);
const PICK_VID = { balloons: "game", colors: "game-colors", count: "game-count", feed: "game-feed", simon: "game-simon", pet: "game-pet", car: "game-car", maze: "game-maze", puzzle: "game-puzzle", pairs: "game-pairs", sizes: "game-sizes",
  catch: "game-catch", paint: "game-paint", story: "game-story", dress: "game-dress", cook: "game-cook", photo: "game-photo", climb: "game-climb",
  music: "game-music", sounds: "game-sounds", bubbles: "game-bubbles", hide: "game-hide", tower: "game-tower", train: "game-train", album: "game-album", hunt: "game-hunt", candles: "game-candles", tree: "game-tree" };
function showPicker() {
  if (!canWatch()) return renderGrid();
  playingId = null; playingCat = null;
  $("home").hidden = true; $("game").hidden = false; $("game").className = "game pick";
  const box = document.createElement("div");
  box.className = "picker";
  for (const [kind, art] of PICK.filter(([k]) => gameOn(k))) { // only the games the parents left on
    const b = document.createElement("button");
    b.setAttribute("aria-label", kind);
    b.innerHTML = typeof art === "function" ? art() : art; // a function: drawn when the picker opens (it may use pictures defined further down)
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
  ({ colors: colorsRound, count: countRound, feed: feedRound, simon: simonStart, pet: petStart, car: carStart, maze: mazeStart, puzzle: puzzleStart, pairs: pairsStart, sizes: sizesStart,
    catch: catchStart, paint: paintStart, story: storyStart, dress: dressStart, cook: cookStart, photo: photoStart, climb: climbStart,
    music: musicStart, sounds: soundsStart, bubbles: bubblesStart, hide: hideStart, tower: towerStart, train: trainStart, album: albumStart, hunt: huntStart, candles: candlesStart, tree: treeStart })[kind]();
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
  ({ colors: colorsKey, count: countKey, feed: feedKey, simon: simonKey, pet: petKey, car: carKey, maze: mazeKey, puzzle: puzzleKey, pairs: pairsKey, sizes: sizesKey,
    catch: catchKey, paint: paintKey, story: storyKey, dress: dressKey, cook: cookKey, photo: photoKey, climb: climbKey,
    music: musicKey, sounds: soundsKey, bubbles: bubblesKey, hide: hideKey, tower: towerKey, train: trainKey, album: albumKey, hunt: huntKey, candles: candlesKey, tree: treeKey })[game.kind](c);
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
// The phone controller: a one-time ticket, then a stream of presses (left, right, honk).
// Any game can listen: padListen(its kind, what to do with each button).
async function padListen(kind, onBtn) {
  if (typeof API === "undefined" || !API || !NT.token()) return;
  const r = await NT.call("/pad/ticket");
  if (!game || game.kind !== kind || !r.ok) return;
  const es = new EventSource(NT.base + "/pad/listen?t=" + encodeURIComponent(r.body.ticket));
  game.stop = () => es.close();
  es.onmessage = (e) => {
    if (!game || game.kind !== kind) return es.close();
    let m = null;
    try { m = JSON.parse(e.data); } catch (err) { return; }
    game.padSeen = true;
    onBtn(m.btn);
  };
  es.onerror = () => { // the stream broke (e.g. the server restarted): a new ticket in a moment
    es.close();
    if (game && game.kind === kind) later(() => padListen(kind, onBtn), 3000);
  };
}
function carListen() {
  padListen("car", (btn) => {
    const q = $("carqr"); if (q) q.classList.add("gone");
    const m = /^lane([012])$/.exec(btn || ""); // the phone held as a steering wheel: its tilt is the lane
    if (m) { const l = Number(m[1]); if (l !== game.lane) { game.lane = l; carPlace(); tune([l === 1 ? 523 : 440], 0, 0.06); } return; }
    carKey({ left: "red", right: "green", honk: "yellow" }[btn] || "");
  });
}

/* ---- Maze ----
   The little dinosaur walks through a garden of hedges to an apple. The arrow
   keys of the remote move it, and so do the colour keys (each shows its arrow:
   red left, green right, yellow up, blue down), or a tap on the path (one
   step that way). A hedge in the way: a soft bump, nothing else. The mazes
   grow a little each round. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.maze { background: #a8cf8e; }
.mazebox { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: flex; align-items: center; justify-content: center; padding: 70px 20px 10px; }
.mazebox svg.mz { max-width: 100%; max-height: 100%; width: auto; height: 100%; overflow: visible; touch-action: none; }
#mzMe { transition: transform .22s ease-out; }
#mzMe .bod { transform-box: fill-box; transform-origin: 50% 90%; }
.mzfoot { animation: grow .3s ease-out; }
.mzapple.eat { animation: pop .4s ease-out forwards; transform-box: fill-box; transform-origin: center; }
.game.maze .k { position: relative; }
.game.maze .k svg { position: absolute; left: 14%; top: 14%; width: 72%; height: 72%; fill: #fff; }
</style>`);
const MAZE_SIZES = [[3, 3], [4, 3], [4, 4], [5, 4], [6, 4], [6, 5]];
const MAZE_STEP = { red: [-1, 0], green: [1, 0], yellow: [0, -1], blue: [0, 1] };
const MAZE_KEYS = { ArrowLeft: "red", ArrowRight: "green", ArrowUp: "yellow", ArrowDown: "blue" };
// The remote's arrow keys in a game (index.html asks here first): the maze walks,
// the car and the basket go left and right. Other games leave the arrows alone.
window.gameArrow = (key) => {
  if (!game) return false;
  const c = MAZE_KEYS[key];
  if (game.kind === "maze") { if (!game.busy) mazeKey(c); return true; }
  if (["car", "catch"].includes(game.kind)) { if (c === "red" || c === "green") gameColor(c); return true; }
  return false;
};
function mazePickArt() {
  return `<svg viewBox="0 0 200 150"><rect width="200" height="150" rx="14" fill="#f3e2b3"/>
    <g stroke="#3f8f4e" stroke-width="12" stroke-linecap="round" fill="none"><path d="M10 10 H190 V140 H10 Z M60 10 V95 M110 55 V140 M150 10 V95"/></g>
    <circle cx="35" cy="120" r="5" fill="#c9a15a"/><circle cx="35" cy="95" r="5" fill="#c9a15a"/>
    <svg x="5" y="20" width="60" height="45" viewBox="0 0 200 150">${dinoSvg({ stage: 1 })}</svg>
    <g transform="translate(160 105) scale(.32)">${THINGS.apple[1]}</g></svg>`;
}
function mazeMake(w, h) { // a new maze: a winding path from the top-left corner that reaches every square
  const open = new Set(), seen = new Set(["0,0"]), stack = [[0, 0]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy])
      .filter(([a, b]) => a >= 0 && b >= 0 && a < w && b < h && !seen.has(a + "," + b));
    if (!next.length) { stack.pop(); continue; }
    const [a, b] = next[Math.floor(Math.random() * next.length)];
    seen.add(a + "," + b); open.add(mazeEdge(x, y, a, b)); stack.push([a, b]);
  }
  return open;
}
const mazeEdge = (x, y, a, b) => (x < a || y < b ? [x, y, a, b] : [a, b, x, y]).join(",");
function mazeStart() {
  document.querySelectorAll(".keys .k").forEach((k, i) => {
    k.innerHTML = `<svg viewBox="0 0 24 24"><path d="M15.5 4 7 12l8.5 8 2-2-6.4-6 6.4-6z" transform="rotate(${[0, 180, 90, -90][i]} 12 12)"/></svg>`;
  });
  mazeRound();
}
function mazeRound() {
  const [w, h] = MAZE_SIZES[Math.min(game.rounds, MAZE_SIZES.length - 1)], C = 100;
  Object.assign(game, { w, h, x: 0, y: 0, open: mazeMake(w, h) });
  const walls = [];
  for (let x = 0; x < w; x++) for (let y = 0; y < h; y++) {
    if (x < w - 1 && !game.open.has(mazeEdge(x, y, x + 1, y))) walls.push(`M${(x + 1) * C} ${y * C} V${(y + 1) * C}`);
    if (y < h - 1 && !game.open.has(mazeEdge(x, y, x, y + 1))) walls.push(`M${x * C} ${(y + 1) * C} H${(x + 1) * C}`);
  }
  const hedge = `M0 0 H${w * C} V${h * C} H0 Z ${walls.join(" ")}`;
  const bushes = Array.from({ length: w + h }, (_, i) => { // little flowers on the hedges
    const t = i / (w + h), px = t < .5 ? t * 2 * w * C : w * C, py = t < .5 ? 0 : (t - .5) * 2 * h * C;
    return `<circle cx="${px}" cy="${py}" r="5" fill="${["#f28482", "#ffd166", "#ffffff"][i % 3]}"/>`;
  }).join("");
  $("sky").innerHTML = `<div class="mazebox"><svg class="mz" id="mz" viewBox="-30 -30 ${w * C + 60} ${h * C + 60}">
    <rect x="-24" y="-24" width="${w * C + 48}" height="${h * C + 48}" rx="30" fill="#8fbf74"/>
    <rect x="0" y="0" width="${w * C}" height="${h * C}" rx="14" fill="#f3e2b3"/>
    <g id="mzFeet"></g>
    <path d="${hedge}" stroke="#2f7a3e" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="${hedge}" stroke="#4fa35c" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    ${bushes}
    <g class="mzapple" id="mzApple" transform="translate(${(w - 1) * C + 18} ${(h - 1) * C + 16}) scale(.64)">${THINGS.apple[1]}</g>
    <g id="mzMe"><g class="bod newone"><svg x="6" y="12" width="88" height="66" viewBox="0 0 200 150">${dinoSvg({ stage: 1 })}</svg></g></g>
  </svg></div>`;
  mazePlace();
  $("mz").addEventListener("pointerdown", (e) => { // a tap: one step towards it
    if (game.busy) return;
    const p = $("mz").createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
    const q = p.matrixTransform($("mz").getScreenCTM().inverse());
    const dx = q.x / C - (game.x + .5), dy = q.y / C - (game.y + .5);
    if (Math.max(Math.abs(dx), Math.abs(dy)) < .5) return;
    mazeKey(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "red" : "green") : (dy < 0 ? "yellow" : "blue"));
  });
}
function mazePlace() { $("mzMe").style.transform = `translate(${game.x * 100}px, ${game.y * 100}px)`; }
function mazeKey(c) {
  const step = MAZE_STEP[c];
  if (!step) return;
  const a = game.x + step[0], b = game.y + step[1], bod = document.querySelector("#mzMe .bod");
  if (a < 0 || b < 0 || a >= game.w || b >= game.h || !game.open.has(mazeEdge(game.x, game.y, a, b))) {
    bod.classList.remove("nope", "newone"); void bod.getBoundingClientRect(); bod.classList.add("nope"); softNo(); return;
  }
  $("mzFeet").insertAdjacentHTML("beforeend", `<circle class="mzfoot" cx="${game.x * 100 + 50}" cy="${game.y * 100 + 58}" r="7" fill="#d4b06a"/>`);
  game.x = a; game.y = b; mazePlace();
  tune([[392, 440, 494, 523][(game.x + game.y) % 4]], 0, 0.07);
  if (game.x !== game.w - 1 || game.y !== game.h - 1) return;
  // The apple: it eats, dances, and a new garden comes.
  game.busy = true;
  later(() => { $("mzApple").classList.add("eat"); bod.classList.remove("nope", "newone"); void bod.getBoundingClientRect(); bod.classList.add("dance"); happy(); }, 250);
  later(() => { game.busy = false; }, 1700);
  if (++game.rounds >= 5) later(() => endGame(true), 1800); else later(mazeRound, 1800);
}

/* ---- Puzzle ----
   A picture in four pieces. The board shows the picture faintly, each quarter
   framed in a key colour (red, green on top; yellow, blue below, the same
   order as on the remote). One piece waits beside it: press the colour of
   its place (or tap the place). The last piece makes the picture come alive.
   Four pictures, then the cheer. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.puzzle { background: #fdf3df; }
.pzroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: flex; align-items: center; justify-content: center; gap: clamp(20px, 5vw, 70px); padding: 70px 20px 10px; direction: ltr; }
.pzboard { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; width: min(62vw, 92vh); padding: 8px; border-radius: 22px; background: #fff; box-shadow: 0 8px 0 rgba(29, 43, 79, .12); transition: gap .5s, padding .5s; }
.pzslot { position: relative; aspect-ratio: 4 / 3; border-radius: 14px; overflow: hidden; outline: 6px solid var(--c); outline-offset: -6px; cursor: pointer; background: #f4f6fa; }
.pzslot svg { display: block; width: 100%; height: 100%; }
.pzslot .ghost { position: absolute; inset: 0; opacity: var(--ghost, .3); filter: grayscale(.7); }
.pzslot .dot { position: absolute; right: 8px; bottom: 8px; width: 26px; height: 26px; border-radius: 50%; background: var(--c); border: 3px solid #fff; }
.pzslot.placed { outline-color: transparent; }
.pzslot.placed .dot, .pzslot.placed .ghost { display: none; }
.pzslot .piece { position: absolute; inset: 0; animation: grow .4s cubic-bezier(.3, 1.6, .5, 1); }
.pzboard.whole { gap: 0; padding: 0; overflow: hidden; }
.pzboard.whole .pzslot { border-radius: 0; }
.pztray { width: min(26vw, 40vh); aspect-ratio: 4 / 3; border-radius: 16px; overflow: hidden; background: #fff; box-shadow: 0 10px 0 rgba(29, 43, 79, .15), 0 0 0 6px #fff; animation: pzbob 1.6s ease-in-out infinite; }
.pztray svg { display: block; width: 100%; height: 100%; }
.pztray.gone { visibility: hidden; }
@keyframes pzbob { 50% { transform: translateY(-10px) rotate(-2deg); } }
.pzboard.whole.dance { transform-origin: 50% 50%; }
</style>`);
function puzzlePictures() { // drawn on a 400 × 300 page
  // No gradients: a piece hidden on the board would take its gradient with it.
  const sky = (c1, c2) => `<rect width="400" height="300" fill="${c1}"/>${[.25, .5, .75, 1].map((o, i) => `<rect y="${60 + i * 60}" width="400" height="${240 - i * 60}" fill="${c2}" opacity="${o * .5}"/>`).join("")}`;
  const flower = (x, y, c) => `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="6" ry="9" cy="-8" transform="rotate(${a})" fill="${c}"/>`).join("")}<circle r="5" fill="#f7d774"/></g>`;
  return [
    `${sky("#b9dbe0", "#e5f0e6")}<g transform="translate(300 10) scale(.85)">${THINGS.sun[1]}</g><rect y="210" width="400" height="90" fill="#9cc97f"/>
     ${flower(40, 250, "#f28482")}${flower(350, 262, "#ffffff")}${flower(80, 280, "#ffd166")}
     <svg x="70" y="60" width="260" height="195" viewBox="0 0 200 150">${dinoSvg({ stage: 2 })}</svg>`,
    `<rect width="400" height="300" fill="#a8cf8e"/><rect y="95" width="400" height="120" fill="#5d6675"/>
     <g fill="#fff">${[20, 110, 200, 290, 380].map((x) => `<rect x="${x - 20}" y="151" width="44" height="8" rx="4"/>`).join("")}</g>
     <g transform="translate(200 155) rotate(90) scale(1.25)">${carSvg()}</g>${carStar(60, 50, 26)}${carStar(340, 255, 22)}
     <g transform="translate(300 222) scale(.7)">${THINGS.tree[1]}</g>`,
    `${sky("#7cc6f2", "#2f7fe0")}<rect y="250" width="400" height="50" fill="#f3d9a4"/>
     ${[[60, 80, 10], [90, 50, 7], [330, 120, 9], [300, 70, 6], [200, 40, 8]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/>`).join("")}
     <g transform="translate(50 110) scale(1.5)">${THINGS.fish[1]}</g><g transform="translate(330 190) scale(-.9 .9)">${THINGS.fish[1]}</g>
     <path d="M30 300 Q20 260 40 230 Q50 260 40 300 Z M360 300 Q370 250 350 220 Q345 260 350 300 Z" fill="#3aa655"/>`,
    `${sky("#ffd6a5", "#fff1d6")}<rect y="230" width="400" height="70" fill="#9cc97f"/>
     <g transform="translate(110 20) scale(2.1)">${THINGS.tree[1]}</g>
     <g transform="translate(40 225) scale(.5)">${THINGS.apple[1]}</g><g transform="translate(300 230) scale(.45)">${THINGS.apple[1]}</g>
     <g transform="translate(320 30) scale(.6)">${THINGS.heart[1]}</g>`,
  ];
}
// The four quarters of the 400 × 300 page (functions, so the picker can use them before this line runs).
function pzView(i) { return ["0 0 200 150", "200 0 200 150", "0 150 200 150", "200 150 200 150"][i]; }
function pzSvg(pic, i) { return `<svg viewBox="${pzView(i)}" preserveAspectRatio="none">${pic}</svg>`; }
function puzzlePickArt() {
  const pic = puzzlePictures()[0];
  return `<svg viewBox="0 0 200 150"><svg x="4" y="4" width="94" height="70" viewBox="${pzView(0)}">${pic}</svg>
    <svg x="102" y="4" width="94" height="70" viewBox="${pzView(1)}">${pic}</svg><svg x="4" y="78" width="94" height="70" viewBox="${pzView(2)}">${pic}</svg>
    <g transform="translate(118 84) rotate(8)"><rect x="-4" y="-4" width="86" height="66" rx="6" fill="#fff"/><svg width="78" height="58" viewBox="${pzView(3)}">${pic}</svg></g></svg>`;
}
function puzzleStart() {
  game.pics = puzzlePictures().sort(() => Math.random() - .5);
  puzzleRound();
}
function puzzleRound() {
  const pic = game.pics[game.rounds % game.pics.length];
  game.pic = pic; game.left = [0, 1, 2, 3].sort(() => Math.random() - .5);
  $("sky").innerHTML = `<div class="pzroom"><div class="pzboard" style="--ghost:${game.rounds < 2 ? .35 : .2}">
    ${KEY_COLORS.map((c, i) => `<div class="pzslot" data-c="${c}" style="--c:${BALLOON[c]}"><div class="ghost">${pzSvg(pic, i)}</div><i class="dot"></i></div>`).join("")}
  </div><div class="pztray newone" id="pzTray"></div></div>`;
  document.querySelectorAll(".pzslot").forEach((s) => s.onclick = () => gameColor(s.dataset.c));
  puzzleNext();
}
function puzzleNext() { $("pzTray").className = "pztray newone"; $("pzTray").innerHTML = pzSvg(game.pic, game.left[0]); }
function puzzleKey(c) {
  const want = game.left[0], i = KEY_COLORS.indexOf(c), tray = $("pzTray");
  if (!tray || i < 0) return;
  if (i !== want) { tray.classList.remove("nope", "newone"); void tray.offsetWidth; tray.classList.add("nope"); softNo(); return; }
  const slot = document.querySelectorAll(".pzslot")[i];
  slot.classList.add("placed"); slot.insertAdjacentHTML("beforeend", `<div class="piece">${pzSvg(game.pic, i)}</div>`);
  tune([[523, 659, 784, 1047][4 - game.left.length]], 0, 0.18);
  game.left.shift();
  if (game.left.length) { tray.className = "pztray gone"; game.busy = true; later(() => { game.busy = false; puzzleNext(); }, 450); return; }
  // The whole picture: the frames go, it bounces, and a new one comes.
  tray.className = "pztray gone"; game.busy = true;
  const board = document.querySelector(".pzboard");
  later(() => { board.classList.add("whole"); }, 300);
  later(() => { board.classList.add("dance"); happy(); }, 800);
  later(() => { game.busy = false; }, 2600);
  if (++game.rounds >= 4) later(() => endGame(true), 2700); else later(puzzleRound, 2700);
}

/* ---- Pairs (memory) ----
   Four cards face down, each framed in a key colour. Press a colour (or tap
   a card) to turn it over. Two the same: they stay up and dance. Two
   different: they look a moment and turn back over. Nothing is lost. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.pairs { background: #e8f1fb; }
.mmrow { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: flex; align-items: center; justify-content: center; gap: clamp(12px, 3vw, 40px); padding: 70px 20px 10px; direction: ltr; }
.mmcard { width: min(20vw, 34vh); aspect-ratio: 3 / 4; perspective: 900px; cursor: pointer; }
.mmin { position: relative; width: 100%; height: 100%; transition: transform .45s; transform-style: preserve-3d; }
.mmcard.mmup .mmin { transform: rotateY(180deg); }
.mmside { position: absolute; inset: 0; border-radius: 20px; backface-visibility: hidden; -webkit-backface-visibility: hidden; display: grid; place-items: center; box-shadow: 0 8px 0 rgba(29, 43, 79, .15); }
.mmbackside { background: var(--c); border: 6px solid #fff;
  background-image: radial-gradient(circle at 25% 25%, rgba(255,255,255,.35) 0 9%, transparent 10%), radial-gradient(circle at 75% 70%, rgba(255,255,255,.35) 0 9%, transparent 10%), radial-gradient(circle at 70% 25%, rgba(255,255,255,.2) 0 6%, transparent 7%), radial-gradient(circle at 30% 75%, rgba(255,255,255,.2) 0 6%, transparent 7%); }
.mmfront { background: #fff; border: 6px solid var(--c); transform: rotateY(180deg); }
.mmfront svg { width: 82%; height: auto; overflow: visible; }
.mmcard.mmgot .mmfront { border-color: #f6c90e; }
.mmcard.mmgot .mmfront svg { animation: dance .9s ease-in-out; transform-origin: 50% 90%; }
</style>`);
function pairsPickArt() {
  const card = (x, r, inner, c) => `<g transform="translate(${x} 75) rotate(${r})"><rect x="-30" y="-40" width="60" height="80" rx="10" fill="${inner ? "#fff" : c}" stroke="${inner ? c : "#fff"}" stroke-width="5"/>${inner ? `<g transform="translate(-24 -24) scale(.48)">${inner}</g>` : ""}</g>`;
  return `<svg viewBox="0 0 200 150">${card(32, -6, THINGS.apple[1], "#e63946")}${card(80, 2, "", "#2a9d4b")}${card(124, -3, "", "#f6c90e")}${card(170, 6, THINGS.apple[1], "#2f7fe0")}</svg>`;
}
function pairsArt(name) { return name === "dino" ? `<svg viewBox="0 0 200 150">${dinoSvg({ stage: 1 })}</svg>` : `<svg viewBox="0 0 100 100">${THINGS[name][1]}</svg>`; }
function pairsStart() { game.used = []; pairsRound(); }
function pairsRound() {
  const all = ["apple", "sun", "fish", "star", "heart", "leaf", "tree", "dino"].filter((n) => !game.used.includes(n));
  const two = all.sort(() => Math.random() - .5).slice(0, 2);
  game.used.push(...two); if (game.used.length > 6) game.used = [];
  game.cards = [two[0], two[0], two[1], two[1]].sort(() => Math.random() - .5);
  game.up = []; game.got = new Set();
  $("sky").innerHTML = `<div class="mmrow">${KEY_COLORS.map((c, i) => `<div class="mmcard newone" data-c="${c}" style="--c:${BALLOON[c]}">
    <div class="mmin"><div class="mmside mmbackside"></div><div class="mmside mmfront">${pairsArt(game.cards[i])}</div></div></div>`).join("")}</div>`;
  document.querySelectorAll(".mmcard").forEach((d) => d.onclick = () => gameColor(d.dataset.c));
}
function pairsKey(c) {
  const i = KEY_COLORS.indexOf(c), cards = [...document.querySelectorAll(".mmcard")];
  if (i < 0 || !cards.length) return;
  if (game.got.has(i) || game.up.includes(i)) { const el = cards[i]; el.classList.remove("nope", "newone"); void el.offsetWidth; el.classList.add("nope"); return; }
  cards[i].classList.remove("newone"); cards[i].classList.add("mmup"); game.up.push(i);
  tune([NOTES[c]], 0, 0.12);
  if (game.up.length < 2) return;
  const [a, b] = game.up; game.up = []; game.busy = true;
  if (game.cards[a] === game.cards[b]) { // the same: they stay up and dance
    later(() => { cards[a].classList.add("mmgot"); cards[b].classList.add("mmgot"); happy(); }, 450);
    game.got.add(a); game.got.add(b);
    if (game.got.size < 4) { later(() => { game.busy = false; }, 1100); return; }
    if (++game.rounds >= 5) later(() => endGame(true), 2000); else later(() => { game.busy = false; pairsRound(); }, 2000);
    return;
  }
  later(() => { softNo(); }, 700); // different: a look, then back over
  later(() => { cards[a].classList.remove("mmup"); cards[b].classList.remove("mmup"); }, 1300);
  later(() => { game.busy = false; }, 1750);
}

/* ---- Smallest to biggest ----
   Four of the same thing in four sizes, mixed up, each standing on a key
   colour. Press the smallest one's colour: it walks down to the shelf. Then
   the next smallest… until the shelf is a staircase, and they all dance. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.sizes { background: #fdf3df; }
.szroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: grid; grid-template-rows: 1fr auto; padding: 70px 20px 10px; direction: ltr; }
.szrow { display: flex; align-items: flex-end; justify-content: center; gap: clamp(12px, 3vw, 44px); }
.szspot { display: flex; flex-direction: column; align-items: center; gap: 6px; width: min(19vw, 30vh); cursor: pointer; }
.szspot .szmat { width: 80%; height: 16px; border-radius: 8px; background: var(--c); }
.szspot.szgone .szmat { opacity: .25; }
.szthing { width: calc(min(19vw, 30vh) * var(--s)); }
.szthing svg { display: block; width: 100%; height: auto; overflow: visible; }
.szshelf { display: flex; align-items: flex-end; justify-content: center; gap: clamp(8px, 2vw, 26px); min-height: calc(min(13vw, 20vh) * 1.05 + 22px); padding: 0 24px 10px; border-bottom: 14px solid #c99a5b; border-radius: 0 0 6px 6px; width: fit-content; min-width: 50%; margin: 10px auto 0; }
.szshelf .szthing { width: calc(min(13vw, 20vh) * var(--s)); }
.szshelf.dance { transform-origin: 50% 100%; }
</style>`);
function sizesPickArt() {
  return `<svg viewBox="0 0 200 150"><rect x="10" y="128" width="180" height="10" rx="4" fill="#c99a5b"/>
    ${[[.3, 22], [.45, 52], [.62, 92], [.8, 142]].map(([k, x]) => `<g transform="translate(${x} ${126 - 100 * k}) scale(${k})">${THINGS.apple[1]}</g>`).join("")}</svg>`;
}
const SZ_SCALES = [0.42, 0.6, 0.8, 1];
function sizesStart() { game.kinds = ["apple", "dino", "star", "fish", "tree"].sort(() => Math.random() - .5); sizesRound(); }
function sizesRound() {
  const kind = game.kinds[game.rounds % game.kinds.length];
  game.order = [0, 1, 2, 3].sort(() => Math.random() - .5); // order[spot] = size index
  game.next = 0;
  const art = kind === "dino" ? `<svg viewBox="0 0 200 150">${dinoSvg({ stage: 1 })}</svg>` : `<svg viewBox="0 0 100 100">${THINGS[kind][1]}</svg>`;
  $("sky").innerHTML = `<div class="szroom"><div class="szrow">${KEY_COLORS.map((c, i) => `<div class="szspot" data-c="${c}" style="--c:${BALLOON[c]}">
    <div class="szthing newone" style="--s:${SZ_SCALES[game.order[i]]}">${art}</div><i class="szmat"></i></div>`).join("")}</div>
    <div class="szshelf" id="szShelf"></div></div>`;
  document.querySelectorAll(".szspot").forEach((d) => d.onclick = () => gameColor(d.dataset.c));
}
function sizesKey(c) {
  const i = KEY_COLORS.indexOf(c), spot = document.querySelectorAll(".szspot")[i];
  if (!spot) return;
  const thing = spot.querySelector(".szthing");
  if (!thing) return; // already on the shelf
  if (game.order[i] !== game.next) { thing.classList.remove("nope", "newone"); void thing.offsetWidth; thing.classList.add("nope"); softNo(); return; }
  thing.classList.remove("nope", "newone"); thing.classList.add("newone");
  $("szShelf").appendChild(thing); spot.classList.add("szgone");
  tune([[523, 659, 784, 1047][game.next]], 0, 0.18);
  if (++game.next < 4) return;
  game.busy = true;
  later(() => { $("szShelf").classList.add("dance"); happy(); }, 450);
  later(() => { game.busy = false; }, 1900);
  if (++game.rounds >= 5) later(() => endGame(true), 2000); else later(sizesRound, 2000);
}

/* ---- Catch the apples ----
   Apples fall from a big tree in three lanes; a basket at the bottom moves
   left and right (red and green, the arrows, a tap on either side, or the
   parent's phone controller). An apple that misses just rolls away. Fifteen
   apples in the basket, then the cheer. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.catch { background: linear-gradient(#bfe3f2, #e9f5e6 70%, #a8cf8e 70%); }
.ctroom { position: absolute; top: 0; right: 0; bottom: 0; left: 0; overflow: hidden; touch-action: none; }
.cttree { position: absolute; left: -5%; top: -8px; width: 110%; height: 130px; }
.ctapple, .ctbasket { position: absolute; left: 0; top: 0; will-change: transform; }
.ctapple { width: var(--aw); height: var(--aw); }
.ctapple.miss { transition: transform 1s ease-in, opacity 1s; opacity: 0; }
.ctbasket { width: var(--bw); transition: transform .16s ease-out; }
.ctbasket svg, .ctapple svg { display: block; width: 100%; height: auto; overflow: visible; }
.ctbasket .in { transform-origin: 50% 100%; }
.ctbasket .in.hop { animation: hop .3s ease-out; }
.game.catch .keys .k.yellow, .game.catch .keys .k.blue { visibility: hidden; }
</style>`);
function catchPickArt() {
  return `<svg viewBox="0 0 200 150"><path d="M0 0 H200 V30 Q180 50 160 32 Q140 52 118 34 Q96 54 76 34 Q54 52 34 32 Q16 48 0 30 Z" fill="#3aa655"/>
    <g transform="translate(40 52) scale(.26)">${THINGS.apple[1]}</g><g transform="translate(118 78) scale(.26)">${THINGS.apple[1]}</g>
    <g transform="translate(70 104)">${catchBasket()}</g></svg>`;
}
function catchBasket() { // 60 wide, 40 high
  return `<path d="M2 8 H58 L52 40 H8 Z" fill="#c98b48"/><path d="M2 8 H58 L56 16 H4 Z" fill="#a8703a"/>
    <g stroke="#a8703a" stroke-width="2.2" fill="none"><path d="M6 24 H54 M8 32 H52"/><path d="M18 16 L20 40 M30 16 V40 M42 16 L40 40"/></g>
    <path d="M10 8 Q30 -14 50 8" stroke="#a8703a" stroke-width="4" fill="none" stroke-linecap="round"/>`;
}
function catchStart() {
  const W = innerWidth, H = innerHeight;
  const rw = Math.min(W * 0.7, H * 1.1), bw = Math.min(rw / 3 * 0.85, 200), aw = bw * 0.45;
  Object.assign(game, { lane: 1, got: 0, apples: [], W, H, rw, bw, aw, spawnIn: 0.6, floor: H - 150 - bw * 0.9, last: 0 });
  const canopy = Array.from({ length: 9 }, (_, i) => `<circle cx="${i * 50 + 10}" cy="${i % 2 ? 40 : 55}" r="${i % 2 ? 48 : 40}" fill="${i % 3 ? "#3aa655" : "#2f8f4a"}"/>`).join("");
  $("sky").innerHTML = `<div class="ctroom" id="ctroom" style="--bw:${bw}px;--aw:${aw}px">
    <svg class="cttree" viewBox="0 0 400 120" preserveAspectRatio="none"><rect width="400" height="40" fill="#2f8f4a"/>${canopy}</svg>
    <div class="ctbasket" id="ctBasket"><div class="in"><svg viewBox="0 -14 60 54">${catchBasket()}</svg></div></div>
    <div class="carhud"><svg viewBox="0 0 100 100">${THINGS.apple[1]}</svg><span id="ctCount">0</span></div></div>`;
  catchPlace();
  $("ctroom").addEventListener("pointerdown", (e) => gameColor(e.clientX < innerWidth / 2 ? "red" : "green"));
  game.raf = requestAnimationFrame(catchFrame);
  padListen("catch", (btn) => { if (btn === "left") gameColor("red"); else if (btn === "right") gameColor("green"); else catchHop(); });
}
const catchX = (i) => game.W / 2 + (i - 1) * game.rw / 3;
function catchPlace() { $("ctBasket").style.transform = `translate3d(${catchX(game.lane) - game.bw / 2}px, ${game.floor}px, 0)`; }
function catchHop() { const b = document.querySelector(".ctbasket .in"); if (b) { b.classList.remove("hop"); void b.offsetWidth; b.classList.add("hop"); } }
function catchKey(c) {
  if (c === "red" && game.lane > 0) { game.lane--; catchPlace(); tune([440], 0, 0.05); }
  else if (c === "green" && game.lane < 2) { game.lane++; catchPlace(); tune([494], 0, 0.05); }
}
function catchFrame(t) {
  if (!game || game.kind !== "catch") return;
  const dt = game.last ? Math.min(0.25, (t - game.last) / 1000) : 0; game.last = t; // real time, even on a slow TV
  game.spawnIn -= dt;
  if (game.spawnIn <= 0 && game.apples.length < 2) {
    game.spawnIn = 1.5 + Math.random() * 0.8;
    const lane = Math.floor(Math.random() * 3), el = document.createElement("div");
    el.className = "ctapple"; el.innerHTML = `<svg viewBox="0 0 100 100">${THINGS.apple[1]}</svg>`;
    $("ctroom").appendChild(el);
    game.apples.push({ el, lane, y: 60, v: game.H / 4.2 });
  }
  const catchY = game.floor - game.aw * 0.3;
  for (const a of game.apples) {
    a.y += a.v * dt;
    a.el.style.transform = `translate3d(${catchX(a.lane) - game.aw / 2}px, ${a.y}px, 0)`;
    if (a.y >= catchY && !a.done) {
      a.done = true;
      if (a.lane === game.lane) { // in the basket
        a.el.remove(); a.gone = true; game.got++;
        $("ctCount").textContent = game.got; catchHop();
        tune([[523, 659, 784][game.got % 3]], 0, 0.16);
        if (game.got >= 15) { happy(); later(() => endGame(true), 900); game.busy = true; }
      } else { // it rolls away, nothing more
        const dx = (a.lane < game.lane ? -1 : 1) * game.W * 0.3;
        a.el.classList.add("miss"); a.el.style.transform = `translate3d(${catchX(a.lane) - game.aw / 2 + dx}px, ${game.floor + game.aw}px, 0) rotate(${dx > 0 ? 360 : -360}deg)`;
        a.gone = true; setTimeout(() => a.el.remove(), 1000);
      }
    }
  }
  game.apples = game.apples.filter((a) => !a.gone);
  game.raf = requestAnimationFrame(catchFrame);
}

/* ---- Colouring ----
   A drawing in a few parts. The part to colour now gently blinks; any colour
   key (or tap on a key) fills it with that colour, and the next part blinks.
   There is no wrong colour. When it is all coloured, it dances. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.paint { background: #fdf3df; }
.ptroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: flex; align-items: center; justify-content: center; padding: 70px 20px 10px; }
.ptroom svg { height: 100%; max-width: 100%; background: #fff; border-radius: 24px; box-shadow: 0 8px 0 rgba(29, 43, 79, .12); }
.ptroom .pr { transition: fill .35s; }
.ptroom .pr.now { animation: prblink 1.1s ease-in-out infinite; }
@keyframes prblink { 50% { fill: #fff1a8; } }
.ptroom svg.dance { transform-origin: 50% 80%; }
</style>`);
const PAINT_PICS = [ // each: parts to colour (drawn outline only), then lines and faces on top
  { parts: [`<rect x="6" y="6" width="188" height="138" rx="14"/>`, `<path d="M146 75 L190 42 L190 108 Z"/>`, `<ellipse cx="92" cy="75" rx="62" ry="40"/>`, `<path d="M74 39 Q98 6 122 38 Z"/>`],
    top: `<circle cx="58" cy="66" r="9" fill="#fff" stroke="#1d2b4f" stroke-width="3"/><circle cx="56" cy="66" r="4.5" fill="#1d2b4f"/>
      <path d="M44 88 Q52 95 60 88" stroke="#1d2b4f" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M100 52 Q114 75 100 98 M120 56 Q132 75 120 94" stroke="#1d2b4f" stroke-width="3" fill="none" opacity=".5"/>
      <circle cx="30" cy="30" r="6" fill="none" stroke="#1d2b4f" stroke-width="2.5"/><circle cx="44" cy="18" r="4" fill="none" stroke="#1d2b4f" stroke-width="2.5"/>` },
  { parts: [`<rect x="6" y="6" width="188" height="104" rx="14"/>`, `<rect x="6" y="104" width="188" height="40" rx="10"/>`, `<rect x="54" y="62" width="92" height="66"/>`,
      `<path d="M42 64 L100 22 L158 64 Z"/>`, `<rect x="88" y="90" width="24" height="38" rx="4"/>`, `<circle cx="168" cy="30" r="15"/>`],
    top: `<rect x="62" y="74" width="20" height="18" fill="#fff" stroke="#1d2b4f" stroke-width="3"/><rect x="118" y="74" width="20" height="18" fill="#fff" stroke="#1d2b4f" stroke-width="3"/>
      <circle cx="106" cy="110" r="2.5" fill="#1d2b4f"/>${face(168, 32, .7)}` },
  { parts: [`<rect x="6" y="6" width="188" height="138" rx="14"/>`, `<path d="M20 96 Q22 74 46 72 L66 50 H124 L148 72 Q178 74 180 96 V108 H20 Z"/>`,
      `<path d="M74 56 H118 L134 72 H62 Z"/>`, `<g><circle cx="58" cy="110" r="16"/><circle cx="144" cy="110" r="16"/></g>`],
    top: `<circle cx="58" cy="110" r="6" fill="#fff" stroke="#1d2b4f" stroke-width="3"/><circle cx="144" cy="110" r="6" fill="#fff" stroke="#1d2b4f" stroke-width="3"/>
      ${face(160, 86, .6)}<path d="M97 56 V72" stroke="#1d2b4f" stroke-width="3"/><path d="M6 128 H194" stroke="#1d2b4f" stroke-width="3" stroke-dasharray="14 10"/>` },
  { parts: [`<rect x="6" y="6" width="188" height="138" rx="14"/>`, `<path d="M70 110 H130 L122 144 H78 Z"/>`, `<g><path d="M100 110 V70"/><path d="M100 96 Q80 92 74 78 Q92 78 100 92 Z"/><path d="M100 88 Q120 84 126 70 Q108 70 100 84 Z"/></g>`,
      `<g>${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="100" cy="30" rx="11" ry="17" transform="rotate(${a} 100 50)"/>`).join("")}</g>`, `<circle cx="100" cy="50" r="13"/>`],
    top: `${face(100, 52, .55)}` },
];
function paintPickArt() {
  const p = PAINT_PICS[3], cols = ["#a8d8ff", "#f28482", "#57c84d", "#ffd23f", "#f4a261"];
  return `<svg viewBox="0 0 200 150">${p.parts.map((d, i) => `<g fill="${i < 4 ? cols[i] : "#fff"}" stroke="#1d2b4f" stroke-width="4" stroke-linejoin="round">${d}</g>`).join("")}${p.top}</svg>`;
}
function paintStart() { game.order = [0, 1, 2, 3].sort(() => Math.random() - .5); paintRound(); }
function paintRound() {
  const p = PAINT_PICS[game.order[game.rounds % 4]];
  game.part = 0; game.parts = p.parts.length;
  $("sky").innerHTML = `<div class="ptroom"><svg viewBox="0 0 200 150" id="ptPic">${p.parts.map((d, i) => `<g class="pr${i === 0 ? " now" : ""}" fill="#fff" stroke="#1d2b4f" stroke-width="4" stroke-linejoin="round">${d}</g>`).join("")}${p.top}</svg></div>`;
}
function paintKey(c) {
  const parts = document.querySelectorAll("#ptPic .pr");
  if (!parts.length || game.part >= game.parts) return;
  const el = parts[game.part];
  el.classList.remove("now"); el.setAttribute("fill", BALLOON[c]); el.style.fill = BALLOON[c];
  tune([NOTES[c]], 0, 0.14);
  if (++game.part < game.parts) { parts[game.part].classList.add("now"); return; }
  game.busy = true;
  later(() => { $("ptPic").classList.add("dance"); happy(); }, 400);
  later(() => { game.busy = false; }, 1900);
  if (++game.rounds >= 4) later(() => endGame(true), 2100); else later(paintRound, 2100);
}

/* ---- What comes first? (story order) ----
   Three pictures of a little story, mixed up, on the red, green and yellow
   mats: an egg, a cracked egg, a baby dinosaur… Press the one that comes
   first: it goes into the first frame of the strip below, then the next. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.story { background: #eef6ea; }
.stroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: grid; grid-template-rows: 1fr auto; padding: 70px 20px 10px; direction: ltr; gap: 10px; }
.strow { display: flex; align-items: center; justify-content: center; gap: clamp(14px, 3vw, 44px); }
.stspot { display: flex; flex-direction: column; align-items: center; gap: 8px; cursor: pointer; }
.stspot { width: min(22vw, 30vh); } .stspot.szgone::before { content: ""; display: block; width: 100%; aspect-ratio: 4 / 3; }
.stcard { width: min(22vw, 30vh); aspect-ratio: 4 / 3; background: #fff; border-radius: 18px; box-shadow: 0 6px 0 rgba(29, 43, 79, .12); overflow: hidden; }
.stcard svg { display: block; width: 100%; height: 100%; }
.stspot .szmat { width: 70%; height: 16px; border-radius: 8px; background: var(--c); }
.stspot.szgone .szmat { opacity: .25; }
.ststrip { display: flex; justify-content: center; gap: 12px; }
.stframe { width: min(15vw, 20vh); aspect-ratio: 4 / 3; border-radius: 14px; border: 4px dashed #b9c9b0; display: grid; place-items: center; position: relative; }
.stframe .stcard { width: 100%; box-shadow: none; }
.stframe .num { position: absolute; display: flex; gap: 5px; }
.stframe .num b { width: 10px; height: 10px; border-radius: 50%; background: #b9c9b0; }
.stframe.full { border-style: solid; border-color: #f6c90e; }
.ststrip.dance { transform-origin: 50% 50%; }
.game.story .keys .k.blue { visibility: hidden; }
</style>`);
function storySets() { // three steps each, drawn on 200 × 150
  const ground = `<rect y="118" width="200" height="32" fill="#a8cf8e"/>`;
  const soil = `<rect y="118" width="200" height="32" fill="#a8cf8e"/><ellipse cx="100" cy="122" rx="54" ry="14" fill="#9a6b45"/>`;
  const sun = `<g transform="translate(14 8) scale(.5)">${THINGS.sun[1]}</g>`;
  const cloud = (x, y, k = 1, c = "#fff") => `<g transform="translate(${x} ${y}) scale(${k})" fill="${c}"><circle cx="0" cy="10" r="16"/><circle cx="20" cy="0" r="20"/><circle cx="42" cy="10" r="16"/><rect x="0" y="10" width="42" height="16"/></g>`;
  const apple = THINGS.apple[1];
  return [
    [`${ground}<g transform="translate(0 -6)">${EGG}</g>`, `${ground}<g transform="translate(0 -6)">${EGG}${CRACK}</g>`, `${ground}<g transform="translate(0 -4)">${dinoSvg({ stage: 0 })}</g>`],
    [`${soil}<ellipse cx="100" cy="114" rx="8" ry="5" fill="#6b4423"/>`,
      `${soil}<path d="M100 118 V92" stroke="#3aa655" stroke-width="5"/><path d="M100 100 Q84 96 80 84 Q94 84 100 96 Z M100 96 Q116 90 120 78 Q106 78 100 92 Z" fill="#57c84d"/>`,
      `${soil}<path d="M100 118 V66" stroke="#3aa655" stroke-width="5"/><path d="M100 100 Q84 96 80 84 Q94 84 100 96 Z" fill="#57c84d"/>
       <g transform="translate(100 50)">${[0, 72, 144, 216, 288].map((a) => `<ellipse rx="10" ry="16" cy="-16" transform="rotate(${a})" fill="#f28482"/>`).join("")}<circle r="12" fill="#ffd23f"/>${face(0, 2, .5)}</g>`],
    [`<g transform="translate(50 25)">${apple}</g>`,
      `<g transform="translate(50 25)">${apple}</g><circle cx="148" cy="66" r="14" fill="#fff"/><circle cx="144" cy="84" r="12" fill="#fff"/><circle cx="148" cy="100" r="10" fill="#fff"/>`,
      `<g transform="translate(50 25)"><path d="M50 30 Q52 15 60 8" stroke="#6b4423" stroke-width="5" fill="none" stroke-linecap="round"/>
       <path d="M36 30 Q50 26 64 30 Q52 58 64 86 Q50 92 36 86 Q48 58 36 30 Z" fill="#fbe7c6" stroke="#e63946" stroke-width="5"/>
       <ellipse cx="47" cy="58" rx="2.5" ry="4" fill="#3b2412"/><ellipse cx="53" cy="62" rx="2.5" ry="4" fill="#3b2412"/></g>`],
    [`<rect width="200" height="150" fill="#cfe9f7"/>${ground}${sun}${cloud(110, 20)}`,
      `<rect width="200" height="150" fill="#b3c3cf"/>${ground}${cloud(50, 14, 1.2, "#8a9bab")}${cloud(120, 24, 1, "#8a9bab")}
       ${[[60, 70], [80, 84], [100, 66], [120, 82], [140, 70], [160, 86], [72, 100], [130, 102]].map(([x, y]) => `<path d="M${x} ${y} q-4 8 0 10 q4 -2 0 -10 Z" fill="#2f7fe0"/>`).join("")}`,
      `<rect width="200" height="150" fill="#cfe9f7"/>${ground}${["#e63946", "#f6a23a", "#f6c90e", "#57c84d", "#2f7fe0"].map((c, i) => `<path d="M${20 + i * 8} 118 A${80 - i * 8} ${80 - i * 8} 0 0 1 ${180 - i * 8} 118" stroke="${c}" stroke-width="8" fill="none"/>`).join("")}
       <ellipse cx="100" cy="132" rx="34" ry="7" fill="#7cc6f2"/>${sun}`],
  ];
}
function storyPickArt() {
  const s = storySets()[0];
  return `<svg viewBox="0 0 200 150"><rect width="200" height="150" rx="14" fill="#eef6ea"/>${s.map((p, i) => `<g transform="translate(${4 + i * 66} 44)"><rect width="60" height="45" rx="6" fill="#fff" stroke="#dfe7d8" stroke-width="2"/><svg width="60" height="45" viewBox="0 0 200 150">${p}</svg></g>`).join("")}
    <path d="M66 112 h8 M132 112 h8" stroke="#5b6b86" stroke-width="3" stroke-linecap="round"/></svg>`;
}
function storyStart() { game.sets = storySets().map((s, i) => i).sort(() => Math.random() - .5); storyRound(); }
function storyRound() {
  const set = storySets()[game.sets[game.rounds % 4]];
  game.order = [0, 1, 2].sort(() => Math.random() - .5); game.next = 0;
  $("sky").innerHTML = `<div class="stroom"><div class="strow">${KEY_COLORS.slice(0, 3).map((c, i) => `<div class="stspot" data-c="${c}" style="--c:${BALLOON[c]}">
      <div class="stcard newone"><svg viewBox="0 0 200 150">${set[game.order[i]]}</svg></div><i class="szmat"></i></div>`).join("")}</div>
    <div class="ststrip" id="stStrip">${[1, 2, 3].map((n) => `<div class="stframe"><span class="num">${"<b></b>".repeat(n)}</span></div>`).join("")}</div></div>`;
  document.querySelectorAll(".stspot").forEach((d) => d.onclick = () => gameColor(d.dataset.c));
}
function storyKey(c) {
  const i = KEY_COLORS.indexOf(c), spot = document.querySelectorAll(".stspot")[i];
  if (!spot) return;
  const card = spot.querySelector(".stcard");
  if (!card) return;
  if (game.order[i] !== game.next) { card.classList.remove("nope", "newone"); void card.offsetWidth; card.classList.add("nope"); softNo(); return; }
  const frame = document.querySelectorAll(".stframe")[game.next];
  card.classList.remove("nope", "newone"); card.classList.add("newone");
  frame.innerHTML = ""; frame.appendChild(card); frame.classList.add("full"); spot.classList.add("szgone");
  tune([[523, 659, 784][game.next]], 0, 0.18);
  if (++game.next < 3) return;
  game.busy = true;
  later(() => { $("stStrip").classList.add("dance"); happy(); }, 450);
  later(() => { game.busy = false; }, 1900);
  if (++game.rounds >= 4) later(() => endGame(true), 2100); else later(storyRound, 2100);
}

/* Little pictures on the colour keys, for games where each key does its own thing. */
document.head.insertAdjacentHTML("beforeend", `<style>
.keys .k { position: relative; }
.keys .k > svg { position: absolute; left: 12%; top: 12%; width: 76%; height: 76%; overflow: visible; }
</style>`);
function keyIcons(icons) { document.querySelectorAll(".keys .k").forEach((k, i) => { k.innerHTML = icons[i] ? `<svg viewBox="0 0 40 40">${icons[i]}</svg>` : ""; }); }
const starPath = (cx, cy, r) => Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; return `${i ? "L" : "M"}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; }).join(" ") + " Z";

/* ---- Dress up the dinosaur ----
   Each key changes one thing: red the hat, green the glasses, yellow what
   it wears round its neck, blue where it is (garden, beach, snow, party).
   Every few changes it shows off with a little dance. No right answer. */
document.head.insertAdjacentHTML("beforeend", `<style>
.drroom { position: absolute; top: 0; right: 0; bottom: 0; left: 0; overflow: hidden; }
.drplace { position: absolute; inset: 0; width: 100%; height: 100%; }
.drdino { position: absolute; left: 50%; bottom: 120px; width: min(70vh, 62vw); transform: translateX(-50%); }
.drdino svg { display: block; width: 100%; height: auto; overflow: visible; }
.drdino .bod { transform-box: fill-box; transform-origin: 50% 100%; }
.drdino .acc { animation: grow .35s cubic-bezier(.3, 1.6, .5, 1); transform-box: fill-box; transform-origin: center; }
</style>`);
const DRESS = {
  hat: [``,
    `<path d="M124 26 L141 -22 L158 26 Z" fill="#f28482"/><path d="M131 10 L151 10 M136 -4 L147 -4" stroke="#fff" stroke-width="4"/><circle cx="141" cy="-24" r="7" fill="#ffd23f"/>`,
    `<path d="M118 28 L120 2 L130 14 L140 -6 L150 14 L160 2 L162 28 Z" fill="#f6c90e" stroke="#e0a800" stroke-width="3" stroke-linejoin="round"/><circle cx="140" cy="18" r="4.5" fill="#e63946"/><circle cx="124" cy="22" r="3" fill="#2f7fe0"/><circle cx="156" cy="22" r="3" fill="#2f7fe0"/>`,
    `<path d="M116 30 Q118 2 142 0 Q166 2 168 30 Z" fill="#2f7fe0"/><path d="M162 27 Q184 24 194 31 Q180 36 162 33 Z" fill="#1b5fb8"/><circle cx="142" cy="0" r="4" fill="#fff"/><path d="M142 4 V28" stroke="#1b5fb8" stroke-width="2"/>`,
    `<g transform="translate(124 20)">${[0, 60, 120, 180, 240, 300].map((a) => `<ellipse rx="6" ry="10" cy="-10" transform="rotate(${a})" fill="#f28482"/>`).join("")}<circle r="6" fill="#ffd23f"/></g>`],
  eyes: [``,
    `<g fill="rgba(255,255,255,.25)" stroke="#e63946" stroke-width="4"><circle cx="136" cy="44" r="15"/><circle cx="162" cy="44" r="15"/></g><path d="M121 42 L110 37" stroke="#e63946" stroke-width="4" stroke-linecap="round"/>`,
    `<path d="M118 34 H151 V44 Q149 58 135 58 Q120 58 118 44 Z M147 34 H180 V44 Q178 58 164 58 Q149 58 147 44 Z" fill="#1d2b4f"/><path d="M124 39 L132 39 M153 39 L161 39" stroke="#fff" stroke-width="3" opacity=".6" stroke-linecap="round"/><path d="M118 38 L108 34" stroke="#1d2b4f" stroke-width="4" stroke-linecap="round"/>`,
    `<g fill="rgba(255,210,63,.25)" stroke="#f6c90e" stroke-width="4" stroke-linejoin="round"><path d="${starPath(136, 45, 19)}"/><path d="${starPath(162, 45, 19)}"/></g>`],
  neck: [``,
    `<path d="M112 84 Q128 98 146 88 L148 98 Q128 110 110 94 Z" fill="#e63946"/><path d="M134 100 L128 126 L140 124 L144 98 Z" fill="#e63946"/><path d="M118 92 L122 88 M126 98 L130 93 M136 99 L139 94 M131 112 L140 111" stroke="#fff" stroke-width="3"/>`,
    `<path d="M114 92 L128 100 L114 108 Z M142 92 L128 100 L142 108 Z" fill="#2f7fe0"/><circle cx="128" cy="100" r="5" fill="#1b5fb8"/>`,
    `${[[114, 86], [119, 92], [125, 96], [131, 98], [137, 97], [143, 94], [147, 89]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="4.5" fill="${["#f28482", "#ffd23f", "#57c84d", "#2f7fe0"][i % 4]}" stroke="#fff" stroke-width="1.5"/>`).join("")}`],
};
function dressPlace(i) {
  const sky = (c) => `<rect width="1600" height="900" fill="${c}"/>`;
  if (i === 0) return gardenSvg();
  const W = `viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" class="drplace"`;
  if (i === 1) return `<svg ${W}>${sky("#9fd8f5")}<rect y="520" width="1600" height="160" fill="#2f9fe0"/><path d="M0 540 Q100 520 200 540 T400 540 T600 540 T800 540 T1000 540 T1200 540 T1400 540 T1600 540" stroke="#fff" stroke-width="8" fill="none" opacity=".7"/>
    <rect y="660" width="1600" height="240" fill="#f3d9a4"/><g transform="translate(1300 60) scale(2.4)">${THINGS.sun[1]}</g>
    <g transform="translate(260 560)"><path d="M0 120 L40 0 L80 120 Z" fill="#e63946"/><path d="M40 0 L40 160" stroke="#8a5a3b" stroke-width="8"/></g>
    <g transform="translate(1180 760) scale(.9)">${BALL}</g></svg>`;
  if (i === 2) return `<svg ${W}>${sky("#cfe4f2")}<path d="M0 640 Q400 560 800 640 T1600 620 V900 H0 Z" fill="#fff"/>
    ${Array.from({ length: 40 }, (_, k) => `<circle cx="${(k * 397) % 1600}" cy="${(k * 211) % 600}" r="${6 + (k % 3) * 3}" fill="#fff"/>`).join("")}
    <g transform="translate(1250 520)"><circle cx="0" cy="120" r="70" fill="#fff" stroke="#dbe7f0" stroke-width="6"/><circle cx="0" cy="20" r="48" fill="#fff" stroke="#dbe7f0" stroke-width="6"/>
    ${face(0, 22, 2.2)}<path d="M0 30 L34 40 L0 44 Z" fill="#f4a261"/></g></svg>`;
  return `<svg ${W}>${sky("#ffe8f0")}<rect y="680" width="1600" height="220" fill="#e0c3f2"/>
    <path d="M0 60 Q400 160 800 60 T1600 60" stroke="#5b6b86" stroke-width="4" fill="none"/>
    ${Array.from({ length: 16 }, (_, k) => `<path d="M${k * 100 + 20} ${60 + Math.sin(k / 16 * Math.PI * 2) * 50 + 20} l30 0 l-15 50 Z" fill="${["#e63946", "#2a9d4b", "#f6c90e", "#2f7fe0"][k % 4]}"/>`).join("")}
    ${[["#e63946", 180, 260], ["#2f7fe0", 300, 300], ["#f6c90e", 1300, 250], ["#2a9d4b", 1420, 310]].map(([c, x, y]) => `<ellipse cx="${x}" cy="${y}" rx="60" ry="74" fill="${c}"/><path d="M${x} ${y + 74} q-10 80 10 160" stroke="#5b6b86" stroke-width="3" fill="none"/>`).join("")}</svg>`;
}
function dressPickArt() {
  return `<svg viewBox="0 -30 200 180">${dinoSvg({ stage: 2 })}${DRESS.hat[1]}${DRESS.eyes[2]}${DRESS.neck[2]}</svg>`;
}
function dressStart() {
  Object.assign(game, { hat: 0, eyes: 0, neck: 0, place: 0, changes: 0 });
  keyIcons([`<path d="M8 32 L20 4 L32 32 Z" fill="#fff"/>`, `<g fill="none" stroke="#fff" stroke-width="4"><circle cx="11" cy="22" r="8"/><circle cx="29" cy="22" r="8"/><path d="M19 21 H21"/></g>`,
    `<path d="M10 14 L20 20 L10 26 Z M30 14 L20 20 L30 26 Z" fill="#fff"/>`, `<rect x="5" y="9" width="30" height="22" rx="3" fill="none" stroke="#fff" stroke-width="3.5"/><path d="M8 28 L17 18 L23 24 L27 20 L33 28" fill="#fff"/>`]);
  $("sky").innerHTML = `<div class="drroom"><div id="drPlace"></div><div class="drdino"><svg viewBox="0 -30 200 180"><g class="bod" id="drBod"></g></svg></div></div>`;
  dressDraw();
}
function dressDraw(changed) {
  $("drPlace").innerHTML = dressPlace(game.place).replace('class="garden"', 'class="garden drplace"');
  const acc = (k, v) => DRESS[k][v] ? `<g class="${changed === k ? "acc" : ""}">${DRESS[k][v]}</g>` : "";
  $("drBod").innerHTML = dinoSvg({ stage: 2, mouth: changed ? "open" : "smile" }) + acc("neck", game.neck) + acc("eyes", game.eyes) + acc("hat", game.hat);
}
function dressKey(c) {
  const k = { red: "hat", green: "eyes", yellow: "neck", blue: "place" }[c];
  if (!k) return;
  game[k] = (game[k] + 1) % (k === "place" ? 4 : DRESS[k].length);
  dressDraw(k);
  tune([NOTES[c], NOTES[c] * 1.25], 0.08, 0.12);
  later(() => { if (game) $("drBod").innerHTML = $("drBod").innerHTML.replace(/class="acc"/g, ""); }, 400);
  if (++game.changes % 5 === 0) {
    game.busy = true;
    later(() => { const b = $("drBod"); b.classList.remove("dance"); void b.getBoundingClientRect(); b.classList.add("dance"); happy(); }, 300);
    later(() => { game.busy = false; }, 1300);
  }
  if (game.changes >= 30) { game.busy = true; later(() => endGame(true), 1400); }
}

/* ---- Make a sandwich ----
   Bread on the plate; red adds tomato, green lettuce, yellow cheese, blue
   puts the top on. Then the sandwich goes to the dinosaur, who eats it
   happily. Any filling is fine. Four sandwiches. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.cook { background: linear-gradient(#fdf3df 62%, #e9c99a 62%); }
.ckroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: flex; align-items: flex-end; justify-content: center; gap: clamp(20px, 6vw, 90px); padding: 70px 20px 30px; direction: ltr; }
.ckplate { position: relative; width: min(34vw, 46vh); display: flex; flex-direction: column-reverse; align-items: center; padding-bottom: 4%; }
.ckplate::after { content: ""; position: absolute; left: -8%; right: -8%; bottom: 0; height: 22%; border-radius: 50%; background: #fff; box-shadow: inset 0 -6px 0 #dfe7f0, 0 6px 0 rgba(0,0,0,.08); z-index: -1; }
.ckstack { display: flex; flex-direction: column-reverse; align-items: center; width: 100%; transition: transform .7s ease-in, opacity .7s; position: relative; z-index: 1; }
.ckstack svg { display: block; width: 92%; height: auto; margin-top: -11%; overflow: visible; }
.ckstack svg.newl { animation: ckdrop .35s cubic-bezier(.3, 1.4, .5, 1); }
@keyframes ckdrop { from { transform: translateY(-120px); opacity: 0; } }
.ckdino { width: min(34vw, 50vh); }
.ckdino svg { display: block; width: 100%; height: auto; overflow: visible; }
</style>`);
const CK_LAYERS = {
  bottom: `<rect x="4" y="6" width="112" height="20" rx="8" fill="#d99a52"/><rect x="8" y="6" width="104" height="11" rx="5" fill="#f3d39a"/>`,
  red: `<rect x="10" y="10" width="100" height="11" rx="5" fill="#e63946"/>${[24, 46, 70, 94].map((x) => `<ellipse cx="${x}" cy="15.5" rx="3" ry="2" fill="#ffd0c8"/>`).join("")}`,
  green: `<path d="M2 18 Q10 6 18 16 Q26 6 34 16 Q42 6 50 16 Q58 6 66 16 Q74 6 82 16 Q90 6 98 16 Q106 6 118 18 Q110 26 60 25 Q10 26 2 18 Z" fill="#57c84d"/>`,
  yellow: `<path d="M8 8 H112 V18 H86 L76 30 L68 18 H8 Z" fill="#f6c90e"/><circle cx="30" cy="13" r="3" fill="#e0a800"/><circle cx="56" cy="12" r="2.5" fill="#e0a800"/><circle cx="96" cy="13" r="3" fill="#e0a800"/>`,
  blue: `<path d="M4 28 Q4 2 60 2 Q116 2 116 28 Z" fill="#d99a52"/><path d="M10 24 Q12 8 60 7 Q108 8 110 24" fill="#e9b26a"/>${[[34, 12], [52, 9], [72, 10], [90, 14], [44, 18], [80, 19]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="3" ry="1.8" fill="#fff6dc"/>`).join("")}`,
};
const ckSvg = (k, cls = "") => `<svg class="${cls}" viewBox="0 0 120 32">${CK_LAYERS[k]}</svg>`;
function cookPickArt() {
  return `<svg viewBox="0 0 200 150"><ellipse cx="100" cy="128" rx="80" ry="16" fill="#fff" stroke="#dfe7f0" stroke-width="3"/>
    ${["bottom", "green", "red", "yellow", "blue"].map((k, i) => `<svg x="40" y="${100 - i * 18}" width="120" height="32" viewBox="0 0 120 32">${CK_LAYERS[k]}</svg>`).join("")}</svg>`;
}
function cookStart() {
  keyIcons([`<circle cx="20" cy="20" r="14" fill="#fff"/>`, `<path d="M6 24 Q10 10 14 20 Q18 10 22 20 Q26 10 30 20 Q34 12 34 24 Z" fill="#fff"/>`,
    `<path d="M6 12 H34 V24 H26 L22 32 L18 24 H6 Z" fill="#fff"/>`, `<path d="M4 28 Q4 8 20 8 Q36 8 36 28 Z" fill="#fff"/>`]);
  cookRound();
}
function cookRound() {
  game.layers = 0;
  $("sky").innerHTML = `<div class="ckroom"><div class="ckplate"><div class="ckstack" id="ckStack">${ckSvg("bottom", "newl")}</div></div>
    <div class="ckdino" id="ckDino"><svg viewBox="0 0 200 150">${dinoSvg({ stage: 1, mouth: "open" })}</svg></div></div>`;
}
function cookKey(c) {
  if (!CK_LAYERS[c]) return;
  $("ckStack").insertAdjacentHTML("beforeend", ckSvg(c, "newl"));
  tune([NOTES[c]], 0, 0.12);
  if (c !== "blue" && ++game.layers < 6) return;
  if (c !== "blue") $("ckStack").insertAdjacentHTML("beforeend", ckSvg("blue", "newl"));
  // The top is on: off it goes to the dinosaur, who munches it up.
  game.busy = true;
  later(() => {
    const st = $("ckStack"), d = $("ckDino").getBoundingClientRect(), r = st.getBoundingClientRect();
    st.style.transform = `translate(${d.left + d.width * .75 - (r.left + r.width / 2)}px, ${d.top + d.height * .45 - (r.top + r.height / 2)}px) scale(.35)`;
  }, 500);
  later(() => { $("ckStack").style.opacity = 0; $("ckDino").innerHTML = `<svg viewBox="0 0 200 150">${dinoSvg({ stage: 1, mouth: "chew" })}</svg>`; tune([392, 523, 392, 523], 0.13, 0.14); }, 1200);
  later(() => { $("ckDino").innerHTML = `<svg viewBox="0 0 200 150" class="dance">${dinoSvg({ stage: 1, mood: "love" })}</svg>`; happy(); }, 1900);
  later(() => { game.busy = false; }, 3000);
  if (++game.rounds >= 4) later(() => endGame(true), 3100); else later(cookRound, 3100);
}

/* ---- Animal photos ----
   Four bushes on the four key colours. An animal peeks out of one: press
   that colour to take its photo (a flash, a click, and the photo goes on the
   line at the top). If it is not taken, it just hides and peeks out
   somewhere else. Eight photos. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.photo { background: linear-gradient(#cfeaf7, #eaf6e4 60%, #a8cf8e 60%); }
.phroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: grid; grid-template-rows: auto 1fr; padding: 70px 20px 10px; direction: ltr; }
.phline { display: flex; justify-content: center; gap: 10px; min-height: min(12vh, 9vw); border-top: 3px solid #8a6a4a; padding-top: 6px; margin: 0 8%; }
.phline .pic { width: min(10vh, 8vw); aspect-ratio: 1; background: #fff; padding: 4px 4px 12px; box-shadow: 0 3px 6px rgba(0,0,0,.15); transform: rotate(var(--r)); animation: grow .4s cubic-bezier(.3, 1.6, .5, 1); }
.phline .pic svg { width: 100%; height: 100%; background: #e9f5e6; display: block; }
.phrow { display: flex; align-items: flex-end; justify-content: center; gap: clamp(10px, 3vw, 40px); }
.phspot { position: relative; width: min(20vw, 30vh); display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.phwho { position: absolute; left: 12%; width: 76%; bottom: 30%; transform: translateY(50%); opacity: 0; transition: transform .35s cubic-bezier(.3, 1.4, .5, 1), opacity .2s; }
.phspot.peek .phwho { transform: translateY(-38%); opacity: 1; }
.phwho svg { display: block; width: 100%; height: auto; overflow: visible; }
.phbush { position: relative; width: 100%; }
.phbush svg { display: block; width: 100%; height: auto; }
.phspot .szmat { width: 70%; height: 16px; border-radius: 8px; background: var(--c); }
.phflash { position: fixed; inset: 0; background: #fff; animation: phflash .45s ease-out forwards; pointer-events: none; z-index: 9; }
@keyframes phflash { from { opacity: .95; } to { opacity: 0; } }
</style>`);
const PH_WHO = ["cat", "frog", "chick", "dino"];
const phArt = (w) => w === "dino" ? `<svg viewBox="28 46 130 104">${dinoSvg({ stage: 0 })}</svg>` : `<svg viewBox="0 0 100 100">${animal(w, false)}</svg>`;
const PH_BUSH = `<svg viewBox="0 0 120 70"><g fill="#3aa655"><circle cx="24" cy="44" r="24"/><circle cx="60" cy="34" r="32"/><circle cx="96" cy="44" r="24"/><rect x="10" y="44" width="100" height="26" rx="10"/></g>
  <g fill="#2f8f4a"><circle cx="40" cy="52" r="10"/><circle cx="82" cy="50" r="12"/></g><circle cx="52" cy="22" r="3" fill="#f28482"/><circle cx="90" cy="34" r="3" fill="#fff"/></svg>`;
function photoPickArt() {
  return `<svg viewBox="0 0 200 150"><rect x="30" y="40" width="140" height="92" rx="14" fill="#1d2b4f"/><rect x="70" y="26" width="44" height="20" rx="6" fill="#1d2b4f"/>
    <circle cx="100" cy="86" r="34" fill="#fff"/><circle cx="100" cy="86" r="26" fill="#2f7fe0"/><circle cx="92" cy="78" r="7" fill="#fff" opacity=".7"/><circle cx="150" cy="56" r="6" fill="#f6c90e"/></svg>`;
}
function photoStart() {
  game.taken = 0; game.at = -1;
  $("sky").innerHTML = `<div class="phroom"><div class="phline" id="phLine"></div><div class="phrow">${KEY_COLORS.map((c) => `<div class="phspot" data-c="${c}" style="--c:${BALLOON[c]}">
    <div class="phwho"></div><div class="phbush">${PH_BUSH}</div><i class="szmat"></i></div>`).join("")}</div></div>`;
  document.querySelectorAll(".phspot").forEach((d) => d.onclick = () => gameColor(d.dataset.c));
  later(photoPeek, 800);
}
function photoPeek() {
  const spots = document.querySelectorAll(".phspot");
  spots.forEach((s) => s.classList.remove("peek"));
  game.at = pickOther(4, game.at); game.who = PH_WHO[Math.floor(Math.random() * PH_WHO.length)];
  spots[game.at].querySelector(".phwho").innerHTML = phArt(game.who);
  spots[game.at].classList.add("peek"); tune([660], 0, 0.06);
  clearTimeout(game.peekTimer);
  game.peekTimer = setTimeout(() => { if (game && game.kind === "photo" && !game.busy) photoPeek(); }, 5000); // not taken: it hides and peeks elsewhere
  game.timers.push(game.peekTimer);
}
function photoKey(c) {
  const i = KEY_COLORS.indexOf(c), spots = document.querySelectorAll(".phspot");
  if (i < 0 || !spots.length) return;
  if (i !== game.at) { const b = spots[i].querySelector(".phbush"); b.classList.remove("nope"); void b.offsetWidth; b.classList.add("nope"); return; }
  game.busy = true; clearTimeout(game.peekTimer);
  document.body.insertAdjacentHTML("beforeend", `<i class="phflash"></i>`); setTimeout(() => { const f = document.querySelector(".phflash"); if (f) f.remove(); }, 500);
  tune([1568, 1175], 0.05, 0.1);
  $("phLine").insertAdjacentHTML("beforeend", `<div class="pic" style="--r:${(Math.random() * 10 - 5).toFixed(1)}deg">${phArt(game.who)}</div>`);
  later(() => { spots[i].classList.remove("peek"); }, 500);
  if (++game.taken >= 8) { later(happy, 600); later(() => endGame(true), 1600); return; }
  later(() => { game.busy = false; photoPeek(); }, 1200);
}

/* ---- Climb and collect shapes ----
   The dinosaur climbs a wall. A bubble shows the shape it wants next; four
   holds above it have four shapes, each in a key colour. Press the colour of
   the hold with that shape: it climbs up and collects it. Eight shapes and
   it reaches the flag at the top. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.climb { background: #8fb3c9; background-image: radial-gradient(circle, rgba(255,255,255,.25) 0 3px, transparent 4px); background-size: 46px 46px; }
.clroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; padding: 70px 20px 10px; direction: ltr; }
.clholds { position: absolute; left: 10%; right: 10%; top: 16%; display: flex; justify-content: space-around; }
.clhold { width: min(15vw, 22vh); cursor: pointer; transition: transform .3s; }
.clhold:nth-child(2) { transform: translateY(30%); } .clhold:nth-child(3) { transform: translateY(-10%); } .clhold:nth-child(4) { transform: translateY(20%); }
.clhold svg { display: block; width: 100%; height: auto; overflow: visible; }
.clhold.got svg { animation: pop .4s ease-out forwards; }
.clme { position: absolute; left: 50%; bottom: 0; width: min(22vw, 30vh); transform: translate(-50%, 0); transition: transform .6s cubic-bezier(.4, 1.3, .5, 1); }
.clme svg { display: block; width: 100%; height: auto; overflow: visible; }
.clwant { position: absolute; left: calc(50% + min(10vw, 14vh)); bottom: min(18vw, 24vh); width: min(10vw, 14vh); aspect-ratio: 1; background: #fff; border-radius: 50%; display: grid; place-items: center; box-shadow: 0 4px 0 rgba(0,0,0,.12); }
.clwant svg { width: 70%; height: 70%; }
.clrope { position: absolute; right: 26px; top: 80px; bottom: 140px; width: 10px; border-radius: 5px; background: #e9d8b4; display: flex; flex-direction: column-reverse; justify-content: space-between; align-items: center; padding: 6px 0; }
.clrope b { width: 22px; height: 22px; border-radius: 50%; background: #fff; border: 3px solid #e9d8b4; }
.clrope b.on { background: #f6c90e; border-color: #fff; }
.clrope .flag { position: absolute; top: -46px; left: -6px; width: 44px; }
</style>`);
const CL_SHAPES = {
  circle: (f, s) => `<circle cx="50" cy="50" r="38" fill="${f}" stroke="${s}" stroke-width="7"/>`,
  square: (f, s) => `<rect x="14" y="14" width="72" height="72" rx="10" fill="${f}" stroke="${s}" stroke-width="7"/>`,
  triangle: (f, s) => `<path d="M50 10 L90 86 H10 Z" fill="${f}" stroke="${s}" stroke-width="7" stroke-linejoin="round"/>`,
  star: (f, s) => `<path d="${starPath(50, 54, 44)}" fill="${f}" stroke="${s}" stroke-width="7" stroke-linejoin="round"/>`,
};
function climbPickArt() {
  return `<svg viewBox="0 0 200 150"><rect width="200" height="150" rx="14" fill="#8fb3c9"/>
    ${["circle", "star", "triangle", "square"].map((k, i) => `<g transform="translate(${16 + i * 46} ${18 + (i % 2) * 18}) scale(.34)">${CL_SHAPES[k](BALLOON[KEY_COLORS[i]], "#fff")}</g>`).join("")}
    <svg x="60" y="74" width="90" height="68" viewBox="0 0 200 150">${dinoSvg({ stage: 1 })}</svg></svg>`;
}
function climbStart() { game.got = 0; climbRound(); }
function climbRound() {
  const kinds = Object.keys(CL_SHAPES).sort(() => Math.random() - .5);
  game.kinds = kinds; game.want = kinds[Math.floor(Math.random() * 4)];
  $("sky").innerHTML = `<div class="clroom" id="clRoom">
    <div class="clholds">${KEY_COLORS.map((c, i) => `<div class="clhold newone" data-c="${c}"><svg viewBox="0 0 100 100">${CL_SHAPES[kinds[i]](BALLOON[c], "#fff")}</svg></div>`).join("")}</div>
    <div class="clme" id="clMe"><svg viewBox="0 0 200 150">${dinoSvg({ stage: 1 })}</svg></div>
    <div class="clwant newone"><svg viewBox="0 0 100 100">${CL_SHAPES[game.want]("#fff", "#1d2b4f")}</svg></div>
    <div class="clrope"><svg class="flag" viewBox="0 0 40 40"><path d="M6 4 V38" stroke="#5b6b86" stroke-width="3"/><path d="M8 4 L36 12 L8 20 Z" fill="#e63946"/></svg>${Array.from({ length: 8 }, (_, i) => `<b class="${i < game.got ? "on" : ""}"></b>`).join("")}</div></div>`;
  document.querySelectorAll(".clhold").forEach((d) => d.onclick = () => gameColor(d.dataset.c));
}
function climbKey(c) {
  const i = KEY_COLORS.indexOf(c), holds = document.querySelectorAll(".clhold");
  if (i < 0 || !holds.length) return;
  if (game.kinds[i] !== game.want) { const h = holds[i]; h.classList.remove("nope", "newone"); void h.offsetWidth; h.classList.add("nope"); softNo(); return; }
  game.busy = true;
  const me = $("clMe"), r = holds[i].getBoundingClientRect(), m = me.getBoundingClientRect();
  me.style.transform = `translate(calc(-50% + ${r.left + r.width / 2 - (m.left + m.width / 2)}px), ${r.bottom - m.top - m.height * .25}px)`;
  tune([392, 494, 587], 0.1, 0.12);
  later(() => { holds[i].classList.add("got"); game.got++; document.querySelectorAll(".clrope b")[game.got - 1].classList.add("on"); tune([784, 1047], 0.08, 0.16); }, 650);
  if (game.got + 1 >= 8) { later(happy, 1000); later(() => endGame(true), 2000); return; }
  later(() => { game.busy = false; climbRound(); }, 1500);
}

/* ---- Sticker album ----
   Every game played to the end gives a sticker (a new one while there are
   new ones), shown on the cheer screen. The album shows them all; ones not
   found yet are grey shadows. Kept on this device. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.album { background: #fff7e6; }
.alroom { position: absolute; top: 0; right: 0; bottom: 30px; left: 0; padding: 80px 24px 10px; display: grid; grid-template-columns: repeat(6, 1fr); gap: clamp(8px, 2vw, 22px); align-content: center; direction: ltr; overflow-y: auto; }
.alslot { aspect-ratio: 1; border-radius: 20px; background: #fff; box-shadow: 0 5px 0 rgba(29,43,79,.1); display: grid; place-items: center; position: relative; }
.alslot svg { width: 78%; height: 78%; overflow: visible; }
.alslot.none svg { filter: brightness(0); opacity: .08; }
.alslot.new { outline: 5px solid #f6c90e; animation: dance .9s ease-in-out 2; }
.alslot b { position: absolute; right: 6px; bottom: 4px; font: 700 18px/1 Fredoka, sans-serif; color: #e0a800; }
.game.album .keys { display: none; }
.stwin { position: absolute; left: calc(50% + min(31vh, 36vw)); top: calc(50% - min(13vh, 13vw)); width: min(26vh, 26vw); aspect-ratio: 1; background: #fff; border-radius: 28px; box-shadow: 0 8px 0 rgba(0,0,0,.12); display: grid; place-items: center; animation: stwin .8s cubic-bezier(.3, 1.6, .5, 1) .5s both; }
.stwin svg { width: 78%; height: 78%; overflow: visible; }
@keyframes stwin { from { transform: scale(0) rotate(-30deg); } }
</style>`);
function stickerList() {
  const t = (n) => `<svg viewBox="0 0 100 100">${THINGS[n][1]}</svg>`;
  return [["apple", t("apple")], ["sun", t("sun")], ["star", t("star")], ["fish", t("fish")], ["heart", t("heart")], ["leaf", t("leaf")], ["tree", t("tree")], ["drop", t("drop")],
    ["cat", `<svg viewBox="0 0 100 100">${animal("cat", false)}</svg>`], ["frog", `<svg viewBox="0 0 100 100">${animal("frog", true)}</svg>`], ["chick", `<svg viewBox="0 0 100 100">${animal("chick", false)}</svg>`],
    ["dino", `<svg viewBox="0 0 200 150">${dinoSvg({ stage: 2 })}</svg>`], ["baby", `<svg viewBox="28 46 130 104">${dinoSvg({ stage: 0, mood: "love" })}</svg>`], ["egg", `<svg viewBox="0 30 200 120">${EGG}</svg>`],
    ["car", `<svg viewBox="-40 -56 80 104">${carSvg()}</svg>`], ["ball", `<svg viewBox="0 0 100 100">${BALL}</svg>`], ["crown", `<svg viewBox="110 -14 60 50">${DRESS.hat[2]}</svg>`],
    ["sandwich", `<svg viewBox="0 0 120 100">${["bottom", "green", "red", "yellow", "blue"].map((k, i) => `<svg y="${66 - i * 14}" width="120" height="32" viewBox="0 0 120 32">${CK_LAYERS[k]}</svg>`).join("")}</svg>`]];
}
function stickersHave() { try { return JSON.parse(load("stickers") || "[]"); } catch (e) { return []; } }
window.stickerWon = () => { // called by endGame in index.html on the cheer screen
  const list = stickerList(), have = stickersHave(), names = have.map((h) => h.k);
  const fresh = list.filter(([k]) => !names.includes(k));
  const pick = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length || list.length))];
  have.push({ k: pick[0], at: Date.now() }); save("stickers", JSON.stringify(have));
  const done = document.querySelector("#sky .done");
  if (done) done.insertAdjacentHTML("beforeend", `<div class="stwin">${pick[1]}</div>`);
};
function albumPickArt() {
  return `<svg viewBox="0 0 200 150"><rect x="30" y="14" width="140" height="122" rx="12" fill="#f4a261"/><rect x="40" y="22" width="120" height="106" rx="8" fill="#fff7e6"/>
    <g transform="translate(48 30) scale(.4)">${THINGS.star[1]}</g><g transform="translate(108 30) scale(.4)">${THINGS.heart[1]}</g>
    <g transform="translate(48 80) scale(.4)">${THINGS.sun[1]}</g><g transform="translate(108 80) scale(.4)" opacity=".12">${THINGS.fish[1]}</g></svg>`;
}
function albumStart() {
  const have = stickersHave(), count = {}, last = have.length ? have[have.length - 1].k : "";
  for (const h of have) count[h.k] = (count[h.k] || 0) + 1;
  $("sky").innerHTML = `<div class="alroom">${stickerList().map(([k, art]) => `<div class="alslot${count[k] ? "" : " none"}${k === last ? " new" : ""}">${art}${count[k] > 1 ? `<b>${count[k]}</b>` : ""}</div>`).join("")}</div>`;
}
function albumKey() { // any key: the stickers he has dance one by one
  const got = [...document.querySelectorAll(".alslot:not(.none)")];
  got.forEach((s, i) => later(() => { s.classList.remove("dance"); void s.offsetWidth; s.classList.add("dance"); tune([[523, 659, 784, 1047][i % 4]], 0, 0.08); }, i * 120));
}

/* ---- Xylophone ----
   Four big bars, one per key colour, each a note (do, mi, sol, high do). He
   plays whatever he likes: the bar bounces and a little note floats up.
   Every eight notes a tiny tune answers him. Free play, no right or wrong. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.music { background: #fff4e0; }
.murow { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: flex; align-items: center; justify-content: center; gap: clamp(10px, 2.4vw, 34px); padding: 70px 20px 10px; direction: ltr; }
.mubar { position: relative; width: min(16vw, 24vh); border-radius: 22px; background: var(--c); box-shadow: inset 0 -12px 0 rgba(0,0,0,.15), 0 8px 0 rgba(29,43,79,.15); cursor: pointer; transform-origin: 50% 50%; }
.mubar::before, .mubar::after { content: ""; position: absolute; left: 50%; width: 18px; height: 18px; margin-left: -9px; border-radius: 50%; background: #e7ddc8; }
.mubar::before { top: 14px; } .mubar::after { bottom: 22px; }
.mubar.hit { animation: muhit .3s ease-out; }
@keyframes muhit { 30% { transform: scale(1.06, .94) translateY(6px); } }
.munote { position: absolute; font: 700 54px/1 Fredoka, sans-serif; color: var(--c); text-shadow: 0 3px 0 #fff; animation: munote 1.4s ease-out forwards; pointer-events: none; }
@keyframes munote { to { transform: translate(var(--dx), -220px) rotate(var(--r)); opacity: 0; } }
</style>`);
function musicPickArt() {
  return `<svg viewBox="0 0 200 150">${KEY_COLORS.map((c, i) => `<rect x="${20 + i * 44}" y="${14 + i * 10}" width="34" height="${118 - i * 20}" rx="10" fill="${BALLOON[c]}"/>`).join("")}
    <path d="M150 20 V48 a8 7 0 1 1 -4 -6 V24 L170 18 V42 a8 7 0 1 1 -4 -6 V22 Z" fill="#1d2b4f"/></svg>`;
}
function musicStart() {
  game.notes = 0;
  $("sky").innerHTML = `<div class="murow">${KEY_COLORS.map((c, i) => `<div class="mubar newone" data-c="${c}" style="--c:${BALLOON[c]};height:min(${56 - i * 8}vh, ${42 - i * 6}vw)"></div>`).join("")}</div>`;
  document.querySelectorAll(".mubar").forEach((b) => b.onclick = () => gameColor(b.dataset.c));
}
function musicKey(c) {
  const i = KEY_COLORS.indexOf(c), bar = document.querySelectorAll(".mubar")[i];
  if (!bar) return;
  const a = audioCtx(); if (a) bell(a, [523, 659, 784, 1047][i], a.currentTime + 0.01, 1.2, 0.22);
  bar.classList.remove("hit", "newone"); void bar.offsetWidth; bar.classList.add("hit");
  const n = document.createElement("i"), r = bar.getBoundingClientRect();
  n.className = "munote"; n.textContent = ["♪", "♫", "♩", "♬"][game.notes % 4];
  n.style.cssText = `left:${r.left + r.width / 2 - 20}px;top:${r.top - 30}px;--c:${BALLOON[c]};--dx:${Math.random() * 80 - 40}px;--r:${Math.random() * 60 - 30}deg`;
  $("sky").appendChild(n); setTimeout(() => n.remove(), 1500);
  if (++game.notes % 8 === 0) { game.busy = true; later(() => tune([523, 659, 784, 659, 523, 784, 1047], 0.16, 0.14), 500); later(() => { game.busy = false; }, 1700); }
  if (game.notes >= 48) { game.busy = true; later(() => endGame(true), 1900); }
}

/* ---- Who says that? (animal sounds) ----
   A sound plays (a cat's meow, a frog's ribbit, a chick's cheep, a little
   dinosaur's roar), made in the browser. Press the animal that makes it. A
   wrong one just makes its own sound, so he hears the difference. The
   speaker button (or the same animal) plays it again. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.sounds { background: #eaf6e4; }
.sdroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: grid; grid-template-rows: auto 1fr; justify-items: center; padding: 70px 20px 10px; direction: ltr; }
.sdspeak { width: min(16vh, 13vw); aspect-ratio: 1; border-radius: 50%; background: #fff; border: 0; box-shadow: 0 6px 0 rgba(29,43,79,.15); cursor: pointer; display: grid; place-items: center; }
.sdspeak svg { width: 60%; height: 60%; }
.sdspeak.on { animation: hop .4s ease-out 2; }
</style>`);
const SD_WHO = ["cat", "frog", "chick", "dino"];
function sdNoise(a, len) { const b = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = a.createBufferSource(); s.buffer = b; return s; }
function sdSay(who) {
  const a = audioCtx(); if (!a) return;
  const t = a.currentTime + 0.02, out = a.createGain(); out.gain.value = 0.9; out.connect(a.destination);
  const voice = (type, f0, f1, at, len, vol, filt) => { // one sliding tone
    const o = a.createOscillator(), g = a.createGain(); o.type = type;
    o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + len);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    let node = o; if (filt) { const f = a.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = filt; o.connect(f); node = f; }
    node.connect(g); g.connect(out); o.start(at); o.stop(at + len + 0.05);
  };
  if (who === "cat") { voice("sawtooth", 520, 900, t, 0.25, 0.12, 2200); voice("sawtooth", 900, 480, t + 0.25, 0.45, 0.12, 1800); }
  else if (who === "frog") { for (const d of [0, 0.32]) for (let k = 0; k < 4; k++) voice("square", 180, 140, t + d + k * 0.045, 0.04, 0.12, 900); }
  else if (who === "chick") { for (let k = 0; k < 3; k++) voice("sine", 2400, 3400, t + k * 0.2, 0.12, 0.14); }
  else { // a small, friendly roar
    voice("sawtooth", 110, 70, t, 0.9, 0.18, 500);
    const n = sdNoise(a, 0.9), f = a.createBiquadFilter(), g = a.createGain();
    f.type = "lowpass"; f.frequency.value = 600; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.15, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    n.connect(f); f.connect(g); g.connect(out); n.start(t); n.stop(t + 0.95);
  }
}
const sdArt = (w, open) => w === "dino" ? `<svg viewBox="28 46 130 104">${dinoSvg({ stage: 0, mouth: open ? "open" : "smile" })}</svg>` : `<svg viewBox="0 0 100 100">${animal(w, open)}</svg>`;
const SD_SPEAKER = `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" fill="#1d2b4f"/></svg>`;
function soundsPickArt() {
  return `<svg viewBox="0 0 200 150"><g transform="translate(10 40) scale(.8)">${animal("cat", true)}</g><g transform="translate(110 40) scale(.8)">${animal("chick", false)}</g>
    <g transform="translate(80 4) scale(1.6)"><path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4z" fill="#1d2b4f"/></g></svg>`;
}
function soundsStart() { game.who = -1; soundsRound(); }
function soundsRound() {
  game.order = SD_WHO.slice().sort(() => Math.random() - .5);
  game.who = pickOther(4, game.who); game.want = game.order[game.who];
  $("sky").innerHTML = `<div class="sdroom"><button class="sdspeak" id="sdSpeak" type="button">${SD_SPEAKER}</button>
    <div class="feedrow">${game.order.map((w, i) => `<div class="pet" data-c="${KEY_COLORS[i]}">${sdArt(w, false)}<i class="mat" style="background:${BALLOON[KEY_COLORS[i]]}"></i></div>`).join("")}</div></div>`;
  document.querySelectorAll(".sdroom .pet").forEach((d) => d.onclick = () => gameColor(d.dataset.c));
  $("sdSpeak").onclick = soundsPlay;
  later(soundsPlay, 700);
}
function soundsPlay() { const s = $("sdSpeak"); if (s) { s.classList.remove("on"); void s.offsetWidth; s.classList.add("on"); } sdSay(game.want); }
function soundsKey(c) {
  const i = KEY_COLORS.indexOf(c), pets = document.querySelectorAll(".sdroom .pet");
  if (i < 0 || !pets.length) return;
  const p = pets[i], who = game.order[i];
  p.innerHTML = sdArt(who, true) + p.innerHTML.slice(p.innerHTML.indexOf("<i class"));
  sdSay(who);
  later(() => { if (p.isConnected) p.innerHTML = sdArt(who, false) + p.innerHTML.slice(p.innerHTML.indexOf("<i class")); }, 900);
  if (who !== game.want) { game.wrong = (game.wrong || 0) + 1; p.classList.remove("nope"); void p.offsetWidth; p.classList.add("nope"); game.busy = true; later(() => { game.busy = false; soundsPlay(); }, 1300); return; }
  game.busy = true;
  later(() => { p.classList.add("dance"); happy(); }, 900);
  later(() => { game.busy = false; }, 2300);
  if (++game.rounds >= 8) later(() => endGame(true), 2400); else later(soundsRound, 2400);
}

/* ---- Bubbles ----
   Soft bubbles drift slowly up in the four colours. A colour key pops the
   lowest bubble of that colour (a tap pops any). Calm, no hurry: missed
   bubbles float away. Twenty pops. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.bubbles { background: linear-gradient(#bfe6f5, #e7f6fb); }
.bbroom { position: absolute; inset: 0; overflow: hidden; }
.bub { position: absolute; left: 0; top: 0; width: var(--s); height: var(--s); border-radius: 50%; will-change: transform; cursor: pointer;
  background: radial-gradient(circle at 32% 30%, rgba(255,255,255,.95) 0 9%, rgba(255,255,255,0) 10%), radial-gradient(circle, rgba(255,255,255,.05) 55%, var(--c) 100%);
  border: 3px solid var(--c); box-shadow: inset 0 0 18px rgba(255,255,255,.6); }
.bub.pop { animation: pop .3s ease-out forwards; }
</style>`);
function bubblesPickArt() {
  return `<svg viewBox="0 0 200 150">${[[50, 100, 30, 0], [120, 60, 36, 1], [160, 120, 20, 2], [80, 34, 22, 3]].map(([x, y, r, i]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" fill-opacity=".4" stroke="${BALLOON[KEY_COLORS[i]]}" stroke-width="4"/><circle cx="${x - r * .35}" cy="${y - r * .35}" r="${r * .15}" fill="#fff"/>`).join("")}</svg>`;
}
function bubblesStart() {
  Object.assign(game, { list: [], popped: 0, spawnIn: 0, last: 0 });
  $("sky").innerHTML = `<div class="bbroom" id="bbRoom"></div>`;
  game.raf = requestAnimationFrame(bubblesFrame);
}
function bubblesFrame(t) {
  if (!game || game.kind !== "bubbles") return;
  const dt = game.last ? Math.min(0.25, (t - game.last) / 1000) : 0; game.last = t;
  game.spawnIn -= dt;
  if (game.spawnIn <= 0 && game.list.length < 7) {
    game.spawnIn = 0.9 + Math.random() * 0.8;
    const c = KEY_COLORS[Math.floor(Math.random() * 4)], s = Math.min(innerWidth, innerHeight) * (0.12 + Math.random() * 0.08), el = document.createElement("div");
    el.className = "bub"; el.style.setProperty("--c", BALLOON[c]); el.style.setProperty("--s", s + "px");
    const b = { el, c, s, x: Math.random() * (innerWidth - s), y: innerHeight, v: innerHeight / (9 + Math.random() * 4), ph: Math.random() * 6 };
    el.onpointerdown = (e) => { e.stopPropagation(); bubblesPop(b); };
    $("bbRoom").appendChild(el); game.list.push(b);
  }
  for (const b of game.list) {
    b.y -= b.v * dt; b.ph += dt;
    b.el.style.transform = `translate3d(${b.x + Math.sin(b.ph * 1.3) * 18}px, ${b.y}px, 0)`;
    if (b.y < -b.s) { b.el.remove(); b.gone = true; }
  }
  game.list = game.list.filter((b) => !b.gone);
  game.raf = requestAnimationFrame(bubblesFrame);
}
function bubblesPop(b) {
  if (!game || b.gone || game.busy) return;
  b.gone = true; b.el.classList.add("pop"); setTimeout(() => b.el.remove(), 320);
  const a = audioCtx(); if (a) bell(a, NOTES[b.c] * 1.5, a.currentTime + 0.01, 0.4, 0.12);
  if (++game.popped >= 20) { game.busy = true; later(happy, 300); later(() => endGame(true), 1200); }
}
function bubblesKey(c) {
  const b = game.list.filter((x) => x.c === c && !x.gone).sort((p, q) => q.y - p.y)[0];
  if (b) bubblesPop(b);
}

/* ---- Hide and seek ----
   The little dinosaur hides behind one of four things (a tree, a box, a
   bush, a curtain), with its tail peeking out as a clue. Press the colour of
   the right one: out it jumps! The wrong one lifts a little to show nobody
   is there. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.hide { background: linear-gradient(#d7ecf7 60%, #a8cf8e 60%); }
.hdroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: flex; align-items: flex-end; justify-content: center; gap: clamp(10px, 3vw, 44px); padding: 70px 20px 10px; direction: ltr; }
.hdspot { position: relative; width: min(20vw, 30vh); display: flex; flex-direction: column; align-items: center; gap: 6px; cursor: pointer; }
.hdthing { position: relative; z-index: 2; width: 100%; transition: transform .35s; }
.hdthing svg { display: block; width: 100%; height: auto; overflow: visible; }
.hdspot.empty .hdthing { transform: translateY(-16%) rotate(-4deg); }
.hddino { position: absolute; z-index: 1; left: 10%; width: 80%; bottom: 22%; transition: transform .45s cubic-bezier(.3, 1.5, .5, 1); }
.hddino svg { display: block; width: 100%; height: auto; overflow: visible; }
.hdtail { position: absolute; z-index: 3; right: -12%; bottom: 26%; width: 30%; }
.hdspot.found .hddino { z-index: 3; transform: translateY(-75%) scale(1.15); }
.hdspot.found .hdtail { display: none; }
.hdspot .szmat { width: 70%; height: 16px; border-radius: 8px; background: var(--c); }
.hdcount { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(29,43,79,.55); color: #fff; font: 700 min(30vh, 22vw)/1 Fredoka, sans-serif; z-index: 5; }
</style>`);
const HD_THINGS = [
  `<svg viewBox="0 0 120 120"><rect x="50" y="70" width="20" height="50" rx="5" fill="#8a5a3b"/><circle cx="60" cy="48" r="44" fill="#3aa655"/><circle cx="34" cy="64" r="22" fill="#2f8f4a"/><circle cx="86" cy="60" r="24" fill="#2f8f4a"/><circle cx="48" cy="34" r="5" fill="#e63946"/><circle cx="76" cy="44" r="5" fill="#e63946"/></svg>`,
  `<svg viewBox="0 0 120 120"><rect x="8" y="40" width="104" height="80" rx="6" fill="#d39a5b"/><path d="M8 40 L22 22 H98 L112 40 Z" fill="#e7b57a"/><path d="M60 40 V120 M8 64 H112" stroke="#b07a40" stroke-width="5"/></svg>`,
  `<svg viewBox="0 0 120 120">${PH_BUSH.replace('viewBox="0 0 120 70"', 'x="0" y="40" width="120" height="80" viewBox="0 0 120 70"')}</svg>`,
  `<svg viewBox="0 0 120 120"><rect x="4" y="4" width="112" height="10" rx="5" fill="#8a5a3b"/><path d="M10 14 Q20 70 12 120 H60 Q50 70 58 14 Z" fill="#c45bb0"/><path d="M62 14 Q70 70 60 120 H108 Q100 70 110 14 Z" fill="#d779c4"/>
    <path d="M24 20 Q30 70 26 116 M86 20 Q92 70 88 116" stroke="#a84595" stroke-width="3" fill="none" opacity=".6"/></svg>`,
];
const HD_TAIL = `<svg viewBox="0 0 60 40"><path d="M0 30 C20 34 44 26 58 6 C50 24 30 36 0 38 Z" fill="#7cc08f"/><path d="M0 38 C30 36 50 24 58 6 L56 14 C44 30 24 38 0 40 Z" fill="#63a777"/></svg>`;
function hidePickArt() {
  return `<svg viewBox="0 0 200 150"><g transform="translate(20 20)">${HD_THINGS[0].replace("<svg ", '<svg width="110" height="110" ')}</g><g transform="translate(118 72) scale(1.1)">${HD_TAIL.replace("<svg ", '<svg width="60" height="40" ')}</g></svg>`;
}
function hideStart() { game.at = -1; hideRound(); }
function hideRound() {
  game.at = pickOther(4, game.at);
  const things = HD_THINGS.slice().sort(() => Math.random() - .5);
  $("sky").innerHTML = `<div class="hdroom">${KEY_COLORS.map((c, i) => `<div class="hdspot" data-c="${c}" style="--c:${BALLOON[c]}">
    ${i === game.at ? `<div class="hddino"><svg viewBox="40 0 160 150">${dinoSvg({ stage: 1 })}</svg></div><div class="hdtail">${HD_TAIL}</div>` : ""}
    <div class="hdthing">${things[i]}</div><i class="szmat"></i></div>`).join("")}<div class="hdcount" id="hdCount">۳</div></div>`;
  document.querySelectorAll(".hdspot").forEach((d) => d.onclick = () => gameColor(d.dataset.c));
  game.busy = true; // eyes closed, counting: three, two, one
  [["۲", 700], ["۱", 1400]].forEach(([n, ms]) => later(() => { $("hdCount").textContent = n; tune([392 + ms / 4], 0, 0.1); }, ms));
  tune([392], 0, 0.1);
  later(() => { $("hdCount").remove(); game.busy = false; tune([523, 784], 0.1, 0.12); }, 2100);
}
function hideKey(c) {
  const i = KEY_COLORS.indexOf(c), spots = document.querySelectorAll(".hdspot");
  if (i < 0 || !spots.length) return;
  if (i !== game.at) { spots[i].classList.add("empty"); softNo(); later(() => spots[i].classList.remove("empty"), 900); return; }
  game.busy = true; spots[i].classList.add("found"); happy();
  later(() => { game.busy = false; }, 1800);
  if (++game.rounds >= 6) later(() => endGame(true), 1900); else later(hideRound, 1900);
}

/* ---- Tower ----
   Each key puts a block of its colour on top of the tower. When it is tall
   (eight blocks), the dinosaur comes and — boom — knocks it over, and they
   laugh. Three towers. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.tower { background: linear-gradient(#fdf3df 78%, #d8c2a0 78%); }
.twroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: flex; align-items: flex-end; justify-content: center; gap: 6vw; padding: 70px 20px 4px; direction: ltr; }
.twstack { display: flex; flex-direction: column-reverse; align-items: center; }
.twblock { width: min(14vw, 10vh * 1.6); height: min(8.4vw, 6vh); border-radius: 10px; background: var(--c); box-shadow: inset 0 -7px 0 rgba(0,0,0,.15), inset 0 4px 0 rgba(255,255,255,.3); margin-top: 4px; transform: translateX(var(--off)); animation: ckdrop .35s cubic-bezier(.3, 1.4, .5, 1); }
.twblock.fly { transition: transform 1s cubic-bezier(.2, .6, .4, 1), opacity 1s; opacity: 0; }
.twdino { width: min(28vw, 34vh); transition: transform .8s ease-in-out; transform: translateX(60vw); }
.twdino svg { display: block; width: 100%; height: auto; overflow: visible; }
</style>`);
function towerPickArt() {
  return `<svg viewBox="0 0 200 150">${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${70 + (i % 2 ? 6 : -4)}" y="${120 - i * 20}" width="60" height="18" rx="5" fill="${BALLOON[KEY_COLORS[i % 4]]}"/>`).join("")}</svg>`;
}
function towerStart() { towerRound(); }
function towerRound() {
  game.blocks = 0;
  $("sky").innerHTML = `<div class="twroom"><div class="twstack" id="twStack"></div><div class="twdino" id="twDino"><svg viewBox="0 0 200 150">${dinoSvg({ stage: 2 })}</svg></div></div>`;
}
function towerKey(c) {
  const st = $("twStack"); if (!st) return;
  st.insertAdjacentHTML("beforeend", `<i class="twblock" style="--c:${BALLOON[c]};--off:${(Math.random() * 16 - 8).toFixed(0)}px"></i>`);
  tune([[392, 440, 494, 523, 587, 659, 698, 784][game.blocks]], 0, 0.14);
  if (++game.blocks < 8) return;
  game.busy = true;
  later(() => { $("twDino").style.transform = "translateX(-4vw)"; }, 400);
  later(() => { // boom
    [...st.children].forEach((b, i) => { b.classList.add("fly"); b.style.transform = `translate(${-80 - Math.random() * 260}px, ${-120 + Math.random() * 300}px) rotate(${Math.random() * 540 - 270}deg)`; });
    const a = audioCtx(); if (a) { const n = sdNoise(a, 0.5), g = a.createGain(); g.gain.setValueAtTime(0.25, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.5); n.connect(g); g.connect(a.destination); n.start(); }
    $("twDino").innerHTML = `<svg viewBox="0 0 200 150" class="dance">${dinoSvg({ stage: 2, mouth: "open" })}</svg>`;
  }, 1300);
  later(() => tune([784, 659, 784, 659, 1047], 0.1, 0.12), 1700);
  later(() => { game.busy = false; }, 2900);
  if (++game.rounds >= 3) later(() => endGame(true), 3000); else later(towerRound, 3000);
}

/* ---- Train ----
   A little train with four wagons, one in each key colour. Things come one
   by one (an apple, a leaf, the sun, a fish…): press the colour of the wagon
   it goes in. When every wagon has something, toot toot, off it goes. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.train { background: linear-gradient(#cfeaf7 70%, #a8cf8e 70%); }
.trroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: grid; grid-template-rows: 1fr auto; justify-items: center; padding: 70px 20px 10px; direction: ltr; overflow: hidden; }
.trload { width: min(26vh, 20vw); align-self: center; }
.trload svg { display: block; width: 100%; height: auto; }
.trtrain { display: flex; align-items: flex-end; gap: 6px; transition: transform 2s ease-in; border-bottom: 8px solid #6b4a32; padding: 0 30px; }
.trtrain.go { transform: translateX(110vw); }
.trwagon { position: relative; width: min(15vw, 22vh); aspect-ratio: 1.3; cursor: pointer; }
.trwagon .body { position: absolute; left: 0; right: 0; bottom: 14%; height: 52%; border-radius: 10px; background: var(--c); box-shadow: inset 0 -8px 0 rgba(0,0,0,.15); }
.trwagon .wheels { position: absolute; left: 0; right: 0; bottom: 0; display: flex; justify-content: space-around; }
.trwagon .wheels b { width: 26%; aspect-ratio: 1; border-radius: 50%; background: #2b2b33; border: 4px solid #8a8a99; }
.trwagon .cargo { position: absolute; left: 12%; right: 12%; bottom: 46%; display: flex; justify-content: center; }
.trwagon .cargo svg { width: 70%; height: auto; animation: ckdrop .4s cubic-bezier(.3, 1.4, .5, 1); }
.trengine { width: min(18vw, 26vh); }
.trengine svg { display: block; width: 100%; height: auto; }
.trpuff { position: absolute; width: 40px; height: 40px; border-radius: 50%; background: #fff; opacity: .9; animation: trpuff 1.2s ease-out forwards; pointer-events: none; }
@keyframes trpuff { to { transform: translate(-30px, -120px) scale(2.4); opacity: 0; } }
</style>`);
const TR_ENGINE = `<svg viewBox="0 0 140 110"><rect x="10" y="40" width="90" height="50" rx="8" fill="#e63946"/><rect x="60" y="10" width="46" height="46" rx="6" fill="#c62f3b"/>
  <rect x="68" y="18" width="30" height="22" rx="4" fill="#cfeaf7"/><rect x="20" y="16" width="16" height="26" rx="3" fill="#2b2b33"/><path d="M100 70 L128 90 H100 Z" fill="#f6c90e"/>
  <circle cx="30" cy="96" r="12" fill="#2b2b33" stroke="#8a8a99" stroke-width="4"/><circle cx="80" cy="96" r="12" fill="#2b2b33" stroke="#8a8a99" stroke-width="4"/>${face(83, 30, .55)}</svg>`;
const TR_CARGO = { red: ["apple", "heart"], green: ["leaf", "tree"], yellow: ["sun", "star"], blue: ["fish", "drop"] };
function trainPickArt() {
  return `<svg viewBox="0 0 200 150"><rect y="120" width="200" height="6" fill="#6b4a32"/><svg x="110" y="50" width="88" height="70" viewBox="0 0 140 110">${TR_ENGINE.slice(TR_ENGINE.indexOf(">") + 1, -6)}</svg>
    ${["#2a9d4b", "#f6c90e"].map((c, i) => `<rect x="${10 + i * 50}" y="80" width="44" height="30" rx="6" fill="${c}"/><circle cx="${20 + i * 50}" cy="114" r="6" fill="#2b2b33"/><circle cx="${44 + i * 50}" cy="114" r="6" fill="#2b2b33"/>`).join("")}
    <g transform="translate(18 52) scale(.3)">${THINGS.leaf[1]}</g></svg>`;
}
function trainStart() { trainRound(); }
function trainRound() {
  game.full = new Set();
  $("sky").innerHTML = `<div class="trroom"><div class="trload" id="trLoad"></div>
    <div class="trtrain" id="trTrain">${KEY_COLORS.map((c) => `<div class="trwagon" data-c="${c}" style="--c:${BALLOON[c]}"><div class="cargo"></div><div class="body"></div><div class="wheels"><b></b><b></b></div></div>`).join("")}
      <div class="trengine">${TR_ENGINE}</div></div></div>`;
  document.querySelectorAll(".trwagon").forEach((d) => d.onclick = () => gameColor(d.dataset.c));
  trainNext();
}
function trainNext() {
  const left = KEY_COLORS.filter((c) => !game.full.has(c));
  game.want = left[Math.floor(Math.random() * left.length)];
  const opts = TR_CARGO[game.want]; game.thing = opts[Math.floor(Math.random() * opts.length)];
  $("trLoad").innerHTML = thingSvg(game.thing, "newone");
}
function trainKey(c) {
  const load = document.querySelector("#trLoad svg"), wagon = document.querySelector(`.trwagon[data-c="${c}"]`);
  if (!load || !wagon) return;
  if (c !== game.want) { load.classList.remove("nope", "newone"); void load.getBoundingClientRect(); load.classList.add("nope"); softNo(); return; }
  wagon.querySelector(".cargo").innerHTML = thingSvg(game.thing);
  $("trLoad").innerHTML = ""; game.full.add(c); tune([NOTES[c]], 0, 0.16);
  if (game.full.size < 4) { game.busy = true; later(() => { game.busy = false; trainNext(); }, 500); return; }
  game.busy = true; // all aboard: toot toot!
  later(() => {
    tune([587, 587, 0, 587, 784], 0.18, 0.14);
    const eng = document.querySelector(".trengine").getBoundingClientRect();
    for (let k = 0; k < 3; k++) later(() => { const p = document.createElement("i"); p.className = "trpuff"; p.style.left = eng.left + eng.width * .2 + "px"; p.style.top = eng.top - 10 + "px"; $("sky").appendChild(p); setTimeout(() => p.remove(), 1300); }, k * 250);
  }, 300);
  later(() => $("trTrain").classList.add("go"), 1100);
  later(() => { game.busy = false; }, 3300);
  if (++game.rounds >= 3) later(() => endGame(true), 3300); else later(trainRound, 3300);
}


/* ---- Blow out the candles / Shake the apple tree (with the phone) ----
   Two games for the phone's own senses: the child blows at the phone (its
   microphone, measured on the phone only) to put out the candles on a cake,
   or shakes the phone to shake an apple tree so apples drop into a basket.
   The phone page is control.html?mode=blow / ?mode=shake (a code on screen);
   any colour key or a tap also blows or shakes, so it works without a phone. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.candles, .game.tree { background: linear-gradient(#bfe3ff, #eaf7ff 66%, #a8dc8c 66%); }
.phroom { position: absolute; inset: 0 0 120px 0; display: grid; place-items: center; }
.phroom svg.main { width: min(70vw, 62vh); height: auto; overflow: visible; }
.phroom .flame { transform-box: fill-box; transform-origin: 50% 100%; animation: flick .5s ease-in-out infinite alternate; }
@keyframes flick { to { transform: scale(.9, 1.08) rotate(3deg); } }
.phroom .smoke { animation: smoke 1.4s ease-out forwards; }
@keyframes smoke { to { transform: translateY(-60px); opacity: 0; } }
.phroom .crown { transform-box: fill-box; transform-origin: 50% 100%; }
.phroom .crown.shake { animation: crown .5s ease-in-out; }
@keyframes crown { 25% { transform: rotate(-5deg); } 50% { transform: rotate(4deg); } 75% { transform: rotate(-2deg); } }
.phroom .apple { transition: transform .7s cubic-bezier(.5, 0, 1, 1); }
.phroom .hud { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, .85); border-radius: 22px; padding: 6px 18px; font: 700 34px/1 Fredoka, sans-serif; color: #24324f; }
</style>`);
function phQrSvg(mode) { // the code holds at most 42 characters: the short link if it fits, else the plain one (pick the tab on the phone)
  if (!window.qrSvg) return "";
  try { return qrSvg(location.origin + "/control.html?m=" + mode); } catch (e) {}
  try { return qrSvg(location.origin + "/control.html"); } catch (e) { return ""; }
}
const phQr = (mode) => `<div class="carqr" id="carqr">${phQrSvg(mode)}<span>با گوشی بازی کنید: این کد را با دوربین گوشی بگیرید</span></div>`;
function phQrLater() { later(() => { const q = $("carqr"); if (q && !game.padSeen) q.classList.add("gone"); }, 25000); }
function candlesPickArt() {
  return `<svg viewBox="0 0 200 150"><rect x="40" y="80" width="120" height="56" rx="10" fill="#f2a0c0"/><path d="M40 100 Q60 112 80 100 T120 100 T160 100" stroke="#fff" stroke-width="7" fill="none"/>
    ${[70, 100, 130].map((x) => `<rect x="${x - 5}" y="48" width="10" height="32" rx="3" fill="#7fb6ef"/><path d="M${x} 26 C${x + 9} 38 ${x + 8} 46 ${x} 48 C${x - 8} 46 ${x - 9} 38 ${x} 26 Z" fill="#ffb300"/>`).join("")}</svg>`;
}
function treePickArt() {
  return `<svg viewBox="0 0 200 150"><rect x="92" y="80" width="16" height="60" rx="4" fill="#8a6a44"/><circle cx="100" cy="62" r="46" fill="#6f9a5e"/><circle cx="70" cy="74" r="26" fill="#87b072"/>
    <circle cx="80" cy="56" r="8" fill="#e05545"/><circle cx="118" cy="50" r="8" fill="#e05545"/><circle cx="108" cy="80" r="8" fill="#e05545"/><path d="M140 138 h40 l-6 -20 h-28 z" fill="#c98a4a"/></svg>`;
}
const CANDLE_X = [150, 225, 300, 375, 450];
function candlesStart() {
  game.round = 0;
  $("sky").innerHTML = `<div class="phroom"><svg class="main" id="cake" viewBox="0 0 600 460"></svg>${phQr("blow")}</div>`;
  candlesRound();
  padListen("candles", (btn) => { if (btn === "blow") { const q = $("carqr"); if (q) q.classList.add("gone"); candlesBlow(); } });
  phQrLater();
}
function candlesRound() {
  game.lit = CANDLE_X.map(() => true); game.busy = false;
  $("cake").innerHTML = `<ellipse cx="300" cy="440" rx="240" ry="18" fill="#1f2a1a" opacity=".15"/>
    <rect x="70" y="260" width="460" height="170" rx="26" fill="#f2a0c0"/><rect x="70" y="330" width="460" height="16" fill="#e889ad"/>
    <path d="M70 290 Q110 320 150 290 T230 290 T310 290 T390 290 T470 290 T530 290" stroke="#fff" stroke-width="18" fill="none" stroke-linecap="round"/>
    ${CANDLE_X.map((x, i) => `<rect x="${x - 13}" y="150" width="26" height="110" rx="6" fill="${["#7fb6ef", "#f6c90e", "#8fd18a", "#f28c38", "#b69cf0"][i]}"/>
      <path d="M${x} 150 V132" stroke="#444" stroke-width="5"/>
      <path class="flame" id="fl${i}" d="M${x} 70 C${x + 26} 104 ${x + 22} 128 ${x} 134 C${x - 22} 128 ${x - 26} 104 ${x} 70 Z" fill="#ffb300"/>`).join("")}`;
}
function candlesBlow() {
  if (!game || game.kind !== "candles" || game.busy) return;
  const left = game.lit.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
  if (!left.length) return;
  for (const i of left.sort(() => Math.random() - 0.5).slice(0, 1 + (Math.random() < 0.35 ? 1 : 0))) { // one candle, sometimes two
    game.lit[i] = false;
    const f = $("fl" + i); if (!f) continue;
    f.outerHTML = `<g class="smoke"><circle cx="${CANDLE_X[i]}" cy="118" r="12" fill="#bbb" opacity=".7"/><circle cx="${CANDLE_X[i] + 10}" cy="96" r="9" fill="#ccc" opacity=".6"/></g>`;
  }
  tune([392], 0, 0.08);
  if (game.lit.some((x) => x)) return;
  game.busy = true; // all out: the birthday tune, then new candles
  later(() => tune([392, 392, 440, 392, 523, 494], 0.32, 0.16), 400);
  if (++game.round >= 3) later(() => endGame(true), 2800); else later(candlesRound, 3200);
}
function candlesKey() { candlesBlow(); }

const APPLES = [[210, 150], [300, 110], [390, 150], [250, 220], [350, 210], [180, 250], [420, 240], [300, 180]];
function treeStart() {
  game.round = 0;
  $("sky").innerHTML = `<div class="phroom"><div class="hud" id="treeHud">🍎 ۰</div><svg class="main" id="tree" viewBox="0 0 600 460"></svg>${phQr("shake")}</div>`;
  game.got = 0;
  treeRound();
  padListen("tree", (btn) => { if (btn === "shake") { const q = $("carqr"); if (q) q.classList.add("gone"); treeShake(); } });
  phQrLater();
}
function treeRound() {
  game.on = APPLES.map(() => true); game.busy = false;
  $("tree").innerHTML = `<ellipse cx="300" cy="440" rx="220" ry="16" fill="#1f2a1a" opacity=".15"/><rect x="272" y="250" width="56" height="190" rx="14" fill="#8a6a44"/>
    <g class="crown" id="crown"><circle cx="300" cy="180" r="150" fill="#6f9a5e"/><circle cx="200" cy="215" r="90" fill="#87b072"/><circle cx="410" cy="200" r="86" fill="#5f8a50"/>
    ${APPLES.map(([x, y], i) => `<g class="apple" id="ap${i}"><circle cx="${x}" cy="${y}" r="22" fill="#e05545"/><path d="M${x} ${y - 22} q4 -12 12 -14" stroke="#6a4a2a" stroke-width="5" fill="none"/></g>`).join("")}</g>
    <path d="M420 440 h150 l-20 -70 h-110 z" fill="#c98a4a"/><path d="M432 400 h126" stroke="#a8743c" stroke-width="8"/>`;
}
function treeShake() {
  if (!game || game.kind !== "tree" || game.busy) return;
  const c = $("crown"); if (!c) return;
  c.classList.remove("shake"); void c.getBoundingClientRect(); c.classList.add("shake");
  const left = game.on.map((on, i) => (on ? i : -1)).filter((i) => i >= 0);
  if (!left.length) return;
  const i = left[Math.floor(Math.random() * left.length)], [x, y] = APPLES[i];
  game.on[i] = false;
  const a = $("ap" + i);
  // Out of the crown (so it doesn't shake along) and down into the basket.
  $("tree").appendChild(a); requestAnimationFrame(() => { a.style.transform = `translate(${490 - x + (Math.random() * 40 - 20)}px, ${385 - y}px)`; });
  later(() => { tune([330, 262], 0.1, 0.1); game.got++; const h = $("treeHud"); if (h) h.textContent = "🍎 " + game.got.toLocaleString("fa-IR"); }, 700);
  if (game.on.some((x) => x)) return;
  game.busy = true;
  later(happy, 900);
  if (++game.round >= 2) later(() => endGame(true), 2600); else later(treeRound, 2800);
}
function treeKey() { treeShake(); }

/* ---- Colour treasure hunt (out in the real room) ----
   The TV shows a colour, with a few things of that colour as a hint, and the
   little dinosaur holding an empty basket: "find something red!". Noyan goes
   off to look around the house. The picture stays still while he is away (no
   moving picture to keep him at the screen). When he brings something, a
   parent presses that colour on the remote (or taps the screen, or any button
   of the phone controller): the dinosaur dances and the next colour comes.
   Four colours, then the cheer. It has its own card and switch, and the time
   it is open does not count as watching. */
document.head.insertAdjacentHTML("beforeend", `<style>
.game.hunt { background: #fdf6e6; }
.hnroom { position: absolute; top: 0; right: 0; bottom: 120px; left: 0; display: grid; grid-template-rows: auto 1fr; justify-items: center; padding: 70px 20px 10px; direction: ltr; }
.hnstars { display: flex; gap: 14px; }
.hnstars i { width: min(7vh, 5vw); aspect-ratio: 1; border-radius: 50%; border: 5px solid #fff; background: #e6e0d2; box-shadow: 0 3px 0 rgba(0,0,0,.1); display: grid; place-items: center; }
.hnstars i.got { background: var(--c); }
.hnstars i.got::after { content: "★"; color: #fff; font: 700 min(4vh, 3vw)/1 Fredoka, sans-serif; }
.hnstars i.now { outline: 5px dashed var(--c); outline-offset: 4px; }
.hnmain { display: flex; align-items: center; justify-content: center; gap: clamp(16px, 4vw, 60px); width: 100%; cursor: pointer; }
.hnblob { width: min(46vh, 34vw); }
.hnblob svg, .hndino svg, .hnhints svg { display: block; width: 100%; height: auto; overflow: visible; }
.hnhints { display: grid; gap: 10px; width: min(16vh, 12vw); }
.hndino { width: min(40vh, 30vw); }
.hndino .bod { transform-box: fill-box; transform-origin: 50% 100%; }
</style>`);
const HUNT_HINTS = { red: ["apple", "heart"], green: ["leaf", "tree"], yellow: ["sun", "star"], blue: ["fish", "drop"] };
function huntBlob(c) { // a paint splash with a magnifying glass and a friendly face
  return `<svg viewBox="0 0 200 200"><path d="M100 18 C130 14 150 40 168 52 C192 68 186 100 178 122 C170 150 150 176 118 182 C86 188 56 178 38 154 C18 128 12 96 26 70 C40 44 70 22 100 18 Z" fill="${BALLOON[c]}"/>
    <circle cx="170" cy="172" r="12" fill="${BALLOON[c]}"/><circle cx="28" cy="36" r="9" fill="${BALLOON[c]}"/>
    ${face(100, 104, 2.6, c === "yellow" ? "#1d2b4f" : "#fff")}
    <g transform="translate(140 34)"><circle r="20" fill="rgba(255,255,255,.55)" stroke="#1d2b4f" stroke-width="7"/><path d="M14 14 L32 32" stroke="#1d2b4f" stroke-width="9" stroke-linecap="round"/></g></svg>`;
}
const huntBasket = (thing) => `<g transform="translate(128 98) scale(.9)">${catchBasket()}${thing ? `<g transform="translate(14 -10) scale(.32)">${THINGS[thing][1]}</g>` : ""}</g>`;
function huntPickArt() { return `<svg viewBox="0 0 200 150"><svg x="10" y="10" width="120" height="120" viewBox="0 0 200 200">${huntBlob("red").replace(/<g transform="translate\(140 34\)">/, '<g transform="translate(150 30)">')}</svg><g transform="translate(120 60) scale(.4)">${THINGS.apple[1]}</g></svg>`; }
function huntStart() {
  game.free = true; // not counted as watching (see beginGame in index.html)
  game.order = KEY_COLORS.slice().sort(() => Math.random() - .5); game.at = 0;
  huntRound();
  padListen("hunt", () => huntFound());
}
function huntRound() {
  const c = game.order[game.at], [h1, h2] = HUNT_HINTS[c];
  $("sky").innerHTML = `<div class="hnroom"><div class="hnstars">${game.order.map((k, i) => `<i class="${i < game.at ? "got" : i === game.at ? "now" : ""}" style="--c:${BALLOON[k]}"></i>`).join("")}</div>
    <div class="hnmain" id="hnMain"><div class="hnhints">${thingSvg(h1)}${thingSvg(h2)}</div><div class="hnblob newone">${huntBlob(c)}</div>
      <div class="hndino"><svg viewBox="0 0 200 150"><g class="bod" id="hnBod">${dinoSvg({ stage: 1 })}${huntBasket()}</g></svg></div></div></div>`;
  $("hnMain").onclick = () => huntFound();
  tune([NOTES[c], NOTES[c] * 1.25, NOTES[c] * 1.5], 0.14, 0.14);
}
function huntKey(c) {
  if (c === game.order[game.at]) return huntFound();
  const b = document.querySelector(".hnblob"); if (b) { b.classList.remove("nope", "newone"); void b.offsetWidth; b.classList.add("nope"); }
}
function huntFound() {
  if (!game || game.kind !== "hunt" || game.busy) return;
  const c = game.order[game.at];
  game.busy = true;
  $("hnBod").innerHTML = dinoSvg({ stage: 1, mood: "love", mouth: "open" }) + huntBasket(HUNT_HINTS[c][0]);
  $("hnBod").classList.add("dance"); happy();
  document.querySelectorAll(".hnstars i")[game.at].className = "got";
  later(() => { game.busy = false; }, 2000);
  if (++game.at >= 4) later(() => endGame(true), 2200); else later(huntRound, 2200);
}

// The home list may have been drawn before this file loaded: draw it again so the
// games card and the little dinosaur's card are there.
try { if (typeof renderGrid === "function" && !$("home").hidden && $("grid").children.length) renderGrid(); } catch (e) {}
