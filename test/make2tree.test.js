// make2tree.test.js — the Make converter is pure and stable: the saved Flugsuche probe dump must give the saved tree.
'use strict';
const test = require('node:test'), assert = require('node:assert'), fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const { convert } = require('../build/make-convert.js');
const FX = f => JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', f), 'utf8'));
const kit = require('../knowledge/live/kit.json'), map = require('../build/make-map.json'), extra = require('../knowledge/live/icons-extra.json').icons || {};

test('convert(): Flugsuche dump → golden tree', () => {
  const r = convert(FX('make-fly.dump.json'), kit, map, extra, 'Flugsuche — SAP kit');
  assert.deepStrictEqual(r.tree, FX('make-fly.tree.json'));
  assert.deepStrictEqual(r.warn, []);
  assert.strictEqual(r.images.length, 3);
});

test('convert(): no fs / path / require inside the module (it is compiled into the plugin)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'build', 'make-convert.js'), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/\brequire\(|\bfs\.|\bpath\./.test(src));
});

test('door.js accepts the golden tree', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'build', 'door.js'), path.join(__dirname, 'fixtures', 'make-fly.tree.json')]).toString();
  assert.match(out, /ALL IN/);
});

test('plugin: the compiled-in converter (slim kit) gives the same tree as the node converter', () => {
  const vm = require('vm');
  const code = fs.readFileSync(path.join(__dirname, '..', 'plugin', 'sap-bridge', 'code.js'), 'utf8');
  const a = code.indexOf('// ── GENERATED MAKE CONVERTER'), z = code.indexOf('// ── end GENERATED MAKE CONVERTER');
  assert.ok(a > 0 && z > a, 'generated block missing — run node build/plugin-bundle.js');
  const ctx = vm.createContext({});
  vm.runInContext(code.slice(a, z) + '\nthis.out = { MAKE_CONVERT, MAKE_MAP, MAKE_EXTRA, MAKE_KIT, FULL_KIT };', ctx);
  const { MAKE_CONVERT, MAKE_MAP, MAKE_EXTRA, MAKE_KIT, FULL_KIT } = ctx.out;
  const r = MAKE_CONVERT(FX('make-fly.dump.json'), MAKE_KIT, MAKE_MAP, MAKE_EXTRA, 'Flugsuche — SAP kit');
  assert.deepStrictEqual(JSON.parse(JSON.stringify(r.tree)), FX('make-fly.tree.json'));
  // every kit name the tree uses is in the full packed KIT the plugin builds with
  const miss = [];
  (function walk(o) {
    if (o.cp && !FULL_KIT.c[o.cp]) miss.push('component ' + o.cp);
    if (o.st && !FULL_KIT.t[o.st]) miss.push('text style ' + o.st);
    if (o.ic && !FULL_KIT.i[o.ic]) miss.push('icon ' + o.ic);
    for (const t of [o.bg, o.bc]) if (typeof t === 'string' && !t.startsWith('RAW') && !FULL_KIT.v[t]) miss.push('variable ' + t);
    (o.nav || []).forEach(x => { if (x.icon && !FULL_KIT.i[x.icon]) miss.push('icon ' + x.icon); });
    (o.c || []).forEach(walk);
  })(r.tree);
  assert.deepStrictEqual([...new Set(miss)], []);
});

// ── make-verify: the offline "does the Figma frame equal the Make app?" check (build/make-verify.js) ────────────────────────────────────────────
// STRUCTURE = the share of nodes that land on their Make box when every part has its Make size (tests the layout logic only). GROSS = a node off by > 40 px / bigger than the screen.
const verify = f => { let out; try { out = execFileSync(process.execPath, [path.join(__dirname, '..', 'build', 'make-verify.js'), path.join(__dirname, 'fixtures', f), '--quiet']).toString(); } catch (e) { out = e.stdout.toString(); }
  return { structure: parseFloat(/STRUCTURE\s+\d+\/\d+ nodes land on their Make box = ([\d.]+) %/.exec(out)[1]), gross: parseInt(/GROSS\s+(\d+) nodes/.exec(out)[1], 10), out }; };

