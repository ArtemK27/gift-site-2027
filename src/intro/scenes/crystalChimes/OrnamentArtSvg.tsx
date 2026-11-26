import type { ChimeOrnamentKind } from '../../config';

interface OrnamentArtSvgProps {
  kind: ChimeOrnamentKind;
  uid: string;
}

/**
 * Distance in logical px from the ornament's bob center `(0, 0)` up to where
 * the golden hanging thread meets the ornament's top loop.
 */
export function getOrnamentLoopOffset(kind: ChimeOrnamentKind): number {
  switch (kind) {
    case 'faceted-sphere':
      return 38;
    case 'crystal-teardrop':
      return 46;
    case 'diamond-lantern':
      return 45;
    case 'pearl-sphere':
      return 38;
    case 'gold-star':
      return 32;
  }
}

function GoldCrownCap({ uid, y = -26, scale = 1 }: { uid: string; y?: number; scale?: number }) {
  return (
    <g transform={`translate(0 ${y}) scale(${scale})`}>
      {/* Slender hanging loop */}
      <circle
        cx="0"
        cy="-9.5"
        r="4.2"
        fill="none"
        stroke={`url(#${uid}-gold-metal)`}
        strokeWidth="1.55"
      />
      {/* Stepped finial dome */}
      <path
        d="M -4.2 -5.2 Q 0 -7.4 4.2 -5.2 L 5.6 -2.6 L -5.6 -2.6 Z"
        fill={`url(#${uid}-gold-metal)`}
      />
      {/* Beaded collar rim */}
      <rect
        x="-7.6"
        y="-2.8"
        width="15.2"
        height="2.1"
        rx="1.05"
        fill={`url(#${uid}-gold-bright)`}
      />
      {/* Scalloped vintage crown skirt */}
      <path
        d="M -7.2 -0.8 L 7.2 -0.8 L 8.2 4.4 Q 6.1 2.7 4.1 4.6 Q 2 2.7 0 4.8 Q -2 2.7 -4.1 4.6 Q -6.1 2.7 -8.2 4.4 Z"
        fill={`url(#${uid}-gold-metal)`}
        stroke="rgba(130,90,32,0.38)"
        strokeWidth="0.45"
      />
      {/* Specular highlight tick on crown */}
      <path
        d="M -4.2 -0.2 L -3.8 3.2 M 0 -0.2 L 0 3.5"
        stroke="rgba(255,248,225,0.68)"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </g>
  );
}

/**
 * Luxury light-glass, cut-crystal, satin pearl, and brushed champagne-gold SVG ornaments.
 * Designed around bob center `(0, 0)` for crisp Retina scaling and GPU-only rotation.
 */
