import {
  Calendar,
  Briefcase,
  Users,
  MapPin,
  Factory,
  UserCheck,
  Zap,
  ShieldCheck,
  Shield,
  Printer,
  Megaphone,
  Building2,
  Sparkles,
  Bus,
  LayoutGrid,
  Clock,
  Lightbulb,
  Target,
  Heart,
  Timer,
  Wrench,
  Ruler,
  Phone,
  Mail,
  Send,
  Gift,
  HelpCircle,
  ArrowRight,
  Image as ImageIcon,
  RectangleHorizontal,
  Newspaper,
  Signpost,
  Landmark,
  Truck,
  Compass,
  type LucideIcon,
} from "lucide-react";

/**
 * Карта Lucide-иконок: имя из CMS → React-компонент.
 *
 * Если клиент в админке введёт имя, которого нет в карте — компонент
 * вернёт `fallback` (по умолчанию Sparkles), чтобы UI не упал.
 *
 * Дополнения сюда нужны редко (только когда копирайтер хочет новую
 * иконку). Чтобы не таскать всю lucide-react по бандлу — список
 * фиксирован и tree-shaken.
 */
export const ICON_MAP: Record<string, LucideIcon> = {
  Calendar,
  Briefcase,
  Users,
  MapPin,
  Factory,
  UserCheck,
  Zap,
  ShieldCheck,
  Shield,
  Printer,
  Megaphone,
  Building2,
  Sparkles,
  Bus,
  LayoutGrid,
  Clock,
  Lightbulb,
  Target,
  Heart,
  Timer,
  Wrench,
  Ruler,
  Phone,
  Mail,
  Send,
  Gift,
  HelpCircle,
  ArrowRight,
  Image: ImageIcon,
  RectangleHorizontal,
  Newspaper,
  Signpost,
  Landmark,
  Truck,
  Compass,
};

export function resolveIcon(
  name: string | undefined | null,
  fallback: LucideIcon = Sparkles,
): LucideIcon {
  if (!name) return fallback;
  return ICON_MAP[name] ?? fallback;
}
