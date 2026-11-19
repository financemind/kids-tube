/* A tiny QR code maker, enough for a short link (up to 42 characters):
   QR version 3 (29 x 29), error correction level M, byte mode. It follows
   the QR standard (ISO/IEC 18004) and draws the code as SVG.
   Usage: qrSvg("https://noyantv.com/a?c=7KQ4") -> "<svg ...>" */
(function () {
  const SIZE = 29, DATA_CW = 44, EC_CW = 26;
  // Galois field GF(256) with polynomial 0x11d, for the error-correction codewords.
  const EXP = new Array(512), LOG = new Array(256);
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);

  function codewords(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    if (bytes.length > 42) throw new Error("QR text too long");
    const bits = [];
    const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
    put(4, 4); put(bytes.length, 8); bytes.forEach((b) => put(b, 8));
    for (let i = 0; i < 4 && bits.length < DATA_CW * 8; i++) bits.push(0); // terminator
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(""), 2));
    for (let pad = 0xec; data.length < DATA_CW; pad ^= 0xec ^ 0x11) data.push(pad);
    // Reed-Solomon error correction
    let gen = [1];
    for (let i = 0; i < EC_CW; i++) {
      const next = new Array(gen.length + 1).fill(0);
      gen.forEach((g, j) => { next[j] ^= g; next[j + 1] ^= mul(g, EXP[i]); });
      gen = next;
    }
    const ec = new Array(EC_CW).fill(0);
    for (const d of data) {
      const f = d ^ ec.shift();
      ec.push(0);
      for (let j = 0; j < EC_CW; j++) ec[j] ^= mul(gen[j + 1], f);
    }
    return data.concat(ec);
  }

  const MASKS = [
    (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
    (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
    (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r * c) % 3) + ((r + c) % 2)) % 2 === 0,
  ];

  function build(cw, mask) {
    const m = Array.from({ length: SIZE }, () => new Array(SIZE).fill(null));
    const probe = (row, col) => {
      for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
        if (row + r < 0 || row + r >= SIZE || col + c < 0 || col + c >= SIZE) continue;
        m[row + r][col + c] = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6)) || (r >= 2 && r <= 4 && c >= 2 && c <= 4);
      }
    };
    probe(0, 0); probe(SIZE - 7, 0); probe(0, SIZE - 7);
    for (let r = -2; r <= 2; r++) for (let c = -2; c <= 2; c++) // alignment pattern at (22, 22)
      m[22 + r][22 + c] = r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0);
    for (let i = 8; i < SIZE - 8; i++) { if (m[i][6] === null) m[i][6] = i % 2 === 0; if (m[6][i] === null) m[6][i] = i % 2 === 0; }
    // format information: level M (00) and the mask, BCH-coded
    const data = mask; // (M = 0) << 3 | mask
    let d = data << 10;
    for (let i = 14; i >= 10; i--) if ((d >> i) & 1) d ^= 0x537 << (i - 10);
    const fmt = ((data << 10) | d) ^ 0x5412;
    for (let i = 0; i < 15; i++) {
      const bit = ((fmt >> i) & 1) === 1;
      if (i < 6) m[i][8] = bit; else if (i < 8) m[i + 1][8] = bit; else m[SIZE - 15 + i][8] = bit;
      if (i < 8) m[8][SIZE - i - 1] = bit; else if (i < 9) m[8][15 - i] = bit; else m[8][15 - i - 1] = bit;
    }
    m[SIZE - 8][8] = true; // the dark module
    // data, in the zigzag order
    let inc = -1, row = SIZE - 1, bitIdx = 7, byteIdx = 0;
    for (let col = SIZE - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      for (;;) {
        for (let c = 0; c < 2; c++) {
          if (m[row][col - c] === null) {
            let dark = byteIdx < cw.length && ((cw[byteIdx] >>> bitIdx) & 1) === 1;
            if (MASKS[mask](row, col - c)) dark = !dark;
            m[row][col - c] = dark;
            if (--bitIdx === -1) { byteIdx++; bitIdx = 7; }
          }
        }
        row += inc;
        if (row < 0 || row >= SIZE) { row -= inc; inc = -inc; break; }
      }
    }
    return m;
  }

  function penalty(m) { // standard rules 1, 2 and 4 (enough to pick a good mask)
    let p = 0, dark = 0;
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (m[r][c]) dark++;
        if (r < SIZE - 1 && c < SIZE - 1 && m[r][c] === m[r + 1][c] && m[r][c] === m[r][c + 1] && m[r][c] === m[r + 1][c + 1]) p += 3;
      }
      for (const line of [m[r], m.map((x) => x[r])]) {
        let run = 1;
        for (let i = 1; i <= SIZE; i++) {
          if (i < SIZE && line[i] === line[i - 1]) run++;
          else { if (run >= 5) p += run - 2; run = 1; }
        }
      }
    }
    return p + Math.floor(Math.abs(dark * 100 / (SIZE * SIZE) - 50) / 5) * 10;
  }

  window.qrSvg = function (text, dark = "#1d2b4f") {
    const cw = codewords(text);
    let best = null;
    for (let mask = 0; mask < 8; mask++) {
      const m = build(cw, mask), p = penalty(m);
      if (!best || p < best.p) best = { m, p };
    }
    const q = 4, n = SIZE + q * 2;
    let rects = "";
    best.m.forEach((rowArr, r) => rowArr.forEach((on, c) => { if (on) rects += `M${c + q} ${r + q}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges"><rect width="${n}" height="${n}" fill="#fff"/><path d="${rects}" fill="${dark}"/></svg>`;
  };
})();
