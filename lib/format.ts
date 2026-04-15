export const formatRub = (value: number): string =>
  new Intl.NumberFormat("ru-RU").format(Math.round(value));

export const formatPriceLabel = (args: {
  price: number;
  priceFrom?: boolean;
  unit?: string | null;
}): string => {
  const base = `${formatRub(args.price)} ₽`;
  const prefix = args.priceFrom ? "от " : "";
  const suffix = args.unit ? ` / ${args.unit}` : "";
  return `${prefix}${base}${suffix}`;
};
