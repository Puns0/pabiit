// Password hashes for protected routes
// To generate a new hash, run in browser console:
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('YOUR_PASSWORD'))
//     .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join(''))
//     .then(console.log)
//
// Current hash is for the password: "" (change this!)
// SHA-256 of " = 11e7e47c5634e338ab4418e8aead74eb2503423087164f9776f34b97d87de79c

export const PROTECTED_HASH = '11e7e47c5634e338ab4418e8aead74eb2503423087164f9776f34b97d87de79c'
