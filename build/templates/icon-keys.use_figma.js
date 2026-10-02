// icon-keys.use_figma.js — READ-ONLY. Run it with use_figma on the SAP Web UI Kit file (SILcWzK5uFghKun9jx6D7c, page "❖ Iconography")
// when the plugin says: icon "xyz" is not in the SAP kit. Put the missing names in WANT, then add the returned {name: key} to
// knowledge/live/icons-extra.json → icons → { "name": { "key": "...", "desc": "..." } }. (The converter and the plugin read that table.)
const WANT = new Set(['xyz']);
const out = {};
for (const p of figma.root.children) {
  try { await p.loadAsync(); } catch (e) { continue; }
  for (const c of p.findAllWithCriteria({ types: ['COMPONENT'] })) if (WANT.has(c.name) && c.parent && c.parent.type !== 'COMPONENT_SET' && Math.round(c.width) <= 24 && !out[c.name]) out[c.name] = c.key;
}
return JSON.stringify(out);
