import { getLegalRoutes } from './legal-area';
import { getArcoMailUrl, LEGAL_CONTACT_EMAIL, PRIVACY, TERMS } from './legal-content';

describe('contenido legal', () => {
  it('conserva las 14 secciones de los términos del sitio web', () => {
    expect(TERMS.sections).toHaveLength(14);
    expect(TERMS.sections[0].title).toBe('Datos de la empresa');
    expect(TERMS.sections[13].title).toBe('Aviso de Privacidad');
  });

  it('reparte las 10 secciones del aviso de privacidad entre tarjetas, usos, ARCO y detalles', () => {
    expect(PRIVACY.dataCategories).toHaveLength(4);
    expect(PRIVACY.purposes).toHaveLength(4);
    expect(PRIVACY.arco.rights).toEqual(['Acceso', 'Rectificación', 'Cancelación', 'Oposición']);
    expect(PRIVACY.details.map((section) => section.title)).toEqual([
      'Responsable del tratamiento de datos',
      'Fundamento legal y consentimiento',
      'Transferencias de datos',
      'Medidas de seguridad',
      'Uso de cookies y tecnologías similares',
      'Cambios al Aviso de Privacidad',
      'Consentimiento',
    ]);
  });

  it('usa el correo oficial del gimnasio y enlaces seguros', () => {
    expect(LEGAL_CONTACT_EMAIL).toBe('tsghuejutla@gmail.com');
    expect(getArcoMailUrl()).toBe(
      'mailto:tsghuejutla@gmail.com?subject=Solicitud%20de%20derechos%20ARCO',
    );
    expect(TERMS.websiteUrl.startsWith('https://')).toBe(true);
    expect(PRIVACY.websiteUrl.startsWith('https://')).toBe(true);
  });
});

describe('rutas legales por rol', () => {
  it('abre las pantallas dentro de la pestaña Más de cada rol', () => {
    expect(getLegalRoutes('cliente').terms).toBe('/account/terms');
    expect(getLegalRoutes('entrenador').privacy).toBe('/trainer/account/privacy');
    expect(getLegalRoutes('administrador').parent).toBe('/admin/account');
    expect(getLegalRoutes(null).terms).toBe('/account/terms');
  });
});
