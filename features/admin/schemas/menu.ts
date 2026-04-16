import { z } from "zod";

export const menuItemSchema = z.object({
  parent_id: z.number().int().positive().nullable().default(null),
  position: z.enum(["header", "footer"]),
  title: z.string().min(1, "Название обязательно").max(200),
  url: z.string().min(1, "URL обязателен").max(500),
  icon: z.string().max(100).nullable().default(null),
  sort_order: z.number().int().nonnegative().default(0),
  is_active: z.boolean().default(true),
  open_in_new_tab: z.boolean().default(false),
});

export type MenuItemFormData = z.infer<typeof menuItemSchema>;
