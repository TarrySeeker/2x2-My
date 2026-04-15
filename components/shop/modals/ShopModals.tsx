"use client";

import OneClickModal from "./OneClickModal";
import QuoteModal from "./QuoteModal";

/**
 * Wrapper, монтируемый один раз в RootLayout.
 * Держит оба лид-модала. Открытие/закрытие — через useUIStore.
 */
export default function ShopModals() {
  return (
    <>
      <OneClickModal />
      <QuoteModal />
    </>
  );
}
