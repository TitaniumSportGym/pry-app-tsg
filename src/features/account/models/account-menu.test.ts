import { getAccountMenu, getRoleLabel, getRoleShortcut } from './account-menu';

function labels(role: Parameters<typeof getAccountMenu>[0]) {
  return getAccountMenu(role).flatMap((section) => section.items.map((item) => item.label));
}

function availableRoutes(role: Parameters<typeof getAccountMenu>[0]) {
  return getAccountMenu(role)
    .flatMap((section) => section.items)
    .filter((item) => item.route)
    .map((item) => item.route);
}

describe('menú de la cuenta', () => {
  it('muestra al cliente las secciones del diseño', () => {
    expect(getAccountMenu('cliente').map((section) => section.title)).toEqual([
      'MI CUENTA',
      'ENTRENAMIENTO',
      'TITANIUM SPORT GYM',
      'PREFERENCIAS',
    ]);
    expect(labels('cliente')).toContain('Pagos y comprobantes');
  });

  it('solo habilita opciones que tienen pantalla', () => {
    expect(availableRoutes('cliente')).toEqual([
      '/memberships',
      '/account/privacy',
      '/account/terms',
    ]);
    expect(availableRoutes('entrenador')).toEqual([
      '/trainer/account/memberships',
      '/trainer/clients',
      '/trainer/routines',
      '/trainer/account/privacy',
      '/trainer/account/terms',
    ]);
    expect(availableRoutes('administrador')).toEqual([
      '/admin/users',
      '/admin/payments',
      '/admin/account/privacy',
      '/admin/account/terms',
    ]);
  });

  it('no mezcla rutas de otros roles', () => {
    expect(availableRoutes('cliente').some((route) => String(route).startsWith('/trainer'))).toBe(false);
    expect(availableRoutes('entrenador').some((route) => String(route).startsWith('/admin'))).toBe(false);
  });

  it('tiene un acceso directo y una etiqueta por rol', () => {
    expect(getRoleShortcut('entrenador').route).toBe('/trainer');
    expect(getRoleLabel('administrador')).toBe('Administrador');
  });
});
