"use client";

import * as React from "react";

/**
 * Заглушка. Заказы упразднены миграцией 006.
 */
export default function OrderDetailClient(): React.ReactElement {
  return (
    <div className="p-6 text-sm text-neutral-500">
      Заказы упразднены. См. /admin/leads.
    </div>
  );
}
