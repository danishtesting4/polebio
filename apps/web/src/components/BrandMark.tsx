type BrandMarkProps = { className?: string; size?: number };

export function BrandMark({ className = "", size = 34 }: BrandMarkProps) {
  return (
    <svg
      className={`brand-mark-svg ${className}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="PoleBio"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="polebio-mark-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a78bfa" />
          <stop offset="1" stopColor="#6d28d9" />
        </linearGradient>
        <clipPath id="polebio-mark-tile">
          <rect x="20" y="30" width="160" height="160" rx="40" />
        </clipPath>
      </defs>
      <rect x="20" y="30" width="160" height="160" rx="40" fill="url(#polebio-mark-gradient)" />
      <g clipPath="url(#polebio-mark-tile)" fill="#fff">
        <circle cx="100" cy="92" r="28" />
        <path d="M44 200 C44 156 68 134 100 134 C132 134 156 156 156 200 Z" />
      </g>
      <path d="M152 52 l5 12 12 5 -12 5 -5 12 -5 -12 -12 -5 12 -5z" fill="#fde68a" />
    </svg>
  );
}