export function OrnamentArtSvg({ kind, uid }: OrnamentArtSvgProps) {
  const sharedGoldDefs = (
    <>
      <linearGradient id={`${uid}-gold-metal`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F8E7BD" />
        <stop offset="35%" stopColor="#D8AE62" />
        <stop offset="72%" stopColor="#B6873E" />
        <stop offset="100%" stopColor="#E6C27A" />
      </linearGradient>
      <linearGradient id={`${uid}-gold-bright`} x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#C89B4D" />
        <stop offset="45%" stopColor="#FFF0C8" />
        <stop offset="100%" stopColor="#B88A3F" />
      </linearGradient>
    </>
  );

  if (kind === 'faceted-sphere') {
    return (
      <g>
        <defs>
          {sharedGoldDefs}
          <radialGradient id={`${uid}-crys-base`} cx="36%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="36%" stopColor="#E7F2FA" stopOpacity="0.88" />
            <stop offset="72%" stopColor="#C4DBEE" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#EEDBBE" stopOpacity="0.86" />
          </radialGradient>
          <radialGradient id={`${uid}-crys-core`} cx="54%" cy="56%" r="48%">
            <stop offset="0%" stopColor="#FFF0C4" stopOpacity="0.75" />
            <stop offset="55%" stopColor="#E8C27A" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#E8C27A" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-sphere-clip`}>
            <circle cx="0" cy="0" r="25.5" />
          </clipPath>
        </defs>

        {/* Soft translucent ambient glow */}
        <circle cx="0" cy="2" r="28" fill="rgba(148,180,208,0.16)" />

        {/* Crystal sphere base */}
        <circle
          cx="0"
          cy="0"
          r="25.5"
          fill={`url(#${uid}-crys-base)`}
          stroke="rgba(255,255,255,0.88)"
          strokeWidth="1"
        />

        {/* Cut-crystal diamond facet mosaic */}
        <g clipPath={`url(#${uid}-sphere-clip)`}>
          <circle cx="2" cy="3" r="19" fill={`url(#${uid}-crys-core)`} />

          {/* Upper crown facets */}
          <polygon points="0,-26 -11,-14 0,-11" fill="rgba(255,255,255,0.68)" />
          <polygon points="0,-26 11,-14 0,-11" fill="rgba(198,224,244,0.45)" />
          <polygon points="-22,-13 -11,-14 -16,0" fill="rgba(255,255,255,0.52)" />
          <polygon points="22,-13 11,-14 16,0" fill="rgba(244,218,168,0.38)" />

          {/* Equatorial diamond facets */}
          <polygon points="0,-11 -11,-14 -16,0 -6,2" fill="rgba(255,255,255,0.62)" />
          <polygon points="0,-11 11,-14 16,0 6,2" fill="rgba(142,184,218,0.44)" />
          <polygon points="0,-11 6,2 0,13 -6,2" fill="rgba(255,252,242,0.58)" />
          <polygon points="-16,0 -6,2 -11,15 -22,12" fill="rgba(104,146,184,0.42)" />
          <polygon points="16,0 6,2 11,15 22,12" fill="rgba(238,198,128,0.48)" />

          {/* Lower refractive crystal facets */}
          <polygon points="-6,2 0,13 -11,15" fill="rgba(255,242,204,0.5)" />
          <polygon points="6,2 0,13 11,15" fill="rgba(154,192,224,0.48)" />
          <polygon points="0,13 -11,15 0,26" fill="rgba(96,138,176,0.46)" />
          <polygon points="0,13 11,15 0,26" fill="rgba(230,190,122,0.54)" />

          {/* Crisp facet edge hairlines */}
          <path
            d="M 0 -26 L -11 -14 L -16 0 L -11 15 L 0 26 L 11 15 L 16 0 L 11 -14 Z M -11 -14 L 0 -11 L 11 -14 M -16 0 L -6 2 L 0 -11 L 6 2 L 16 0 M -11 15 L 0 13 L 11 15 M -6 2 L 0 13 L 6 2"
            fill="none"
            stroke="rgba(255,255,255,0.68)"
            strokeWidth="0.65"
            strokeLinejoin="round"
          />

          {/* Top-left bright glass specular crescent */}
          <path
            d="M -17 -10 A 20 20 0 0 1 -4 -20"
            fill="none"
            stroke="rgba(255,255,255,0.92)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          {/* Tiny 4-point diamond glint */}
          <path
            d="M -9 -11 L -7.6 -12.4 L -9 -16 L -10.4 -12.4 L -14 -11 L -10.4 -9.6 L -9 -6 L -7.6 -9.6 Z"
            fill="#FFFFFF"
            opacity="0.92"
          />
        </g>

        <GoldCrownCap uid={uid} y={-27} scale={0.95} />
      </g>
    );
  }

  if (kind === 'crystal-teardrop') {
    return (
      <g>
        <defs>
          {sharedGoldDefs}
          <linearGradient id={`${uid}-drop-body`} x1="15%" y1="5%" x2="85%" y2="95%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.94" />
            <stop offset="32%" stopColor="#E4F1FA" stopOpacity="0.86" />
            <stop offset="68%" stopColor="#C3DCED" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#F3E0BC" stopOpacity="0.88" />
          </linearGradient>
          <radialGradient id={`${uid}-drop-glow`} cx="48%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#FFF5D8" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#E7C27B" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft ambient shadow aura */}
        <path
          d="M 0 -32 C 13 -21 20 -5 17 12 C 14 26 5 36 0 42 C -5 36 -14 26 -17 12 C -20 -5 -13 -21 0 -32 Z"
          fill="rgba(146,178,206,0.16)"
          transform="translate(0 2) scale(1.06)"
        />

        {/* Elongated crystal teardrop body */}
        <path
          d="M 0 -32 C 12.5 -21 19.5 -5 16.5 11.5 C 13.5 25 4.8 35.5 0 40.5 C -4.8 35.5 -13.5 25 -16.5 11.5 C -19.5 -5 -12.5 -21 0 -32 Z"
          fill={`url(#${uid}-drop-body)`}
          stroke="rgba(255,255,255,0.88)"
          strokeWidth="0.95"
        />

        {/* Warm inner radiance */}
        <ellipse cx="0" cy="4" rx="11" ry="20" fill={`url(#${uid}-drop-glow)`} />

        {/* Vertical icicle cut facets */}
        <polygon points="0,-31 -11,-11 -5,9 0,40" fill="rgba(255,255,255,0.44)" />
        <polygon points="0,-31 11,-11 5,9 0,40" fill="rgba(176,209,235,0.28)" />
        <polygon points="0,-31 -5,9 0,40 5,9" fill="rgba(255,253,246,0.42)" />
        <polygon points="11,-11 16,11 5,9" fill="rgba(244,214,154,0.36)" />
        <polygon points="-11,-11 -16,11 -5,9" fill="rgba(255,255,255,0.52)" />
        <polygon points="5,9 14,22 0,40" fill="rgba(232,197,134,0.34)" />
        <polygon points="-5,9 -14,22 0,40" fill="rgba(156,192,222,0.28)" />

        {/* Facet ridge highlights */}
        <path
          d="M 0 -31 L 0 40 M 0 -31 L -11 -11 L -5 9 L 0 40 M 0 -31 L 11 -11 L 5 9 L 0 40 M -16 11 L -5 9 L 5 9 L 16 11"
          fill="none"
          stroke="rgba(255,255,255,0.7)"
          strokeWidth="0.65"
          strokeLinejoin="round"
        />

        {/* Sleek glass highlight curve */}
        <path
          d="M -9 -14 C -13 -4 -12 8 -8 18"
          fill="none"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.75"
          strokeLinecap="round"
        />

        {/* Delicate pinpoint glint near tip */}
        <path
          d="M 0 28 L 1.1 30.9 L 4 32 L 1.1 33.1 L 0 36 L -1.1 33.1 L -4 32 L -1.1 30.9 Z"
          fill="#FFFFFF"
          opacity="0.9"
        />

        <GoldCrownCap uid={uid} y={-35} scale={0.82} />
      </g>
    );
  }

  if (kind === 'diamond-lantern') {
    return (
      <g>
        <defs>
          {sharedGoldDefs}
          <linearGradient id={`${uid}-lan-glass`} x1="15%" y1="0%" x2="85%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.82" />
            <stop offset="48%" stopColor="#DCEBF6" stopOpacity="0.58" />
            <stop offset="100%" stopColor="#F3E2C3" stopOpacity="0.76" />
          </linearGradient>
          <radialGradient id={`${uid}-lan-ember`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF7DC" stopOpacity="0.98" />
            <stop offset="38%" stopColor="#F2C872" stopOpacity="0.62" />
            <stop offset="75%" stopColor="#DDA84E" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#DDA84E" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Soft luminous ambient halo */}
        <polygon
          points="0,-34 27,0 0,34 -27,0"
          fill="rgba(232,196,126,0.16)"
          transform="scale(1.1)"
        />

        {/* Translucent frosted glass panes */}
        <polygon points="0,-33 25,0 0,33 -25,0" fill={`url(#${uid}-lan-glass)`} />
        <polygon points="0,-33 -25,0 -10,0" fill="rgba(255,255,255,0.48)" />
        <polygon points="0,-33 25,0 10,0" fill="rgba(182,212,236,0.3)" />
        <polygon points="0,33 -25,0 -10,0" fill="rgba(164,196,224,0.28)" />
        <polygon points="0,33 25,0 10,0" fill="rgba(244,212,152,0.36)" />

        {/* Glowing warm golden candle-star core suspended inside lantern */}
        <circle cx="0" cy="0" r="16" fill={`url(#${uid}-lan-ember)`} />
        <path
          d="M 0 -10 L 2.2 -2.2 L 10 0 L 2.2 2.2 L 0 10 L -2.2 2.2 L -10 0 L -2.2 -2.2 Z"
          fill="#FFF8E2"
        />
        <circle cx="0" cy="0" r="2.6" fill="#F2C66E" />

        {/* Architectural brushed champagne-gold frame & 3D ribs */}
        <path
          d="M 0 -33 L 25 0 L 0 33 L -25 0 Z"
          fill="none"
          stroke={`url(#${uid}-gold-metal)`}
          strokeWidth="1.95"
          strokeLinejoin="round"
        />
        <path
          d="M 0 -33 L -10 0 L 0 33 M 0 -33 L 10 0 L 0 33 M -25 0 L 25 0"
          fill="none"
          stroke={`url(#${uid}-gold-bright)`}
          strokeWidth="1.05"
          strokeLinejoin="round"
          opacity="0.92"
        />

        {/* Crisp glass bevel gleam */}
        <path
          d="M -18 -5 L -5 -22"
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="1.65"
          strokeLinecap="round"
        />

        {/* Dainty gold teardrop finial at base */}
        <circle cx="0" cy="35.5" r="2.1" fill={`url(#${uid}-gold-metal)`} />
        <path d="M 0 37.2 L 1.7 41.2 L 0 43.2 L -1.7 41.2 Z" fill={`url(#${uid}-gold-metal)`} />

        <GoldCrownCap uid={uid} y={-34} scale={0.86} />
      </g>
    );
  }

  if (kind === 'pearl-sphere') {
    return (
      <g>
        <defs>
          {sharedGoldDefs}
          <radialGradient id={`${uid}-pearl-base`} cx="34%" cy="28%" r="74%">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="38%" stopColor="#F5F0E7" />
            <stop offset="74%" stopColor="#DDE4EC" />
            <stop offset="100%" stopColor="#EBDAC2" />
          </radialGradient>
          <radialGradient id={`${uid}-pearl-sheen`} cx="68%" cy="72%" r="52%">
            <stop offset="0%" stopColor="#F6DFBA" stopOpacity="0.6" />
            <stop offset="55%" stopColor="#DCE8F4" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-pearl-clip`}>
            <circle cx="0" cy="0" r="25.5" />
          </clipPath>
        </defs>

        {/* Soft matte drop aura */}
        <circle cx="0" cy="2" r="27.5" fill="rgba(148,168,188,0.16)" />

        {/* Satin mother-of-pearl sphere */}
        <circle
          cx="0"
          cy="0"
          r="25.5"
          fill={`url(#${uid}-pearl-base)`}
          stroke="rgba(255,255,255,0.88)"
          strokeWidth="0.95"
        />

        {/* Subtle swirled frosted ribs (echoing card-2.webp ornaments) */}
        <g clipPath={`url(#${uid}-pearl-clip)`}>
          <circle cx="0" cy="0" r="25.5" fill={`url(#${uid}-pearl-sheen)`} />
          <path
            d="M -18 -22 C -6 -10 -2 6 -12 24 M -8 -26 C 4 -11 7 7 -2 26 M 3 -26 C 14 -10 17 8 9 25 M 13 -22 C 22 -8 24 8 18 22 M -25 -10 C -17 0 -15 11 -21 20"
            fill="none"
            stroke="rgba(255,255,255,0.72)"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <path
            d="M -16 -22 C -4 -10 0 6 -10 24 M -6 -26 C 6 -11 9 7 0 26 M 5 -26 C 16 -10 19 8 11 25"
            fill="none"
            stroke="rgba(162,182,202,0.28)"
            strokeWidth="0.9"
            strokeLinecap="round"
          />
          {/* Soft satin velvet bloom (never harsh plastic glare) */}
          <ellipse
            cx="-8"
            cy="-9"
            rx="10"
            ry="7"
            transform="rotate(-28 -8 -9)"
            fill="rgba(255,255,255,0.68)"
          />
        </g>

        <GoldCrownCap uid={uid} y={-27} scale={0.95} />
      </g>
    );
  }

  // 'gold-star': Sculpted 3D-beveled 8-pointed champagne-gold star
  const rays: Array<{ angleDeg: number; len: number }> = [
    { angleDeg: 0, len: 25 },
    { angleDeg: 45, len: 15.5 },
    { angleDeg: 90, len: 21 },
    { angleDeg: 135, len: 15.5 },
    { angleDeg: 180, len: 25 },
    { angleDeg: 225, len: 15.5 },
    { angleDeg: 270, len: 21 },
    { angleDeg: 315, len: 15.5 },
  ];

  const innerR = 6.2;

  return (
    <g>
      <defs>
        {sharedGoldDefs}
        <linearGradient id={`${uid}-star-lit`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFF5D6" />
          <stop offset="55%" stopColor="#E4BE72" />
          <stop offset="100%" stopColor="#C9994A" />
        </linearGradient>
        <linearGradient id={`${uid}-star-shade`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C89B4C" />
          <stop offset="100%" stopColor="#936B2A" />
        </linearGradient>
        <radialGradient id={`${uid}-star-aura`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F5D38A" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#F5D38A" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Warm champagne halo */}
      <circle cx="0" cy="0" r="24" fill={`url(#${uid}-star-aura)`} />

      {/* Delicate top hanging ring */}
      <circle
        cx="0"
        cy="-28.5"
        r="3.6"
        fill="none"
        stroke={`url(#${uid}-gold-metal)`}
        strokeWidth="1.4"
      />

      {/* Beveled dual-facet metallic rays */}
      {rays.map((ray) => {
        const aMid = ((ray.angleDeg - 90) * Math.PI) / 180;
        const aLeft = ((ray.angleDeg - 90 - 22.5) * Math.PI) / 180;
        const aRight = ((ray.angleDeg - 90 + 22.5) * Math.PI) / 180;

        const tipX = Math.cos(aMid) * ray.len;
        const tipY = Math.sin(aMid) * ray.len;
        const leftX = Math.cos(aLeft) * innerR;
        const leftY = Math.sin(aLeft) * innerR;
        const rightX = Math.cos(aRight) * innerR;
        const rightY = Math.sin(aRight) * innerR;

        return (
          <g key={ray.angleDeg}>
            <polygon
              points={`0,0 ${tipX.toFixed(2)},${tipY.toFixed(2)} ${leftX.toFixed(2)},${leftY.toFixed(2)}`}
              fill={`url(#${uid}-star-lit)`}
            />
            <polygon
              points={`0,0 ${tipX.toFixed(2)},${tipY.toFixed(2)} ${rightX.toFixed(2)},${rightY.toFixed(2)}`}
              fill={`url(#${uid}-star-shade)`}
            />
          </g>
        );
      })}

      {/* Luminous icy-crystal center gem */}
      <circle
        cx="0"
        cy="0"
        r="3.8"
        fill="#FFFBF2"
        stroke={`url(#${uid}-gold-bright)`}
        strokeWidth="1"
      />
      <circle cx="-1" cy="-1.1" r="1.2" fill="#FFFFFF" />
    </g>
  );
}
