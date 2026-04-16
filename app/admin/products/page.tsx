"use client";

import { useCallback, useState } from "react";
import ProductsPageClient from "@/features/admin/components/ProductsPageClient";
import ProductDialog from "@/features/admin/components/ProductDialog";

export default function ProductsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenDialog = useCallback((productId?: number) => {
    setEditId(productId);
    setDialogOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <>
      <ProductsPageClient
        key={refreshKey}
        onOpenDialog={handleOpenDialog}
      />
      <ProductDialog
        open={dialogOpen}
        productId={editId ?? null}
        onClose={() => {
          setDialogOpen(false);
          setEditId(undefined);
        }}
        onSaved={handleSaved}
      />
    </>
  );
}
