import type { SymbolViewProps } from 'expo-symbols';

/**
 * Official legal text, copied from the website pages
 * https://titaniumsportgym.vercel.app/terms and /aviso-privacidad.
 * The backend has no legal endpoints yet: when the text changes on the website
 * it must be updated here too.
 */

export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'privacy-link'; text: string };

export interface LegalSection {
  title: string;
  blocks: LegalBlock[];
}

export interface DataCategory {
  title: string;
  description: string;
  icon: SymbolViewProps['name'];
}

export const LEGAL_CONTACT_EMAIL = 'tsghuejutla@gmail.com';
export const LEGAL_WEBSITE = 'https://titaniumsportgym.vercel.app';

export const TERMS = {
  title: 'TÉRMINOS Y CONDICIONES',
  summary:
    'Al usar la plataforma digital Titanium Sport Gym, aceptas las condiciones descritas en este documento.',
  sections: [
    {
      title: 'Datos de la empresa',
      blocks: [
        {
          type: 'paragraph',
          text: 'Titanium Sport Gym es un gimnasio ubicado en Huejutla de Reyes, Hidalgo, dedicado a la prestación de servicios deportivos y de acondicionamiento físico. Para cualquier duda relacionada con estos términos puedes contactarnos al correo tsghuejutla@gmail.com o al teléfono 771 221 4594.',
        },
      ],
    },
    {
      title: 'Marco legal aplicable',
      blocks: [
        {
          type: 'paragraph',
          text: 'El uso de esta plataforma se rige por la Ley Federal de Protección al Consumidor, las disposiciones sobre comercio electrónico del Código de Comercio y las regulaciones de PROFECO, así como por la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y demás normatividad vigente en México.',
        },
      ],
    },
    {
      title: 'Aceptación de los términos',
      blocks: [
        {
          type: 'paragraph',
          text: 'Al registrarte, iniciar sesión o marcar la casilla de aceptación, declaras que has leído y aceptas estos términos y condiciones, así como el Aviso de Privacidad. El uso continuo de la plataforma se considera aceptación renovada de cualquier actualización.',
        },
      ],
    },
    {
      title: 'Uso de la cuenta de usuario',
      blocks: [
        {
          type: 'paragraph',
          text: 'Cada usuario es responsable de la confidencialidad de su correo y contraseña. Está prohibido compartir credenciales con terceros o permitir el acceso no autorizado a la cuenta. Titanium Sport Gym puede suspender o cancelar cuentas cuando detecte uso indebido, fraude, suplantación de identidad o violaciones a estas condiciones.',
        },
      ],
    },
    {
      title: 'Procesos de compra, membresías y servicios',
      blocks: [
        {
          type: 'paragraph',
          text: 'La plataforma permite adquirir membresías, reservar servicios, contratar entrenamientos y realizar pagos en línea. El proceso incluye: selección de productos o servicios, confirmación del pedido, elección de método de pago y generación de comprobante. Los precios se muestran en moneda nacional e incluyen los impuestos aplicables.',
        },
        {
          type: 'paragraph',
          text: 'La vigencia y características de cada membresía se indicarán al momento de la compra (duración, tipo de acceso, horarios, etc.). Es responsabilidad del usuario revisar estos detalles antes de finalizar el pago.',
        },
      ],
    },
    {
      title: 'Pagos, facturación y reembolsos',
      blocks: [
        {
          type: 'paragraph',
          text: 'Los pagos pueden realizarse mediante tarjetas bancarias, medios electrónicos autorizados o en efectivo en las instalaciones del gimnasio. El usuario debe proporcionar datos de pago verídicos y estar autorizado para utilizarlos.',
        },
        {
          type: 'paragraph',
          text: 'Las solicitudes de reembolso o aclaración se analizarán de acuerdo con la política interna de Titanium Sport Gym y la legislación aplicable. En general, no se realizan devoluciones por periodos de membresía ya utilizados o por falta de asistencia del usuario.',
        },
      ],
    },
    {
      title: 'Cancelaciones y modificaciones',
      blocks: [
        {
          type: 'paragraph',
          text: 'El usuario puede solicitar cancelaciones o cambios de servicio en los canales oficiales de atención. Algunas membresías y promociones pueden ser no cancelables o no reembolsables; esto se indicará en la descripción del producto o servicio.',
        },
      ],
    },
    {
      title: 'Conducta del usuario y uso permitido',
      blocks: [
        {
          type: 'paragraph',
          text: 'El usuario se compromete a utilizar la plataforma de forma lícita, respetuosa y sin intentar vulnerar la seguridad del sistema. Queda prohibido:',
        },
        {
          type: 'list',
          items: [
            'Intentar acceder a cuentas de otros usuarios.',
            'Introducir código malicioso, realizar ataques de fuerza bruta o escaneos no autorizados.',
            'Manipular precios, promociones o información mostrada en la plataforma.',
          ],
        },
      ],
    },
    {
      title: 'Seguridad de la información',
      blocks: [
        {
          type: 'paragraph',
          text: 'La plataforma implementa medidas como contraseñas robustas, autenticación en dos pasos (OTP, enlace de confirmación o TOTP), expiración de sesiones e inicio de sesión seguro. El usuario se compromete a colaborar con estas medidas, mantener sus datos actualizados y reportar cualquier actividad sospechosa.',
        },
      ],
    },
    {
      title: 'Limitación de responsabilidad',
      blocks: [
        {
          type: 'paragraph',
          text: 'Titanium Sport Gym realizará esfuerzos razonables para mantener la disponibilidad y seguridad del sistema; sin embargo, no garantiza la ausencia total de fallos técnicos, interrupciones temporales o errores en contenido. La responsabilidad del gimnasio se limita, en su caso, al monto pagado por el usuario por el servicio afectado, sin incluir daños indirectos o pérdida de oportunidades.',
        },
      ],
    },
    {
      title: 'Propiedad intelectual',
      blocks: [
        {
          type: 'paragraph',
          text: 'Los logotipos, diseños, textos, imágenes y componentes de la plataforma son propiedad de Titanium Sport Gym o se utilizan con las licencias correspondientes. No se permite su reproducción o distribución sin autorización expresa por escrito.',
        },
      ],
    },
    {
      title: 'Modificaciones a los términos',
      blocks: [
        {
          type: 'paragraph',
          text: 'Titanium Sport Gym podrá actualizar estos términos y condiciones cuando sea necesario por cambios legales, mejoras del sistema o nuevos servicios. La versión vigente siempre estará disponible en esta sección. Cuando haya cambios relevantes, se notificará a los usuarios mediante avisos en la plataforma o por correo electrónico.',
        },
      ],
    },
    {
      title: 'Jurisdicción y resolución de controversias',
      blocks: [
        {
          type: 'paragraph',
          text: 'Para la interpretación y cumplimiento de estos términos, las partes se someten a las leyes mexicanas y a la jurisdicción de los tribunales competentes en Huejutla de Reyes, Hidalgo, renunciando a cualquier otro fuero que pudiera corresponderles.',
        },
      ],
    },
    {
      title: 'Aviso de Privacidad',
      blocks: [
        {
          type: 'paragraph',
          text: 'El tratamiento de los datos personales de los usuarios se detalla en el Aviso de Privacidad de Titanium Sport Gym. Te recomendamos leerlo antes de completar tu registro.',
        },
        { type: 'privacy-link', text: 'Ver Aviso de Privacidad' },
      ],
    },
  ] satisfies LegalSection[],
  closingNote:
    'Al continuar utilizando la plataforma y crear una cuenta, declaras que aceptas íntegramente estos términos y condiciones.',
  websiteUrl: `${LEGAL_WEBSITE}/terms`,
};

