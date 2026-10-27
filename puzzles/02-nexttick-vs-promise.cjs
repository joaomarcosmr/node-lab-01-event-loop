// process.nextTick queue vs Promise microtask queue.
// Hint: Node drains the ENTIRE nextTick queue before touching the microtask queue,
// then alternates until both are empty.
process.nextTick(() => {
  console.log('1');
  Promise.resolve().then(() => console.log('2'));
  process.nextTick(() => console.log('3'));
});
Promise.resolve().then(() => {
  console.log('4');
  process.nextTick(() => console.log('5'));
});
setTimeout(() => console.log('6'), 0);
console.log('7');
