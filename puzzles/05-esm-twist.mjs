// Exactly the same code as 01-basics.cjs, but as an ES module.
// The output is DIFFERENT. Why? (Hint: how does Node evaluate the top level of an ESM module?
// What is already on the microtask queue when your code runs?)
console.log('A');
setTimeout(() => console.log('B'), 0);
Promise.resolve().then(() => console.log('C'));
process.nextTick(() => console.log('D'));
console.log('E');
