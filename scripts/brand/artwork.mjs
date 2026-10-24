export const colors = {
  ink: "#202b27",
  green: "#235c46",
  sage: "#e4eee7",
  paper: "#faf7ef",
  yellow: "#f3d37a",
  white: "#ffffff",
};
const { ink, green, sage, paper, yellow } = colors;

export const group = (body, x = 0, y = 0, scale = 1, angle = 0) =>
  `<g transform="translate(${x} ${y}) scale(${scale}) rotate(${angle})">${body}</g>`;
export const stroke = (
  d,
  color = ink,
  width = 3.2,
  fill = "none",
  extra = "",
) =>
  `<path d="${d}" fill="${fill}" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
export const shape = (d, fill = green) => `<path d="${d}" fill="${fill}"/>`;
export const circle = (x, y, r, fill = "none", color = ink, width = 3.2) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${color}" stroke-width="${width}"/>`;
export const check = (x, y, scale = 1) =>
  group(stroke("M0 9Q5 13 8 17Q15 6 25 0", green, 4), x, y, scale);

export function sheet({
  lines = 3,
  checked = false,
  tint = false,
  revised = false,
} = {}) {
  let body = stroke(
    "M5 8Q4 2 12 3L113 1L143 30L145 180Q145 186 138 186L7 184Q0 184 1 177Z",
    ink,
    3.2,
    tint ? sage : paper,
  );
  body += stroke("M113 2L113 24Q113 31 121 30L142 30", green, 2.7);
  body += stroke("M23 44Q48 42 81 44", green, 4.2);
  for (let i = 0; i < lines; i++) {
    const y = 70 + i * 27;
    if (checked) {
      body += stroke(
        `M22 ${y - 6}L35 ${y - 6}L35 ${y + 7}L22 ${y + 7}Z`,
        green,
        2.2,
      );
      if (i < 2) body += check(22, y - 8, 0.6);
      body += stroke(
        `M48 ${y}Q72 ${y - 2} ${i === lines - 1 ? 89 : 117} ${y}`,
        ink,
        2.3,
      );
    } else
      body += stroke(
        `M23 ${y}Q62 ${y - 2} ${i === lines - 1 ? 88 : 119} ${y + 1}`,
        ink,
        2.3,
      );
  }
  if (revised) {
    body += stroke(
      "M46 123Q75 111 111 120Q125 130 108 141Q72 148 40 138Q30 130 46 123Z",
      green,
      2.4,
    );
    body += stroke("M118 130Q143 133 153 118", green, 2.2);
  }
  return body;
}

export function pencil() {
  return (
    stroke("M0 16L145 16Q153 23 145 30L0 30L-27 23Z", ink, 2.6, yellow) +
    stroke("M0 16L0 30M131 17L131 29M8 22L125 22", ink, 1.8) +
    shape("M-27 23L-16 19L-16 27Z", ink)
  );
}

export function notebook() {
  return (
    stroke(
      "M0 20Q46 3 102 19Q160 3 206 18L205 179Q161 165 103 184Q49 166 0 181Z",
      green,
      3.2,
      sage,
    ) +
    stroke(
      "M7 11Q50 -3 104 15Q158 -3 200 9L198 168Q153 153 104 174Q55 155 7 171Z",
      ink,
      3.2,
      paper,
    ) +
    stroke("M104 15Q99 84 104 174", green, 2.4) +
    [43, 66, 89, 112]
      .map((y, i) =>
        stroke(
          `M23 ${y}Q51 ${y - 3} ${i === 3 ? 64 : 84} ${y + 1}M123 ${y}Q151 ${y - 4} ${i === 3 ? 170 : 182} ${y}`,
          ink,
          2.2,
        ),
      )
      .join("")
  );
}

