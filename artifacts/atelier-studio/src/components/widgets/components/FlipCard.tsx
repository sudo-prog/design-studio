import { type ReactNode, useState } from 'react'
import { motion } from 'framer-motion'

interface FlipCardProps {
  front: ReactNode
  back: ReactNode
  className?: string
}

export default function FlipCard({ front, back, className = '' }: FlipCardProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  return (
    <div
      className={`perspective-1000 w-full h-full cursor-pointer ${className}`}
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          setIsFlipped(!isFlipped)
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? 'Show front' : 'Show settings'}
    >
      <motion.div
        className="relative w-full h-full preserve-3d"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden">
          {front}
        </div>
        <div
          className="absolute inset-0 backface-hidden rounded-2xl overflow-hidden"
          style={{ transform: 'rotateY(180deg)' }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  )
}
