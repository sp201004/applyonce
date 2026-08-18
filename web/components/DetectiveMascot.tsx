interface DetectiveMascotProps {
  className?: string
}

/**
 * Blue-toned detective mascot rendered as inline SVG.
 * Palette is strictly blue (#1e40af / #2563eb / #3b82f6 / #93c5fd / #dbeafe / #eff6ff).
 * No green anywhere. Gentle ~4s float via motion-safe animation.
 */
export default function DetectiveMascot({ className = '' }: DetectiveMascotProps) {
  return (
    <div className={`motion-safe:animate-float-mascot ${className}`} aria-hidden="false">
      <svg
        viewBox="0 0 240 240"
        role="img"
        aria-label="ApplyOnce detective mascot inspecting your profile"
        className="h-full w-full drop-shadow-[0_18px_35px_rgba(37,99,235,0.28)]"
      >
        {/* soft halo */}
        <circle cx="120" cy="118" r="96" fill="#eff6ff" />
        <circle cx="120" cy="118" r="96" fill="none" stroke="#dbeafe" strokeWidth="2" strokeDasharray="4 7" />

        {/* body / coat */}
        <path
          d="M74 214c0-30 20-52 46-52s46 22 46 52z"
          fill="#2563eb"
        />
        <path d="M120 162c-9 0-17 3-24 8l24 44 24-44c-7-5-15-8-24-8z" fill="#1e40af" />
        <circle cx="120" cy="186" r="4" fill="#93c5fd" />
        <circle cx="120" cy="202" r="4" fill="#93c5fd" />

        {/* head */}
        <circle cx="120" cy="112" r="42" fill="#eff6ff" stroke="#93c5fd" strokeWidth="2" />

        {/* deerstalker hat */}
        <path d="M78 96c0-26 19-44 42-44s42 18 42 44c-14-9-28-13-42-13s-28 4-42 13z" fill="#1e40af" />
        <path d="M74 96c0 7 21 12 46 12s46-5 46-12c0-5-4-8-10-8H84c-6 0-10 3-10 8z" fill="#2563eb" />
        <circle cx="120" cy="70" r="6" fill="#93c5fd" />

        {/* face */}
        <circle cx="106" cy="110" r="5.5" fill="#1e40af" />
        <circle cx="134" cy="110" r="5.5" fill="#1e40af" />
        <path d="M110 128c6 5 14 5 20 0" fill="none" stroke="#2563eb" strokeWidth="3.5" strokeLinecap="round" />

        {/* magnifying glass */}
        <g>
          <circle cx="170" cy="150" r="26" fill="#93c5fd" fillOpacity="0.35" stroke="#2563eb" strokeWidth="6" />
          <circle cx="170" cy="150" r="26" fill="none" stroke="#3b82f6" strokeWidth="2" />
          <rect
            x="184"
            y="168"
            width="12"
            height="34"
            rx="6"
            transform="rotate(-45 190 185)"
            fill="#1e40af"
          />
          <path d="M158 142c3-5 8-8 14-8" fill="none" stroke="#eff6ff" strokeWidth="3" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  )
}
