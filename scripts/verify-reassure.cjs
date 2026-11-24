const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Reassure 1.6 writes a report but does not fail the command on regressions.
function verifyReassure(directory = '.reassure', expected = {}) {
  const read = (file) => JSON.parse(fs.readFileSync(path.join(directory, file), 'utf8'));
  const measurements = {};
  for (const side of ['baseline', 'current']) {
    const jest = read(`jest-${side}.json`);
    assert.equal(jest.success, true, `${side}: Jest no terminó correctamente`);
    assert.ok(jest.numTotalTests > 0, `${side}: no hay pruebas`);
    for (const key of ['numFailedTests', 'numPendingTests', 'numTodoTests', 'numFailedTestSuites', 'numPendingTestSuites']) {
      assert.equal(jest[key], 0, `${side}: ${key}`);
    }
    assert.equal(jest.numPassedTests, jest.numTotalTests, `${side}: hay pruebas sin aprobar`);
    const [header, ...entries] = fs.readFileSync(path.join(directory, `${side}.perf`), 'utf8')
      .trim().split(/\r?\n/).map((line) => JSON.parse(line));
    assert.ok(header.metadata?.commitHash, `${side}: falta el commit medido`);
    if (expected[side]) assert.equal(header.metadata.commitHash, expected[side], `${side}: commit incorrecto`);
    assert.equal(entries.length, jest.numTotalTests, `${side}: faltan escenarios medidos`);
    assert.equal(new Set(entries.map((entry) => entry.name)).size, entries.length, `${side}: nombres duplicados`);
    for (const entry of entries) {
      assert.ok(entry.runs > 1 && entry.durations.length === entry.runs && entry.counts.length === entry.runs,
        `${side}: muestras incompletas en ${entry.name}`);
      assert.ok(entry.durations.every((duration) => Number.isFinite(duration) && duration > 0),
        `${side}: duraciones inválidas en ${entry.name}`);
    }
    measurements[side] = { header, entries };
  }
  assert.deepEqual(measurements.current.entries.map((entry) => entry.name).sort(),
    measurements.baseline.entries.map((entry) => entry.name).sort(), 'Los escenarios de ambas ramas no coinciden');

  const report = read('output.json');
  for (const side of ['baseline', 'current']) {
    assert.equal(report.metadata?.[side]?.commitHash, measurements[side].header.metadata.commitHash,
      `${side}: informe de otro commit`);
  }
  for (const key of ['errors', 'warnings', 'added', 'removed']) {
    assert.ok(Array.isArray(report[key]) && report[key].length === 0, `Comparación incompleta: ${key}`);
  }
  const compared = [...report.significant, ...report.meaningless];
  assert.deepEqual(compared.map((entry) => entry.name).sort(),
    measurements.current.entries.map((entry) => entry.name).sort(), 'El informe omite escenarios');
  const regressions = report.significant.filter((entry) => entry.durationDiff > 0);
  const extraRenders = report.countChanged.filter((entry) => entry.countDiff > 0);
  assert.equal(regressions.length, 0, `Regresiones de duración: ${regressions.map((entry) => entry.name).join(', ')}`);
  assert.equal(extraRenders.length, 0, `Aumento de renders: ${extraRenders.map((entry) => entry.name).join(', ')}`);
  return compared.length;
}

if (require.main === module) {
  try {
    const count = verifyReassure(process.argv[2], {
      baseline: process.env.REASSURE_BASE_SHA,
      current: process.env.REASSURE_CURRENT_SHA,
    });
    console.log(`Reassure: ${count} escenarios comparados, sin omisiones ni regresiones detectadas.`);
  } catch (error) {
    console.error(`Reassure: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { verifyReassure };