export const PRIVACY = {
  title: 'AVISO DE PRIVACIDAD',
  updatedAt: 'septiembre 2025',
  intro:
    'Este aviso explica de manera general cómo recabamos, usamos y protegemos tus datos personales cuando utilizas la plataforma digital y los servicios de Titanium Sport Gym.',
  dataCategoriesIntro: 'Dependiendo del servicio que utilices, podemos recabar datos como:',
  dataCategories: [
    {
      title: 'Identificación',
      description: 'Nombre y apellidos.',
      icon: { ios: 'person', android: 'person', web: 'person' },
    },
    {
      title: 'Contacto',
      description: 'Correo electrónico y número telefónico.',
      icon: { ios: 'envelope', android: 'mail', web: 'mail' },
    },
    {
      title: 'Facturación',
      description: 'Datos de facturación (RFC, domicilio fiscal) cuando se solicitan comprobantes.',
      icon: { ios: 'creditcard', android: 'credit_card', web: 'credit_card' },
    },
    {
      title: 'Membresía',
      description:
        'Información relacionada con tus membresías, asistencias, reservas y servicios contratados.',
      icon: { ios: 'crown', android: 'workspace_premium', web: 'workspace_premium' },
    },
  ] satisfies DataCategory[],
  sensitiveDataNote:
    'En general no se solicitan datos sensibles. En caso de requerirse información relacionada con tu salud para fines de entrenamiento, se te explicará de forma específica y se recabará tu consentimiento expreso.',
  purposesIntro: 'Tus datos personales se utilizan principalmente para:',
  purposes: [
    'Crear y administrar tu cuenta de usuario en la plataforma.',
    'Gestionar membresías, pagos, reservas, historial de asistencia y servicios contratados.',
    'Enviarte confirmaciones, recordatorios y avisos relacionados con tu cuenta o membresía.',
    'Atender dudas, aclaraciones, solicitudes de soporte y reclamaciones.',
  ],
  secondaryPurposes:
    'De manera secundaria, y solo cuando lo autorices, podemos usar tus datos para enviarte promociones, noticias del gimnasio, encuestas de satisfacción o información de nuevos servicios. Puedes pedir en cualquier momento dejar de recibir comunicaciones promocionales.',
  arco: {
    rights: ['Acceso', 'Rectificación', 'Cancelación', 'Oposición'],
    description:
      'Como titular de los datos, tienes derecho a Acceder, Rectificar, Cancelar u Oponerte (derechos ARCO) al tratamiento de tu información. También puedes revocar tu consentimiento cuando sea procedente.',
    requestIntro: `Para ejercer estos derechos, envía una solicitud al correo ${LEGAL_CONTACT_EMAIL} indicando:`,
    requirements: [
      'Nombre completo y datos de contacto.',
      'Descripción clara de la solicitud o derecho que deseas ejercer.',
      'Copia de tu identificación oficial o medio que acredite tu identidad.',
    ],
    response:
      'Te responderemos dentro de los plazos establecidos por la ley, indicando el resultado de tu solicitud y, en su caso, las medidas aplicadas.',
    emailSubject: 'Solicitud de derechos ARCO',
  },
  /** Shown as accordions under "Más información". */
  details: [
    {
      title: 'Responsable del tratamiento de datos',
      blocks: [
        {
          type: 'paragraph',
          text: 'Titanium Sport Gym, ubicado en Huejutla de Reyes, Hidalgo, es el responsable del uso y protección de tus datos personales. Cualquier duda sobre este aviso puede enviarse al correo tsghuejutla@gmail.com o consultarse en la recepción del gimnasio.',
        },
      ],
    },
    {
      title: 'Fundamento legal y consentimiento',
      blocks: [
        {
          type: 'paragraph',
          text: 'El tratamiento de tus datos se realiza con base en la Ley Federal de Protección de Datos Personales en Posesión de los Particulares y su reglamento. Al registrarte en la plataforma, proporcionar tus datos y aceptar este aviso, otorgas tu consentimiento para el tratamiento descrito.',
        },
      ],
    },
    {
      title: 'Transferencias de datos',
      blocks: [
        {
          type: 'paragraph',
          text: 'Titanium Sport Gym no vende tus datos personales. Solo podrán compartirse con terceros cuando:',
        },
        {
          type: 'list',
          items: [
            'Sea necesario para procesar pagos con instituciones bancarias o proveedores de servicios de cobro.',
            'Lo exija una autoridad competente mediante resolución legal.',
            'Sea requerido por proveedores que apoyan en la operación del sistema (por ejemplo, servicios de correo electrónico), siempre bajo acuerdos de confidencialidad.',
          ],
        },
      ],
    },
    {
      title: 'Medidas de seguridad',
      blocks: [
        {
          type: 'paragraph',
          text: 'Implementamos medidas técnicas y administrativas para proteger tu información, como contraseñas cifradas, autenticación de dos factores, conexiones seguras (HTTPS), control de accesos por rol y políticas internas de seguridad. Aunque ninguna tecnología es infalible, trabajamos para reducir riesgos de acceso, uso o divulgación no autorizados.',
        },
      ],
    },
    {
      title: 'Uso de cookies y tecnologías similares',
      blocks: [
        {
          type: 'paragraph',
          text: 'La plataforma puede utilizar cookies o tecnologías de seguimiento para mejorar tu experiencia, mantener tu sesión iniciada y obtener estadísticas de uso. Puedes configurar tu navegador para rechazarlas; sin embargo, algunas funciones del sitio podrían no funcionar correctamente.',
        },
      ],
    },
    {
      title: 'Cambios al Aviso de Privacidad',
      blocks: [
        {
          type: 'paragraph',
          text: 'Este aviso puede actualizarse para reflejar cambios legales o mejoras en nuestros procesos. La versión vigente estará disponible en la sección de Aviso de Privacidad del sitio web y se podrán colocar avisos en recepción o enviar correos informando cambios relevantes.',
        },
      ],
    },
    {
      title: 'Consentimiento',
      blocks: [
        {
          type: 'paragraph',
          text: 'Al registrar una cuenta, usar la plataforma y proporcionar tus datos, declaras que has leído y comprendido este Aviso de Privacidad y aceptas el tratamiento de tus datos personales en los términos aquí descritos.',
        },
      ],
    },
  ] satisfies LegalSection[],
  websiteUrl: `${LEGAL_WEBSITE}/aviso-privacidad`,
};

/** mailto link for ARCO requests; only the fixed address and subject, encoded. */
export function getArcoMailUrl() {
  return `mailto:${LEGAL_CONTACT_EMAIL}?subject=${encodeURIComponent(PRIVACY.arco.emailSubject)}`;
}
