import AnimatedSection from '@/components/ui/AnimatedSection'
import ServicesHero from '@/components/sections/services/ServicesHero'
import ContactForm from '@/components/sections/contacts/ContactForm'
import ContactInfo from '@/components/sections/contacts/ContactInfo'
import ContactMap from '@/components/sections/contacts/ContactMap'
import { makeGenerateMetadata } from '@/lib/seo/metadata-cms'
import { JsonLdScript, buildBreadcrumbList } from '@/lib/seo/json-ld'
import { readPageSectionContent } from '@/lib/cms/page-section-content'
import { getSettingValue } from '@/lib/data/settings'

interface ContactsSetting {
  phone_primary?: string
  phone_secondary?: string
  email?: string
  address?: string
  address_geo?: { lat: number | null; lng: number | null }
}

// CMS-driven hero + contact_info. См. app/page.tsx.
export const dynamic = 'force-dynamic'

export const generateMetadata = makeGenerateMetadata({
  path: '/contacts',
  fallback: {
    title: 'Контакты рекламной компании «2х2» — Ханты-Мансийск, ул. Парковая 92 Б',
    description:
      'Телефон +7 (932) 424-77-40, адрес: Ханты-Мансийск, ул. Парковая 92 Б. Часы работы: Пн–Пт 09:00–19:00. Форма заявки, карта, мессенджеры.',
    keywords: ['контакты 2х2', 'рекламное агентство ханты-мансийск телефон', 'адрес типографии хмао'],
  },
})

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
  // Карта переведена со встроенного iframe на статическую карточку
  // (ContactMap.tsx) — клиентское «Этот контент заблокирован» уходит
  // вместе с iframe. CMS-поля map_embed_url / map_iframe_title больше
  // не используются (оставлены в БД как no-op для обратной совместимости).
  const mapTitle = infoCms?.content.map_iframe_title || 'Карта офиса 2×2'

  // Координаты карты + адрес офиса берутся из site_settings.contacts.
  // Раньше они были захардкожены в ContactMap.tsx — клиент менял их в
  // админке (/admin/content/settings → Контакты), сохранение проходило,
  // но карта не обновлялась. Теперь — единый источник истины.
  // Fallback: если БД пуста / поля null — используются дефолты в ContactMap.
  const contacts = await getSettingValue<ContactsSetting>('contacts', {})
  const mapLat = contacts.address_geo?.lat ?? null
  const mapLon = contacts.address_geo?.lng ?? null
  const mapAddress = contacts.address ?? null

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
              <div className="mt-8">
                <ContactMap
                  title={mapTitle}
                  lat={mapLat}
                  lon={mapLon}
                  address={mapAddress}
                />
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>
    </main>
  )
}
