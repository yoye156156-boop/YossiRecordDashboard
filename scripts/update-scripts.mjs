import fs from 'fs';
const pkgPath = new URL('../package.json', import.meta.url);
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

pkg.scripts ??= {};
pkg.scripts.api = 'node server.cjs';
pkg.scripts['web:build'] = 'cd dashboard && npm run build';
pkg.scripts['web:preview'] = 'cd dashboard && npx vite preview --host 0.0.0.0 --port 5174';
pkg.scripts['preview:all'] =
  'concurrently -n API,WEB -c green,magenta "node server.cjs" "cd dashboard && npx vite preview --host 0.0.0.0 --port 5174"';

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log('✔ scripts updated in package.json');
