#!/usr/bin/env node
// Builds the Lambda deployment directory dist/lambda.
//
// Only runtime files are copied: server/, public/, aws/lambda/ and the package
// manifests. Tests, docs, infrastructure, .env files and dev dependencies are
// never included. Production dependencies are installed with `npm ci`.
import { cpSync, existsSync, mkdirSync, rmSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist', 'lambda');
const INCLUDE = ['server', 'public', 'aws/lambda', 'package.json', 'package-lock.json'];
const FORBIDDEN = /(^|\/)(\.env(\..*)?|.*\.pem|.*\.key|credentials)$/;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const entry of INCLUDE) {
  cpSync(path.join(root, entry), path.join(out, entry), {
    recursive: true,
    filter: source => !FORBIDDEN.test(path.relative(root, source)) || source.endsWith('.env.example')
  });
}

execFileSync('npm', ['ci', '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: out, stdio: 'inherit' });

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}
const files = walk(out);
const leaked = files.filter(file => FORBIDDEN.test(path.relative(out, file)) && !file.includes(`${path.sep}node_modules${path.sep}`));
if (leaked.length) {
  console.error('Refusing to package sensitive files:', leaked.map(f => path.relative(out, f)));
  process.exit(1);
}
if (existsSync(path.join(out, 'node_modules', 'yaml'))) {
  console.error('Dev dependencies leaked into the Lambda package.');
  process.exit(1);
}
const bytes = files.reduce((sum, file) => sum + statSync(file).size, 0);
console.log(`Lambda package ready: dist/lambda (${files.length} files, ${(bytes / 1024 / 1024).toFixed(1)} MiB unzipped)`);
