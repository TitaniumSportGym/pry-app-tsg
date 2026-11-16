import { createRequire } from 'node:module';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const load = createRequire(__filename);
const fromJest = createRequire(load.resolve('jest-config'));
const merge = fromJest('deepmerge');
const fromExpo = createRequire(load.resolve('@expo/fingerprint'));
const glob = fromExpo('glob');
const minimatch = fromExpo('minimatch');

it('Jest resolves the reviewed local replacement, including its .all API', () => {
  expect(fs.realpathSync(fromJest.resolve('deepmerge')))
    .toBe(fs.realpathSync(path.resolve(__dirname, '../../vendor/deepmerge-safe/index.cjs')));
  expect(typeof merge).toBe('function');
  expect(typeof merge.all).toBe('function');
});

it.each([() => ({}), () => Object.create(null), () => null, () => 1])(
  'does not change the returned prototype with a malicious source and target shape %#', target => {
    const result = merge(target(), JSON.parse('{"__proto__":{"tsgInheritedFlag":true},"safe":1}'));
    expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
    expect(result.tsgInheritedFlag).toBeUndefined();
    expect(Object.hasOwn(result, '__proto__')).toBe(false);
    expect(result.safe).toBe(1);
  },
);

it('blocks poisoning through the target-copy loop, nested placeholders and arrays', () => {
  const target = JSON.parse('{"__proto__":{"tsgInheritedFlag":true},"safe":1}');
  const result = merge(target, { extra: true });
  expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
  expect(result.tsgInheritedFlag).toBeUndefined();
  const nested = merge({ session: null }, JSON.parse('{"session":{"__proto__":{"tsgInheritedFlag":true}}}'));
  expect(Object.getPrototypeOf(nested.session)).toBe(Object.prototype);
  expect(nested.session.tsgInheritedFlag).toBeUndefined();
  const array = merge([], [target]);
  expect(Object.getPrototypeOf(array[0])).toBe(Object.prototype);
  expect(array[0].tsgInheritedFlag).toBeUndefined();
  expect(Object.hasOwn(Object.prototype, 'tsgInheritedFlag')).toBe(false);
});

it('blocks constructor/prototype paths and treats a throwing proxy lookup as unsafe', () => {
  const malicious = JSON.parse('{"constructor":{"prototype":{"tsgInheritedFlag":true}},"prototype":{"tsgInheritedFlag":true}}');
  expect(merge(malicious, malicious)).toEqual({});
  const proxy = new Proxy({}, { has() { throw new Error('untrusted proxy'); } });
  expect(merge(proxy, { sourceKey: true })).toEqual({});
});

it('preserves Jest configuration merges, cloning, arrays, symbols and special values', () => {
  const symbol = Symbol('configuration');
  const date = new Date('2026-01-01T00:00:00Z');
  const regex = /fixture/;
  const element = { $$typeof: Symbol.for('react.element'), props: { name: 'fixture' } };
  const defaults = { nested: { left: 1 }, values: [{ a: 1 }], date, regex, element, [symbol]: { first: 1 } };
  const overrides = { nested: { right: 2 }, values: [{ b: 2 }], [symbol]: { second: 2 } };
  const result = merge.all([defaults, overrides]);
  expect(result.nested).toEqual({ left: 1, right: 2 });
  expect(result.values).toEqual([{ a: 1 }, { b: 2 }]);
  expect(result[symbol]).toEqual({ first: 1, second: 2 });
  expect(result.date).toBe(date); expect(result.regex).toBe(regex); expect(result.element).toBe(element);
  expect(result.values[0]).not.toBe(defaults.values[0]);
  expect(defaults.nested).toEqual({ left: 1 });
  expect(overrides.nested).toEqual({ right: 2 });
  expect(merge.all([])).toEqual({});
  expect(() => merge.all(null)).toThrow('first argument should be an array');
});

it('preserves clone, custom arrayMerge, customMerge and isMergeableObject options', () => {
  const source = { nested: { value: 1 } };
  expect(merge({}, source, { clone: false }).nested).toBe(source.nested);
  expect(merge({ values: [1] }, { values: [2] }, { arrayMerge: (_a: unknown[], b: unknown[]) => b }).values).toEqual([2]);
  const customMerge = (key: string) => key === 'nested' ? () => ({ custom: true }) : undefined;
  expect(merge({ nested: {} }, source, { customMerge })).toEqual({ nested: { custom: true } });
  const isMergeableObject = (value: unknown) => !!value && Object.getPrototypeOf(value) === Object.prototype;
  expect(merge({ values: [1] }, { values: [2] }, { isMergeableObject }).values).toEqual([2]);
});

describe('glob/minimatch contracts used by Expo, Jest and ESLint', () => {
  let directory: string;
  beforeAll(() => {
    directory = fs.mkdtempSync(path.join(tmpdir(), 'tsg-dependency-security-'));
    for (const file of ['src/app/(tabs)/index.tsx', 'src/app/[id].tsx', 'src/config/env.ts', 'node_modules/ignored.ts']) {
      const destination = path.join(directory, file);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, 'fixture');
    }
  });
  afterAll(() => {
    // Validate the absolute generated target before recursive cleanup on Windows.
    expect(path.dirname(path.resolve(directory))).toBe(path.resolve(tmpdir()));
    expect(path.basename(directory)).toMatch(/^tsg-dependency-security-/);
    fs.rmSync(directory, { recursive: true, force: true });
  });

  it('preserves async/sync globs, ignored node_modules and literal Expo Router filenames', async () => {
    const options = { cwd: directory, nodir: true, dot: true, posix: true, ignore: ['node_modules/**'] };
    const expected = ['src/app/(tabs)/index.tsx', 'src/app/[id].tsx', 'src/config/env.ts'];
    expect(glob.globSync('**/*.{ts,tsx}', options).sort()).toEqual(expected);
    expect((await glob.glob('**/*.{ts,tsx}', options)).sort()).toEqual(expected);
    expect(minimatch.minimatch('src/app/[id].tsx', minimatch.escape('src/app/[id].tsx'))).toBe(true);
    expect(minimatch.minimatch('src/app/(tabs)/index.tsx', '**/*.{ts,tsx}')).toBe(true);
    const fromEslint = createRequire(load.resolve('eslint'));
    const legacy = fromEslint('minimatch');
    expect(typeof legacy).toBe('function');
    expect(legacy('fixture.ts', '*.ts')).toBe(true);
  });

  it('stops scheduling directory reads after AbortSignal cancellation', async () => {
    const controller = new AbortController();
    const reason = new Error('dependency-security-abort');
    let readsAfterAbort = 0;
    const customFs = {
      ...fs,
      readdir: (location: fs.PathLike, options: unknown, callback: (...args: unknown[]) => void) => {
        if (controller.signal.aborted) readsAfterAbort += 1;
        fs.readdir(location, options as { withFileTypes: true }, (error, entries) => {
          controller.abort(reason);
          callback(error, entries);
        });
      },
    };
    await expect(glob.glob('**/*', { cwd: directory, signal: controller.signal, fs: customFs })).rejects.toBe(reason);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(readsAfterAbort).toBe(0);
  });
});
