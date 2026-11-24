import { trainerProfile } from '../../../../tests/fixtures/privacy';

import { parseTrainerProfile, personalDataRows, validateRectification } from './personal-data';

describe('datos personales', () => {
  it('normaliza los datos editables y permite borrar el teléfono opcional', () => {
    expect(validateRectification({ fullName: ' Ana ', phone: ' +52 (771) 123-4567 ' })).toEqual({
      values: { fullName: 'Ana', phone: '+52 (771) 123-4567' }, errors: {},
    });
    expect(validateRectification({ fullName: 'Ana', phone: ' ' }).errors).toEqual({});
    expect(validateRectification({ fullName: 'a'.repeat(160), phone: '1'.repeat(30) }).errors).toEqual({});
  });

  it('permite vaciar los datos opcionales sin exigir más datos personales que el backend', () => {
    expect(validateRectification({ fullName: ' ', phone: ' ' })).toEqual({
      values: { fullName: '', phone: '' }, errors: {},
    });
  });

  it.each(['a'.repeat(161)])('rechaza el nombre demasiado largo', (fullName) => {
    expect(validateRectification({ fullName, phone: '' }).errors.fullName).toBeDefined();
  });

  it.each(['abc', '--()', '1'.repeat(31)])('rechaza el teléfono inválido %j', (phone) => {
    expect(validateRectification({ fullName: 'Ana', phone }).errors.phone).toBeDefined();
  });

  it('solo admite los campos del contrato y rechaza perfiles de otra cuenta', () => {
    const profile = trainerProfile();
    expect(parseTrainerProfile({ profile: { ...profile, password: 'secret', accessToken: 'secret' } }, 'user-1')).toEqual(profile);
    expect(() => parseTrainerProfile({ profile }, 'user-2')).toThrow();
  });

  it.each([
    null, undefined, [], {}, { profile: null }, { profile: [] },
    { profile: trainerProfile({ fullName: null as unknown as string }) },
    { profile: trainerProfile({ experienceYears: -1 }) },
    { profile: trainerProfile({ experienceYears: 1.5 }) },
    { profile: trainerProfile({ experienceYears: NaN }) },
  ])('rechaza respuestas incompletas sin convertirlas en datos guardados (%j)', (response) => {
    expect(() => parseTrainerProfile(response, 'user-1')).toThrow('No se pudo verificar la respuesta del perfil.');
  });

  it.each([
    ['cliente', 'local', 'normal', 'Cliente', 'Local', 'Contraseña'],
    ['entrenador', 'google', 'otp', 'Entrenador', 'Google', 'Código por correo'],
    ['desconocido', undefined, 'desconocido', 'No informado', 'No informado', 'No informado'],
    ['administrador', 'otro', undefined, 'Administrador', 'No informado', 'No informado'],
    ['cliente', '__proto__', 'constructor', 'Cliente', 'No informado', 'No informado'],
  ])('expone únicamente datos consultables del perfil %s', (rol, provider, authMethod, label, providerLabel, authLabel) => {
    const rows = personalDataRows({ id: 'user-1', email: 'persona@example.com', rol, provider, authMethod });
    expect(rows.map((row) => row.value)).toEqual(['user-1', 'persona@example.com', label, providerLabel, authLabel]);
  });
});
