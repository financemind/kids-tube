/* Pictures for the big clock. The parents pick one in the report for the
   child, after the show the child loves. They are our own drawings in the
   spirit of each show (colours and things from that world: a pup's ears, a
   monster-truck tyre and flames, a rescue badge and a paw), not the show's
   characters themselves.
   Each picture has three layers, all SVG (the TV shows emoji without colour):
   - back: behind the clock (ears, a badge, spikes), in a -30 -40 160 160 box;
   - ring: the clock face itself, in a 0 0 100 100 box; it must leave the
     middle circle (radius 40) for the time slice;
   - top:  in front (a star, flames, a paw, eyes), in the -30 -40 160 160 box.
   hand and dot: the colours of the clock hand and its middle. */
(function () {
  const star = (cx, cy, r, fill, stroke) => {
    const pts = Array.from({ length: 10 }, (_, i) => { const a = Math.PI / 5 * i - Math.PI / 2, d = i % 2 ? r * .45 : r;
      return `${(cx + Math.cos(a) * d).toFixed(1)},${(cy + Math.sin(a) * d).toFixed(1)}`; }).join(" ");
    return `<polygon points="${pts}" fill="${fill}" stroke="${stroke || "none"}" stroke-width="1.5" stroke-linejoin="round"/>`;
  };
  const paw = (cx, cy, k, fill) => `<g transform="translate(${cx} ${cy}) scale(${k})" fill="${fill}">
    <ellipse cx="0" cy="4" rx="7" ry="6"/><ellipse cx="-8" cy="-4" rx="3" ry="4"/><ellipse cx="-3" cy="-9" rx="3" ry="4"/>
    <ellipse cx="3" cy="-9" rx="3" ry="4"/><ellipse cx="8" cy="-4" rx="3" ry="4"/></g>`;
  const eye = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="#4f8c63" stroke-width="2"/>
    <circle cx="${x + 1.5}" cy="${y + 1}" r="${r * .55}" fill="#14182a"/><circle cx="${x + 3}" cy="${y - 1.5}" r="${r * .2}" fill="#fff"/>
    <g stroke="#24324f" stroke-width="1.6" stroke-linecap="round"><line x1="${x - 4}" y1="${y - r + 1}" x2="${x - 6}" y2="${y - r - 3}"/>
    <line x1="${x}" y1="${y - r}" x2="${x}" y2="${y - r - 4}"/><line x1="${x + 4}" y1="${y - r + 1}" x2="${x + 6}" y2="${y - r - 3}"/></g>`;
  const face = (fill) => `<circle cx="50" cy="50" r="40" fill="${fill}" stroke="#fff" stroke-width="2.5"/>`;

  const THEMES = {
    christmas: {
      name: "کریسمس", hint: "عصای آب‌نباتی و ستاره",
      ring: `<circle cx="50" cy="50" r="50" fill="#fff"/><circle cx="50" cy="50" r="45.5" fill="none" stroke="#d62839" stroke-width="8" stroke-dasharray="7.147 7.147"/>${face("#fff8ee")}`,
      back: "",
      top: star(50, -6, 13, "#f6c90e", "#d99a00"),
      hand: "#a4161a", dot: "#f4c430",
    },
    pup: {
      name: "توله‌سگ آبی", hint: "برای کسی که بلویی را دوست دارد",
      back: `<path d="M16 34 L4 -18 Q22 -8 42 14 Z" fill="#3a64a8"/><path d="M18 26 L10 -8 Q22 -2 34 14 Z" fill="#e9c48f"/>
        <path d="M84 34 L96 -18 Q78 -8 58 14 Z" fill="#3a64a8"/><path d="M82 26 L90 -8 Q78 -2 66 14 Z" fill="#e9c48f"/>`,
      ring: `<circle cx="50" cy="50" r="50" fill="#4a7fc1"/>
        <g fill="#e9c48f"><ellipse cx="18" cy="70" rx="6" ry="4"/><ellipse cx="84" cy="28" rx="5" ry="3.4"/><ellipse cx="76" cy="84" rx="4" ry="3"/></g>
        <g fill="#2f5591"><ellipse cx="22" cy="24" rx="5" ry="3.4"/><ellipse cx="88" cy="62" rx="4" ry="3"/></g>${face("#fdf3e0")}`,
      top: `<ellipse cx="50" cy="99" rx="17" ry="9" fill="#e9c48f"/><ellipse cx="50" cy="94" rx="7" ry="5" fill="#1d2433"/><ellipse cx="48" cy="92.5" rx="2" ry="1.2" fill="#fff" opacity=".7"/>`,
      hand: "#2f5591", dot: "#e9c48f",
    },
    truck: {
      name: "ماشین غول‌پیکر", hint: "برای کسی که بلیز را دوست دارد",
      back: "",
      ring: `<circle cx="50" cy="50" r="50" fill="#2b2b2b"/><circle cx="50" cy="50" r="46" fill="none" stroke="#4a4a4a" stroke-width="7" stroke-dasharray="7 4.5"/>
        <circle cx="50" cy="50" r="41.5" fill="none" stroke="#c3cad3" stroke-width="3.5"/>${face("#fff7e6")}`,
      top: `<path d="M30 6 Q24 -10 34 -22 Q34 -10 42 -6 Q40 -20 50 -32 Q52 -16 60 -8 Q62 -18 68 -22 Q76 -8 70 6 Z" fill="#e8481c"/>
        <path d="M36 6 Q32 -6 40 -14 Q41 -4 46 -2 Q46 -14 52 -22 Q54 -10 60 -4 Q62 -12 64 -14 Q70 -4 64 6 Z" fill="#f59a1b"/>
        <path d="M42 6 Q40 -2 46 -8 Q48 0 52 0 Q52 -8 56 -12 Q60 -2 58 6 Z" fill="#ffd23f"/>`,
      hand: "#e8481c", dot: "#ffd23f",
    },
    rescue: {
      name: "سگ‌های نجات", hint: "برای کسی که سگ‌های نگهبان را دوست دارد",
      back: `<path d="M50 -26 L106 -6 L102 66 Q50 122 -2 66 L-6 -6 Z" fill="#1f5fa8" stroke="#f6c90e" stroke-width="4" stroke-linejoin="round"/>`,
      ring: `<circle cx="50" cy="50" r="50" fill="#d62839"/><circle cx="50" cy="50" r="45.5" fill="none" stroke="#fff" stroke-width="2.5" stroke-dasharray="4 3"/>${face("#fff8ee")}`,
      top: `<circle cx="50" cy="-12" r="15" fill="#f6c90e" stroke="#fff" stroke-width="3"/>${paw(50, -11, .95, "#d62839")}`,
      hand: "#1f5fa8", dot: "#f6c90e",
    },
    dino: {
      name: "دایناسور", hint: "مثل دایناسور کوچولوی بازی‌ها",
      back: [-64, -42, -20, 0, 20, 42, 64].map((d) => { const a = (d - 90) * Math.PI / 180, b = 8 * Math.PI / 180;
        const p = (ang, r) => `${(50 + Math.cos(ang) * r).toFixed(1)} ${(50 + Math.sin(ang) * r).toFixed(1)}`;
        return `<path d="M${p(a - b, 46)} L${p(a, 66)} L${p(a + b, 46)} Z" fill="#f2a65a"/>`; }).join(""),
      ring: `<circle cx="50" cy="50" r="50" fill="#7cc08f"/><g fill="#63a777"><ellipse cx="16" cy="66" rx="5" ry="3.5"/><ellipse cx="86" cy="36" rx="4" ry="3"/><ellipse cx="72" cy="88" rx="4.5" ry="3"/><ellipse cx="22" cy="26" rx="3.5" ry="2.5"/></g>${face("#fdf3e0")}`,
      top: `${eye(36, 2, 9)}${eye(64, 2, 9)}`,
      hand: "#24324f", dot: "#f2a65a",
    },
    space: {
      name: "فضا و موشک", hint: "ستاره‌ها و یک موشک",
      back: `${star(-14, 10, 6, "#f6c90e")}${star(112, 30, 5, "#f6c90e")}${star(104, -10, 4, "#fff")}${star(-6, 80, 4, "#fff")}`,
      ring: `<circle cx="50" cy="50" r="50" fill="#23305e"/><g fill="#fff"><circle cx="14" cy="40" r="1.4"/><circle cx="24" cy="16" r="1"/><circle cx="80" cy="14" r="1.3"/><circle cx="90" cy="60" r="1"/><circle cx="70" cy="90" r="1.4"/><circle cx="26" cy="84" r="1"/></g>${face("#fdf6e3")}`,
      top: `<g transform="translate(50 -16) rotate(0)"><path d="M0 -24 Q10 -14 10 4 L-10 4 Q-10 -14 0 -24 Z" fill="#eef1f6" stroke="#9aa3ad" stroke-width="1.2"/>
        <circle cx="0" cy="-8" r="4" fill="#5b9bd5" stroke="#3a64a8" stroke-width="1.2"/><path d="M-10 -2 L-16 8 L-10 6 Z M10 -2 L16 8 L10 6 Z" fill="#d62839"/>
        <path d="M-6 4 Q0 18 6 4 Z" fill="#f59a1b"/><path d="M-3 4 Q0 12 3 4 Z" fill="#ffd23f"/></g>`,
      hand: "#d62839", dot: "#f6c90e",
    },
  };
  /* Whole characters with the clock: drawn around it in the same -30 -40 160 160
     box (the clock is the circle at 50 50, radius 50). The body is behind the
     clock (back), the head, paws and feet in front (top); the head stays above
     y = 6 so the time slice is never covered. tall: needs more room above. */
  const face2 = (cx, cy, k, ink = "#24324f") => `<g transform="translate(${cx} ${cy}) scale(${k})">
    <circle cx="-8" cy="0" r="4.6" fill="#fff"/><circle cx="8" cy="0" r="4.6" fill="#fff"/>
    <circle cx="-7.2" cy="0.6" r="2.8" fill="${ink}"/><circle cx="8.8" cy="0.6" r="2.8" fill="${ink}"/><circle cx="-6.4" cy="-0.6" r="1" fill="#fff"/><circle cx="9.6" cy="-0.6" r="1" fill="#fff"/>
    <ellipse cx="-13" cy="6" rx="3.4" ry="2.2" fill="#f2a0a6" opacity=".75"/><ellipse cx="13" cy="6" rx="3.4" ry="2.2" fill="#f2a0a6" opacity=".75"/></g>`;
  const pawHold = (x, y, fill, shade, flip) => `<g transform="translate(${x} ${y}) scale(${flip ? -1 : 1} 1)">
    <path d="M-16 -18 Q-26 0 -10 10 L-2 4 Q-12 -4 -6 -16 Z" fill="${fill}"/><ellipse cx="0" cy="2" rx="9" ry="11" fill="${fill}"/>
    <path d="M-4 -6 Q2 -4 4 2 M-4 2 Q2 4 4 8" stroke="${shade}" stroke-width="1.6" fill="none" stroke-linecap="round"/></g>`;
  const foot = (x, fill, toe) => `<ellipse cx="${x}" cy="110" rx="13" ry="8" fill="${fill}"/>${[x - 6, x, x + 6].map((t) => `<circle cx="${t}" cy="114" r="2.4" fill="${toe}"/>`).join("")}`;
  Object.assign(THEMES, {
    dinoHug: {
      name: "دایناسور ساعت به بغل", hint: "دایناسور کوچولو ساعت را بغل کرده", tall: true,
      back: `<path d="M92 76 Q118 84 132 104 Q112 102 94 94 Z" fill="#63a777"/>
        ${[[32, -8], [50, -14], [68, -8]].map(([x, y]) => `<path d="M${x - 7} ${y + 8} Q${x} ${y - 12} ${x + 7} ${y + 8} Z" fill="#f2a65a"/>`).join("")}
        <ellipse cx="50" cy="62" rx="58" ry="56" fill="#7cc08f"/>${foot(28, "#63a777", "#f3dcae")}${foot(72, "#63a777", "#f3dcae")}`,
      ring: `<circle cx="50" cy="50" r="50" fill="#f3dcae"/><circle cx="50" cy="50" r="45.5" fill="none" stroke="#63a777" stroke-width="3" stroke-dasharray="5 4"/>${face("#fffaf0")}`,
      top: `<ellipse cx="50" cy="-16" rx="27" ry="22" fill="#7cc08f"/><ellipse cx="50" cy="-6" rx="17" ry="9" fill="#9fd4ab"/>
        ${face2(50, -20, 1.1)}<path d="M43 -4 Q50 2 57 -4" stroke="#24324f" stroke-width="2.4" fill="none" stroke-linecap="round"/>
        <circle cx="45" cy="-9" r="1.2" fill="#4f8c63"/><circle cx="55" cy="-9" r="1.2" fill="#4f8c63"/>
        ${pawHold(2, 52, "#7cc08f", "#4f8c63", false)}${pawHold(98, 52, "#7cc08f", "#4f8c63", true)}`,
      hand: "#24324f", dot: "#f2a65a",
    },
    pupMedal: {
      name: "توله‌سگ با مدال", hint: "یک توله‌سگ ساعت را مثل مدال گردنش انداخته", tall: true,
      back: `<ellipse cx="50" cy="66" rx="54" ry="54" fill="#e8c9a0"/><ellipse cx="50" cy="80" rx="34" ry="34" fill="#f6e6cc"/>
        ${foot(26, "#e8c9a0", "#c9a77c")}${foot(74, "#e8c9a0", "#c9a77c")}
        <path d="M100 74 Q122 64 124 40 Q132 56 120 76 Q110 86 98 84 Z" fill="#c9a77c"/>`,
      ring: `<circle cx="50" cy="50" r="50" fill="#f6c90e"/><circle cx="50" cy="50" r="46" fill="none" stroke="#e0a800" stroke-width="2.5"/>${face("#fffaf0")}`,
      top: `<path d="M30 -2 L50 6 L70 -2 L66 -10 L50 -3 L34 -10 Z" fill="#d62839"/>
        <path d="M24 -36 Q10 -34 12 -10 Q14 2 26 -4 Q28 -20 32 -28 Z" fill="#a9784c"/><path d="M76 -36 Q90 -34 88 -10 Q86 2 74 -4 Q72 -20 68 -28 Z" fill="#a9784c"/>
        <ellipse cx="50" cy="-22" rx="24" ry="20" fill="#e8c9a0"/><ellipse cx="58" cy="-26" rx="8" ry="7" fill="#c9a77c"/>
        <ellipse cx="50" cy="-12" rx="12" ry="8" fill="#f6e6cc"/>${face2(50, -26, 1)}
        <ellipse cx="50" cy="-15" rx="4" ry="3" fill="#24324f"/><path d="M45 -10 Q50 -6 55 -10" stroke="#24324f" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M48 -8 Q50 -2 52 -8" fill="#e7848f"/>`,
      hand: "#d62839", dot: "#e0a800",
    },
    bear: {
      name: "خرس عروسکی", hint: "یک خرس مهربان ساعت را در دست گرفته", tall: true,
      back: `<circle cx="30" cy="-34" r="11" fill="#a0714a"/><circle cx="70" cy="-34" r="11" fill="#a0714a"/><circle cx="30" cy="-34" r="6" fill="#e8b98c"/><circle cx="70" cy="-34" r="6" fill="#e8b98c"/>
        <ellipse cx="50" cy="64" rx="56" ry="54" fill="#a0714a"/>${foot(26, "#8a5f3d", "#e8b98c")}${foot(74, "#8a5f3d", "#e8b98c")}`,
      ring: `<circle cx="50" cy="50" r="50" fill="#e8b98c"/><circle cx="50" cy="50" r="45.5" fill="none" stroke="#a0714a" stroke-width="3" stroke-dasharray="2 4" stroke-linecap="round"/>${face("#fffaf0")}`,
      top: `<ellipse cx="50" cy="-18" rx="27" ry="23" fill="#a0714a"/><ellipse cx="50" cy="-8" rx="13" ry="9" fill="#e8b98c"/>
        ${face2(50, -23, 1.05)}<ellipse cx="50" cy="-11" rx="4.2" ry="3.2" fill="#3a2a20"/><path d="M45 -5 Q50 -1 55 -5" stroke="#3a2a20" stroke-width="2" fill="none" stroke-linecap="round"/>
        ${pawHold(2, 54, "#a0714a", "#6e4a2e", false)}${pawHold(98, 54, "#a0714a", "#6e4a2e", true)}`,
      hand: "#6e4a2e", dot: "#e8b98c",
    },
    robot: {
      name: "ربات مهربان", hint: "ساعت روی شکم یک ربات است", tall: true,
      back: `<rect x="-6" y="6" width="112" height="100" rx="20" fill="#9aa9bd"/><rect x="-6" y="6" width="112" height="16" rx="8" fill="#b8c4d4"/>
        <rect x="22" y="104" width="16" height="12" rx="3" fill="#6f7f95"/><rect x="62" y="104" width="16" height="12" rx="3" fill="#6f7f95"/>
        <path d="M-6 40 Q-24 46 -22 70" stroke="#6f7f95" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M106 40 Q124 46 122 70" stroke="#6f7f95" stroke-width="8" fill="none" stroke-linecap="round"/>
        <circle cx="-22" cy="74" r="7" fill="#f2a65a"/><circle cx="122" cy="74" r="7" fill="#f2a65a"/>`,
      ring: `<circle cx="50" cy="50" r="50" fill="#5b9bd5"/><g fill="#ffd23f"><circle cx="50" cy="5" r="2.4"/><circle cx="95" cy="50" r="2.4"/><circle cx="50" cy="95" r="2.4"/><circle cx="5" cy="50" r="2.4"/></g>${face("#f4f8ff")}`,
      top: `<line x1="50" y1="-36" x2="50" y2="-26" stroke="#6f7f95" stroke-width="3"/><circle cx="50" cy="-38" r="4" fill="#e05545"/>
        <rect x="24" y="-28" width="52" height="34" rx="10" fill="#b8c4d4"/><rect x="30" y="-23" width="40" height="22" rx="7" fill="#24324f"/>
        <circle cx="41" cy="-13" r="4.5" fill="#8fe3ff"/><circle cx="59" cy="-13" r="4.5" fill="#8fe3ff"/><path d="M44 -6 Q50 -3 56 -6" stroke="#8fe3ff" stroke-width="2" fill="none" stroke-linecap="round"/>
        <rect x="18" y="-18" width="6" height="12" rx="2" fill="#6f7f95"/><rect x="76" y="-18" width="6" height="12" rx="2" fill="#6f7f95"/>`,
      hand: "#24324f", dot: "#ffd23f",
    },
  });
  const ORDER = ["christmas", "dinoHug", "pupMedal", "bear", "robot", "pup", "truck", "rescue", "dino", "space"];
  // The whole clock as one picture, for the choices on the parents' page.
  function preview(key) {
    const t = THEMES[key] || THEMES.christmas;
    return `<svg viewBox="-30 -40 160 160">${t.back}${t.ring}<path d="M50 50 L50 10 A40 40 0 1 1 15.4 70 Z" fill="#1e9b4f"/>${t.top}
      <line x1="50" y1="50" x2="50" y2="18" stroke="${t.hand}" stroke-width="4.4" stroke-linecap="round"/><circle cx="50" cy="50" r="7" fill="${t.dot}" stroke="${t.hand}" stroke-width="2"/></svg>`;
  }
  window.CLOCK_THEMES = { THEMES, ORDER, preview };
})();
