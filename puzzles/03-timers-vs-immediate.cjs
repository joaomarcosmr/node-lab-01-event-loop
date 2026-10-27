// setTimeout(0) vs setImmediate.
// From the main module their order is NON-deterministic (depends on process startup time).
// Inside an I/O callback it IS deterministic. Why? Which event-loop phase comes next?
const fs = require('node:fs');

fs.readFile(__filename, () => {
  setTimeout(() => console.log('timeout'), 0);
  setImmediate(() => console.log('immediate'));
  process.nextTick(() => console.log('tick'));
  console.log('io');
});
console.log('start');
