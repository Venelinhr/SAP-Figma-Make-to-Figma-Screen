// Builds test/fixtures/make-dom.dump.json — a hand-made React + UI5 Web Components app in the shape make-probe-dom.browser.js returns
// (shell bar, title, filter row, KPI cards, tabs with a list, status tags, an open dialog). Run: node test/fixtures/make-dom.gen.js
const fs = require('fs'), path = require('path'), nodes = [];
const cs = (o) => Object.assign({ color: 'rgb(19, 30, 41)', fs: '14px', fw: '400', ff: '72', d: 'block' }, o);
const add = (p, t, r, c, extra) => { const n = Object.assign({ i: nodes.length, p, t, r, cs: cs(c) }, extra); nodes.push(n); return n.i; };
const body = add(-1, 'body', [0, 0, 1440, 900], { bg: 'rgb(245, 246, 247)', d: 'flex', fd: 'column' });
add(body, 'ui5-shellbar', [0, 0, 1440, 52], { bg: 'rgb(255, 255, 255)', d: 'flex' }, { at: { 'primary-title': 'Approval Flow', 'show-search': '' }, wc: 'Approval Flow' });
const main = add(body, 'div', [0, 52, 1440, 848], { d: 'flex', fd: 'column', gap: '16px 16px', pad: [24, 32, 24, 32] });
add(main, 'ui5-title', [32, 76, 300, 28], { fs: '24px', fw: '700' }, { at: { level: 'H2' }, wc: 'Approval Requests' });
const filt = add(main, 'div', [32, 120, 1376, 56], { d: 'flex', fd: 'row', gap: '16px 16px', ai: 'flex-end' });
add(filt, 'ui5-input', [32, 136, 240, 32], { bg: 'rgb(255, 255, 255)', bw: [1, 1, 1, 1], bc: ['rgb(137,145,154)', 'rgb(137,145,154)', 'rgb(137,145,154)', 'rgb(137,145,154)'], rad: '8px' }, { at: { placeholder: 'Search requests' }, wc: '' });
add(filt, 'ui5-select', [288, 136, 200, 32], { bg: 'rgb(255, 255, 255)', bw: [1, 1, 1, 1], bc: ['rgb(137,145,154)', 'rgb(137,145,154)', 'rgb(137,145,154)', 'rgb(137,145,154)'], rad: '8px' }, { sel: 'All statuses', wc: 'All statuses Open Approved' });
add(filt, 'ui5-checkbox', [504, 140, 140, 24], {}, { at: { text: 'Only mine', checked: '' }, wc: '' });
add(filt, 'ui5-button', [660, 136, 100, 32], { bg: 'rgb(8, 84, 160)', color: 'rgb(255,255,255)', rad: '8px' }, { at: { design: 'Emphasized', icon: 'add' }, wc: 'New' });
const cards = add(main, 'div', [32, 200, 1376, 140], { d: 'flex', fd: 'row', gap: '16px 16px' });
[['Open', '12', 'Negative'], ['In review', '5', 'Critical'], ['Approved', '31', 'Positive']].forEach((c, k) => {
  const x = 32 + k * 464, card = add(cards, 'div', [x, 200, 448, 140], { d: 'flex', fd: 'column', gap: '8px 8px', pad: [16, 16, 16, 16], bg: 'rgb(255, 255, 255)', rad: '16px', sh: 'rgba(0, 0, 0, 0.1) 0px 0px 2px 0px, rgba(0, 0, 0, 0.1) 0px 2px 4px 0px' });
  add(card, 'ui5-title', [x + 16, 216, 200, 20], { fs: '16px', fw: '700' }, { wc: c[0] });
  add(card, 'span', [x + 16, 244, 60, 44], { fs: '36px' }, { tx: c[1] });
  add(card, 'ui5-tag', [x + 16, 300, 90, 24], {}, { at: { design: c[2] }, wc: c[0] });
});
const tc = add(main, 'ui5-tabcontainer', [32, 360, 1376, 440], { d: 'block', bg: 'rgb(255,255,255)' });
const t1 = add(tc, 'ui5-tab', [32, 360, 1376, 440], {}, { at: { text: 'Requests', selected: '' }, wc: '' });
const list = add(t1, 'ui5-list', [32, 410, 1376, 240], { d: 'block' });
[['Laptop purchase', 'Requested by A. Kapoor · 29 Sept 2026'], ['Travel to Walldorf', 'Requested by L. Fischer · 27 Sept 2026'], ['Software licence', 'Requested by W. Zhang · 26 Sept 2026']].forEach((it, k) => {
  add(list, 'ui5-li', [32, 410 + k * 80, 1376, 80], { bg: 'rgb(255,255,255)', bw: [0, 0, 1, 0], bc: ['', '', 'rgb(229,229,229)', ''] }, { at: { description: it[1], icon: 'document' }, wc: it[0] + ' ' + it[1] });
});
add(tc, 'ui5-tab', [32, 360, 1376, 440], {}, { at: { text: 'History' }, wc: '' });
const dlg = add(body, 'ui5-dialog', [440, 200, 560, 360], { bg: 'rgb(255,255,255)', rad: '16px', sh: 'rgba(0, 0, 0, 0.3) 0px 8px 32px 0px', pos: 'fixed', d: 'flex', fd: 'column', pad: [64, 16, 16, 16] }, { at: { open: '', 'header-text': 'Approve request?' }, wc: '' });
add(dlg, 'span', [456, 264, 500, 20], {}, { tx: 'Laptop purchase will be sent to the next approver.' });
add(dlg, 'ui5-button', [880, 500, 100, 32], { bg: 'rgb(8, 84, 160)', color: 'rgb(255,255,255)', rad: '8px' }, { at: { design: 'Emphasized' }, wc: 'Approve' });
fs.writeFileSync(path.join(__dirname, 'make-dom.dump.json'), JSON.stringify({ kind: 'dom', url: 'https://example.figma.site/', title: 'Approval Flow', viewport: [1440, 900], page: [1440, 900], theme: 'sap_horizon', vars: {}, nodes }));
console.log(nodes.length, 'nodes');
