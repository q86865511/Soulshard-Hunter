import {installHeadless,makeCanvas} from '../src/authority/headless.js';
installHeadless();await import('../../src/bootstrap.js');
const {initRenderer}=await import('../../src/engine/renderer.js');initRenderer(makeCanvas());
const {authorityParityFixture}=await import('../../test/authority-parity-fixture.mjs');
const result=await authorityParityFixture();
console.log(JSON.stringify(result));
