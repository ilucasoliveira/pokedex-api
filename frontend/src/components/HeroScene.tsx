import styles from './HeroScene.module.css'

// Ilustração do hero: trilha dourada atravessando colinas até a placa da Rota 151.
// Desenhada aqui (sem personagens Pokémon), só com as cores do kit. Decorativa.
export function HeroScene() {
  return (
    <svg
      className={styles.scene}
      viewBox="0 0 640 380"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6CB6E8" />
          <stop offset="70%" stopColor="#CFE8F7" />
          <stop offset="100%" stopColor="#FDF6E9" />
        </linearGradient>
        <radialGradient id="sol" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#FFF4CC" />
          <stop offset="60%" stopColor="#F3C95B" />
          <stop offset="100%" stopColor="#E0A932" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="640" height="380" fill="url(#ceu)" />
      <circle cx="510" cy="92" r="70" fill="url(#sol)" />
      <circle cx="510" cy="92" r="30" fill="#FBE3A1" />

      <g className={styles.clouds} fill="#FFFFFF">
        <g className={styles.cloudSlow} opacity="0.95">
          <ellipse cx="120" cy="78" rx="46" ry="16" />
          <ellipse cx="150" cy="68" rx="30" ry="18" />
          <ellipse cx="95" cy="70" rx="22" ry="12" />
        </g>
        <g className={styles.cloudFast} opacity="0.8">
          <ellipse cx="330" cy="52" rx="38" ry="12" />
          <ellipse cx="352" cy="44" rx="22" ry="13" />
        </g>
      </g>

      {/* Montanhas ao fundo */}
      <path d="M0 236 L92 140 L150 196 L236 104 L318 190 L392 128 L470 200 L560 116 L640 186 L640 280 L0 280Z" fill="#8C7158" opacity="0.55" />
      <path d="M236 104 L214 128 L230 124 L244 134 L258 122 Z M560 116 L540 138 L556 134 L570 142 L584 132Z" fill="#FDF6E9" opacity="0.9" />
      <path d="M0 262 L70 204 L140 244 L214 176 L300 246 L380 196 L452 244 L540 190 L640 238 L640 300 L0 300Z" fill="#6B4E37" opacity="0.85" />

      {/* Colinas */}
      <path d="M0 282 C90 246 170 262 250 278 C340 296 420 250 520 258 C580 262 620 274 640 280 L640 380 L0 380Z" fill="#4F9A52" />
      <path d="M0 318 C110 288 210 300 300 318 C400 338 500 300 640 312 L640 380 L0 380Z" fill="#2E7D32" />

      {/* Árvores */}
      <g fill="#245E28">
        <path d="M44 300 l14 -34 l14 34 Z M38 312 l20 -40 l20 40 Z" />
        <path d="M92 292 l12 -30 l12 30 Z M88 304 l16 -36 l16 36 Z" />
        <path d="M560 296 l14 -34 l14 34 Z M554 308 l20 -40 l20 40 Z" />
        <path d="M600 304 l12 -28 l12 28 Z" />
        <path d="M470 286 l10 -24 l10 24 Z" />
      </g>
      <g fill="#6B4E37">
        <rect x="56" y="312" width="4" height="8" />
        <rect x="102" y="304" width="4" height="8" />
        <rect x="572" y="308" width="4" height="8" />
      </g>

      {/* Trilha dourada, do primeiro plano até a placa */}
      <path
        d="M300 380 C292 352 352 340 340 316 C330 296 270 300 280 280 C288 264 346 266 372 258"
        fill="none"
        stroke="#E0A932"
        strokeWidth="18"
        strokeLinecap="round"
      />
      <path
        className={styles.trail}
        d="M300 380 C292 352 352 340 340 316 C330 296 270 300 280 280 C288 264 346 266 372 258"
        fill="none"
        stroke="#FDF6E9"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray="6 10"
      />

      {/* Placa da Rota 151, à direita do marcador */}
      <g transform="translate(52 0)">
        <rect x="392" y="214" width="8" height="66" rx="2" fill="#5A3F2B" />
        <path d="M356 206 h96 l14 15 l-14 15 h-96 Z" fill="#8C6239" stroke="#5A3F2B" strokeWidth="3" />
        <text x="404" y="226" textAnchor="middle" className={styles.signText}>
          ROTA 151
        </text>
      </g>

      {/* Marcador do mapa, como no símbolo da marca */}
      <g className={styles.marker} transform="translate(372 216)">
        <path d="M0 -40 C-14 -40 -24 -30 -24 -17 C-24 -1 -9 12 0 20 C9 12 24 -1 24 -17 C24 -30 14 -40 0 -40Z" fill="#D54E3A" stroke="#1F1F1D" strokeWidth="2.5" />
        <circle cx="0" cy="-18" r="8" fill="#FDF6E9" />
      </g>
    </svg>
  )
}
