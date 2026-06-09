/**
 * Sh4d0w Studio brand mark.
 *
 * A voxel "S" carved out of a dark cube, lit by a violet glow — Minecraft
 * blockiness meets shadow aesthetic. Pure SVG so it scales anywhere
 * (sidebar, splash, about dialog) and inherits the theme via CSS variables.
 */
export function Logo({ size = 32, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={glow ? { filter: 'drop-shadow(0 0 14px hsl(261 83% 65% / 0.55))' } : undefined}
      aria-label="Sh4d0w Studio"
    >
      <defs>
        <linearGradient id="shadow-violet" x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(263 90% 70%)" />
          <stop offset="1" stopColor="hsl(258 80% 48%)" />
        </linearGradient>
        <linearGradient id="shadow-face" x1="14" y1="10" x2="50" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="hsl(240 8% 14%)" />
          <stop offset="1" stopColor="hsl(245 12% 7%)" />
        </linearGradient>
      </defs>

      {/* outer rounded cube */}
      <rect x="4" y="4" width="56" height="56" rx="14" fill="url(#shadow-face)" />
      <rect
        x="4.75"
        y="4.75"
        width="54.5"
        height="54.5"
        rx="13.25"
        stroke="url(#shadow-violet)"
        strokeOpacity="0.55"
        strokeWidth="1.5"
      />

      {/* voxel S — built from blocks, Minecraft style */}
      <g fill="url(#shadow-violet)">
        <rect x="20" y="14" width="24" height="7" rx="1.5" />
        <rect x="20" y="21" width="7" height="7" rx="1.5" />
        <rect x="20" y="28" width="24" height="7" rx="1.5" />
        <rect x="37" y="35" width="7" height="7" rx="1.5" />
        <rect x="20" y="42" width="24" height="7" rx="1.5" />
      </g>

      {/* glint */}
      <rect x="22" y="16" width="8" height="2.5" rx="1.25" fill="white" fillOpacity="0.35" />
    </svg>
  );
}
