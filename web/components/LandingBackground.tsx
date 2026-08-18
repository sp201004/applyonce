interface LandingBackgroundProps {
  className?: string
}

/**
 * Scoped hero backdrop: a dotted grid plus scattered light-blue geometric
 * doodles used to fill the lower-right empty space and sit BEHIND the mascot.
 * Purely decorative (aria-hidden), pointer-events disabled.
 */
export default function LandingBackground({ className = '' }: LandingBackgroundProps) {
  return (
    <div className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden ${className}`} aria-hidden="true">
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="hero-dot-grid" x="0" y="0" width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill="#93c5fd" opacity="0.45" />
          </pattern>
        </defs>

        {/* dotted grid patches (behind mascot + filling lower zone) */}
        <rect x="58%" y="2%" width="140" height="140" fill="url(#hero-dot-grid)" opacity="0.9" />
        <rect x="8%" y="62%" width="180" height="150" fill="url(#hero-dot-grid)" opacity="0.8" />
        <rect x="70%" y="70%" width="150" height="130" fill="url(#hero-dot-grid)" opacity="0.7" />
      </svg>

      {/* scattered geometric doodles */}
      <svg width="70" height="70" viewBox="0 0 100 100" className="absolute left-[6%] top-[68%] rotate-[18deg] text-[#93c5fd] opacity-70">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" />
          <line x1="50" y1="55" x2="50" y2="95" />
          <line x1="50" y1="55" x2="15" y2="35" />
          <line x1="50" y1="55" x2="85" y2="35" />
        </g>
      </svg>

      <svg width="54" height="54" viewBox="0 0 100 100" className="absolute right-[10%] top-[74%] -rotate-12 text-[#93c5fd] opacity-70">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="50,5 90,30 80,80 50,95 20,80 10,30" />
          <polygon points="50,5 50,95" />
          <polygon points="10,30 90,30" />
          <polygon points="20,80 80,80" />
        </g>
      </svg>

      <svg width="40" height="40" viewBox="0 0 100 100" className="absolute left-[40%] top-[82%] rotate-45 text-[#93c5fd] opacity-60">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 8" />
      </svg>

      {/* dotted accent lines */}
      <div className="absolute left-[86%] top-[30%] h-24 w-[2px] border-l-[1.5px] border-dotted border-[#93c5fd]/70" />
      <div className="absolute left-[14%] top-[50%] h-16 w-[2px] rotate-12 border-l-[1.5px] border-dotted border-[#93c5fd]/60" />
    </div>
  )
}
