"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Script from "next/script";
import { MapPin, AlertTriangle } from "lucide-react";
import { trackEvent, EVENTS } from "@/lib/analytics";

export interface CdekSelectData {
  tariffCode: number;
  pointCode?: string;
  pointAddress?: string;
  deliverySum: number;
  cityCode: number;
}

interface CdekWidgetProps {
  onSelect: (data: CdekSelectData) => void;
  goods: Array<{ width: number; height: number; length: number; weight: number }>;
}

const YANDEX_KEY = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? "";
const FROM_CODE = Number(process.env.NEXT_PUBLIC_CDEK_FROM_CODE || "1104");

export default function CdekWidget({ onSelect, goods }: CdekWidgetProps) {
  const uniqueId = useId().replace(/:/g, "");
  const containerId = `cdek-map-${uniqueId}`;
  const widgetRef = useRef<{ open: () => void; close: () => void } | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<string | null>(null);

  const hasYandexKey = YANDEX_KEY.length > 0;

  const initWidget = useCallback(() => {
    if (!window.CDEKWidget || widgetRef.current) return;

    const widget = new window.CDEKWidget({
      apiKey: YANDEX_KEY,
      root: containerId,
      servicePath: "/api/cdek/proxy",
      from: { country_code: "RU", code: FROM_CODE },
      defaultLocation: "Ханты-Мансийск",
      canChoose: true,
      popup: true,
      lang: "rus",
      currency: "RUB",
      goods,
      tariffs: {
        office: [234, 136],
        door: [233, 137],
      },
      onChoose: (mode, tariff, address) => {
        const data: CdekSelectData = {
          tariffCode: tariff.tariff_code,
          pointCode: mode === "office" ? address.code : undefined,
          pointAddress: address.address || address.name || "",
          deliverySum: tariff.delivery_sum,
          cityCode: address.city_code,
        };
        setSelectedPoint(
          `${data.pointAddress} — ${tariff.delivery_sum} ₽ (${tariff.period_min}–${tariff.period_max} дн.)`,
        );
        trackEvent(EVENTS.cdek_select_pvz, {
          tariff: tariff.tariff_code,
          deliverySum: tariff.delivery_sum,
        });
        onSelect(data);
      },
    });

    widgetRef.current = widget;
  }, [containerId, goods, onSelect]);

  useEffect(() => {
    if (scriptReady && hasYandexKey) {
      initWidget();
    }
  }, [scriptReady, hasYandexKey, initWidget]);

  const handleOpen = () => {
    trackEvent(EVENTS.cdek_widget_open);
    if (widgetRef.current) {
      widgetRef.current.open();
    }
  };

  if (!hasYandexKey) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-amber-800">
            Выбор ПВЗ на карте временно недоступен
          </p>
          <p className="text-xs text-amber-600">
            Менеджер подберёт ПВЗ и свяжется с вами после оформления заказа.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Script
        src="https://cdn.jsdelivr.net/npm/@cdek-it/widget@3"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />

      <div id={containerId} className="hidden" />

      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-2 rounded-xl border border-brand-orange/30 bg-brand-orange-soft px-4 py-3 text-sm font-semibold text-brand-orange transition-colors hover:border-brand-orange hover:bg-brand-orange/10"
      >
        <MapPin className="h-4 w-4" />
        {selectedPoint ? "Изменить пункт выдачи" : "Выбрать пункт выдачи на карте"}
      </button>

      {selectedPoint && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <p className="text-sm font-medium text-green-800">Выбрано:</p>
          <p className="text-sm text-green-700">{selectedPoint}</p>
        </div>
      )}
    </div>
  );
}
