// node make-figma/tools/unmapped.js — converts every saved dump (test/fixtures/make-*.dump.json + make-figma/out/last-dump.json, incl. its popup states)
// and lists controls that are not mapped, missing icons and texts that did not reach the tree. Use it after a mapping change.
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..') + '/';
const { convert } = require(R + 'build/make-convert.js'), kit = require(R + 'knowledge/live/kit.json'), map = require(R + 'build/make-map.json'), extra = require(R + 'knowledge/live/icons-extra.json').icons || {};
const files = fs.readdirSync(R + 'test/fixtures').filter(f => /dump\.json$/.test(f)).map(f => R + 'test/fixtures/' + f).concat([R + 'make-figma/out/last-dump.json']).filter(f => fs.existsSync(f));
const cnt = {}, lost = new Set();
for (const f of files) { let d; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { continue; }
  for (const dd of [d].concat((d.states || []).map(s => typeof s.dump === 'string' ? JSON.parse(s.dump) : s.dump))) { try { const r = convert(dd, kit, map, extra, 'x'); r.warn.forEach(w => { cnt[w] = (cnt[w] || 0) + 1; }); (r.audit.lostTexts || []).forEach(t => lost.add(t)); } catch (e) {} } }
console.log('WARNINGS'); Object.entries(cnt).sort((a, b) => b[1] - a[1]).forEach(e => console.log(' ', e[1], e[0]));
console.log('LOST TEXTS', [...lost]);
