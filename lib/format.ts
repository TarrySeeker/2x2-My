export const formatRub = (value: number): string =>
  new Intl.NumberFormat("ru-RU").format(Math.round(value));

/**
 * Формирует подпись цены для каталога/карточки товара.
 *
 * Логика после Chain 4a:
 *   - если задан `priceTo` и он больше `price` → «от {price} до {priceTo} ₽»
 *   - иначе → «от {price} ₽» (всегда «от», т.к. финальная сумма
 *     согласуется менеджером);
 *   - суффикс с единицей измерения (`/ м²`, `/ см`, `/ тираж` и т.д.).
 */
export const formatPriceLabel = (args: {
  price: number;
  priceTo?: number | null;
  unit?: string | null;
}): string => {
  const suffix = args.unit ? ` / ${args.unit}` : "";
  const hasRange =
    typeof args.priceTo === "number" &&
    args.priceTo > args.price;
  if (hasRange) {
    return `от ${formatRub(args.price)} до ${formatRub(args.priceTo as number)} ₽${suffix}`;
  }
  return `от ${formatRub(args.price)} ₽${suffix}`;
};
