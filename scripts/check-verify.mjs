// Lists every [VERIFY] / VERIFY: marker in guides and country configs.
// Guides must have none left before publishing (CLAUDE.md section 16), so markers there fail the check.
// Country-config markers are listed for review but don't fail, because each one also records its source.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

function scan(dir, pattern) {
  const hits = [];
  for (const file of walk(join(root, dir))) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (pattern.test(line)) hits.push(`${relative(root, file)}:${i + 1}  ${line.trim().slice(0, 120)}`);
      });
  }
  return hits;
}

const guideHits = scan('src/content/guides', /\[VERIFY\]/);
const configHits = scan('src/countries', /VERIFY:/);

if (configHits.length) {
  console.log(`Country config figures to check against the official source (${configHits.length}):`);
  for (const hit of configHits) console.log(`  ${hit}`);
}

if (guideHits.length) {
  console.error(`\nUnverified facts in guides (${guideHits.length}). Check each one and remove the marker before publishing:`);
  for (const hit of guideHits) console.error(`  ${hit}`);
  process.exit(1);
}

console.log('\nNo [VERIFY] markers left in guides.');