test('make-verify: Purchase Orders (Grid + Table + toolbars, REAL dump read from the published app) lands on the Make boxes', () => {
  const v = verify('make-po.dump.json');
  assert.ok(v.structure >= 97, v.out); assert.strictEqual(v.gross, 0, v.out);
  const r = convert(FX('make-po.dump.json'), kit, map, extra, null);
  assert.deepStrictEqual(r.warn.filter(w => /^layout:|not mapped/.test(w)), []);               // nothing was left to guess
  const find = (n, name, out = []) => { if (n.n === name) out.push(n); (n.c || []).forEach(k => find(k, name, out)); return out; };
  const [header] = find(r.tree, 'Header Row'), rows = find(r.tree, 'Row').filter(x => x.c && x.c.length === header.c.length && x.h >= 50 && x.h <= 56);   // a row is ~52 px; long supplier names wrap to ~54 px
  assert.strictEqual(rows.length, 15);                                                          // 15 items, every row has one cell per column (+ the navigation arrow)
  assert.deepStrictEqual(rows[0].c.map(k => k.w), header.c.map(k => k.w));                       // header and rows share the column widths, so they line up
  assert.strictEqual(header.c.filter(k => /^F/.test(k.s)).length, 1);                           // exactly one column flexes: the table resizes
  const [grid] = find(r.tree, 'Grid'); assert.strictEqual(grid.d, 'H'); assert.strictEqual(grid.c.length, 6);   // the six filter fields sit side by side, not stacked
});

test('convert(): status cells are kit Object Status components (state + badge), filter fields are Multi Combobox with the sample tokens hidden', () => {
  const r = convert(FX('make-po.dump.json'), kit, map, extra, null), all = [];
  (function w(n) { all.push(n); (n.c || []).forEach(w); })(r.tree);
  const st = all.filter(n => n.k === 'i' && n.cp === 'Object Status');
  assert.strictEqual(st.length, 15);                                                              // one per order, never plain text
  assert.ok(st.every(n => n.tx && n.tx.Text));
  assert.ok(st.filter(n => n.pr.Inverted === 'Yes').every(n => ['Warning', 'Error'].includes(n.pr.Semantic)));   // Pending Approval / Rejected are badges
  assert.ok(st.some(n => n.pr.Inverted === 'Yes') && st.some(n => n.pr.Semantic === 'Success' && n.pr.Inverted === 'No'));
  const mc = all.filter(n => n.k === 'i' && n.cp === 'Multi Combobox');
  assert.strictEqual(mc.length, 5);
  assert.ok(mc.every(n => ['1st Token', '2nd Token', 'Overflow Link / Typing'].every(x => n.hide.includes(x)) && n.add[0].into === '⿻ Tokens Compact' && n.add[0].t));   // sample tokens hidden, the placeholder text goes into the tokens slot
  assert.ok(st.every(n => n.pr['Large Design'] === undefined && n.s === 'XX'));                 // normal size (Large Design = Yes is the 24 px display size); the box follows Make
  assert.ok(st.filter(n => n.pr.Inverted === 'Yes').every(n => n.h >= 22) && st.filter(n => n.pr.Inverted === 'No').every(n => n.h >= 16 && n.h <= 20));   // badge taller than plain status, like Make (24 / 18 px)
});

test('make-verify: hidden / off-screen controls (OverflowToolbar clones, probe hid:1) never enter the tree', () => {
  const D = FX('make-po.dump.json'), before = convert(D, kit, map, extra, null);
  const clone = { ...D.controls.find(c => c.cls === 'sap.m.Button'), id: '__clone', box: [9000, 10, 32, 32], props: { icon: 'sap-icon://overflow' } }, hid = { ...clone, id: '__hid', box: [400, 60, 32, 32], hid: 1 };
  D.controls.push(clone, hid);
  const after = convert(D, kit, map, extra, null);
  assert.deepStrictEqual(after.tree, before.tree);
});

test('make-verify: saved dumps do not get worse (regression floor per app)', () => {
  // floors are what the converter reached when this check was written; raise them when the converter improves
  const floors = { 'make-fly.dump.json': 46, 'make-search.dump.json': 56, 'make-tabs.dump.json': 98 };
  for (const [f, min] of Object.entries(floors)) { const v = verify(f); assert.ok(v.structure >= min, `${f}: STRUCTURE ${v.structure} % < ${min} %\n${v.out}`); assert.strictEqual(v.gross, 0, `${f}\n${v.out}`); }
});

