/**
 * The membership screens are reused in two route areas:
 * - client and guest: Servicios → Membresías
 * - trainer: Cuenta → Membresías (no extra tab)
 */
export type MembershipArea = "client" | "trainer";

const MEMBERSHIP_ROUTES = {
  client: {
    list: "/services/memberships",
    detail: "/services/memberships/[id]",
    parent: "/services",
  },
  trainer: {
    list: "/trainer/account/memberships",
    detail: "/trainer/account/memberships/[id]",
    parent: "/trainer/account",
  },
} as const;

export function getMembershipRoutes(area: MembershipArea) {
  return MEMBERSHIP_ROUTES[area];
}
