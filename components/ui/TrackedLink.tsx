"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";
import type { AnalyticsParams } from "@/lib/analytics";

type TrackedLinkProps = {
  href: string;
  event: string;
  eventParams?: AnalyticsParams;
  children: ReactNode;
  className?: string;
  target?: string;
  rel?: string;
};

export default function TrackedLink({
  href,
  event,
  eventParams,
  children,
  className,
  target,
  rel,
}: TrackedLinkProps) {
  return (
    <a
      href={href}
      onClick={() => trackEvent(event, eventParams)}
      className={className}
      target={target}
      rel={rel}
    >
      {children}
    </a>
  );
}
