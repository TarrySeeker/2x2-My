import AnimatedSection from '@/components/ui/AnimatedSection'
import ServicesHero from '@/components/sections/services/ServicesHero'
import ContactForm from '@/components/sections/contacts/ContactForm'
import ContactInfo from '@/components/sections/contacts/ContactInfo'
import { makeGenerateMetadata } from '@/lib/seo/metadata-cms'
import { JsonLdScript, buildBreadcrumbList } from '@/lib/seo/json-ld'
import { readPageSectionContent } from '@/lib/cms/page-section-content'

export const generateMetadata = makeGenerateMetadata({
  path: '/contacts',
  fallback: {
    title: 'Контакты рекламной компании «2х2» — Ханты-Мансийск, ул. Парковая 92 Б',
    description:
      'Телефон +7 (932) 424-77-40, адрес: Ханты-Мансийск, ул. Парковая 92 Б. Часы работы: Пн–Пт 09:00–19:00. Форма заявки, карта, мессенджеры.',
    keywords: ['контакты 2х2', 'рекламное агентство ханты-мансийск телефон', 'адрес типографии хмао'],
  },
})

const MAP_EMBED_FALLBACK =
  'https://www.google.com/maps?q=%D1%83%D0%BB.+%D0%9F%D0%B0%D1%80%D0%BA%D0%BE%D0%B2%D0%B0%D1%8F,+92%D0%B1,+%D0%A5%D0%B0%D0%BD%D1%82%D1%8B-%D0%9C%D0%B0%D0%BD%D1%81%D0%B8%D0%B9%D1%81%D0%BA&hl=ru&z=15&output=embed'

export default async function ContactsPage() {
  // CMS: /contacts/hero
  const heroCms = await readPageSectionContent('/contacts', 'hero', 'hero')
  const heroData = {
    badge: heroCms?.content.badge || 'Контакты',
    title: heroCms?.content.title || 'Свяжитесь с нами',
    description:
      heroCms?.content.description ||
      'Перезвоним в течение часа и рассчитаем стоимость бесплатно',
  }

  // CMS: /contacts/contact_info — титулы + карта
  const infoCms = await readPageSectionContent(
    '/contacts',
    'contact_info',
    'contact_info',
  )
  const formTitle = infoCms?.content.form_title || 'Оставьте заявку'
  const infoTitle = infoCms?.content.info_title || 'Как с нами связаться'
  const mapEmbed = infoCms?.content.map_embed_url || MAP_EMBED_FALLBACK
  const mapTitle = infoCms?.content.map_iframe_title || 'Карта офиса 2×2'

  return (
    <main>
      <JsonLdScript
        data={buildBreadcrumbList([
          { name: 'Главная', url: '/' },
          { name: 'Контакты', url: '/contacts' },
        ])}
      />
      <ServicesHero
        badge={heroData.badge}
        title={heroData.title}
        description={heroData.description}
      />

      <section className="section-padding bg-white">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <AnimatedSection direction="left">
              <h2 className="text-2xl font-bold text-brand-dark mb-8">{formTitle}</h2>
              <ContactForm />
            </AnimatedSection>
            <AnimatedSection direction="right" delay={0.2}>
              <h2 className="text-2xl font-bold text-brand-dark mb-8">{infoTitle}</h2>
              <ContactInfo />
              <div className="mt-8 rounded-2xl overflow-hidden h-64">
                <iframe
                  src={mapEmbed}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title={mapTitle}
                />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </main>
  )
}
