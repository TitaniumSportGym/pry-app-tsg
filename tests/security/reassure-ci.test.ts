import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

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

  it('acepta muestras atípicas registradas por Reassure sin contarlas como pruebas omitidas', () => {
    const file = path.join(directory, 'current.perf');
    const [header, entry] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
    fs.writeFileSync(file, `${JSON.stringify(header)}\n${JSON.stringify({
      ...entry, runs: 3, counts: [1, 1, 1], outlierDurations: [10],
    })}\n`);
    expect(verifyReassure(directory)).toBe(1);
  });

  it.each([
    { runs: 3, counts: [1, 1, 1] },
    { runs: 3, outlierDurations: [10] },
    { runs: 3, counts: [1, 1, 1], outlierDurations: [-1] },
    { runs: 3, counts: [1, 1, 1], outlierDurations: [null] },
  ])('rechaza datos perdidos o muestras atípicas inválidas: %j', (change) => {
    const file = path.join(directory, 'current.perf');
    const [header, entry] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
    fs.writeFileSync(file, `${JSON.stringify(header)}\n${JSON.stringify({ ...entry, ...change })}\n`);
    expect(() => verifyReassure(directory)).toThrow();
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

  it.each(['complete', 'outlier', 'incomplete', 'regression'])('propaga a CI el código de salida correcto: %s', (scenario) => {
    if (scenario === 'outlier') {
      const file = path.join(directory, 'current.perf');
      const [header, entry] = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
      fs.writeFileSync(file, `${JSON.stringify(header)}\n${JSON.stringify({
        ...entry, runs: 3, counts: [1, 1, 1], outlierDurations: [10],
      })}\n`);
    }
    if (scenario === 'incomplete') fs.unlinkSync(path.join(directory, 'baseline.perf'));
    if (scenario === 'regression') {
      write('output.json', { ...read('output.json'), meaningless: [],
        significant: [{ name: 'contraseña', durationDiff: 1 }] });
    }
    const result = spawnSync(process.execPath, [path.resolve(__dirname, '../../scripts/verify-reassure.cjs'), directory], {
      encoding: 'utf8',
      env: { ...process.env, REASSURE_BASE_SHA: 'baseline', REASSURE_CURRENT_SHA: 'current' },
    });
    expect(result.error).toBeUndefined();
    expect(result.status).toBe(['complete', 'outlier'].includes(scenario) ? 0 : 1);
  });

  it('ejecuta el verificador en Actions con el SHA exacto del destino y conserva las evidencias', () => {
    const yaml = load('js-yaml');
    const workflow = yaml.load(fs.readFileSync(path.resolve(__dirname, '../../.github/workflows/ci.yml'), 'utf8'));
    const job = workflow.jobs['pruebas-rendimiento'];
    const baseline = job.steps.find((step: { id?: string }) => step.id === 'linea-base');
    const compare = job.steps.find((step: { id?: string }) => step.id === 'comparar');
    expect(job['runs-on']).toBe('ubuntu-latest');
    expect(baseline.env.BASE_SHA).toBe('${{ github.event.pull_request.base.sha }}');
    expect(baseline.run).toContain('git worktree add --detach "$BASELINE_DIR" "$BASE_SHA"');
    expect(baseline.run).toContain('cp -R tests/performance/.');
    expect(baseline.run).not.toContain('BASELINE_BRANCH="develop"');
    expect(compare.env.REASSURE_BASE_SHA).toBe('${{ github.event.pull_request.base.sha }}');
    expect(compare.run).toContain('set -euo pipefail');
    expect(compare.run).toContain('node scripts/verify-reassure.cjs');
    expect(compare['continue-on-error']).not.toBe(true);
    const artifact = job.steps.find((step: { uses?: string }) => step.uses?.startsWith('actions/upload-artifact@'));
    expect(artifact.if).toBe('always()');
    expect(artifact.with['include-hidden-files']).toBe(true);
    expect(artifact.with['if-no-files-found']).toBe('error');
  });
});