export function folder({ packed = false, small = false } = {}) {
  let body = stroke(
    "M0 40L0 15Q0 7 9 8L77 8L96 26L204 25Q213 25 213 35L211 165Q211 173 202 173L10 174Q1 174 0 165Z",
    green,
    3.2,
    sage,
  );
  if (packed) {
    body += group(sheet({ lines: small ? 1 : 3 }), 37, -53, 0.72, -5);
    body += group(
      sheet({ checked: true, lines: small ? 1 : 3 }),
      75,
      -35,
      0.72,
      6,
    );
  }
  body += stroke(
    "M-4 72Q-4 64 5 64L211 61Q221 61 219 72L207 169Q207 176 199 176L10 176Q3 176 2 169Z",
    ink,
    3.2,
    paper,
  );
  body += stroke("M30 94Q63 91 89 93", green, 3.3);
  return body;
}

export function envelope({ message = true } = {}) {
  let body = stroke("M0 48L105 -19L211 48L207 180L5 181Z", green, 3.2, sage);
  if (message) body += group(sheet({ lines: 3 }), 49, -45, 0.77);
  body += stroke("M0 48L104 115L211 48L207 180L5 181Z", ink, 3.2, paper);
  body += stroke("M5 177L76 103M206 177L133 103", green, 2.4);
  return body;
}

export const bubble = (question = false) => {
  let body = stroke(
    "M9 15Q25 -3 72 0Q125 -2 142 20Q154 39 143 68Q131 89 80 88L43 112L45 85Q8 83 1 59Q-5 34 9 15Z",
    ink,
    3.2,
    question ? sage : paper,
  );
  if (question)
    body += stroke(
      "M59 30Q63 14 80 18Q98 23 88 36Q76 46 76 54M76 67L76 69",
      green,
      4.8,
    );
  else
    body += stroke(
      "M30 29Q60 25 112 29M30 45Q67 43 111 46M30 62L84 61",
      green,
      2.8,
    );
  return body;
};

export const arrow = (variant = "curved") =>
  ({
    curved: stroke(
      "M5 58C48 -5 119 -8 173 38M154 34L174 39L168 18",
      green,
      3.2,
    ),
    long: stroke(
      "M3 57C67 -12 153 107 245 24M222 24L247 22L243 47",
      green,
      3.2,
    ),
    return: stroke("M146 20C190 92 30 106 32 37M18 49L31 34L46 48", green, 3.2),
    down: stroke("M25 4C14 42 48 63 32 117M20 102L31 120L45 106", green, 3.2),
    diagonal: stroke("M10 106Q73 71 119 9M98 16L122 5L119 29", green, 3.2),
    loop: stroke(
      "M6 58C57 -3 110 13 96 48C76 90 35 13 136 22M118 12L139 22L121 34",
      green,
      3.2,
    ),
  })[variant];

function paperclip() {
  return stroke(
    "M44 17L14 82C2 108 29 120 41 94L74 25C88 -7 51 -19 37 9L4 79",
    green,
    4,
  );
}
function magnifier() {
  return (
    circle(42, 42, 40, paper, green, 5) +
    stroke(
      "M71 72L111 112Q121 119 113 126Q106 132 98 123L61 84",
      ink,
      3.4,
      yellow,
    ) +
    stroke("M23 27Q31 16 44 17", green, 2.3)
  );
}
function key() {
  return (
    stroke(
      "M61 35C61 75 1 74 1 35C1 -4 61 -3 61 35ZM54 54L113 113L128 99L119 90L129 80L112 63L102 72L72 42",
      ink,
      3.2,
      sage,
    ) + circle(24, 27, 8, paper, green, 2.4)
  );
}
const ground = (d = "M102 390Q310 401 542 389") => stroke(d, green, 1.8);
const marginLines = () => stroke("M0 0L17 5M2 16L15 16M2 32L18 26", green, 2.5);

