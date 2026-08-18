interface DetectiveMascotProps {
  className?: string
}

/**
 * Original detailed detective artwork, shifted from green into the ApplyOnce blue
 * palette while preserving the raster's highlights, shadows, and gradients.
 */
export default function DetectiveMascot({ className = '' }: DetectiveMascotProps) {
  return (
    <div className={`group motion-safe:animate-float-mascot ${className}`}>
      <img
        src="/detective.png"
        role="img"
        alt="ApplyOnce detective mascot inspecting your profile"
        className="mascot-tilt h-full w-full object-contain p-2 drop-shadow-[0_18px_35px_rgba(37,99,235,0.28)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] [filter:hue-rotate(105deg)_saturate(1.18)_contrast(1.04)_brightness(1.03)] group-hover:rotate-3 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:group-hover:rotate-0 motion-reduce:group-hover:scale-100"
      />
    </div>
  )
}
