"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import type { ProductWithRelations } from "@/types";

type ProductTabsProps = {
  product: ProductWithRelations;
};

export default function ProductTabs({ product }: ProductTabsProps) {
  const specs = Object.entries(
    (product.attributes as Record<string, unknown> | null) ?? {},
  ).filter(([, v]) => v != null && v !== "");

  return (
    <Tabs defaultValue="description" className="w-full">
      <TabsList>
        <TabsTrigger value="description">Описание</TabsTrigger>
        {specs.length > 0 && (
          <TabsTrigger value="specs">Характеристики</TabsTrigger>
        )}
        <TabsTrigger value="delivery">Доставка и оплата</TabsTrigger>
      </TabsList>

      <TabsContent value="description" className="pt-4">
        <div className="max-w-3xl whitespace-pre-line text-base leading-relaxed text-neutral-700">
          {product.description ?? product.short_description ?? "Подробное описание готовится. Напишите нам в WhatsApp или позвоните +7 (932) 424-77-40 — расскажем о материалах, сроках и ценах по вашей задаче."}
        </div>
      </TabsContent>

      {specs.length > 0 && (
        <TabsContent value="specs" className="pt-4">
          <dl className="grid max-w-3xl grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {specs.map(([key, value]) => (
              <div
                key={key}
                className="flex items-start justify-between gap-4 border-b border-dashed border-neutral-200 pb-2"
              >
                <dt className="text-sm font-medium text-neutral-500">{key}</dt>
                <dd className="text-sm font-semibold text-brand-dark">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </TabsContent>
      )}

      <TabsContent value="delivery" className="pt-4">
        <div className="flex flex-col gap-4 text-sm text-neutral-700">
          <div>
            <h3 className="mb-1 font-display text-base font-bold text-brand-dark">
              Самовывоз
            </h3>
            <p>
              Ханты-Мансийск, ул. Парковая 92 Б. Пн–Пт 09:00–19:00. Сб–Вс — по
              звонку.
            </p>
          </div>
          <div>
            <h3 className="mb-1 font-display text-base font-bold text-brand-dark">
              Доставка по ХМАО и ЯНАО
            </h3>
            <p>
              Курьер по Ханты-Мансийску. По региону — СДЭК, транспортные
              компании. Стоимость рассчитывается в корзине.
            </p>
          </div>
          {product.has_installation && (
            <div>
              <h3 className="mb-1 font-display text-base font-bold text-brand-dark">
                Монтаж
              </h3>
              <p>
                Выезжаем с замерами и монтажом по ХМАО-Югре и ЯНАО. Стоимость
                монтажа рассчитывается индивидуально.
              </p>
            </div>
          )}
          <div>
            <h3 className="mb-1 font-display text-base font-bold text-brand-dark">
              Оплата
            </h3>
            <p>
              Для физлиц — карта, СБП, наличные. Для юрлиц — счёт на оплату, НДС
              не облагается.
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