export const artwork = [
  {
    id: "I01",
    name: "hero-planning",
    title: "Dari brief menjadi rencana",
    width: 1536,
    height: 1024,
    viewBox: "0 0 1024 680",
    body: () =>
      group(sheet({ lines: 4 }), 145, 228, 1.38, -10) +
      group(
        stroke(
          "M25 61C55 0 126 87 153 48C186 4 111 10 114 42C121 101 260 54 304 60M285 47L306 60L284 70",
          green,
          3.6,
        ),
        357,
        223,
        1.05,
      ) +
      group(folder({ packed: true }), 635, 294, 1.18, 5) +
      group(pencil(), 230, 498, 1.15, -24) +
      group(paperclip(), 185, 189, 0.5, -19) +
      group(
        stroke("M4 20Q18 7 37 12Q53 18 39 31Q19 46 4 20Z", ink, 2.5, yellow),
        481,
        411,
        1.2,
        -9,
      ) +
      group(marginLines(), 919, 252, 0.9, -5) +
      ground("M128 550Q535 567 911 546"),
    prompt:
      "An informal handwritten brief gradually becomes a neatly organized set of planning documents. Connect them with one flowing hand-drawn line. Include a pencil and folded page corners. Airy horizontal composition.",
    usage: ["/"],
  },
  {
    id: "I02",
    name: "hero-planning-mobile",
    title: "Rencana dalam susunan ringkas",
    width: 1024,
    height: 1024,
    viewBox: "0 0 640 640",
    body: () =>
      group(sheet({ lines: 3 }), 119, 74, 0.94, -10) +
      group(arrow("down"), 361, 174, 0.8, -14) +
      group(folder({ packed: true }), 258, 353, 1.07, 5) +
      group(pencil(), 129, 474, 0.72, -42) +
      ground("M96 571Q324 581 525 568"),
    prompt:
      "Recompose the desktop hero into a compact square arrangement. Place the brief above the organized document set. Preserve the same objects and drawing style. Keep generous outer margins.",
    usage: ["/"],
  },
  {
    id: "I03",
    name: "workflow-brief",
    title: "Tulis brief",
    width: 768,
    height: 768,
    body: () =>
      group(notebook(), 141, 137, 1.4, -5) +
      group(pencil(), 331, 350, 0.9, -51) +
      group(
        stroke("M0 0L62 0L64 46L0 48Z", green, 2.6, yellow) +
          stroke("M12 17L45 16M12 29L35 29", ink, 2),
        108,
        104,
        0.8,
        -12,
      ) +
      ground(),
    prompt:
      "An open notebook with abstract line marks, a pencil, and a small loose note. One clear focal object suggests an idea being clarified.",
    usage: ["/", "#cara-kerja"],
  },
  {
    id: "I04",
    name: "workflow-review",
    title: "Periksa pilihan dokumen",
    width: 768,
    height: 768,
    body: () =>
      group(sheet({ tint: true }), 180, 126, 1.1, -12) +
      group(sheet({ checked: true }), 289, 101, 1.22, 8) +
      group(pencil(), 196, 363, 0.7, -18) +
      ground(),
    prompt:
      "A small group of planning sheets with checkboxes and section lines. One sheet is pulled forward for review. Show deliberate selection and organization.",
    usage: ["/", "#cara-kerja"],
  },
  {
    id: "I05",
    name: "workflow-export",
    title: "Bawa rencana ke pengerjaan",
    width: 768,
    height: 768,
    body: () =>
      group(folder({ packed: true }), 179, 189, 1.15, -3) +
      group(
        stroke("M0 0L0 68M-17 52L0 70L17 52M-24 89L23 89", green, 4),
        482,
        181,
        0.8,
      ) +
      ground(),
    prompt:
      "A tidy folder containing planning documents and one small downward export arrow. The documents remain the focal point. Compact balanced composition.",
    usage: ["/", "CTA"],
  },
  {
    id: "I06",
    name: "feature-revisions",
    title: "Tinjau perubahan",
    width: 1024,
    height: 768,
    body: () =>
      group(sheet(), 132, 128, 1.15, -5) +
      group(sheet({ revised: true, checked: true }), 363, 115, 1.15, 6) +
      group(arrow("curved"), 291, 104, 0.44, 15) +
      group(pencil(), 285, 375, 0.75, -19) +
      ground(),
    prompt:
      "Two versions of a planning sheet side by side, with a curved connecting line and a few revised marks. A pencil annotation makes comparison the main idea.",
    usage: ["/", "/pricing"],
  },
  {
    id: "I07",
    name: "feature-projects",
    title: "Kelola beberapa rencana",
    width: 1024,
    height: 768,
    body: () =>
      group(folder(), 106, 117, 0.7, -8) +
      group(folder(), 387, 125, 0.67, 9) +
      group(sheet({ checked: true }), 261, 218, 0.86, -2) +
      stroke("M220 230Q232 243 253 248M390 256Q418 253 429 235", green, 2.5) +
      ground(),
    prompt:
      "Distinct project folders arranged around one reusable planning sheet. Restrained connecting lines suggest reuse across projects. Sparse orderly composition.",
    usage: ["/", "/pricing"],
  },
  {
    id: "I08",
    name: "pricing-documents",
    title: "Ruang untuk setiap proyek",
    width: 1024,
    height: 768,
    body: () =>
      group(sheet({ tint: true }), 131, 142, 0.9, -12) +
      group(folder(), 356, 177, 0.82, 10) +
      group(folder({ packed: true }), 229, 233, 0.98, -2) +
      ground(),
    prompt:
      "Overlapping planning documents and folders with different capacities, supported by a quiet baseline. Communicate increasing room for project planning with equal visual dignity.",
    usage: ["/pricing"],
  },
  {
    id: "I09",
    name: "terms-document",
    title: "Ketentuan layanan",
    width: 512,
    height: 512,
    body: () =>
      group(sheet({ lines: 4 }), 238, 115, 1.2, 3) +
      group(
        stroke("M0 0L30 0L30 25L0 25", green, 2.5, sage) +
          stroke("M0 36L24 36L24 61L0 61", ink, 2.5, yellow),
        408,
        166,
      ) +
      group(pencil(), 169, 342, 0.78, -28),
    prompt:
      "An agreement document with simple section tabs, a folded corner, and one quiet pencil annotation. Calm editorial composition for a long reading page.",
    usage: ["/terms"],
  },
  {
    id: "I10",
    name: "privacy-folder",
    title: "Penanganan data pribadi",
    width: 512,
    height: 512,
    body: () =>
      group(folder(), 172, 174, 1.15, -4) +
      group(
        stroke("M0 0L25 0L25 67Q12 78 0 67Z", green, 2.6, sage) +
          circle(12, 56, 3, green, green, 1),
        290,
        245,
        1,
        -4,
      ) +
      group(sheet({ lines: 2 }), 401, 251, 0.43, 12),
    prompt:
      "A closed document folder with a simple fastening tab and a small information sheet beside it. Communicate careful everyday handling of personal documents.",
    usage: ["/privacy"],
  },
  {
    id: "I11",
    name: "faq-conversation",
    title: "Pertanyaan dan jawaban",
    width: 768,
    height: 768,
    body: () =>
      group(bubble(true), 129, 115, 1.45, -5) +
      group(bubble(), 328, 218, 1.25, 6),
    prompt:
      "Two hand-drawn conversation bubbles. One contains a question mark; the other contains short abstract answer lines. Friendly, clear, and balanced.",
    usage: ["/faq"],
  },
  {
    id: "I12",
    name: "refund-receipt",
    title: "Pemeriksaan pengembalian dana",
    width: 512,
    height: 512,
    body: () =>
      group(
        stroke(
          "M0 0L136 0L136 189L122 179L108 189L94 179L80 189L66 179L52 189L38 179L24 189L10 179L0 189Z",
          ink,
          3.2,
          paper,
        ) +
          stroke(
            "M25 32L108 32M25 61L110 61M25 88L85 88M25 127L110 127M74 150L109 150",
            green,
            2.8,
          ),
        258,
        130,
        1,
        7,
      ) + group(arrow("return"), 154, 225, 1, -46),
    prompt:
      "A plain transaction receipt with abstract line marks and one returning curved arrow. Calm composition without currency symbols or approval stamps.",
    usage: ["/refund"],
  },
  {
    id: "I13",
    name: "disclaimer-review",
    title: "Periksa sebelum digunakan",
    width: 512,
    height: 512,
    body: () =>
      group(sheet({ revised: true }), 211, 119, 1.12, -6) +
      group(magnifier(), 345, 232, 0.85, -7) +
      group(pencil(), 167, 356, 0.65, -18),
    prompt:
      "A planning document inspected through a small magnifying glass with a pencil annotation in the margin. Communicate reviewing assumptions before use.",
    usage: ["/disclaimer"],
  },
  {
    id: "I14",
    name: "cookies-browser",
    title: "Cookie sesi browser",
    width: 512,
    height: 512,
    body: () =>
      group(
        stroke(
          "M0 14Q0 0 15 0L248 3Q260 3 260 16L257 178Q257 191 243 190L14 190Q0 190 0 177Z",
          ink,
          3.2,
          paper,
        ) +
          stroke("M1 34L258 37", green, 2.5) +
          [17, 30, 43]
            .map((x) => circle(x, 18, 2.5, green, green, 1))
            .join("") +
          stroke("M33 68L95 68L95 117L33 117Z", green, 2.5, sage) +
          stroke("M115 69L218 69M115 91L216 91M115 113L175 113", green, 2.2) +
          stroke("M164 148L225 148L225 186L164 186Z", ink, 2.5, yellow),
        177,
        138,
        1,
        -3,
      ) +
      group(stroke("M0 0L49 0L49 38L0 38Z", green, 2.5, sage), 452, 325, 1, 7),
    prompt:
      "A browser frame with a few small rounded data tiles. One tile sits beside the frame to suggest a remembered session. A clear editorial metaphor with little detail.",
    usage: ["/cookies"],
  },
  {
    id: "I15",
    name: "contact-message",
    title: "Hubungi pengelola",
    width: 768,
    height: 768,
    body: () =>
      group(envelope(), 162, 195, 1.25, -6) +
      group(bubble(), 411, 119, 0.75, 9),
    prompt:
      "An open envelope holding one message sheet, with a small conversation bubble beside it. Welcoming and practical with generous empty space.",
    usage: ["/contact"],
  },
  {
    id: "I16",
    name: "auth-notebook",
    title: "Mulai merencanakan",
    width: 1024,
    height: 1024,
    body: () =>
      group(sheet({ tint: true, lines: 2 }), 344, 90, 0.72, 9) +
      group(notebook(), 133, 178, 1.55, -7) +
      group(pencil(), 360, 366, 0.98, -43),
    prompt:
      "An open project notebook with a pencil along its edge and a folded planning sheet tucked inside. A welcoming starting point for organizing a website idea.",
    usage: ["/login", "/signup"],
  },
  {
    id: "I17",
    name: "auth-email",
    title: "Periksa email Anda",
    width: 512,
    height: 512,
    body: () =>
      group(envelope(), 199, 206, 1.1, -4) +
      stroke("M430 166Q463 144 477 164M449 178L480 169L466 148", green, 3),
    prompt:
      "A message sheet emerging from an open envelope, with a small directional line suggesting delivery. Neutral illustration suitable while verification is pending.",
    usage: ["/verify-email", "/signup"],
  },
  {
    id: "I18",
    name: "auth-recovery",
    title: "Pulihkan akses akun",
    width: 512,
    height: 512,
    body: () =>
      group(sheet({ lines: 3, tint: true }), 295, 123, 1.05, 7) +
      group(key(), 178, 242, 1, -17) +
      group(arrow("return"), 194, 127, 0.65, -5),
    prompt:
      "A rounded key next to an account notebook, connected by a gentle return curve. Clear shapes, minimal detail, and a calm recovery mood.",
    usage: ["/forgot-password", "/reset-password"],
  },
  {
    id: "I19",
    name: "public-not-found",
    title: "Halaman belum ditemukan",
    width: 768,
    height: 768,
    body: () =>
      stroke(
        "M117 374C89 301 254 367 220 277C195 219 328 188 387 220",
        green,
        3,
        "none",
        'stroke-dasharray="3 12"',
      ) +
      group(sheet({ lines: 2 }), 381, 148, 0.8, 11) +
      group(
        stroke("M0 0L48 0L65 17L48 34L0 34Z", ink, 2.7, yellow) +
          stroke("M17 35L14 85", green, 3),
        136,
        215,
        0.8,
        -7,
      ),
    prompt:
      "A loose planning sheet at the end of a short wandering dotted path, with a small direction sign. Lighthearted and restrained. Leave room for the real error message outside the image.",
    usage: ["public 404"],
  },
  {
    id: "I20",
    name: "public-error",
    title: "Proses perlu dilanjutkan",
    width: 768,
    height: 768,
    body: () =>
      group(sheet({ tint: true }), 194, 136, 1, -11) +
      group(sheet({ lines: 2 }), 317, 122, 0.98, 8) +
      group(pencil(), 183, 359, 1.1, -3) +
      stroke(
        "M151 140Q127 157 129 183M117 193L132 196M153 122L145 114",
        green,
        2.8,
      ),
    prompt:
      "A pencil resting beside a partly organized document stack, with a small interrupted joining line. Suggest a temporary interruption. Calm and simple composition.",
    usage: ["public error"],
  },
];

