import { ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  hover?: boolean
}

export default function Card({ children, className = '', hover = true }: CardProps) {
  return (
    <div className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100
      ${hover ? 'hover:shadow-md hover:-translate-y-1 transition-all duration-300' : ''}
      ${className}`}>
      {children}
    </div>
  )
}