test('convert(): a wrapped Text keeps only the lines Make shows (maxLines, or what fits the measured box) — Figma truncates with "…"', () => {
  const find = (t, s) => { let hit = null; JSON.stringify(t, (k, v) => { if (v && v.k === 't' && v.t === s) hit = v; return v; }); return hit; };
  const run = mut => {
    const d = FX('make-po.dump.json'), base = convert(d, kit, map, extra, 'T').tree, c = d.controls.find(x => x.cls === 'sap.m.Text' && x.props.text && find(base, x.props.text));
    mut(c); return { c, node: find(convert(d, kit, map, extra, 'T').tree, c.props.text) };
  };
  const a = run(c => { c.box[3] = 32; c.tx = Object.assign({}, c.tx, { fs: 14, lh: 16 }); c.props.text = 'Seal leakage with pressure drop in the main pump housing'; });
  assert.strictEqual(a.node.ml, 2, 'box of 2 lines → 2 lines');
  const b = run(c => { c.box[3] = 64; c.tx = Object.assign({}, c.tx, { fs: 14, lh: 16 }); c.props.maxLines = 3; c.props.text = 'Belt misalignment on the conveyor line, please check the drive'; });
  assert.strictEqual(b.node.ml, 3, 'the control maxLines wins');
  const one = run(c => { c.box[3] = 16; c.tx = Object.assign({}, c.tx, { fs: 14, lh: 16 }); c.props.text = 'Single line'; });
  assert.strictEqual(one.node.ml, undefined, 'a one-line text is not limited');
});

test('convert(): a flex-wrap row of small items becomes ONE Figma wrap row (re-wraps when the frame is resized), and still lands on the Make boxes', () => {
  const r = convert(FX('make-maint.dump.json'), kit, map, extra, 'M');
  const rows = []; JSON.stringify(r.tree, (k, v) => { if (v && v.wrapRow) rows.push(v); return v; });
  assert.strictEqual(rows.length, 1, 'the filter bar');
  assert.strictEqual(rows[0].d, 'H'); assert.match(rows[0].s, /^F/, 'wrap row spans its parent'); assert.ok(rows[0].c.length >= 6);
  const out = execFileSync(process.execPath, [path.join(__dirname, '..', 'build', 'make-verify.js'), path.join(__dirname, 'fixtures', 'make-maint.dump.json'), '--quiet']).toString();
  assert.match(out, /STRUCTURE .*100 %/); assert.match(out, /GROSS +0 /);
});

test('convert(): a table that Make scrolls sideways (columns wider than the table) is fitted to the table width — every row adds up', () => {
  const r = convert(FX('make-support.dump.json'), kit, map, extra, 'S');
  const rows = []; JSON.stringify(r.tree, (k, v) => { if (v && (v.n === 'Header Row' || v.n === 'Row') && v.c && v.c.length > 5 && v.c[0].n === 'Cell') rows.push(v); return v; });
  assert.ok(rows.length >= 20, 'header + rows');
  for (const row of rows) assert.ok(Math.abs(row.c.reduce((q, c) => q + c.w, 0) - row.w) <= 1.5, `cells ${row.c.reduce((q, c) => q + c.w, 0)} vs row ${row.w}`);
});

test('convert(): an OPEN Dialog (static area, position:fixed → probe says hidden) becomes its own frame; a page without one has none', () => {
  const r = convert(FX('make-dialog.dump.json'), kit, map, extra, 'D');
  assert.strictEqual(r.extra.length, 1);
  const e = r.extra[0]; assert.match(e.name, /^Dialog — Case /); assert.deepStrictEqual(e.tree.w, 832); assert.ok(e.tree.c.length >= 3, 'title bar, content, footer');
  const js = JSON.stringify(e.tree);
  assert.ok(js.includes('"✏️ Label":"Customer"') && js.includes('"✏️ Label":"Response Deadline"') && js.includes('Conversation'), 'the dialog fields are there');
  assert.ok(js.includes('The vendor import created duplicates') && js.includes('Customer · 24 Sept, 19:05'), 'conversation messages keep their text and meta line');
  assert.strictEqual(convert(FX('make-support.dump.json'), kit, map, extra, 'S').extra.length, 0);
});

