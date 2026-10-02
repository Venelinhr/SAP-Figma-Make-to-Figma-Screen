// node make-figma/tools/outline.js <dump.json> [depth] — converts a saved dump and prints the Figma tree outline (first popup if the dump has one).
const fs = require('fs'), path = require('path'), R = path.join(__dirname, '..', '..') + '/';
const { convert } = require(R + 'build/make-convert.js'), kit = require(R + 'knowledge/live/kit.json'), map = require(R + 'build/make-map.json'), extra = require(R + 'knowledge/live/icons-extra.json').icons || {};
const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), r = convert(d, kit, map, extra, 'x'), t = (r.extra && r.extra[0] ? r.extra[0].tree : r.tree), max = +(process.argv[3] || 6);
(function p(n, dep) { if (dep > max) return; console.log('  '.repeat(dep) + (n.n || '?') + ' ' + (n.k || '') + (n.cp ? '[' + n.cp + ']' : '') + ' ' + (n.s || '') + ' ' + (n.w || '') + 'x' + (n.h || '') + (n.tx ? ' "' + String(n.tx).slice(0, 30) + '"' : '')); (n.c || []).forEach(k => p(k, dep + 1)); })(t, 0);
console.log('warn', r.warn.slice(0, 10), 'lost texts', r.audit.lostTexts);
