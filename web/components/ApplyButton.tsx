'use client'

import { useState } from 'react'
import Link from 'next/link'

interface ApplyButtonProps {
  href: string
  scroll?: boolean
}

export default function ApplyButton({ href, scroll }: ApplyButtonProps) {
  const [clicked, setClicked] = useState(false)

  return (
    <Link 
      href={href}
      scroll={scroll}
      onClick={() => setClicked(true)}
      className={`group absolute z-20 flex items-center justify-center transition-all duration-[400ms] ease-out hover:duration-[600ms] hover:ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 active:scale-95 active:translate-y-1 cursor-pointer text-white font-extrabold text-3xl sm:text-4xl md:text-5xl rounded-2xl shadow-[0_0_30px_var(--glow)] border-b-4 px-8 py-4 md:px-12 md:py-6 overflow-hidden ${
        clicked
          ? 'bg-[#3b82f6] border-[#2563eb]'
          : "bg-[#2563eb] border-[#1e3a8a] hover:shadow-[0_0_60px_var(--glow)] before:content-[''] before:absolute before:h-2 before:w-2 before:top-1/2 before:left-1/2 before:-translate-x-1/2 before:-translate-y-1/2 before:scale-0 before:rounded-full before:bg-[#1e3a8a] before:transition-transform before:duration-[200ms] before:ease-out hover:before:duration-[600ms] hover:before:ease-in hover:before:delay-[100ms] hover:before:scale-[150] after:content-[''] after:absolute after:h-2 after:w-2 after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:scale-0 after:rounded-full after:bg-primary after:transition-transform after:duration-[300ms] after:ease-out hover:after:duration-[800ms] hover:after:ease-out hover:after:delay-[400ms] hover:after:scale-[150]"
      }`}
      style={{ left: '58.9%', top: '52.6%', transform: 'translate(-50%, -50%)', minWidth: '220px', minHeight: '80px' }}
    >
      <span className="relative z-10 transition-transform duration-[200ms] ease-out flex items-center justify-center">
        {clicked ? (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="w-10 h-10 sm:w-12 sm:h-12 animate-[zoomIn_0.6s_ease-out]" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        ) : (
          "Apply"
        )}
      </span>
    </Link>
  )
}
