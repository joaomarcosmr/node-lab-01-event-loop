import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve('puzzles');
const answers = JSON.parse(readFileSync(path.join(dir, 'answers.json'), 'utf8'));
const files = readdirSync(dir).filter((f) => /\.(cjs|mjs)$/.test(f)).sort();

let failed = 0;
for (const file of files) {
  const actual = execFileSync(process.execPath, [path.join(dir, file)], { encoding: 'utf8' })
    .trim()
    .split('\n');
  const predicted = answers[file];
  const ok = Array.isArray(predicted) && JSON.stringify(predicted) === JSON.stringify(actual);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${file}`);
  if (!ok) {
    failed++;
    console.log(`      predicted: ${JSON.stringify(predicted)}`);
    console.log(`      actual:    ${JSON.stringify(actual)}`);
  }
}
console.log(failed === 0 ? '\nAll puzzles correct.' : `\n${failed} puzzle(s) wrong.`);
process.exit(failed === 0 ? 0 : 1);
