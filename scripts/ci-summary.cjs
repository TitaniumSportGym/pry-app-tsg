'use strict';

// Resultados de CI como texto en GitHub Actions; no se publican artifacts.
const fs = require('node:fs');
const path = require('node:path');

const outFile = process.env.GITHUB_STEP_SUMMARY;
const mode = process.argv[2];

function clean(s) {
  return String(s ?? '')
    .replace(/\x1b\[[0-9;]*m/g, '')
    .replace(/```/g, "'''" )
    .replace(/\r/g, '')
    .trim();
}

function readIfExists(filename) {
  try { return fs.readFileSync(filename, 'utf8'); } catch { return ''; }
}

function jsonIfExists(filename) {
  const contents = readIfExists(filename);
  if (!contents) return null;
  try { return JSON.parse(contents); } catch { return null; }
}

function markdownStatus(value) {
  switch (value) {
    case 'success': return '✅ Aprobado';
    case 'failure': return '❌ Fallido';
    case 'skipped': return '⏭️ No ejecutado';
    case 'cancelled': return '⛔ Cancelado';
    default: return `⚠️ ${value || 'Sin resultado'}`;
  }
}

function fenced(text, maxChars = 3500) {
  const cleaned = clean(text);
  if (!cleaned) return '_No se registró salida adicional._';
  return `\`\`\`text\n${cleaned.slice(0, maxChars)}${cleaned.length > maxChars ? '\n...(salida recortada)' : ''}\n\`\`\``;
}

function append(lines) {
  const content = `${lines.join('\n')}\n\n`;
  if (outFile) fs.appendFileSync(outFile, content);
  process.stdout.write(content);
}

if (mode === 'static') {
  const tsc = process.env.TYPESCRIPT_RESULT || 'skipped';
  const eslint = process.env.ESLINT_RESULT || 'skipped';
  const lines = [
    '## Análisis estático',
    `- Instalación de dependencias: ${markdownStatus(process.env.DEPS_RESULT)}`,
    `- TypeScript: ${markdownStatus(tsc)}`,
    `- ESLint: ${markdownStatus(eslint)}`,
    '',
  ];
  if (tsc === 'failure') {
    lines.push('### Errores de TypeScript', fenced(readIfExists('typescript.log'), 4000), '');
  }
  const lintOutput = readIfExists('eslint.log');
  if (eslint === 'failure') {
    lines.push('### Errores de ESLint', fenced(lintOutput, 4000), '');
  } else if (lintOutput && /\bwarning\b|\bwarnings\b|advertencia/i.test(lintOutput)) {
    lines.push('### Advertencias de ESLint', fenced(lintOutput, 2000), '');
  }
  append(lines);
} else if (mode === 'jest') {
  const [, , , label, jsonFile, coverageFile, logFile] = process.argv;
  const status = process.env.TEST_RESULT || 'skipped';
  const results = jsonIfExists(jsonFile);
  const lines = [`## ${label || 'Pruebas'}`, `- Estado del paso: ${markdownStatus(status)}`, ''];

  if (results) {
    lines.push(
      '| Resultado | Cantidad |',
      '|---|---:|',
      `| Pruebas ejecutadas / totales | ${(results.numPassedTests || 0) + (results.numFailedTests || 0)} / ${results.numTotalTests ?? '—'} |`,
      `| Aprobadas | ${results.numPassedTests ?? '—'} |`,
      `| Fallidas | ${results.numFailedTests ?? '—'} |`,
      `| Omitidas / pendientes | ${results.numPendingTests ?? '—'} |`,
      `| Suites aprobadas | ${results.numPassedTestSuites ?? '—'} |`,
      `| Suites fallidas | ${results.numFailedTestSuites ?? '—'} |`,
      '',
    );

    const failed = [];
    for (const suite of results.testResults || []) {
      for (const test of suite.assertionResults || []) {
        if (test.status === 'failed') {
          failed.push(`**${clean(test.fullName || test.title)}** (${path.basename(suite.name || 'archivo desconocido')})\n\n${fenced((test.failureMessages || []).join('\n'), 1200)}`);
        }
      }
      if (suite.status === 'failed' && !(suite.assertionResults || []).some(t => t.status === 'failed')) {
        failed.push(`**Suite:** ${path.basename(suite.name || 'archivo desconocido')}\n\n${fenced(suite.message, 1200)}`);
      }
    }
    if (failed.length) {
      lines.push('### Fallos detectados', ...failed.slice(0, 8), '');
      if (failed.length > 8) lines.push(`_Se muestran 8 de ${failed.length} fallos. Revisa el log para el detalle completo._`, '');
    }
  } else {
    lines.push('_No se generó el JSON de Jest (por ejemplo, porque falló la instalación o la ejecución). Revisa los logs._', '');
    const log = readIfExists(logFile);
    if (log) lines.push('### Últimas líneas del log', fenced(log.slice(-3500)), '');
  }

  const coverage = jsonIfExists(coverageFile);
  const total = coverage && coverage.total;
  if (total) {
    lines.push('### Cobertura', '| Métrica | Porcentaje |', '|---|---:|');
    for (const [key, title] of [
      ['statements', 'Sentencias'],
      ['branches', 'Ramas'],
      ['functions', 'Funciones'],
      ['lines', 'Líneas'],
    ]) {
      const percentage = total[key] && total[key].pct;
      lines.push(`| ${title} | ${percentage ?? '—'}% |`);
    }
    lines.push('');
  } else {
    lines.push('_No hay resumen de cobertura disponible para esta ejecución._', '');
  }
  append(lines);
} else {
  process.stderr.write('Uso: node scripts/ci-summary.cjs static | jest <nombre> <resultados.json> <coverage-summary.json> <log>\n');
  process.exitCode = 2;
}
