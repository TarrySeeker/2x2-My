'use client'

import { useRef, useState, useCallback } from 'react'
import Image from 'next/image'
import { Printer, Megaphone, Building2 } from 'lucide-react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import AnimatedSection from '@/components/ui/AnimatedSection'

const services = [
  {
    icon: Printer,
    title: 'Офсетная печать',
    description: 'Визитки, журналы, каталоги, буклеты. Экономим ваш бюджет. Офсет — это дешевле!',
    badge: 'Визитки от 1.7 р./шт (тираж 1000 шт)',
    image: '/img/pint.png',
    width: '90 см',
    height: '60 см',
  },
  {
    icon: Megaphone,
    title: 'Наружная реклама',
    description: 'Стелы, фасады, фигуры и многое другое. Реализуем любые, даже самые невероятные идеи!',
    badge: 'Световые буквы от 150 р./см.',
    image: '/port/1.png',
    width: '3 м',
    height: '1.5 м',
  },
  {
    icon: Building2,
    title: 'Фасады, МАФы и пр.',
    description: 'Работаем с подсветкой, комплексные решения по индивидуальным ТЗ, поможем придумать!',
    badge: 'Индивидуально',
    image: '/img/facades-maf.png',
    width: '12 м',
    height: '4 м',
  },
]

function RulerBorder({ width, height }: { width: string; height: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const smoothX = useSpring(mouseX, { stiffness: 200, damping: 25 })
  const smoothY = useSpring(mouseY, { stiffness: 200, damping: 25 })
  const [hover, setHover] = useState(false)
  const [pos, setPos] = useState({ xPct: 0, yPct: 0 })

  const topTicks = 20
  const sideTicks = 12

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
    setPos({
      xPct: (e.clientX - rect.left) / rect.width,
      yPct: (e.clientY - rect.top) / rect.height,
    })
  }, [mouseX, mouseY])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ pointerEvents: 'auto' }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Top ruler */}
      <div className="absolute -top-6 left-0 right-0 h-6">
        <motion.div
          className="absolute inset-0 bg-white/90 backdrop-blur-sm border border-brand-dark/10 rounded-t-lg overflow-hidden"
          animate={{ opacity: hover ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative w-full h-full">
            {Array.from({ length: topTicks + 1 }).map((_, i) => {
              const isMajor = i % 5 === 0
              return (
                <div
                  key={`t${i}`}
                  className="absolute bottom-0"
                  style={{ left: `${(i / topTicks) * 100}%` }}
                >
                  <div className={`${isMajor ? 'w-[1.5px] h-4 bg-brand-dark/40' : 'w-[1px] h-2.5 bg-brand-dark/15'}`} />
                  {isMajor && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-brand-dark/40">
                      {Math.round((i / topTicks) * parseFloat(width))}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="absolute top-0 right-1 text-[7px] font-bold text-brand-orange/70">{width}</div>
        </motion.div>

        {hover && (
          <motion.div
            className="absolute bottom-0 w-[1.5px] h-full bg-brand-orange z-10"
            style={{ left: smoothX }}
          >
            <motion.div
              className="absolute -top-5 left-1/2 -translate-x-1/2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {(pos.xPct * parseFloat(width)).toFixed(1)}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Left ruler */}
      <div className="absolute top-0 -left-6 bottom-0 w-6">
        <motion.div
          className="absolute inset-0 bg-white/90 backdrop-blur-sm border border-brand-dark/10 rounded-l-lg overflow-hidden"
          animate={{ opacity: hover ? 1 : 0.5 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative w-full h-full">
            {Array.from({ length: sideTicks + 1 }).map((_, i) => {
              const isMajor = i % 3 === 0
              return (
                <div
                  key={`l${i}`}
                  className="absolute right-0"
                  style={{ top: `${(i / sideTicks) * 100}%` }}
                >
                  <div className={`${isMajor ? 'h-[1.5px] w-4 bg-brand-dark/40' : 'h-[1px] w-2.5 bg-brand-dark/15'}`} />
                  {isMajor && (
                    <span className="absolute -left-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-brand-dark/40 -rotate-90 whitespace-nowrap">
                      {Math.round((i / sideTicks) * parseFloat(height))}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <div className="absolute bottom-1 left-0 text-[7px] font-bold text-brand-orange/70 -rotate-90 origin-bottom-left translate-x-3">{height}</div>
        </motion.div>

        {hover && (
          <motion.div
            className="absolute right-0 h-[1.5px] w-full bg-brand-orange z-10"
            style={{ top: smoothY }}
          >
            <motion.div
              className="absolute -left-7 top-1/2 -translate-y-1/2 bg-brand-orange text-white text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {(pos.yPct * parseFloat(height)).toFixed(1)}
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Crosshair lines */}
      {hover && (
        <>
          <motion.div
            className="absolute top-0 bottom-0 w-[1px] bg-brand-orange/20 pointer-events-none"
            style={{ left: smoothX }}
          />
          <motion.div
            className="absolute left-0 right-0 h-[1px] bg-brand-orange/20 pointer-events-none"
            style={{ top: smoothY }}
          />
        </>
      )}
    </div>
  )
}

export default function ServicesPreview() {
  return (
    <section className="section-padding bg-white">
      <div className="container">
        <div className="mb-14 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="text-3xl font-black text-brand-dark sm:text-4xl md:text-6xl"
          >
            Наши{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-orange via-amber-400 to-brand-orange">
              услуги
            </span>
          </motion.h2>
        </div>
        <div className="space-y-14">
          {services.map((s, i) => {
            const Icon = s.icon
            const reversed = i % 2 !== 0
            return (
              <AnimatedSection key={s.title} delay={i * 0.1} direction={reversed ? 'right' : 'left'}>
                <div className="relative md:pl-8 md:pt-8">
                  <div className="hidden md:block">
                    <RulerBorder width={s.width} height={s.height} />
                  </div>
                  <div className={`group flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} rounded-2xl border border-gray-100 bg-white transition-all duration-400 hover:shadow-xl md:rounded-3xl`}>
                    <div className="relative h-56 min-h-[220px] overflow-hidden md:h-auto md:min-h-[300px] md:w-1/2">
                      <Image
                        src={s.image}
                        alt={s.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        loading={i === 0 ? 'eager' : 'lazy'}
                        fetchPriority={i === 0 ? 'high' : 'low'}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                      <div className="absolute bottom-5 left-5 w-14 h-14 bg-brand-orange rounded-xl flex items-center justify-center shadow-lg">
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <div className="flex flex-col justify-center p-6 sm:p-8 md:w-1/2 md:p-12">
                      <h3 className="mb-3 text-xl font-black text-brand-dark sm:mb-4 sm:text-2xl md:text-3xl">{s.title}</h3>
                      <p className="mb-5 text-base leading-relaxed text-gray-500 sm:mb-6 md:text-lg">{s.description}</p>
                      <div>
                        <span className="inline-flex items-center gap-2 bg-brand-orange/10 text-brand-orange px-4 py-2 rounded-full text-sm font-semibold shadow-[0_0_12px_rgba(255,107,0,0.3)]">
                          <span className="w-2 h-2 bg-brand-orange rounded-full animate-pulse" />
                          {s.badge}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </AnimatedSection>
            )
          })}
        </div>
      </div>
    </section>
  )
}
