"use client";

import { useEffect } from "react";
import { trackEvent, EVENTS } from "@/lib/analytics";

export default function ProductViewTracker({
  slug,
  name,
}: {
  slug: string;
  name: string;
}) {
  useEffect(() => {
    trackEvent(EVENTS.view_product, { slug, name });
  }, [slug, name]);

  return null;
}
