// Local estimate only. SonarQube owns the new-code baseline and Quality Gate.
// Usage: node scripts/report-new-code-coverage.cjs [lcov] [baseline.diff] [Sonar new-line snapshot]
const fs = require('node:fs');
const path = require('node:path');

const reportPath = process.argv[2] || 'coverage/regresion/lcov.info';
const diffPath = process.argv[3] || 'coverage/admin-new-code.diff';
const snapshotPath = process.argv[4];
const normalize = (file) => (path.isAbsolute(file) ? path.relative(process.cwd(), file) : file).replaceAll('\\', '/');
const reports = new Map();
let current;
for (const line of fs.readFileSync(reportPath, 'utf8').split(/\r?\n/)) {
  if (line.startsWith('SF:')) {
    const file = normalize(line.slice(3));
    if (!fs.existsSync(file)) throw new Error(`LCOV source does not exist: ${file}`);
    current = { lines: new Map(), branches: [] };
    reports.set(file, current);
  } else if (line.startsWith('DA:')) {
    const [number, hits] = line.slice(3).split(',').map(Number);
    current.lines.set(number, hits);
  } else if (line.startsWith('BRDA:')) {
    const [number, , , hits] = line.slice(5).split(',');
    current.branches.push({ line: Number(number), covered: Number(hits) > 0 });
  }
}

for (const [file, coverage] of reports) {
  const lastLine = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
  const numbers = [...coverage.lines.keys(), ...coverage.branches.map(branch => branch.line)];
  if (numbers.some(line => line < 1 || line > lastLine)) {
    throw new Error(`LCOV counters outside the TypeScript source: ${file}`);
  }
}

const additions = new Map();
let snapshot;
if (snapshotPath) {
  snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
  for (const [file, lines] of Object.entries(snapshot)) {
    additions.set(file, new Set(lines.map(({ line }) => line)));
  }
} else {
  const diff = fs.readFileSync(diffPath, 'utf8').replace(/^\uFEFF/, '');
  let file;
  let number;
  for (const line of diff.split(/\r?\n/)) {
    if (line.startsWith('+++ b/')) {
      file = line.slice(6);
      additions.set(file, new Set());
    } else if (line.startsWith('@@ ')) {
      number = Number(line.match(/\+(\d+)/)[1]);
    } else if (line.startsWith('+') && file) {
      additions.get(file).add(number++);
    } else if (line.startsWith(' ')) {
      number++;
    }
  }
}

const percent = (covered, total) => total ? Number((100 * covered / total).toFixed(2)) : 100;
function metrics(lines, branches) {
  const coveredLines = lines.filter(([, hits]) => hits > 0).length;
  const coveredBranches = branches.filter(branch => branch.covered).length;
  return {
    lines: lines.length, coveredLines, branches: branches.length, coveredBranches,
    lineCoverage: percent(coveredLines, lines.length),
    branchCoverage: percent(coveredBranches, branches.length),
    combinedEstimate: percent(coveredLines + coveredBranches, lines.length + branches.length),
  };
}

const missing = [];
const files = [];
for (const [file, added] of additions) {
  if (!/\.tsx?$/.test(file) || /\.test\.tsx?$|\/__tests__\//.test(file)) continue;
  const coverage = reports.get(file);
  if (!coverage) { missing.push(file); continue; }
  const newLines = [...coverage.lines].filter(([line]) => added.has(line));
  const newBranches = coverage.branches.filter(({ line }) => added.has(line));
  if (newLines.length + newBranches.length === 0) continue;
  files.push({
    file,
    newCode: metrics(newLines, newBranches),
    wholeFile: metrics([...coverage.lines], coverage.branches),
    uncoveredNewLines: newLines.filter(([, hits]) => hits === 0).map(([line]) => line),
  });
}
const totals = files.reduce((sum, { newCode: item }) => ({
  lines: sum.lines + item.lines, coveredLines: sum.coveredLines + item.coveredLines,
  branches: sum.branches + item.branches, coveredBranches: sum.coveredBranches + item.coveredBranches,
}), { lines: 0, coveredLines: 0, branches: 0, coveredBranches: 0 });
const result = {
  reportPath, baseline: snapshotPath || diffPath,
  note: 'LCOV estimate of executable new lines and branch paths, not a remote SonarQube approval. Production source line numbers must match the baseline.',
  sourceFilesValidated: reports.size, missing,
  ...totals,
  lineCoverage: percent(totals.coveredLines, totals.lines),
  branchCoverage: percent(totals.coveredBranches, totals.branches),
  combinedEstimate: percent(totals.coveredLines + totals.coveredBranches, totals.lines + totals.branches),
  files,
};
if (snapshot) {
  // Sonar can count executable lines absent from the local DA records. Count
  // those as uncovered for a conservative estimate using its existing baseline.
  const executable = Object.entries(snapshot).flatMap(([file, lines]) =>
    lines.filter(line => line.lineHits !== undefined).map(line => ({ file, line: line.line })),
  );
  const covered = executable.filter(({ file, line }) => reports.get(file)?.lines.get(line) > 0).length;
  const unmapped = executable.filter(({ file, line }) => !reports.get(file)?.lines.has(line));
  result.sonarSnapshotConservative = {
    lines: executable.length,
    coveredLines: covered,
    linesWithoutLocalCounter: unmapped.length,
    branches: totals.branches,
    coveredBranches: totals.coveredBranches,
    lineCoverage: percent(covered, executable.length),
    branchCoverage: result.branchCoverage,
    combinedEstimate: percent(covered + totals.coveredBranches, executable.length + totals.branches),
    note: 'Keeps all executable lines from the previous remote analysis; lines without local DA counters are conservatively uncovered. This is not a predicted exact Sonar percentage.',
  };
}
const output = path.join(path.dirname(reportPath), 'new-code-estimate.json');
fs.writeFileSync(output, JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ ...result, files: undefined, output }, null, 2));
if (missing.length > 0) process.exitCode = 1;
