import { getCameraAccess, normalizeScannedCode } from './access-code';

describe('normalizeScannedCode', () => {
  it('quita los espacios de los extremos', () => {
    expect(normalizeScannedCode('  TSG-ACC-8F2K71QZ \n')).toBe('TSG-ACC-8F2K71QZ');
  });

  it('descarta lecturas vacías', () => {
    expect(normalizeScannedCode('')).toBeNull();
    expect(normalizeScannedCode('   ')).toBeNull();
    expect(normalizeScannedCode(undefined)).toBeNull();
    expect(normalizeScannedCode(null)).toBeNull();
  });
});

describe('getCameraAccess', () => {
  it('espera mientras se consulta el permiso', () => {
    expect(getCameraAccess(null)).toBe('loading');
  });

  it('permite usar la cámara con el permiso concedido', () => {
    expect(getCameraAccess({ granted: true, canAskAgain: true })).toBe('granted');
  });

  it('puede volver a pedir el permiso si el sistema lo deja', () => {
    expect(getCameraAccess({ granted: false, canAskAgain: true })).toBe('askable');
  });

  it('manda a ajustes cuando el sistema ya no muestra el aviso', () => {
    expect(getCameraAccess({ granted: false, canAskAgain: false })).toBe('blocked');
  });
});
