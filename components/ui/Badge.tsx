import { ReactNode } from 'react'

type BadgeVariant = 'orange' | 'dark' | 'gray' | 'success' | 'danger' | 'info'

type BadgeProps = {
  children: ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  orange: 'bg-orange-100 text-brand-orange',
  dark: 'bg-brand-dark text-white',
  gray: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
}

export default function Badge({ children, variant = 'orange', className = '' }: BadgeProps) {
  return (
    <span className={`inline-block max-w-full px-3 py-1 text-left text-xs font-semibold leading-snug rounded-full ${variants[variant]} ${className}`}>
      {children}
    </span>
  )
}
