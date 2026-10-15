import {
  getAccessibleAreas,
  getRoleHome,
  getRoleRouteGroup,
  parseUserRole,
  UnsupportedRoleError,
} from "./user-role";

describe("parseUserRole", () => {
  it.each([
    ["cliente", "cliente"],
    ["entrenador", "entrenador"],
    ["administrador", "administrador"],
    ["  Entrenador ", "entrenador"],
    ["ADMINISTRADOR", "administrador"],
  ])("reconoce el rol %p", (rawRole, expected) => {
    expect(parseUserRole(rawRole)).toBe(expected);
  });

  it.each([["admin"], ["trainer"], [""], [null], [undefined], [1], [{}]])(
    "rechaza el valor desconocido %p",
    (rawRole) => {
      expect(parseUserRole(rawRole)).toBeNull();
    },
  );
});

describe("navegación por rol", () => {
  it("envía a cada rol a su inicio", () => {
    expect(getRoleHome("cliente")).toBe("/");
    expect(getRoleHome("entrenador")).toBe("/trainer");
    expect(getRoleHome("administrador")).toBe("/admin");
  });

  it("asigna el grupo de rutas de cada rol y deja a los invitados en el área de cliente", () => {
    expect(getRoleRouteGroup("cliente")).toBe("(app)");
    expect(getRoleRouteGroup("entrenador")).toBe("trainer");
    expect(getRoleRouteGroup("administrador")).toBe("admin");
    expect(getRoleRouteGroup(null)).toBe("(app)");
  });

  it("explica al usuario por qué no puede entrar", () => {
    expect(new UnsupportedRoleError().message).toBe(
      "Tu cuenta no tiene acceso a la aplicación móvil.",
    );
  });
});

describe("getAccessibleAreas", () => {
  it("deja al invitado en el área de cliente y en las pantallas de acceso", () => {
    expect(getAccessibleAreas(false, null)).toEqual({
      client: true,
      trainer: false,
      admin: false,
      auth: true,
    });
  });

  it.each([
    ["cliente", { client: true, trainer: false, admin: false, auth: false }],
    ["entrenador", { client: false, trainer: true, admin: false, auth: false }],
    ["administrador", { client: false, trainer: false, admin: true, auth: false }],
  ] as const)("solo abre el área propia del rol %p", (role, expected) => {
    expect(getAccessibleAreas(true, role)).toEqual(expected);
  });

  it("no abre ningún área a una sesión sin rol reconocido", () => {
    expect(getAccessibleAreas(true, null)).toEqual({
      client: false,
      trainer: false,
      admin: false,
      auth: false,
    });
  });
});
