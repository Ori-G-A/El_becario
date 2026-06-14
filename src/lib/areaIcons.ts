import {
  User,
  Users,
  Heart,
  School,
  GraduationCap,
  Rocket,
  BookOpen,
  Briefcase,
  House,
  Star,
  Coffee,
  Folder,
  Tag,
  Calendar,
  Dumbbell,
  Palette,
  type LucideIcon,
} from 'lucide-react'

/** Registro de iconos elegibles para un área (clave estable → componente). */
export const AREA_ICONS: Record<string, LucideIcon> = {
  user: User,
  users: Users,
  heart: Heart,
  school: School,
  'graduation-cap': GraduationCap,
  rocket: Rocket,
  'book-open': BookOpen,
  briefcase: Briefcase,
  house: House,
  star: Star,
  coffee: Coffee,
  folder: Folder,
  tag: Tag,
  calendar: Calendar,
  dumbbell: Dumbbell,
  palette: Palette,
}

export const AREA_ICON_KEYS = Object.keys(AREA_ICONS)
export const DEFAULT_AREA_ICON = 'tag'

/** Devuelve el componente del icono (o un fallback) para una clave guardada. */
export function getAreaIcon(name: string): LucideIcon {
  return AREA_ICONS[name] ?? Tag
}