test('convert(): an overlay owned by a control (a dropdown Popover whose parent is the ComboBox) is found as well', () => {
  const d = FX('make-dialog.dump.json'), dlg = d.controls.find(c => c.cls === 'sap.m.Dialog');
  const owner = d.controls.find(c => c.cls === 'sap.m.Button'); dlg.parent = owner.id;          // owned by a control, not by the static area
  assert.strictEqual(convert(d, kit, map, extra, 'D').extra.length, 1);
  const closed = FX('make-dialog.dump.json'); closed.controls.find(c => c.cls === 'sap.m.Dialog').box = [0, 0, 0, 0];   // a closed overlay has no box
  assert.strictEqual(convert(closed, kit, map, extra, 'D').extra.length, 0);
});

test('convert(): an ObjectHeader shows its title (a property) and its Equipment / Plant / Scheduled attributes', () => {
  const D = FX('make-dialog.dump.json'), bar = D.controls.find(c => c.cls === 'sap.m.Bar'), dlg = D.controls.find(c => c.cls === 'sap.m.Dialog');
  const oh = { id: '__oh0', cls: 'sap.m.ObjectHeader', parent: dlg.id, box: [dlg.box[0], dlg.box[1] + 40, dlg.box[2], 100], props: { title: 'Seal leakage with pressure drop' }, st: bar.st, css: [] };
  const oa = { id: '__oa0', cls: 'sap.m.ObjectAttribute', parent: oh.id, box: [dlg.box[0] + 16, dlg.box[1] + 108, 190, 16], props: { title: 'Plant', text: '1010 Hamburg' }, st: bar.st, tx: { fs: 14, fw: 400, fg: '#556b82', ff: '72', lh: 16 }, css: [] };
  D.controls.push(oh, oa);
  const js = JSON.stringify(convert(D, kit, map, extra, 'D').extra[0].tree);
  assert.ok(js.includes('Seal leakage with pressure drop') && js.includes('Plant: 1010 Hamburg'));
});

test('an icon tab bar shows its icon tabs and the content of the selected tab (form fields, status labels)', () => {
  const r = convert(FX('make-row.dump.json'), kit, map, extra, 'Row');
  const all = JSON.stringify((r.extra || []).map(x => x.tree));
  assert.ok(r.extra && r.extra.length, 'the dialog is an extra frame');
  assert.ok(/Icon Only/.test(all) && /Assign & Schedule/.test(all), 'icon tabs: kit icon tab + label');
  assert.ok(/Technician/.test(all) && /Work Notes/.test(all), 'form fields');
  assert.ok(/Priority:/.test(all), 'status label');
  assert.ok(!r.warn.some(w => /icon "(history|appointment-2)"/.test(w)));
});