export const ornaments = [
  ...["curved", "long", "return", "down", "diagonal", "loop"].map((name) => ({
    id: "D01",
    name: `arrow-${name}`,
    title: `Panah ${name}`,
    viewBox: "-12 -20 280 170",
    body: () => arrow(name),
    prompt: `A separate hand-drawn ${name} directional arrow with a clear arrowhead and rounded strokes.`,
  })),
  {
    id: "D02",
    name: "emphasis-underline",
    title: "Garis bawah",
    viewBox: "0 0 300 54",
    body: () => stroke("M9 31Q107 17 287 29", green, 4),
    prompt: "A single airy hand-drawn underline for live text.",
  },
  {
    id: "D02",
    name: "emphasis-double",
    title: "Garis bawah ganda",
    viewBox: "0 0 300 64",
    body: () => stroke("M9 25Q117 13 286 22M31 43Q159 31 268 39", green, 3.4),
    prompt: "Two airy hand-drawn underlines for live text.",
  },
  {
    id: "D02",
    name: "emphasis-oval",
    title: "Lingkaran penekanan",
    viewBox: "0 0 320 116",
    body: () =>
      stroke(
        "M40 29C91 -1 273 5 301 48C335 116 19 129 13 70C9 52 24 43 41 40",
        green,
        3.4,
      ),
    prompt: "An open hand-drawn oval with enough room to surround live text.",
  },
  {
    id: "D02",
    name: "emphasis-brackets",
    title: "Kurung penekanan",
    viewBox: "0 0 320 112",
    body: () =>
      stroke(
        "M35 11L14 15L17 95L40 99M283 11L304 16L302 94L280 99",
        green,
        3.4,
      ),
    prompt: "A pair of loose hand-drawn brackets for live text.",
  },
  {
    id: "D03",
    name: "paperclip",
    title: "Klip kertas",
    viewBox: "-14 -18 110 150",
    body: paperclip,
    prompt: "An isolated paperclip in controlled green ink.",
  },
  {
    id: "D03",
    name: "folded-corner",
    title: "Lipatan kertas",
    viewBox: "0 0 128 128",
    body: () =>
      stroke("M12 12L64 12L114 62L114 113L12 113Z", ink, 3, paper) +
      stroke("M64 12L63 62L114 62", green, 2.5, sage),
    prompt: "An isolated folded page corner with a pale sage fold.",
  },
  {
    id: "D03",
    name: "binder-clip",
    title: "Penjepit dokumen",
    viewBox: "0 0 128 144",
    body: () =>
      stroke("M30 70L97 70L112 125L16 125Z", ink, 3, sage) +
      stroke(
        "M42 71L38 31Q38 10 52 10L73 10Q90 10 87 31L83 71M51 70L49 33L76 33L74 70",
        green,
        3,
      ),
    prompt: "A simple binder clip with clean hand-drawn handles.",
  },
  {
    id: "D03",
    name: "paper-tape",
    title: "Pita kertas",
    viewBox: "0 0 220 100",
    body: () =>
      stroke(
        "M22 21L204 12L198 29L207 40L196 55L203 73L14 84L22 67L12 53L24 38Z",
        green,
        2.4,
        yellow,
      ),
    prompt: "A short strip of muted yellow paper tape with lightly torn edges.",
  },
  {
    id: "D04",
    name: "corner-top",
    title: "Ornamen sudut atas",
    viewBox: "0 0 160 160",
    body: () =>
      group(sheet({ lines: 1 }), 57, 44, 0.45, -12) +
      stroke("M16 105Q10 62 46 27M24 35L48 23L43 48", green, 2.5),
    prompt:
      "A folded sheet edge and one loose pencil stroke for a document-header corner.",
  },
  {
    id: "D04",
    name: "corner-bottom",
    title: "Ornamen sudut bawah",
    viewBox: "0 0 160 160",
    body: () =>
      group(pencil(), 42, 122, 0.55, -43) +
      stroke("M61 129Q125 147 142 91", green, 2.5),
    prompt:
      "A small pencil and one quiet curved line for a document-header corner.",
  },
  {
    id: "D06",
    name: "divider-line",
    title: "Pemisah garis",
    viewBox: "0 0 600 44",
    body: () => stroke("M8 23Q198 15 308 22T590 20", green, 2),
    prompt: "A quiet gently uneven horizontal editorial separator.",
  },
  {
    id: "D06",
    name: "divider-dashed",
    title: "Pemisah putus-putus",
    viewBox: "0 0 600 44",
    body: () =>
      stroke(
        "M8 22Q219 17 589 22",
        green,
        2,
        "none",
        'stroke-dasharray="7 10"',
      ),
    prompt: "A quiet short-dashed editorial separator.",
  },
  {
    id: "D06",
    name: "divider-paper",
    title: "Pemisah dokumen",
    viewBox: "0 0 600 72",
    body: () =>
      stroke("M8 39L266 37M331 37L590 39", green, 2) +
      group(sheet({ lines: 1 }), 285, 12, 0.23, -5),
    prompt:
      "A quiet horizontal separator interrupted by a tiny folded-paper shape.",
  },
  {
    id: "D07",
    name: "plan-free",
    title: "Paket Free",
    viewBox: "0 0 256 256",
    body: () => group(sheet({ lines: 2 }), 72, 37, 0.78, -5),
    prompt:
      "One simple planning sheet with a folded corner and abstract content lines.",
  },
  {
    id: "D08",
    name: "plan-starter",
    title: "Pro Starter",
    viewBox: "0 0 256 256",
    body: () => group(folder({ packed: true, small: true }), 43, 103, 0.78, -3),
    prompt: "One planning folder holding a compact document set.",
  },
  {
    id: "D09",
    name: "plan-plus",
    title: "Pro Plus",
    viewBox: "0 0 256 256",
    body: () =>
      group(sheet({ tint: true, lines: 2 }), 51, 47, 0.69, -9) +
      group(sheet({ revised: true, lines: 2 }), 121, 50, 0.68, 7),
    prompt:
      "Two overlapping planning sheets with a small revision mark and connecting curve.",
  },
  {
    id: "D10",
    name: "plan-max",
    title: "Pro Max",
    viewBox: "0 0 256 256",
    body: () =>
      group(folder(), 46, 59, 0.64, -6) +
      group(folder(), 68, 110, 0.64, 4) +
      group(sheet({ checked: true, lines: 1 }), 143, 60, 0.48, 5),
    prompt:
      "A compact orderly group of project folders with one reusable document tab.",
  },
];

export function symbol(color = green, micro = false, alternate = false) {
  if (alternate)
    return shape(
      "M12 6H38L53 21V47Q53 60 39 60H12ZM23 20V49H37Q43 49 43 41Q43 33 36 33H31V23H40L34 17H23Z",
      color,
    );
  const outer = micro
    ? "M10 6H32L49 20V25Q49 31 43 34Q54 37 54 46Q54 59 37 59H10Z"
    : "M10 6H32L49 20V24Q49 31 42 34Q54 37 54 46Q54 59 37 59H10Z";
  const holes = micro
    ? "M22 18V29H31Q37 29 37 24Q37 18 31 18ZM22 39V48H35Q42 48 42 44Q42 39 35 39Z"
    : "M22 18V29H31Q37 29 37 23Q37 18 31 18ZM22 39V48H35Q42 48 42 44Q42 39 35 39Z";
  return `<path d="${outer}${holes}" fill="${color}" fill-rule="evenodd"/>`;
}
