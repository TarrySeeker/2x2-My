import Script from "next/script";

/**
 * Загружает счётчики аналитики: Яндекс.Метрика и GA4.
 *
 * Обе системы подключаются по env-переменным:
 *   NEXT_PUBLIC_YM_ID   — ID счётчика Яндекс.Метрики ("99999999")
 *   NEXT_PUBLIC_GA4_ID  — Measurement ID GA4 ("G-XXXXXXXXXX")
 *
 * Если ID не заданы — ни один тег не рендерится.
 * Все события из `lib/analytics.ts` автоматически начнут работать.
 */
export default function AnalyticsScripts() {
  const ymId = process.env.NEXT_PUBLIC_YM_ID;
  const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;

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
