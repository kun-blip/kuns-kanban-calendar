'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {shouldAnnounceUpdate} = require('../desktop/update-notice.cjs');
const available = { phase:'available', newVersion:'1.7.0' };
test('announces a new version once, respects later dismissal',()=>{
  assert.equal(shouldAnnounceUpdate(available,'',''),true);
  assert.equal(shouldAnnounceUpdate(available,'1.7.0',''),false);
  assert.equal(shouldAnnounceUpdate(available,'','1.7.0'),false);
  assert.equal(shouldAnnounceUpdate({phase:'current',newVersion:''},'',''),false);
  assert.equal(shouldAnnounceUpdate({...available,newVersion:'1.7.1'},'1.7.0','1.7.0'),true);
});
