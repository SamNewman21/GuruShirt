export interface SampleMotif {
  id: string;
  name: string;
  category: string;
  src: string;
}

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const SAMPLE_MOTIFS: SampleMotif[] = [
  {
    id: "guru-crest",
    name: "Guru Streetwear Crest",
    category: "Emblems",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <defs>
          <linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#ff5e62"/>
            <stop offset="50%" stop-color="#ff9966"/>
            <stop offset="100%" stop-color="#6366f1"/>
          </linearGradient>
        </defs>
        <circle cx="200" cy="200" r="175" fill="none" stroke="url(#g1)" stroke-width="16"/>
        <circle cx="200" cy="200" r="145" fill="#111318" stroke="#ffffff" stroke-width="4" stroke-dasharray="12 8"/>
        <polygon points="200,55 236,145 332,152 258,214 282,308 200,256 118,308 142,214 68,152 164,145" fill="url(#g1)"/>
        <circle cx="200" cy="200" r="52" fill="#111318" stroke="#ffffff" stroke-width="6"/>
        <text x="200" y="212" font-family="Arial Black, Impact, sans-serif" font-size="32" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">GURU</text>
        <text x="200" y="345" font-family="Arial, sans-serif" font-size="18" font-weight="800" fill="#ffffff" text-anchor="middle" letter-spacing="6">EST. 2026</text>
      </svg>
    `),
  },
  {
    id: "cyber-tiger",
    name: "Neo Tokyo Acid Sun",
    category: "Graphics",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <rect x="30" y="30" width="340" height="340" rx="28" fill="#0f172a" stroke="#38bdf8" stroke-width="8"/>
        <circle cx="200" cy="175" r="95" fill="#f43f5e"/>
        <rect x="75" y="190" width="250" height="10" fill="#0f172a"/>
        <rect x="75" y="212" width="250" height="14" fill="#0f172a"/>
        <rect x="75" y="238" width="250" height="18" fill="#0f172a"/>
        <polygon points="85,295 200,135 315,295" fill="#facc15" stroke="#0f172a" stroke-width="10" stroke-linejoin="round"/>
        <circle cx="200" cy="235" r="24" fill="#0f172a"/>
        <text x="200" y="342" font-family="Impact, Arial Black, sans-serif" font-size="38" fill="#38bdf8" text-anchor="middle" letter-spacing="5">ARCHIVE // 01</text>
      </svg>
    `),
  },
  {
    id: "heavy-type",
    name: "Heavyweight Studio Type",
    category: "Typography",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 300" width="500" height="300">
        <rect x="15" y="15" width="470" height="270" fill="none" stroke="#ffffff" stroke-width="8"/>
        <rect x="30" y="30" width="440" height="85" fill="#ffffff"/>
        <text x="250" y="92" font-family="Impact, Arial Black, sans-serif" font-size="66" font-weight="900" fill="#000000" text-anchor="middle" letter-spacing="6">GURUSHIRT</text>
        <text x="250" y="175" font-family="Arial Black, sans-serif" font-size="36" font-weight="900" fill="#a855f7" text-anchor="middle" letter-spacing="4">3D GARMENT LAB</text>
        <line x1="50" y1="205" x2="450" y2="205" stroke="#ffffff" stroke-width="4"/>
        <text x="250" y="248" font-family="Courier New, monospace" font-size="22" font-weight="700" fill="#34d399" text-anchor="middle" letter-spacing="3">CUT &amp; SEW SPEC // 450 GSM</text>
      </svg>
    `),
  },
  {
    id: "chrome-star",
    name: "Y2K Tribal Star",
    category: "Motifs",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400">
        <path d="M200,15 L235,155 L385,200 L235,245 L200,385 L165,245 L15,200 L165,155 Z" fill="#ec4899" stroke="#ffffff" stroke-width="10"/>
        <path d="M200,75 L220,170 L325,200 L220,230 L200,325 L180,230 L75,200 L180,170 Z" fill="#111827"/>
        <circle cx="200" cy="200" r="22" fill="#ffffff"/>
      </svg>
    `),
  },
  {
    id: "checker-flame",
    name: "Motorsport Badge",
    category: "Badges",
    src: svgToDataUrl(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 450 300" width="450" height="300">
        <polygon points="40,40 410,40 380,260 70,260" fill="#ef4444" stroke="#ffffff" stroke-width="10"/>
        <polygon points="65,65 385,65 362,235 88,235" fill="#18181b"/>
        <text x="225" y="155" font-family="Impact, Arial Black, sans-serif" font-size="64" font-style="italic" fill="#facc15" text-anchor="middle" letter-spacing="4">TURBO 99</text>
        <text x="225" y="205" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="8">FACTORY RACING</text>
      </svg>
    `),
  },
];
