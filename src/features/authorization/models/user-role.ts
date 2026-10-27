export const USER_ROLES = ["cliente", "entrenador", "administrador"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export type RoleRouteGroup = "(app)" | "trainer" | "admin";

const ROLE_HOME = {
  cliente: "/",
  entrenador: "/trainer",
  administrador: "/admin",
} as const satisfies Record<UserRole, string>;

const ROLE_ROUTE_GROUP: Record<UserRole, RoleRouteGroup> = {
  cliente: "(app)",
  entrenador: "trainer",
  administrador: "admin",
};

export class UnsupportedRoleError extends Error {
  constructor() {
    super("Tu cuenta no tiene acceso a la aplicación móvil.");
    this.name = "UnsupportedRoleError";
  }
}

/**
 * Converts the role sent by the backend into a known role.
 * Any unknown value returns null so callers can deny access (fail closed).
 */
export function parseUserRole(rawRole: unknown): UserRole | null {
  if (typeof rawRole !== "string") {
    return null;
  }

  const normalizedRole = rawRole.trim().toLowerCase();
  return USER_ROLES.find((role) => role === normalizedRole) ?? null;
}

export function getRoleHome(role: UserRole) {
  return ROLE_HOME[role];
}

export interface AccessibleAreas {
  client: boolean;
  trainer: boolean;
  admin: boolean;
  auth: boolean;
}

/**
 * Decides which route areas exist for the current session.
 * These guards only hide screens; the API is what enforces permissions.
 */
export function getAccessibleAreas(
  isAuthenticated: boolean,
  role: UserRole | null,
): AccessibleAreas {
  if (!isAuthenticated) {
    return { client: true, trainer: false, admin: false, auth: true };
  }

  return {
    client: role === "cliente",
    trainer: role === "entrenador",
    admin: role === "administrador",
    auth: false,
  };
}

/** Guests share the client area, where they can browse and sign in. */
export function getRoleRouteGroup(role: UserRole | null): RoleRouteGroup {
  return role ? ROLE_ROUTE_GROUP[role] : "(app)";
}
