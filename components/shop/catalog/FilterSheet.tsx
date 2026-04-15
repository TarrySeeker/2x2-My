"use client";

import Sheet from "@/components/ui/Sheet";
import Button from "@/components/ui/Button";
import FilterSidebar from "./FilterSidebar";
import type { ProductFacets } from "@/types";

type FilterSheetProps = {
  open: boolean;
  onClose: () => void;
  facets: ProductFacets;
};

export default function FilterSheet({ open, onClose, facets }: FilterSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      side="bottom"
      title="Фильтры"
      footer={
        <Button onClick={onClose} className="w-full">
          Показать результаты
        </Button>
      }
    >
      <div className="px-1">
        <FilterSidebar facets={facets} className="shadow-none border-none p-0" />
      </div>
    </Sheet>
  );
}
