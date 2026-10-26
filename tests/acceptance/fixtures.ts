import type { MembershipPlan } from '../../src/features/memberships/models/membership';
import type { Product } from '../../src/features/store/models/product';

// Synthetic examples based on the existing integration scenarios.
export const monthly: MembershipPlan = {
  id: 'c1cad6f0-ac55-49ce-820d-5cf9dc0cf6d5',
  name: 'Regular mensual',
  description: 'Membresía mensual.',
  type: 'individual',
  durationDays: 30,
  price: 440,
  pricePerPerson: 440,
  minPeople: 1,
  maxPeople: 1,
  requiresStudentProof: false,
  benefits: ['Acceso al gimnasio por 30 días', 'Acceso a rutinas y entrenamientos'],
  sortOrder: 4,
};

export const couple: MembershipPlan = {
  ...monthly,
  id: '7939f270-1a01-4f8f-a2b6-09996d6e1cfb',
  name: 'Paquete 2 personas',
  type: 'group',
  price: 780,
  pricePerPerson: 390,
  minPeople: 2,
  maxPeople: 2,
  benefits: ['Acceso mensual para 2 personas'],
  sortOrder: 8,
};

export const student: MembershipPlan = {
  ...monthly,
  id: 'e3d4f560-10a2-4bc3-8d45-123456789abc',
  name: 'Mensual estudiante',
  type: 'student',
  price: 350,
  pricePerPerson: 350,
  requiresStudentProof: true,
  benefits: ['Acceso mensual con tarifa de estudiante'],
};

export const creatine: Product = {
  id: 138,
  name: 'Creatina monohidratada 300 g',
  brand: 'Optimum Nutrition',
  categoryId: 2,
  categoryName: 'Suplementos',
  kind: 'supplement',
  price: 549,
  stock: 26,
  imageUrls: [],
  description: 'Creatina monohidratada micronizada',
  features: [],
  specs: [{ label: 'Presentación', value: '300 g' }],
  createdAt: null,
};

export const shirt: Product = {
  ...creatine,
  id: 101,
  name: 'Playera Block Party Negro',
  brand: 'YoungLA',
  categoryId: 1,
  categoryName: 'Ropa deportiva',
  kind: 'apparel',
  price: 599,
  stock: 0,
  description: 'Playera deportiva de corte ajustado',
  features: ['Corte ajustado'],
  specs: [{ label: 'Talla', value: 'M' }],
};

export const protein: Product = {
  ...creatine,
  id: 139,
  name: 'Proteína de suero',
  brand: 'Titanium',
  price: 799,
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
};
