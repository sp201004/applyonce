export default function GeometricBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden bg-white">
      {/* Soft Glows */}
      <div className="absolute -bottom-[30%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-gradient-to-tr from-[#dbeafe]/60 via-[#dbeafe]/20 to-transparent blur-[120px]" />
      <div className="absolute -top-[10%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-bl from-[#dbeafe]/40 to-transparent blur-[100px]" />
      <div className="absolute top-[40%] right-[20%] w-[30vw] h-[30vw] rounded-full bg-gradient-to-tl from-[#dbeafe]/30 to-transparent blur-[80px]" />

      {/* Dot Patterns */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#2563eb" opacity="0.25" />
          </pattern>
        </defs>
        {/* Top Left Blob */}
        <circle cx="22%" cy="28%" r="120" fill="url(#dot-grid)" />
        {/* Right Blob */}
        <circle cx="68%" cy="50%" r="100" fill="url(#dot-grid)" />
        {/* Bottom Right Blob */}
        <circle cx="95%" cy="95%" r="140" fill="url(#dot-grid)" />
        {/* Bottom Left Corner */}
        <circle cx="10%" cy="75%" r="80" fill="url(#dot-grid)" />
      </svg>

      {/* Dotted Accent Lines */}
      <div className="absolute top-[35%] left-[80%] h-32 w-[2px] border-l-[1.5px] border-dotted border-primary/50" />
      <div className="absolute top-[55%] left-[82%] w-16 h-[2px] border-t-[1.5px] border-dotted border-primary/50 -rotate-12" />
      <div className="absolute top-[85%] left-[83%] h-12 w-[2px] border-l-[1.5px] border-dotted border-primary/50 rotate-12" />

      {/* 3D Shapes */}
      {/* Icosahedron Top Left */}
      <svg width="70" height="70" viewBox="0 0 100 100" className="absolute top-[8%] left-[28%] text-primary opacity-60 drop-shadow-sm rotate-[15deg]">
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="50,5 90,30 80,80 50,95 20,80 10,30" />
          <polygon points="50,5 50,95" />
          <polygon points="10,30 90,30" />
          <polygon points="20,80 80,80" />
          <polygon points="50,5 30,45 50,95 70,45" />
          <circle cx="50" cy="5" r="2" fill="currentColor" />
          <circle cx="90" cy="30" r="2" fill="currentColor" />
          <circle cx="80" cy="80" r="2" fill="currentColor" />
          <circle cx="50" cy="95" r="2" fill="currentColor" />
          <circle cx="20" cy="80" r="2" fill="currentColor" />
          <circle cx="10" cy="30" r="2" fill="currentColor" />
        </g>
      </svg>

      {/* Cube Mid Top */}
      <svg width="45" height="45" viewBox="0 0 100 100" className="absolute top-[18%] left-[38%] text-primary opacity-60 drop-shadow-sm -rotate-12">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" />
          <line x1="50" y1="55" x2="50" y2="95" />
          <line x1="50" y1="55" x2="15" y2="35" />
          <line x1="50" y1="55" x2="85" y2="35" />
          {/* Back lines faintly */}
          <line x1="50" y1="15" x2="50" y2="45" strokeDasharray="2 4" opacity="0.5" />
          <line x1="15" y1="75" x2="50" y2="45" strokeDasharray="2 4" opacity="0.5" />
          <line x1="85" y1="75" x2="50" y2="45" strokeDasharray="2 4" opacity="0.5" />
        </g>
      </svg>

      {/* Polyhedron Top Right */}
      <svg width="60" height="60" viewBox="0 0 100 100" className="absolute top-[14%] right-[8%] text-primary opacity-50 drop-shadow-sm rotate-45">
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
          <polygon points="50,10 90,40 70,90 30,90 10,40" />
          <polygon points="50,10 60,50 90,40" />
          <polygon points="90,40 60,50 70,90" />
          <polygon points="70,90 60,50 30,90" />
          <polygon points="30,90 60,50 10,40" />
          <polygon points="10,40 60,50 50,10" />
          <circle cx="50" cy="10" r="2" fill="currentColor" />
          <circle cx="90" cy="40" r="2" fill="currentColor" />
          <circle cx="70" cy="90" r="2" fill="currentColor" />
          <circle cx="30" cy="90" r="2" fill="currentColor" />
          <circle cx="10" cy="40" r="2" fill="currentColor" />
          <circle cx="60" cy="50" r="2" fill="currentColor" />
        </g>
      </svg>

      {/* Prism Mid Left */}
      <svg width="50" height="50" viewBox="0 0 100 100" className="absolute top-[35%] left-[3%] text-primary opacity-60 drop-shadow-sm rotate-[30deg]">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <polygon points="20,30 80,10 90,40 30,60" />
          <polygon points="20,30 30,60 20,80 10,50" />
          <polygon points="30,60 90,40 80,70 20,80" />
        </g>
      </svg>

      {/* Small Cube Bottom Mid */}
      <svg width="25" height="25" viewBox="0 0 100 100" className="absolute top-[82%] left-[48%] text-primary opacity-50 drop-shadow-sm rotate-12">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" />
          <line x1="50" y1="55" x2="50" y2="95" />
          <line x1="50" y1="55" x2="15" y2="35" />
          <line x1="50" y1="55" x2="85" y2="35" />
        </g>
      </svg>

      {/* Icosahedron Bottom Right */}
      <svg width="55" height="55" viewBox="0 0 100 100" className="absolute top-[70%] right-[12%] text-primary opacity-60 drop-shadow-sm -rotate-12">
         <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="50,5 90,30 80,80 50,95 20,80 10,30" />
          <polygon points="50,5 50,95" />
          <polygon points="10,30 90,30" />
          <polygon points="20,80 80,80" />
          <polygon points="50,5 30,45 50,95 70,45" />
        </g>
      </svg>

      {/* Tube Bottom Right */}
      <svg width="180" height="40" viewBox="0 0 200 40" className="absolute top-[82%] left-[65%] text-primary opacity-60 drop-shadow-sm -rotate-[22deg]">
        <g fill="none" stroke="currentColor" strokeWidth="1.5">
          <ellipse cx="20" cy="20" rx="10" ry="15" />
          <ellipse cx="180" cy="20" rx="10" ry="15" />
          <line x1="20" y1="5" x2="180" y2="5" />
          <line x1="20" y1="35" x2="180" y2="35" />
          <line x1="180" y1="5" x2="180" y2="35" strokeDasharray="3 4" opacity="0.4"/>
        </g>
      </svg>
      
      {/* Small Cube Far Left */}
      <svg width="20" height="20" viewBox="0 0 100 100" className="absolute top-[55%] left-[4%] text-primary opacity-40 drop-shadow-sm rotate-45">
        <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="50,15 85,35 85,75 50,95 15,75 15,35" />
          <line x1="50" y1="55" x2="50" y2="95" />
          <line x1="50" y1="55" x2="15" y2="35" />
          <line x1="50" y1="55" x2="85" y2="35" />
        </g>
      </svg>

      {/* Small Icosahedron Mid */}
      <svg width="35" height="35" viewBox="0 0 100 100" className="absolute top-[80%] left-[28%] text-primary opacity-50 drop-shadow-sm rotate-45">
         <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
          <polygon points="50,5 90,30 80,80 50,95 20,80 10,30" />
          <polygon points="50,5 50,95" />
          <polygon points="10,30 90,30" />
          <polygon points="20,80 80,80" />
        </g>
      </svg>

    </div>
  )
}