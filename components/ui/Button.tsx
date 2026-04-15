import Link from 'next/link'
import { ReactNode } from 'react'

type ButtonProps = {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  children: ReactNode
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

const variants = {
  primary: 'bg-brand-orange text-white hover:bg-orange-600 border-transparent',
  outline: 'border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white',
  ghost: 'text-brand-orange hover:bg-orange-50 border-transparent',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
}

export default function Button({
  variant = 'primary', size = 'md', href, onClick,
  disabled, loading, children, className = '', type = 'button',
}: ButtonProps) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg font-semibold
    transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
    ${variants[variant]} ${sizes[size]} ${className}`

  if (href) return <Link href={href} onClick={onClick} className={cls}>{children}</Link>

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} className={cls}>
      {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  )
}
