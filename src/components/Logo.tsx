function LogoGradientDefs() {
  return (
    <defs>
      <linearGradient id="logo-peak" x1="6" y1="48" x2="36" y2="10" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#5b8cff" />
        <stop offset="1" stopColor="#3a4fd1" />
      </linearGradient>
      <linearGradient id="logo-glass" x1="28" y1="30" x2="58" y2="60" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#9b7bff" />
        <stop offset="1" stopColor="#5b3fd6" />
      </linearGradient>
    </defs>
  );
}

function LogoMarkShape() {
  return (
    <>
      <path
        d="M9 47 L27 13 L36 30"
        stroke="url(#logo-peak)"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="41" cy="41" r="11" stroke="url(#logo-glass)" strokeWidth="7" />
      <line
        x1="49"
        y1="49"
        x2="56"
        y2="56"
        stroke="url(#logo-glass)"
        strokeWidth="7"
        strokeLinecap="round"
      />
    </>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <LogoGradientDefs />
      <LogoMarkShape />
    </svg>
  );
}

export function LogoLockup({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <LogoGradientDefs />
      <LogoMarkShape />
      <text
        x="76"
        y="45"
        fontFamily="var(--font-quicksand), sans-serif"
        fontWeight={700}
        fontSize="34"
        fill="currentColor"
      >
        Alloqo
      </text>
    </svg>
  );
}
