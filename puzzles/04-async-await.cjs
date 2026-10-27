// async/await is just Promises. Where does each `await` yield back to the loop?
async function a() {
  console.log('a1');
  await null;
  console.log('a2');
}
async function b() {
  console.log('b1');
  await a();
  console.log('b2');
}
b();
Promise.resolve().then(() => console.log('p'));
console.log('sync');
