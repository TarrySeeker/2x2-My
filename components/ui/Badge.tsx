import { ReactNode } from 'react'

type BadgeProps = {
  children: ReactNode
  variant?: 'orange' | 'dark' | 'gray'
  className?: string
}

const variants = {
  orange: 'bg-orange-100 text-brand-orange',
  dark: 'bg-brand-dark text-white',
  gray: 'bg-gray-100 text-gray-600',
}

export default function Badge({ children, variant = 'orange', className = '' }: BadgeProps) {
  return (
    <span className={`inline-block max-w-full px-3 py-1 text-left text-xs font-semibold leading-snug rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
