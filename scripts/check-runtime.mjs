import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const extensions = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'];
const platforms = ['', '.web', '.native', '.ios', '.android'];
const sourceExtension = /\.(?:[cm]?[jt]s|[jt]sx)$/;
const blockedSegment = /^(?:__tests__|__mocks__|tests?|testing|fixtures?)(?:\.[^.]+)?$/i;
const blockedFile = /(?:^|[._-])(?:demo|mocks?|fixtures?|simulator|synthetic)(?:[._-]|$)/i;

function forbidden(file) {
  const parts = file.split(/[\\/]/);
  return (
    parts.some((part) => blockedSegment.test(part)) ||
    /\.(?:test|spec)\.[^.]+$/.test(file) ||
    blockedFile.test(parts.at(-1))
  );
}

function strings(value) {
  if (typeof value === 'string') return [value];
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).flatMap(strings);
}

function workspacePackages(root) {
  const result = new Map();
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const patterns = Array.isArray(manifest.workspaces)
    ? manifest.workspaces
    : (manifest.workspaces?.packages ?? []);
  for (const pattern of patterns) {
    if (typeof pattern !== 'string' || (pattern.includes('*') && !/^[^*]+\/\*$/.test(pattern)))
      throw new Error('Unsupported workspace pattern in runtime guard: ' + pattern);
    const dirs = pattern.endsWith('/*')
      ? readdirSync(join(root, pattern.slice(0, -2)), { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => join(root, pattern.slice(0, -2), entry.name))
      : [join(root, pattern)];
    for (const directory of dirs) {
      if (!existsSync(join(directory, 'package.json'))) continue;
      const pkg = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'));
      if (typeof pkg.name === 'string') result.set(pkg.name, { directory, pkg });
    }
  }
  return result;
}

/** Conservative union of source resolutions: every platform variant must remain fixture-free. */
function localFiles(path) {
  const result = new Set();
  const add = (candidate) => {
    if (existsSync(candidate) && statSync(candidate).isFile() && !candidate.endsWith('.d.ts'))
      result.add(realpathSync(candidate));
  };
  const extension = extname(path);
  const base = extensions.includes(extension) ? path.slice(0, -extension.length) : path;
  add(path);
  for (const platform of platforms) for (const ext of extensions) add(base + platform + ext);
  if (existsSync(path) && statSync(path).isDirectory()) {
    for (const platform of platforms)
      for (const ext of extensions) add(join(path, 'index' + platform + ext));
  }
  return [...result];
}

function dependencies(source, report) {
  const dependencies = [];
  const literal = (node) =>
    node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node));
  const add = (node, specifier) => {
    if (!literal(specifier))
      report(node, 'Computed runtime import cannot be checked; use a literal local module path.');
    else dependencies.push({ node, specifier: specifier.text });
  };
  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const onlyTypes =
        clause?.isTypeOnly ||
        (!clause?.name &&
          clause?.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.length > 0 &&
          clause.namedBindings.elements.every((item) => item.isTypeOnly));
      if (!onlyTypes) add(node, node.moduleSpecifier);
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier) {
      const onlyTypes =
        node.isTypeOnly ||
        (node.exportClause &&
          ts.isNamedExports(node.exportClause) &&
          node.exportClause.elements.length > 0 &&
          node.exportClause.elements.every((item) => item.isTypeOnly));
      if (!onlyTypes) add(node, node.moduleSpecifier);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      !node.isTypeOnly &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(node, node.moduleReference.expression);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      add(node, node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return dependencies;
}

/** Checks repository-owned runtime code, not external node_modules or arbitrary downloaded data. */
export function checkRuntimeGraph(
  root,
  entries = ['apps/mobile/index.ts', 'apps/api/src/index.ts'],
) {
  root = realpathSync(root);
  const packages = workspacePackages(root);
  const scopes = new Set(
    [...packages.keys()].filter((name) => name.startsWith('@')).map((name) => name.split('/')[0]),
  );
  const queue = entries.flatMap((entry) =>
    localFiles(resolve(root, entry)).map((file) => ({ file, chain: [relative(root, file)] })),
  );
  const seen = new Set();
  const violations = [];
  const issue = (file, message, chain) => violations.push({ file, message, chain });
  for (const entry of entries)
    if (!localFiles(resolve(root, entry)).length)
      issue(entry, 'Runtime entry is missing.', [entry]);
  while (queue.length) {
    const { file, chain } = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const name = relative(root, file).split(sep).join('/');
    if (name.startsWith('../') || isAbsolute(name)) {
      issue(name, 'Local runtime dependency escapes the repository.', chain);
      continue;
    }
    if (forbidden(name)) {
      issue(name, 'Test fixtures or replay code are reachable from a runtime entry.', chain);
      continue;
    }
    if (!sourceExtension.test(file)) continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
    );
    const report = (node, message) =>
      issue(
        `${name}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`,
        message,
        chain,
      );
    for (const error of source.parseDiagnostics)
      issue(name, ts.flattenDiagnosticMessageText(error.messageText, ' '), chain);
    for (const dependency of dependencies(source, report)) {
      const { specifier } = dependency;
      let candidates = [];
      let owned = false;
      if (specifier.startsWith('.') || isAbsolute(specifier)) {
        owned = true;
        candidates = localFiles(resolve(dirname(file), specifier));
      } else {
        const packageName = [...packages.keys()].find(
          (key) => specifier === key || specifier.startsWith(key + '/'),
        );
        if (packageName) {
          owned = true;
          const { directory, pkg } = packages.get(packageName);
          const subpath =
            specifier === packageName ? '.' : '.' + specifier.slice(packageName.length);
          const exports = pkg.exports;
          let targets;
          if (exports !== undefined)
            targets = strings(
              typeof exports === 'string' ||
                !Object.keys(exports ?? {}).some((key) => key.startsWith('.'))
                ? subpath === '.'
                  ? exports
                  : undefined
                : exports[subpath],
            );
          else
            targets =
              subpath === '.'
                ? [
                    pkg['react-native'],
                    typeof pkg.browser === 'string' ? pkg.browser : undefined,
                    pkg.main ?? './index',
                  ].filter(Boolean)
                : [subpath];
          if (pkg.browser && typeof pkg.browser === 'object') targets.push(...strings(pkg.browser));
          candidates = targets.flatMap((target) => localFiles(resolve(directory, target)));
        } else if (scopes.has(specifier.split('/')[0])) owned = true;
      }
      if (owned && !candidates.length)
        report(dependency.node, `Cannot resolve repository runtime dependency: ${specifier}`);
      for (const next of candidates)
        queue.push({ file: next, chain: [...chain, relative(root, next).split(sep).join('/')] });
    }
  }
  return {
    files: [...seen].map((file) => relative(root, file).split(sep).join('/')).sort(),
    violations,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const result = checkRuntimeGraph(root);
  if (result.violations.length) {
    for (const violation of result.violations)
      console.error(`${violation.file}: ${violation.message}\n  ${violation.chain.join(' → ')}`);
    process.exitCode = 1;
  } else
    console.log(
      `Runtime guard passed: ${result.files.length} repository modules checked across web, native and API entries.`,
    );
}
