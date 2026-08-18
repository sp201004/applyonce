interface LandingBackgroundProps {
  className?: string
}

/**
 * Hero-scoped layered backdrop (purely decorative, pointer-events off):
 *  - base white -> #eff6ff soft vertical gradient
 *  - animated gradient mesh: three large blurred blobs (blue / indigo / sky)
 *    drifting on slow transform-only loops (reduced-motion safe)
 *  - a fine dot-grid overlay (radial-gradient dots, 24px spacing) masked to
 *    fade at the edges
 *  - a soft thin horizontal top-glow line under the navbar area
 *  - preserved dotted-grid patches + light wireframe doodles from the original
 */
export default function LandingBackground({ className = '' }: LandingBackgroundProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 -z-10 overflow-hidden bg-gradient-to-b from-white to-[#eff6ff] ${className}`}
      aria-hidden="true"
    >
      {/* soft thin top-glow line under the navbar area */}
      <div
        className="animate-top-glow absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(37,99,235,0.35) 20%, rgba(99,102,241,0.45) 50%, rgba(14,165,233,0.35) 80%, transparent)',
        }}
      />

      {/* ===== animated gradient mesh (3 drifting blurred blobs) ===== */}
      <div className="absolute inset-0 motion-reduce:!animate-none">
        <div
          className="animate-mesh-a absolute -left-24 -top-24 h-[560px] w-[560px] rounded-full blur-3xl will-change-transform"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.10), transparent 70%)' }}
        />
        <div
          className="animate-mesh-b absolute right-[-10%] top-[6%] h-[620px] w-[620px] rounded-full blur-3xl will-change-transform"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)' }}
        />
        <div
          className="animate-mesh-c absolute bottom-[-12%] left-[28%] h-[520px] w-[520px] rounded-full blur-3xl will-change-transform"
          style={{ background: 'radial-gradient(circle, rgba(14,165,233,0.08), transparent 70%)' }}
        />
      </div>

      {/* ===== fine dot-grid overlay, edge-faded via radial mask ===== */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(203,213,225,0.55) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage:
            'radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 70% at 50% 40%, black 40%, transparent 100%)',
        }}
      />

      {/* large blurred blue blob, top-right behind mascot (kept from original) */}
      <div
        className="absolute -right-24 -top-32 h-[700px] w-[700px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(37,99,235,0.06), transparent 70%)' }}
      />

      {/* dotted-grid patches (~200x200, dots #bfdbfe) */}
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <pattern id="hero-dot-grid" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.6" fill="#bfdbfe" />
          </pattern>
        </defs>
        {/* strengthened patch directly behind the Apply button zone (right-center) */}
        <rect x="66%" y="42%" width="220" height="210" fill="url(#hero-dot-grid)" opacity="0.6" />
        {/* bottom-left corner */}
        <rect x="2%" y="70%" width="200" height="200" fill="url(#hero-dot-grid)" opacity="0.4" />
      </svg>

      {/* five light wireframe doodles */}
      {/* top-center-left: cube */}
      <svg
        width="70"
        height="70"
        viewBox="0 0 100 100"
        className="absolute left-[30%] top-[10%] rotate-[15deg] text-[#93c5fd] opacity-40"
      >
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" />
          <line x1="50" y1="55" x2="50" y2="95" />
          <line x1="50" y1="55" x2="15" y2="35" />
          <line x1="50" y1="55" x2="85" y2="35" />
        </g>
      </svg>

      {/* mid-right edge: icosahedron */}
      <svg
        width="60"
        height="60"
        viewBox="0 0 100 100"
        className="absolute right-[3%] top-[46%] -rotate-12 text-[#93c5fd] opacity-40"
      >
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="50,5 90,30 80,80 50,95 20,80 10,30" />
          <polygon points="50,5 50,95" />
          <polygon points="10,30 90,30" />
          <polygon points="20,80 80,80" />
        </g>
      </svg>

      {/* bottom-center: dashed ring */}
      <svg
        width="56"
        height="56"
        viewBox="0 0 100 100"
        className="absolute bottom-[8%] left-[48%] rotate-45 text-[#93c5fd] opacity-40"
      >
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray="6 8" />
      </svg>

      {/* heading-right: tilted wireframe diamond */}
      <svg
        width="54"
        height="54"
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="absolute left-[52%] top-[30%] rotate-12 text-[#93c5fd] opacity-35"
      >
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round">
          <polygon points="50,8 88,50 50,92 12,50" />
          <path d="M50 8 65 50 50 92 35 50 50 8ZM12 50h76" />
        </g>
      </svg>

      {/* below Apply zone: offset orbital wireframe */}
      <svg
        width="74"
        height="48"
        viewBox="0 0 120 80"
        aria-hidden="true"
        className="absolute bottom-[10%] right-[13%] -rotate-6 text-[#93c5fd] opacity-35"
      >
        <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <ellipse cx="60" cy="40" rx="52" ry="20" />
          <ellipse cx="60" cy="40" rx="22" ry="36" transform="rotate(58 60 40)" />
          <circle cx="94" cy="25" r="4" fill="currentColor" stroke="none" />
        </g>
      </svg>
    </div>
  )
}
