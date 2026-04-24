"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { cookieBanner } from "@/content/cookie-banner";

/**
 * Загружает счётчики аналитики: Яндекс.Метрика и GA4.
 *
 * Подключается по env-переменным:
 *   NEXT_PUBLIC_YM_ID   — ID счётчика Яндекс.Метрики ("99999999")
 *   NEXT_PUBLIC_GA4_ID  — Measurement ID GA4 ("G-XXXXXXXXXX")
 *
 * Скрипты грузятся ТОЛЬКО при условии:
 *   1) Соответствующий ENV задан;
 *   2) Пользователь явно нажал «Принять» в `CookieBanner`
 *      (`localStorage.cookie_consent === 'accepted'`).
 *
 * До подтверждения cookie-баннера никакие сторонние теги не загружаются —
 * это требование 152-ФЗ и обещание UI cookie-баннера.
 *
 * Реакция на изменение consent в рантайме:
 *   - На клик «Принять» CookieBanner диспатчит `cookie-consent-changed`;
 *   - Так же ловим `storage`-event (если consent изменили в другой вкладке).
 *   - При смене на 'accepted' — компонент перерисовывается, скрипты
 *     грузятся без полного reload страницы.
 *
 * Реализация через `useSyncExternalStore` — это «правильный» React-API
 * для подписки на внешнее состояние без cascading effects.
 */

const CONSENT_EVENT = "cookie-consent-changed";

function readConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(cookieBanner.storageKey) === "accepted";
  } catch {
    return false;
  }
}

function subscribeConsent(callback: () => void): () => void {
  function handleStorage(e: StorageEvent) {
    if (e.key === cookieBanner.storageKey) callback();
  }
  window.addEventListener(CONSENT_EVENT, callback);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(CONSENT_EVENT, callback);
    window.removeEventListener("storage", handleStorage);
  };
}

// SSR-snapshot: до hydration considers consent=false. Если пользователь уже
// дал consent в прошлый раз, после mount произойдёт rehydrate и скрипты
// смонтируются.
function getServerConsent(): boolean {
  return false;
}

export default function AnalyticsScripts() {
  const ymId = process.env.NEXT_PUBLIC_YM_ID;
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;

  const consented = useSyncExternalStore(
    subscribeConsent,
    readConsent,
    getServerConsent,
  );

  if (!consented) return null;

  return (
    <>
      {ymId ? (
        <>
          <Script id="yandex-metrika" strategy="afterInteractive">
            {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();for(var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${ymId}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true, ecommerce:"dataLayer"});`}
          </Script>
          <noscript>
            <div>
              <img
                src={`https://mc.yandex.ru/watch/${ymId}`}
                style={{ position: "absolute", left: "-9999px" }}
                alt=""
              />
            </div>
          </noscript>
        </>
      ) : null}

      {ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${ga4Id}', { send_page_view: true });`}
          </Script>
        </>
      ) : null}
    </>
  );
}
