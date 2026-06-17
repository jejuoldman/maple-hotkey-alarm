const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('package defines Electron app scripts and Windows build outputs', () => {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

  assert.equal(pkg.main, 'src/main/main.js');
  assert.equal(pkg.scripts.start, 'electron .');
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.js');
  assert.equal(pkg.scripts.dist, 'electron-builder --win nsis portable');
  assert.equal(pkg.dependencies['node-global-key-listener'], '0.3.0');
  assert.deepEqual(pkg.build.win.target, ['nsis', 'portable']);
  assert.equal(pkg.build.win.signAndEditExecutable, false);
  assert.ok(pkg.build.files.includes('!node_modules/node-global-key-listener/bin/MacKeyServer'));
  assert.ok(pkg.build.files.includes('!node_modules/node-global-key-listener/bin/X11KeyServer'));
  assert.equal(pkg.build.asarUnpack, 'node_modules/node-global-key-listener/bin/WinKeyServer.exe');
});
