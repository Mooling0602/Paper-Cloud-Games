const selfsigned = require('selfsigned');
const fs = require('fs');
const pems = selfsigned.generate([{ name: 'commonName', value: 'roll-and-move' }], {
  days: 365,
  keySize: 2048,
  extensions: [{
    name: 'subjectAltName',
    altNames: [
      { type: 7, ip: '192.168.2.64' },
      { type: 7, ip: '127.0.0.1' },
      { type: 7, ip: '::1' },
      { type: 2, value: 'localhost' },
    ],
  }],
});
fs.writeFileSync('../certs/key.pem', pems.private);
fs.writeFileSync('../certs/cert.pem', pems.cert);
console.log('cert ok:', pems.private.length, pems.cert.length);
