export interface CdekTariffResult {
  tariff_code: number;
  tariff_name: string;
  tariff_description: string;
  delivery_mode: number;
  delivery_sum: number;
  period_min: number;
  period_max: number;
  calendar_min?: number;
  calendar_max?: number;
}

export interface CdekCalculateResponse {
  tariff_code?: number;
  tariff_name?: string;
  delivery_sum: number;
  period_min: number;
  period_max: number;
  total_sum: number;
  currency: string;
  errors?: CdekError[];
}

export interface CdekTariffListResponse {
  tariff_codes: CdekTariffResult[];
  errors?: CdekError[];
}

export interface CdekError {
  code: string;
  message: string;
}

export interface CdekCity {
  code: number;
  city: string;
  fias_guid?: string;
  country_code: string;
  region: string;
  sub_region?: string;
  postal_codes?: string[];
  longitude?: number;
  latitude?: number;
}

export interface CdekDeliveryPoint {
  code: string;
  name: string;
  type: string;
  owner_code: string;
  address_comment: string;
  nearest_station?: string;
  work_time: string;
  phones: { number: string }[];
  email?: string;
  location: {
    country_code: string;
    region_code: number;
    region: string;
    city_code: number;
    city: string;
    postal_code?: string;
    longitude: number;
    latitude: number;
    address: string;
    address_full: string;
  };
  dimensions?: { width: number; height: number; depth: number };
  have_cashless: boolean;
  have_cash: boolean;
  is_dressing_room: boolean;
  images?: { url: string }[];
}

export interface CdekOrderRequest {
  type: 1 | 2;
  number: string;
  tariff_code: number;
  shipment_point?: string;
  delivery_point?: string;
  from_location?: { code: number; address?: string };
  to_location?: { code: number; address?: string };
  sender: {
    name: string;
    phones: { number: string }[];
  };
  recipient: {
    name: string;
    phones: { number: string }[];
    email?: string;
  };
  packages: {
    number: string;
    weight: number;
    length?: number;
    width?: number;
    height?: number;
    items: {
      name: string;
      ware_key: string;
      payment: { value: number };
      cost: number;
      amount: number;
      weight: number;
    }[];
  }[];
}

export interface CdekOrderResponse {
  entity: {
    uuid: string;
  };
  requests: {
    request_uuid: string;
    type: string;
    state: string;
    errors?: CdekError[];
  }[];
}

export interface CdekWebhookPayload {
  type: "ORDER_STATUS" | "PRINT_FORM";
  date_time: string;
  uuid: string;
  attributes: {
    is_return?: boolean;
    is_reverse?: boolean;
    is_client_return?: boolean;
    cdek_number?: string;
    number?: string;
    status_code?: string;
    status_date_time?: string;
    city_name?: string;
    code?: string;
  };
}

export const CDEK_STATUS_MAP: Record<string, string> = {
  "1": "CREATED",
  "2": "DELETED",
  "3": "ACCEPTED_AT_SENDER_WH",
  "6": "DISPATCHED",
  "7": "HANDED_TO_CARRIER",
  "13": "ACCEPTED_AT_RECEIVER_WH",
  "16": "OUT_FOR_DELIVERY",
  "18": "DELIVERED",
  "20": "NOT_DELIVERED",
};

export const IM_TARIFF_CODES = [136, 137, 138, 139, 233, 234];
