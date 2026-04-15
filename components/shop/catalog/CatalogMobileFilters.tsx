"use client";

import { useState } from "react";
import CatalogToolbar from "./CatalogToolbar";
import FilterSheet from "./FilterSheet";
import type { ProductFacets } from "@/types";

type CatalogMobileFiltersProps = {
  total: number;
  currentSort: string;
  facets: ProductFacets;
};

export default function CatalogMobileFilters({
  total,
  currentSort,
  facets,
}: CatalogMobileFiltersProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <CatalogToolbar
        total={total}
        currentSort={currentSort}
        onOpenFilters={() => setOpen(true)}
      />
      <FilterSheet open={open} onClose={() => setOpen(false)} facets={facets} />
    </>
  );
}
