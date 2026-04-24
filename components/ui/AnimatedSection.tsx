'use client'

import { motion } from 'framer-motion'
import { ReactNode } from 'react'

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

/**
 * Анимация появления секции. Переведена на `whileInView` (вместо useInView +
 * animate-gate), чтобы гарантированно отработать в Firefox и mobile-Chrome:
 * при `animate={isInView ? {...} : {}}` если IntersectionObserver не
 * успевает сработать до того, как пользователь оказался в viewport (а в
 * FF/mobile-chrome это случалось), контент оставался сдвинут и невидим.
 *
 * Также держим `initial.opacity: 1` — даже если whileInView не сработает
 * из-за отключённого IO, секция останется видимой, только без entry-анимации.
 */
export default function AnimatedSection({ children, className = '', delay = 0, direction = 'up', style }: Props) {
  const d = dirs[direction]

  return (
    <motion.div
      initial={{ opacity: 1, x: d.x, y: d.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6, delay, ease: 'easeOut' }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
