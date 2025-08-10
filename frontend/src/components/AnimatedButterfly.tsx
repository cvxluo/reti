interface AnimatedButterflyProps {
  isFlying: boolean;
}

export default function AnimatedButterfly({
  isFlying,
}: AnimatedButterflyProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-3000 ease-out ${
        isFlying
          ? "-translate-x-full -translate-y-full -rotate-90 opacity-0"
          : ""
      }`}
    >
      <svg
        width="100"
        height="150"
        viewBox="0 0 100 150"
        className={`text-emerald-500 drop-shadow-lg ${
          !isFlying ? "animate-bounce" : ""
        }`}
        style={{
          animation: !isFlying ? "flutter 1.5s ease-in-out infinite" : "none",
        }}
      >
        {/* Butterfly body */}
        <ellipse cx="50" cy="40" rx="2" ry="30" fill="currentColor" />

        {/* Left upper wing - curved organic shape */}
        <path
          d="M 50 25 C 30 15, 10 20, 15 35 C 12 45, 25 50, 40 45 C 45 40, 48 30, 50 25 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="origin-[35px_35px]"
          style={{
            animation: !isFlying
              ? "wingFlap 0.4s ease-in-out infinite alternate"
              : "none",
          }}
        />

        {/* Left lower wing - curved organic shape */}
        <path
          d="M 48 45 C 35 50, 20 55, 25 65 C 22 70, 30 72, 40 68 C 45 65, 47 55, 48 45 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="origin-[35px_58px]"
          style={{
            animation: !isFlying
              ? "wingFlap 0.4s ease-in-out infinite alternate"
              : "none",
          }}
        />

        {/* Right upper wing - curved organic shape */}
        <path
          d="M 50 25 C 70 15, 90 20, 85 35 C 88 45, 75 50, 60 45 C 55 40, 52 30, 50 25 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="origin-[65px_35px]"
          style={{
            animation: !isFlying
              ? "wingFlap 0.4s ease-in-out infinite alternate-reverse"
              : "none",
          }}
        />

        {/* Right lower wing - curved organic shape */}
        <path
          d="M 52 45 C 65 50, 80 55, 75 65 C 78 70, 70 72, 60 68 C 55 65, 53 55, 52 45 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="origin-[65px_58px]"
          style={{
            animation: !isFlying
              ? "wingFlap 0.4s ease-in-out infinite alternate-reverse"
              : "none",
          }}
        />

        {/* Antennae */}
        <path
          d="M 47 15 Q 44 8, 42 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M 53 15 Q 56 8, 58 5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="42" cy="5" r="1.5" fill="currentColor" />
        <circle cx="58" cy="5" r="1.5" fill="currentColor" />

        {/* Rope from butterfly body to sign */}
        <path
          d="M 50 70 Q 48 85, 50 95"
          fill="none"
          stroke="#8B4513"
          strokeWidth="1.5"
          strokeLinecap="round"
          className="rope"
          style={{
            animation: !isFlying ? "ropeSwing 2s ease-in-out infinite" : "none",
          }}
        />

        {/* Sign background */}
        <rect
          x="10"
          y="95"
          width="80"
          height="30"
          rx="4"
          ry="4"
          fill="#10B981"
          stroke="#059669"
          strokeWidth="1.5"
          className="sign"
          style={{
            animation: !isFlying ? "signSwing 2s ease-in-out infinite" : "none",
          }}
        />

        {/* "reti" text */}
        <text
          x="50"
          y="115"
          textAnchor="middle"
          fontSize="18"
          fontWeight="bold"
          fill="white"
          fontFamily="Arial, sans-serif"
          className="sign-text"
          style={{
            animation: !isFlying ? "signSwing 2s ease-in-out infinite" : "none",
          }}
        >
          reti
        </text>

        {/* Rope attachment points on sign */}
        <circle cx="25" cy="95" r="1.5" fill="#8B4513" />
        <circle cx="75" cy="95" r="1.5" fill="#8B4513" />

        {/* Left rope strand */}
        <path
          d="M 48 85 L 25 95"
          fill="none"
          stroke="#8B4513"
          strokeWidth="1"
          strokeLinecap="round"
          style={{
            animation: !isFlying ? "ropeSwing 2s ease-in-out infinite" : "none",
          }}
        />

        {/* Right rope strand */}
        <path
          d="M 52 85 L 75 95"
          fill="none"
          stroke="#8B4513"
          strokeWidth="1"
          strokeLinecap="round"
          style={{
            animation: !isFlying ? "ropeSwing 2s ease-in-out infinite" : "none",
          }}
        />
      </svg>

      <style jsx>{`
        @keyframes flutter {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes wingFlap {
          0% {
            transform: scaleY(1);
          }
          100% {
            transform: scaleY(0.7);
          }
        }

        @keyframes ropeSwing {
          0%,
          100% {
            transform: rotate(0deg);
            transform-origin: 50px 70px;
          }
          50% {
            transform: rotate(2deg);
            transform-origin: 50px 70px;
          }
        }

        @keyframes signSwing {
          0%,
          100% {
            transform: rotate(0deg) translateY(0px);
            transform-origin: 50px 95px;
          }
          50% {
            transform: rotate(2deg) translateY(2px);
            transform-origin: 50px 95px;
          }
        }
      `}</style>
    </div>
  );
}
