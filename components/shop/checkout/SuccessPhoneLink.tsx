"use client";

import { Phone } from "lucide-react";
import { trackEvent, EVENTS } from "@/lib/analytics";

export default function SuccessPhoneLink() {
  return (
    <a
      href="tel:+79324247740"
      className="inline-flex items-center gap-2 rounded-lg border-2 border-brand-orange px-6 py-3 font-semibold text-brand-orange transition-colors hover:bg-brand-orange hover:text-white"
      onClick={() =>
        trackEvent(EVENTS.phone_click, { source: "checkout_success" })
      }
    >
      <Phone className="h-4 w-4" />
      +7 932 424-77-40
    </a>
  );
}
