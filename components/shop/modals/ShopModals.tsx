import OneClickModal from "./OneClickModal";
import QuoteModal from "./QuoteModal";

/**
 * Wrapper, монтируемый один раз в RootLayout.
 * Держит оба лид-модала. Открытие/закрытие — через useUIStore.
 *
 * Server component: QuoteModal и OneClickModal — async server wrappers,
 * которые читают ui_strings и передают тексты в свои клиентские
 * реализации (QuoteModalClient / OneClickModalClient).
 */
export default function ShopModals() {
  return (
    <>
      <OneClickModal />
      <QuoteModal />
    </>
  );
}
