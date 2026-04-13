'use client'

import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { Clock, Lightbulb, Target, Heart } from 'lucide-react'

const features = [
  {
    icon: Clock,
    title: 'Ваше время',
    description: 'Чем яснее задача, тем проще и дешевле реализация.',
    extra: 'Всегда быстро находим общий язык и задаём правильные вопросы.',
    gradient: 'from-orange-500 to-amber-400',
  },
  {
    icon: Lightbulb,
    title: 'Ваши идеи',
    description: 'Скажите чего вам хочется, а мы это сделаем.',
    extra: 'Докрутим, допилим исходя из опыта и всегда подскажем, как это сделать.',
    gradient: 'from-amber-500 to-yellow-400',
  },
  {
    icon: Target,
    title: 'Ваши задачи',
    description: 'Даже самые смелые задачи находят решения в диалоге.',
    extra: 'Не стесняйтесь спрашивать, даже самые смелые вопросы.',
    gradient: 'from-orange-600 to-orange-400',
  },
  {
    icon: Heart,
    title: 'Ваши нервы',
    description: 'Все наши менеджеры компетентны, дизайнеры с опытом.',
    extra: 'А монтажники ведут себя профессионально.',
    gradient: 'from-red-500 to-orange-400',
  },
]

export default function FeaturesSection() {
  const sectionRef = useRef(null)
  const isInView = useInView(sectionRef, { once: true, margin: '-100px' })

  return (
    <section ref={sectionRef} className="section-padding relative overflow-hidden bg-brand-dark">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,107,0,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(255,107,0,0.06),transparent_50%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 50%, rgba(255,107,0,0.06) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(245,158,11,0.05) 0%, transparent 50%)',
        }}
      />

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center md:mb-14"
        >
          <h2 className="mb-4 text-3xl font-black text-white md:text-5xl">Почему выбирают нас</h2>
          <p className="text-2xl font-bold text-brand-orange md:text-3xl">Мы ценим:</p>
        </motion.div>

        <div className="relative mx-auto max-w-3xl">
          <div
            className="pointer-events-none absolute bottom-6 left-[21px] top-8 w-px bg-gradient-to-b from-brand-orange/70 via-amber-500/40 to-white/10 md:left-[25px]"
            aria-hidden
          />

          <ol className="relative list-none space-y-0 p-0">
            {features.map((item, i) => {
              const Icon = item.icon
              const isLast = i === features.length - 1
              return (
                <li
                  key={item.title}
                  className={`relative flex gap-6 md:gap-8 ${isLast ? 'pb-0' : 'pb-10 md:pb-12'}`}
                >
                  <div className="relative z-10 flex w-11 shrink-0 justify-center md:w-12">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.85 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true, margin: '-50px' }}
                      transition={{ duration: 0.4, type: 'spring', stiffness: 260, damping: 22 }}
                      className={`rounded-full bg-gradient-to-br p-[2px] shadow-md ${item.gradient} shadow-black/30`}
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-dark text-sm font-black text-white ring-2 ring-brand-dark md:h-10 md:w-10 md:text-base">
                        {i + 1}
                      </span>
                    </motion.div>
                  </div>

                  <motion.article
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.45, delay: 0.05 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -4 }}
                    className="group min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition-colors duration-300 hover:border-white/18 md:p-8"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
                      <span
                        className={`mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md ${item.gradient} text-white shadow-black/25 sm:mx-0`}
                      >
                        <Icon className="h-6 w-6" strokeWidth={2} />
                      </span>
                      <div className="min-w-0 flex-1 text-center sm:text-left">
                        <h3 className="mb-2 text-xl font-black text-white md:text-2xl">{item.title}</h3>
                        <p className="mb-2 text-base leading-relaxed text-white/90 md:text-lg">{item.description}</p>
                        <p className="text-sm leading-relaxed text-white/65 md:text-base">{item.extra}</p>
                      </div>
                    </div>
                  </motion.article>
                </li>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
