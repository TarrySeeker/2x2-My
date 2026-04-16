interface CdekWidgetTariff {
  tariff_code: number;
  tariff_name: string;
  delivery_sum: number;
  period_min: number;
  period_max: number;
}

interface CdekWidgetAddress {
  code?: string;
  name?: string;
  address?: string;
  city_code: number;
  city?: string;
}

interface CdekWidgetConfig {
  apiKey?: string;
  root: string;
  servicePath: string;
  from?: { country_code: string; code: number };
  defaultLocation?: string;
  canChoose?: boolean;
  popup?: boolean;
  lang?: string;
  currency?: string;
  goods?: Array<{ width: number; height: number; length: number; weight: number }>;
  tariffs?: {
    office?: number[];
    door?: number[];
  };
  onChoose?: (
    mode: "office" | "door",
    tariff: CdekWidgetTariff,
    address: CdekWidgetAddress,
  ) => void;
  onReady?: () => void;
}

declare global {
  interface Window {
    CDEKWidget?: new (config: CdekWidgetConfig) => {
      open: () => void;
      close: () => void;
    };
  }
}

export {};
