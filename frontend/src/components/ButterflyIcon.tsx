interface ButterflyIconProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function ButterflyIcon({
  width = 36,
  height = 28,
  className = "text-emerald-600",
}: ButterflyIconProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 80"
      className={className}
    >
      {/* Butterfly body */}
      <ellipse cx="50" cy="40" rx="1.5" ry="20" fill="currentColor" />

      {/* Left upper wing */}
      <path
        d="M 50 25 C 35 18, 20 22, 22 32 C 20 38, 28 42, 38 38 C 42 35, 48 30, 50 25 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Left lower wing */}
      <path
        d="M 48 40 C 38 44, 28 46, 30 52 C 28 55, 33 56, 40 52 C 43 50, 47 45, 48 40 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right upper wing */}
      <path
        d="M 50 25 C 65 18, 80 22, 78 32 C 80 38, 72 42, 62 38 C 58 35, 52 30, 50 25 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Right lower wing */}
      <path
        d="M 52 40 C 62 44, 72 46, 70 52 C 72 55, 67 56, 60 52 C 57 50, 53 45, 52 40 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Antennae */}
      <path
        d="M 47 15 Q 45 10, 43 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <path
        d="M 53 15 Q 55 10, 57 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinecap="round"
      />
      <circle cx="43" cy="8" r="1" fill="currentColor" />
      <circle cx="57" cy="8" r="1" fill="currentColor" />
    </svg>
  );
}
