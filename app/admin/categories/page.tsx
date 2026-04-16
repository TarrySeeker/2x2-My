"use client";

import { useCallback, useState } from "react";
import CategoriesPageClient from "@/features/admin/components/CategoriesPageClient";
import CategoryDialog from "@/features/admin/components/CategoryDialog";

export default function CategoriesPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | undefined>();
  const [parentId, setParentId] = useState<number | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  const handleEdit = useCallback((id: number) => {
    setEditId(id);
    setParentId(undefined);
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback((parent?: number) => {
    setEditId(undefined);
    setParentId(parent);
    setDialogOpen(true);
  }, []);

  const handleSaved = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <>
      <CategoriesPageClient
        key={refreshKey}
        onEdit={handleEdit}
        onAdd={handleAdd}
      />
      <CategoryDialog
        open={dialogOpen}
        editId={editId ?? null}
        parentId={parentId ?? null}
        onClose={() => {
          setDialogOpen(false);
          setEditId(undefined);
          setParentId(undefined);
        }}
        onSaved={handleSaved}
      />
    </>
  );
}
