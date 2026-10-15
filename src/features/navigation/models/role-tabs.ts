import type { AppTab } from "@/components/navigation/app-tab-bar";

const ACCOUNT_ICON: AppTab["icon"] = {
  ios: "person.crop.circle.fill",
  android: "account_circle",
  web: "account_circle",
};

export const CLIENT_TABS = [
  {
    name: "home",
    href: "/",
    label: "Inicio",
    icon: { ios: "house.fill", android: "home", web: "home" },
  },
  {
    name: "services",
    href: "/services",
    label: "Servicios",
    icon: { ios: "square.grid.2x2.fill", android: "apps", web: "apps" },
  },
  {
    name: "training",
    href: "/training",
    label: "Entrena",
    icon: { ios: "dumbbell.fill", android: "fitness_center", web: "fitness_center" },
  },
  { name: "account", href: "/account", label: "Cuenta", icon: ACCOUNT_ICON },
] as const satisfies readonly AppTab[];

export const TRAINER_TABS = [
  {
    name: "home",
    href: "/trainer",
    label: "Inicio",
    icon: { ios: "house.fill", android: "home", web: "home" },
  },
  {
    name: "clients",
    href: "/trainer/clients",
    label: "Clientes",
    icon: { ios: "person.2.fill", android: "group", web: "group" },
  },
  {
    name: "routines",
    href: "/trainer/routines",
    label: "Rutinas",
    icon: { ios: "list.bullet.clipboard.fill", android: "assignment", web: "assignment" },
  },
  { name: "account", href: "/trainer/account", label: "Cuenta", icon: ACCOUNT_ICON },
] as const satisfies readonly AppTab[];

export const ADMIN_TABS = [
  {
    name: "home",
    href: "/admin",
    label: "Inicio",
    icon: { ios: "chart.bar.fill", android: "dashboard", web: "dashboard" },
  },
  {
    name: "users",
    href: "/admin/users",
    label: "Usuarios",
    icon: { ios: "person.3.fill", android: "groups", web: "groups" },
  },
  {
    name: "payments",
    href: "/admin/payments",
    label: "Pagos",
    icon: { ios: "creditcard.fill", android: "payments", web: "payments" },
  },
  { name: "account", href: "/admin/account", label: "Cuenta", icon: ACCOUNT_ICON },
] as const satisfies readonly AppTab[];
