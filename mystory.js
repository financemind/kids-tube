/* Noyan's own stories, on the TV: a picture book made by a parent in the
   parents' page (a real memory, up to six photos, maybe the parent's own voice
   for each page). A card on the home screen ("قصه‌های نویان") and the first
   places in the bedtime story list open it. Each page shows its photo and
   words; the parent's recording plays if there is one (else a Persian voice if
   the TV has one, else the page waits a little), then the next page comes.
   Right/green: next page, left/red: back, OK: pause/play, the home key: out.
   At the end, the questions the parent can ask about the real day. Time spent
   here is not counted as watching: it is a story told with the parent. */
(function () {
  const $ = (id) => document.getElementById(id);
  let stories = [], book = null;
  const ok = () => typeof API !== "undefined" && API && NT.token();

  document.head.insertAdjacentHTML("beforeend", `<style>
  .video.gamecard.bookcard { background: #fde7c8; background-image: linear-gradient(#fff1dc, #f7d9a8); }
  .bookroom { position: fixed; inset: 0; z-index: 40; background: #1b2347; color: #fff; display: grid; grid-template-rows: 1fr auto; }
  .bookroom .pic { position: relative; min-height: 0; display: grid; place-items: center; padding: 3vh 4vw 0; }
  .bookroom .pic img { max-width: 100%; max-height: 100%; border-radius: 22px; box-shadow: 0 10px 40px rgba(0,0,0,.4); }
  .bookroom .pic .nopic { font-size: 22vh; }
  .bookroom .words { font: 600 clamp(26px, 4.4vh, 46px)/1.7 Vazirmatn, system-ui, sans-serif; text-align: center; padding: 2vh 8vw 3vh; direction: rtl; }
  .bookroom .dots { display: flex; gap: 10px; justify-content: center; padding-bottom: 2vh; }
  .bookroom .dots i { width: 14px; height: 14px; border-radius: 50%; background: rgba(255,255,255,.3); }
  .bookroom .dots i.on { background: #f6c90e; }
  .bookroom .ctl { position: absolute; top: 2vh; left: 2vw; display: flex; gap: 12px; }
  .bookroom .ctl button { width: 64px; height: 64px; border-radius: 50%; border: 0; font-size: 28px; background: rgba(255,255,255,.15); color: #fff; }
  .bookroom .ctl button:focus { outline: 4px solid #f6c90e; }
  .bookroom .end { display: grid; gap: 14px; justify-items: center; padding: 4vh 8vw; font: 500 clamp(20px, 3vh, 30px)/1.6 Vazirmatn, system-ui, sans-serif; text-align: center; }
  .bookroom .end ul { margin: 0; padding: 0; list-style: none; display: grid; gap: 8px; }
  .booklist { position: fixed; inset: 0; z-index: 39; background: #1b2347; display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; padding: 6vh 5vw; align-content: start; overflow: auto; }
  .booklist button { aspect-ratio: 4 / 3; border: 0; border-radius: 22px; background: #2c3f80 center / cover no-repeat; color: #fff; font: 700 22px/1.4 Vazirmatn, system-ui, sans-serif; display: grid; place-items: end center; padding: 12px; text-shadow: 0 2px 6px #000; }
  .booklist button:focus { outline: 6px solid #f6c90e; }
  </style>`);

  const BOOK_ART = `<svg aria-hidden="true" viewBox="0 0 200 150" width="62%"><path d="M100 40 Q70 22 30 28 V122 Q70 116 100 134 Q130 116 170 122 V28 Q130 22 100 40 Z" fill="#fff" stroke="#c98a4a" stroke-width="6"/>
    <path d="M100 40 V134" stroke="#c98a4a" stroke-width="5"/><circle cx="62" cy="64" r="11" fill="#f6c90e"/><path d="M42 104 L62 80 L80 100 L90 90 L96 104 Z" fill="#7fb6ef"/>
    <path d="M112 62 H156 M112 78 H150 M112 94 H156 M112 110 H144" stroke="#9aa6c0" stroke-width="5" stroke-linecap="round"/></svg>`;

  async function load() {
    if (!ok()) return;
    const r = await NT.call("/stories", {});
    if (r.ok && r.body && Array.isArray(r.body.stories)) {
      const had = stories.length; stories = r.body.stories;
      if (stories.length !== had && typeof renderGrid === "function" && !$("home").hidden) renderGrid();
    }
  }
  const media = {}; // id-what-n -> data URL
  async function getMedia(st, what, n) {
    const key = `${st.id}-${what}${n}`;
    if (media[key] !== undefined) return media[key];
    const r = await NT.call("/story/media", { id: st.id, what, n });
    return (media[key] = r.ok && r.body ? r.body.data : null);
  }

  /* The home card and the bedtime list */
  window.myStoryCard = (grid) => {
    if (!stories.length) return;
    const b = document.createElement("button");
    b.className = "video gamecard bookcard"; b.setAttribute("aria-label", "Noyan's stories");
    b.innerHTML = BOOK_ART;
    b.onclick = () => (stories.length === 1 ? open(stories[0]) : list());
    grid.appendChild(b);
  };
  window.myStoryButtons = (box, badge) => {
    for (const st of stories) {
      const b = document.createElement("button");
      b.setAttribute("aria-label", st.title); b.innerHTML = badge || "";
      b.style.background = "#2c3f80";
      if (st.pages[0] && st.pages[0].img) getMedia(st, "img", 0).then((d) => { if (d) b.style.backgroundImage = `url(${d})`; });
      b.onclick = () => open(st);
      box.appendChild(b);
    }
  };
  function list() {
    close();
    const box = document.createElement("div"); box.className = "booklist"; box.id = "bookList";
    for (const st of stories) {
      const b = document.createElement("button"); b.textContent = st.title;
      if (st.pages[0] && st.pages[0].img) getMedia(st, "img", 0).then((d) => { if (d) b.style.backgroundImage = `url(${d})`; });
      b.onclick = () => open(st);
      box.appendChild(b);
    }
    document.body.appendChild(box);
    box.firstChild.focus();
  }

  /* The picture book */
  function open(st) {
    close();
    book = { st, at: 0, paused: false, timer: null, audio: null };
    const room = document.createElement("section"); room.className = "bookroom"; room.id = "bookRoom";
    room.innerHTML = `<div class="pic" id="bkPic"></div><div><div class="words" id="bkWords"></div><div class="dots" id="bkDots"></div></div>
      <div class="ctl"><button type="button" id="bkHome" aria-label="Home"><svg viewBox="0 0 24 24" width="30" height="30"><path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="#fff"/></svg></button><button type="button" id="bkPlay" aria-label="Pause">⏸</button></div>`;
    document.body.appendChild(room);
    $("bkHome").onclick = close; $("bkPlay").onclick = pause;
    $("bkPic").onclick = () => go(1);
    $("bkPlay").focus();
    show();
  }
  function stopSound() {
    clearTimeout(book.timer);
    if (book.audio) { book.audio.pause(); book.audio = null; }
    try { speechSynthesis.cancel(); } catch (e) {}
  }
  async function show() {
    if (!book) return;
    stopSound();
    const st = book.st, i = book.at;
    if (i >= st.pages.length) return end();
    const pg = st.pages[i];
    $("bkWords").textContent = pg.text;
    $("bkDots").innerHTML = st.pages.map((_, k) => `<i class="${k === i ? "on" : ""}"></i>`).join("");
    $("bkPic").innerHTML = `<div class="nopic">📖</div>`;
    if (pg.img) { const d = await getMedia(st, "img", i); if (book && book.at === i && d) $("bkPic").innerHTML = `<img alt="" src="${d}">`; }
    if (!book || book.at !== i) return;
    const next = () => { if (book && book.at === i && !book.paused) book.timer = setTimeout(() => go(1), 1500); };
    if (pg.audio) { // the parent's own voice for this page
      const d = await getMedia(st, "audio", i);
      if (book && book.at === i && d) { book.audio = new Audio(d); book.audio.onended = next; book.audio.play().catch(() => wait(pg, i)); return; }
    }
    const fa = (window.speechSynthesis && speechSynthesis.getVoices() || []).find((v) => /^fa/i.test(v.lang));
    if (fa) { const u = new SpeechSynthesisUtterance(pg.text); u.voice = fa; u.lang = fa.lang; u.rate = 0.85; u.onend = next; speechSynthesis.speak(u); return; }
    wait(pg, i);
  }
  function wait(pg, i) { // no voice: the page stays long enough for a parent to read it aloud
    if (book && book.at === i && !book.paused) book.timer = setTimeout(() => go(1), Math.max(7000, 3000 + pg.text.length * 90));
  }
  function go(step) {
    if (!book) return;
    book.at = Math.max(0, Math.min(book.st.pages.length, book.at + step));
    book.paused = false; $("bkPlay").textContent = "⏸";
    show();
  }
  function pause() {
    if (!book) return;
    book.paused = !book.paused; $("bkPlay").textContent = book.paused ? "▶" : "⏸";
    if (book.paused) stopSound(); else show();
  }
  function end() {
    const qs = book.st.questions || [];
    $("bkDots").innerHTML = ""; $("bkWords").textContent = "";
    $("bkPic").innerHTML = `<div class="end"><div style="font-size:12vh">🌙</div><div>قصه تمام شد. شب بخیر نویان.</div>
      ${qs.length ? `<div style="opacity:.8">برای مامان و بابا، سؤال‌هایی که می‌شود پرسید:</div><ul>${qs.map(() => "<li></li>").join("")}</ul>` : ""}</div>`;
    $("bkPic").querySelectorAll("li").forEach((li, k) => { li.textContent = "• " + qs[k]; });
    $("bkPic").onclick = null;
  }
  function close() {
    if (book) stopSound();
    book = null;
    const r = $("bookRoom"); if (r) r.remove();
    const l = $("bookList"); if (l) l.remove();
  }
  // Keys while a book (or the list of books) is open. True: the key was used here.
  window.bookKey = (key) => {
    if ($("bookList") && !book) {
      if (key === "Escape" || key === "Backspace" || key === "GoBack") { close(); return true; }
      const bs = [...$("bookList").children], at = bs.indexOf(document.activeElement);
      const step = { ArrowRight: -1, ArrowLeft: 1, ArrowDown: 1, ArrowUp: -1 }[key]; // right to left page
      if (step) { (bs[Math.max(0, Math.min(bs.length - 1, (at < 0 ? 0 : at + step)))] || bs[0]).focus(); return true; }
      return false; // OK opens the focused book
    }
    if (!book) return false;
    if (["ArrowRight", "ColorF1Green", "MediaTrackNext"].includes(key)) { go(1); return true; }
    if (["ArrowLeft", "ColorF0Red", "MediaTrackPrevious"].includes(key)) { go(-1); return true; }
    if (key === "Enter" || key === " " || key === "MediaPlayPause") { if (document.activeElement && document.activeElement.id === "bkHome") return false; pause(); return true; }
    if (key === "Escape" || key === "Backspace" || key === "GoBack") { close(); return true; }
    return false;
  };
  window.bookColor = (c) => { if (!book) return false; if (c === "green") go(1); else if (c === "red") go(-1); else pause(); return true; };
  window.bookOpen = () => !!book || !!$("bookList");

  load();
  setInterval(load, 10 * 60 * 1000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); });
  try { if (window.speechSynthesis) speechSynthesis.getVoices(); } catch (e) {}
})();
