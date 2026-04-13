'use client'

import { motion, useInView } from 'framer-motion'
import { useRef, ReactNode } from 'react'

type Props = {
  children: ReactNode
  className?: string
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'none'
  style?: React.CSSProperties
}

const dirs = {
  up:    { y: 40, x: 0 },
  left:  { x: -40, y: 0 },
  right: { x: 40, y: 0 },
  none:  { x: 0, y: 0 },
}

export default function AnimatedSection({ children, className = '', delay = 0, direction = 'up', style }: Props) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const d = dirs[direction]

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 1, x: d.x, y: d.y }}
      animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 1, x: d.x, y: d.y }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
