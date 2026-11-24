import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const load = createRequire(__filename);
const { verifyReassure } = load('../../scripts/verify-reassure.cjs');

describe('Reassure CI: evidencia completa y línea base verificable', () => {
  let directory: string;
  const write = (file: string, data: unknown) => fs.writeFileSync(path.join(directory, file), JSON.stringify(data));
  const read = (file: string) => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(tmpdir(), 'tsg-reassure-test-'));
    const entry = { name: 'contraseña', runs: 2, durations: [1, 1], counts: [1, 1] };
    for (const side of ['baseline', 'current']) {
      write(`jest-${side}.json`, {
        success: true, numTotalTests: 1, numPassedTests: 1, numFailedTests: 0,
        numPendingTests: 0, numTodoTests: 0, numFailedTestSuites: 0, numPendingTestSuites: 0,
      });
      fs.writeFileSync(path.join(directory, `${side}.perf`),
        `${JSON.stringify({ metadata: { commitHash: side } })}\n${JSON.stringify(entry)}\n`);
    }
    write('output.json', {
      metadata: { baseline: { commitHash: 'baseline' }, current: { commitHash: 'current' } },
      significant: [], meaningless: [{ name: 'contraseña' }], countChanged: [],
      errors: [], warnings: [], added: [], removed: [],
    });
  });

  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  it('acepta una comparación completa del commit destino exacto', () => {
    expect(verifyReassure(directory, { baseline: 'baseline', current: 'current' })).toBe(1);
  });

  it('rechaza una línea base de otra rama o commit', () => {
    expect(() => verifyReassure(directory, { baseline: 'main-sha' })).toThrow('commit incorrecto');
  });

  it('rechaza la ausencia de línea base aunque exista un informe anterior', () => {
    fs.unlinkSync(path.join(directory, 'baseline.perf'));
    expect(() => verifyReassure(directory)).toThrow();
  });

  it.each([
    ['success', false], ['numTotalTests', 0], ['numPendingTests', 1], ['numTodoTests', 1],
    ['numFailedTests', 1], ['numPendingTestSuites', 1],
  ])('rechaza resultados de Jest incompletos: %s', (key, value) => {
    write('jest-current.json', { ...read('jest-current.json'), [key]: value });
    expect(() => verifyReassure(directory)).toThrow();
  });

  it('rechaza archivos de medición sin escenarios', () => {
    fs.writeFileSync(path.join(directory, 'current.perf'), JSON.stringify({ metadata: { commitHash: 'current' } }));
    expect(() => verifyReassure(directory)).toThrow('faltan escenarios');
  });

  it.each(['errors', 'warnings', 'added', 'removed'])('rechaza una comparación con %s', (key) => {
    write('output.json', { ...read('output.json'), [key]: ['incompleto'] });
    expect(() => verifyReassure(directory)).toThrow('Comparación incompleta');
  });

  it('rechaza informes obsoletos y escenarios omitidos', () => {
    const report = read('output.json');
    write('output.json', { ...report, metadata: { ...report.metadata, current: { commitHash: 'old' } } });
    expect(() => verifyReassure(directory)).toThrow('informe de otro commit');
    write('output.json', { ...report, meaningless: [] });
    expect(() => verifyReassure(directory)).toThrow('omite escenarios');
  });

  it('falla ante una regresión significativa aunque Reassure haya terminado con código cero', () => {
    write('output.json', { ...read('output.json'), meaningless: [],
      significant: [{ name: 'contraseña', durationDiff: 1 }] });
    expect(() => verifyReassure(directory)).toThrow('Regresiones de duración');
  });

  it('acepta mejoras y rechaza aumentos de renders', () => {
    const report = { ...read('output.json'), meaningless: [],
      significant: [{ name: 'contraseña', durationDiff: -1 }] };
    write('output.json', report);
    expect(verifyReassure(directory)).toBe(1);
    write('output.json', { ...report, countChanged: [{ name: 'contraseña', countDiff: 1 }] });
    expect(() => verifyReassure(directory)).toThrow('Aumento de renders');
  });
});