test('make-map.json "controls": every kit part, property and value exists in the real kit', () => {
  const norm = x => String(x).replace(/#.*$/, '').replace(/^[^\p{L}\p{N}]+/u, '').trim().toLowerCase();
  const rows = Object.entries(map.controls).filter(([k]) => k[0] !== '_');
  assert.ok(rows.length >= 20, 'the table has the controls');
  const bad = [];
  for (const [cls, row] of rows) {
    const comp = kit.components[row.comp]; if (!comp) { bad.push(cls + ': no kit part "' + row.comp + '"'); continue; }
    const defs = {}; for (const [k, v] of Object.entries(comp.props || {})) defs[norm(k)] = v;
    for (const [k, spec] of Object.entries(row.props || {})) {
      const d = defs[norm(k)]; if (!d) { bad.push(cls + ': ' + row.comp + ' has no property "' + k + '"'); continue; }
      if (!/^V:/.test(d)) continue;
      const opts = d.slice(2).split('|').slice(1).join('|').split(',').map(x => x.trim().toLowerCase());
      const vals = typeof spec === 'string' ? [spec.slice(1)] : [].concat(spec.map ? Object.values(spec.map) : [], spec.def !== undefined && typeof spec.def === 'string' ? [spec.def] : []);
      if (spec && spec.pct) continue;
      vals.forEach(v => { if (!opts.includes(String(v).toLowerCase())) bad.push(cls + ': ' + row.comp + '.' + k + ' has no value "' + v + '"'); });
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('mapped controls become kit instances with their properties (MessageStrip, RadioButton, Breadcrumbs)', () => {
  const d = JSON.parse(JSON.stringify(FX('make-row.dump.json')));                       // a real dump: three of its labels become other UI5 controls
  const labels = d.controls.filter(c => c.cls === 'sap.m.Label').slice(0, 3);
  Object.assign(labels[0], { cls: 'sap.m.MessageStrip', props: { text: 'Careful', type: 'Warning' } });
  Object.assign(labels[1], { cls: 'sap.m.RadioButton', props: { text: 'Yes', selected: true } });
  Object.assign(labels[2], { cls: 'sap.m.Breadcrumbs', props: { currentLocationText: 'Here' } });
  const r = convert(d, kit, map, extra, 'x'), all = JSON.stringify([r.tree].concat((r.extra || []).map(x => x.tree)));
  assert.ok(/Message Strip/.test(all) && /"Value State":"Critical"/.test(all), 'message strip warning → Critical');
  assert.ok(/Radio Button/.test(all) && /"Selected":"True"/.test(all), 'radio selected');
  assert.ok(/Breadcrumb/.test(all) && /"Current Item":"Here"/.test(all), 'breadcrumb');
  assert.ok(!r.warn.some(w => /not mapped/.test(w)), 'no "not mapped" warning');
});

test('SegmentedButton → kit segments (selected = Toggled); aliases: OverflowToolbarButton is a Button, ObjectPage is a DynamicPage, ui.table is a Table', () => {
  const d = JSON.parse(JSON.stringify(FX('make-row.dump.json')));
  const btns = ['Save', 'Cancel'].map(x => d.controls.find(c => c.cls === 'sap.m.Button' && c.props.text === x && c.hid));
  assert.ok(btns[0] && btns[1], 'the dialog footer has Save and Cancel');
  const seg = Object.assign({}, btns[0], { id: 'seg0', cls: 'sap.m.SegmentedButton', props: {}, box: [btns[0].box[0], btns[0].box[1], 128, 26], aria: {} });
  btns.forEach(b => { b.parent = 'seg0'; });
  btns[1].aria = { cls: 'sapMSegBBtn sapMSegBBtnSel' };
  d.controls.push(seg);
  const r = convert(d, kit, map, extra, 'x'), all = JSON.stringify([r.tree].concat((r.extra || []).map(x => x.tree)));
  assert.ok(/Segmented Button Singular/.test(all) && /"Toggled":"True"/.test(all), 'segments, selected one toggled');
  assert.deepStrictEqual(Object.keys(map.class_alias).filter(k => !/^sap\./.test(k)), []);
});

test('an app without the ToolPage shell (Grid root, e.g. a fare search) is converted, not dropped', () => {
  const r = convert(FX('make-build.dump.json'), kit, map, extra, 'Build');
  const all = JSON.stringify(r.tree);
  assert.ok(all.length > 10000, 'the tree has the page content (' + all.length + ' bytes)');
  assert.ok(/Range Slider/.test(all) && /Radio Button/.test(all), 'sliders and radio buttons are kit parts');
});

test('self-check: a control the converter has never seen keeps its text; a lost text is reported', () => {
  const d = JSON.parse(JSON.stringify(FX('make-row.dump.json')));
  const lbl = d.controls.find(c => c.cls === 'sap.m.Label' && c.hid);
  Object.assign(lbl, { cls: 'sap.m.BrandNewThing', props: { text: 'Brand new control text' } });
  const r = convert(d, kit, map, extra, 'x'), all = JSON.stringify([r.tree].concat((r.extra || []).map(x => x.tree)));
  assert.ok(all.includes('Brand new control text'), 'the text of an unknown control is in the tree');
  assert.ok(r.warn.some(w => /BrandNewThing/.test(w)), 'and it is reported');
  assert.ok(r.audit && Array.isArray(r.audit.lostTexts), 'the audit is returned');
});

test('React / UI5 Web Components app (kind:"dom") → kit parts, popup frame, door passes', () => {
  const r = convert(FX('make-dom.dump.json'), kit, map, extra, 'Approval Flow'), all = JSON.stringify(r.tree);
  for (const part of ['Shell Bar', '"cp":"Input"', '"cp":"Select"', 'Check Box', '"cp":"Button"', 'Object Status', '"cp":"Tab"', 'List Item'])
    assert.ok(all.includes(part), 'kit part ' + part);
  assert.ok(all.includes('Approval Requests') && all.includes('Laptop purchase'), 'texts');
  assert.ok(r.extra.length === 1 && /Approve request/.test(r.extra[0].name), 'the open dialog is its own frame');
  assert.deepStrictEqual(r.audit.lostTexts, [], 'no text is lost');
  const tmp = require('os').tmpdir() + '/make-dom.tree.json'; fs.writeFileSync(tmp, JSON.stringify(r.tree));
  assert.match(execFileSync(process.execPath, [path.join(__dirname, '..', 'build', 'door.js'), tmp]).toString(), /ALL IN/);
});

test('React app with plain HTML (Ariba-style): cards, avatar circles, pills, role=button icon, svg, absolute dashed connectors, door passes', () => {
  const r = convert(FX('make-dom-ariba.dump.json'), kit, map, extra, 'Approval Flow'), all = JSON.stringify(r.tree);
  for (const x of ['Michael Adams', 'Global Procurement Strategic Lead', 'Approved: Oct 24', 'Current Approver:', '"cp":"Icon Button"', '"cp":"Link"', '"abs":1', '"k":"v"', 'status-completed'])
    assert.ok(all.includes(x), 'tree has ' + x);
  assert.ok(/"r":16/.test(all) && /"r":8/.test(all), 'radius of the avatar circle and the card');
  assert.deepStrictEqual(r.audit.lostTexts, [], 'no text is lost');
  const tmp = require('os').tmpdir() + '/make-dom-ariba.tree.json'; fs.writeFileSync(tmp, JSON.stringify(r.tree));
  assert.match(execFileSync(process.execPath, [path.join(__dirname, '..', 'build', 'door.js'), tmp]).toString(), /ALL IN/);
});

test('React controller panel (select label, gradient buttons, bold label + plain text on one line)', () => {
  const cs = o => Object.assign({ color: 'rgb(76, 76, 76)', fs: '13px', fw: '400', ff: 'Helvetica Neue', d: 'block' }, o);
  const nodes = []; const add = (p, t, r, c, x) => { nodes.push(Object.assign({ i: nodes.length, p, t, r, cs: cs(c) }, x)); return nodes.length - 1; };
  const root = add(-1, 'div', [0, 0, 300, 400], { bg: 'rgb(231, 231, 231)', pad: [24, 24, 24, 24] });
  add(root, 'select', [24, 40, 252, 36], { bgi: 'linear-gradient(rgb(255, 255, 255) 0%, rgb(200, 200, 200) 100%)', bw: [1, 1, 1, 1], bc: ['rgb(150,150,150)', 'rgb(150,150,150)', 'rgb(150,150,150)', 'rgb(150,150,150)'], rad: '10px', fw: '700' }, { at: { value: 'PartiallyApproved' }, sel: 'Partially Approved' });
  add(root, 'button', [24, 100, 120, 36], { bgi: 'linear-gradient(rgb(94, 161, 236) 0%, rgb(38, 96, 179) 100%)', bw: [1, 1, 1, 1], bc: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'], rad: '10px', color: 'rgb(255,255,255)', fw: '700' }, { tx: 'Morning' });
  add(root, 'button', [156, 100, 120, 36], { bgi: 'linear-gradient(rgb(255, 255, 255) 0%, rgb(200, 200, 200) 100%)', bw: [1, 1, 1, 1], bc: ['rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)', 'rgb(0,0,0)'], rad: '10px', fw: '700' }, { tx: 'Evening' });
  const line = add(root, 'div', [24, 160, 252, 16], { fs: '10px' }, { tx: 'Online' });
  add(line, 'strong', [24, 160, 40, 16], { fs: '10px', fw: '700' }, { tx: 'Status:' });
  const r = convert({ kind: 'dom', url: 'x', title: 'Controller', viewport: [300, 400], page: [300, 400], vars: {}, nodes }, kit, map, extra, 'Controller'), all = JSON.stringify(r.tree);
  assert.ok(all.includes('Partially Approved') && !all.includes('PartiallyApproved'), 'the select shows its label');
  assert.ok(/"Type":"Primary"/.test(all) && /"Type":"Secondary"/.test(all), 'the blue gradient button is primary, the grey one is secondary');
  assert.ok(all.includes('Online') && all.includes('Status:'), 'both parts of the line');
  assert.deepStrictEqual(r.audit.lostTexts, []);
});
