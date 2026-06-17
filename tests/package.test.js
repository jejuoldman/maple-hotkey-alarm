const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('package defines Electron app scripts and Windows build outputs', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  assert.equal(pkg.main, 'src/main/main.js');
  assert.equal(pkg.scripts.start, 'electron .');
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.js');
  assert.equal(pkg.scripts.dist, 'electron-builder --win nsis portable');
  assert.deepEqual(pkg.build.win.target, ['nsis', 'portable']);
  assert.equal(pkg.build.win.signAndEditExecutable, false);
});
