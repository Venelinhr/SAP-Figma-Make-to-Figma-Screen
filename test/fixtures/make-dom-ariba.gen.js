// Builds test/fixtures/make-dom-ariba.dump.json — a React app shaped like "SAP Ariba Approval Flow" (read from its Make source):
// plain divs / spans / h4 / p, a role="button" div with a ui5-icon, avatar circles, status pills, an inline svg and absolutely
// positioned dashed connector lines. Run: node test/fixtures/make-dom-ariba.gen.js
const fs = require('fs'), path = require('path'), nodes = [];
const cs = o => Object.assign({ color: 'rgb(19, 30, 41)', fs: '14px', fw: '400', ff: '72', d: 'block' }, o);
const add = (p, t, r, c, extra) => { const n = Object.assign({ i: nodes.length, p, t, r, cs: cs(c) }, extra); nodes.push(n); return n.i; };
const W = 520, root = add(-1, 'div', [0, 0, W, 900], { bg: 'rgb(245, 246, 247)', d: 'flex', fd: 'column', pad: [24, 24, 24, 24] });
const head = add(root, 'div', [24, 24, 472, 44], { bg: 'rgb(255, 255, 255)', d: 'flex', ai: 'center', pad: [16, 16, 16, 16], fs: '12px' });
add(head, 'span', [40, 38, 40, 16], { fs: '12px', color: 'rgb(85, 107, 130)' }, { tx: 'Steps:' });
add(head, 'span', [84, 38, 10, 16], { fs: '12px' }, { tx: '8' });
add(head, 'span', [98, 38, 8, 16], { fs: '12px', color: 'rgb(85, 107, 130)' }, { tx: '•' });
add(head, 'span', [110, 38, 100, 16], { fs: '12px', color: 'rgb(85, 107, 130)' }, { tx: 'Current Approver:' });
add(head, 'span', [214, 38, 90, 16], { fs: '12px', color: 'rgb(0, 100, 217)' }, { tx: 'Carmen Fernandez', at: { role: 'link' } });
const list = add(root, 'div', [24, 84, 472, 600], { d: 'flex', fd: 'column' });
[['Michael Adams', 'Global Procurement Strategic Lead', 'Approved: Oct 24', 'ok', 'MA'], ['Carmen Fernandez', 'Finance Controller, LATAM Region', 'Viewed: Oct 27', 'view', 'CF'], ['Maria Fontes', 'Senior Legal Counsel', 'Not Started', 'none', 'MF']].forEach((s, k) => {
  const y = 84 + k * 168, row = add(list, 'div', [24, y, 472, 168], { d: 'flex', fd: 'row', pad: [0, 16, 32, 16] });
  if (k > 0) add(row, 'div', [51, y, 1, 13], { pos: 'absolute', bw: [0, 0, 0, 1], bc: ['', '', '', 'rgb(137, 145, 154)'], bs: 'dashed' });
  if (k < 2) add(row, 'div', [51, y + 35, 1, 133], { pos: 'absolute', bw: [0, 0, 0, 1], bc: ['', '', '', 'rgb(137, 145, 154)'], bs: s[3] === 'ok' ? 'solid' : 'dashed' });
  const iw = add(row, 'div', [40, y + 13, 22, 22], { d: 'flex', ai: 'center' });
  if (s[3] === 'view') add(iw, 'svg', [42, y + 15, 18, 18], { color: 'rgb(0, 93, 191)' }, { svg: '<svg viewBox="0 0 512 512" style="width:18px;height:18px"><path d="M390 32q38 0 64 26t26 64v268q0 38-26 64t-64 26H122q-38 0-64-26t-26-64V122q0-38 26-64t64-26h268z"/></svg>' });
  else add(iw, 'ui5-icon', [40, y + 13, 22, 22], { color: s[3] === 'ok' ? 'rgb(16, 126, 62)' : 'rgb(106, 109, 112)' }, { at: { name: s[3] === 'ok' ? 'status-completed' : 'circle-task' } });
  const card = add(row, 'div', [78, y, 402, 120], { bg: 'rgb(255, 255, 255)', bw: [1, 1, 1, 1], bc: ['rgb(217,217,217)', 'rgb(217,217,217)', 'rgb(217,217,217)', 'rgb(217,217,217)'], rad: '8px', pad: [16, 16, 16, 16], d: 'flex', fd: 'column' });
  const top = add(card, 'div', [95, y + 17, 366, 56], { d: 'flex', gap: '12px 12px', ai: 'flex-start' });
  add(top, 'span', [95, y + 17, 32, 32], { bg: 'rgb(232, 243, 255)', bw: [1, 1, 1, 1], bc: ['rgb(0,100,217)', 'rgb(0,100,217)', 'rgb(0,100,217)', 'rgb(0,100,217)'], rad: '50%', d: 'flex', ai: 'center', jc: 'center', color: 'rgb(0, 100, 217)', fs: '16px' }, { tx: s[4] });
  const txtc = add(top, 'div', [139, y + 19, 270, 54], { d: 'block' });
  const h4 = add(txtc, 'h4', [139, y + 19, 270, 20], { fs: '14px' });
  add(h4, 'span', [139, y + 19, 120, 20], { color: 'rgb(0, 100, 217)', fw: '700' }, { tx: s[0] });
  add(txtc, 'p', [139, y + 41, 270, 32], { fs: '12px', color: 'rgb(85, 107, 130)' }, { tx: s[1] });
  const ib = add(top, 'div', [429, y + 13, 32, 26], { d: 'flex', ai: 'center', jc: 'center', rad: '8px' }, { at: { role: 'button', tabindex: '0' } });
  add(ib, 'ui5-icon', [437, y + 18, 16, 16], { color: 'rgb(0, 100, 217)' }, { at: { name: 'overflow' } });
  const pill = add(card, 'div', [95, y + 85, s[2].length * 7 + 16, 20], { bg: s[3] === 'ok' ? 'rgb(235, 245, 203)' : s[3] === 'view' ? 'rgb(232, 240, 247)' : 'rgb(245, 245, 245)', rad: '16px', pad: [2, 8, 2, 8], d: 'inline-flex', ai: 'center', fs: '12px', fw: '700', color: s[3] === 'ok' ? 'rgb(16, 126, 62)' : s[3] === 'view' ? 'rgb(0, 93, 191)' : 'rgb(106, 109, 112)' }, { tx: s[2] });
});
fs.writeFileSync(path.join(__dirname, 'make-dom-ariba.dump.json'), JSON.stringify({ kind: 'dom', url: 'https://example.figma.site/', title: 'Approval Flow', viewport: [520, 900], page: [520, 900], theme: 'sap_horizon', vars: {}, nodes }));
console.log(nodes.length, 'nodes');
