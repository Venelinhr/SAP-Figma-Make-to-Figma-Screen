// make-explore.browser.js — an async function (READ, opt) → states[]. Runs inside a classic SAPUI5 Make app (MAIN world, from the extension).
// It "uses the demo" the way a person would, but ONLY with safe presses, reads every new state with READ() (the probe) and puts the page back:
//   popup  = a Dialog / Popover / Menu / Action Sheet opened  (table row, sort / settings / filter / help / user buttons, dropdowns and date pickers)
//   screen = the page shows clearly different content          (side navigation item, icon tab, an interactive KPI card that filters the list)
// Never pressed: anything whose label matches BAD (save, delete, assign, escalate, send, confirm, cancel, close, reset, clear, refresh, export …).
// Before every read the page is normalised (header expanded, scrolled to the top) so each state is complete, and a state is kept only when it is NEW:
//   popups are compared by their fixed structure (class + labels + button texts), screens by their visible texts (≥ 85 % alike = the same screen).
// Returns [{ name, kind: 'popup' | 'screen', dump }] with .main (probe text of the normalised main page) and .info (what it found / did).
async (READ, opt) => {
  opt = opt || {};
  const sap = window.sap, E = sap.ui.require('sap/ui/core/Element');
  const nm = c => c.getMetadata().getName(), sleep = ms => new Promise(r => setTimeout(r, ms));
  const all = () => { const a = []; E.registry.forEach(c => a.push(c)); return a; };
  const vis = c => { const d = c.getDomRef && c.getDomRef(); if (!d) return false; const r = d.getBoundingClientRect(); return r.width > 4 && r.height > 4 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
  const BAD = /save|delet|remov|escalat|assign|send|submit|confirm|approv|reject|cancel|clos|reset|clear|refresh|export|log ?out|sign ?out|create|\badd\b|\bnew\b|updat|apply|discard|archiv|publish|toggle nav|menu2|\bok\b|reply|post|pay|buy|order/i;
  const clean = t => String(t || '').replace(/\s*\[.*$/, '').replace(/sap-icon:\/\/\S*/g, '').replace(/\s+/g, ' ').trim();
  const label = c => { let t = ''; try { t = (c.getTooltip_AsString && c.getTooltip_AsString()) || (c.getText && c.getText()) || (typeof c.getTitle === 'function' && typeof c.getTitle() === 'string' && c.getTitle()) || ''; } catch (e) {} let ic = ''; try { ic = c.getIcon ? c.getIcon() : ''; } catch (e) {} return String(t) + (ic ? ' [' + ic + ']' : ''); };
  const OVR = /^sap\.m\.(Dialog|Popover|ResponsivePopover|ActionSheet|Menu)$|^sap\.ui\.unified\.Menu$/;
  const overlays = () => all().filter(c => OVR.test(nm(c)) && c.isOpen && c.isOpen());
  const closeAll = async () => { for (let i = 0; i < 8; i++) { const o = overlays(); if (!o.length) return true; o.forEach(x => { try { x.close(); } catch (e) {} }); await sleep(400); } return !overlays().length; };
  const TXT = /^sap\.m\.(Text|Title|Label|ObjectIdentifier|ObjectStatus|ObjectNumber|Link)$/;
  const texts = () => { const s = new Set(); all().filter(c => TXT.test(nm(c)) && vis(c)).forEach(c => { try { const t = String(c.getText ? c.getText() : c.getTitle()).trim(); if (t) s.add(t); } catch (e) {} }); return s; };
  const alike = (a, b) => { if (!a.size && !b.size) return 1; let n = 0; a.forEach(x => { if (b.has(x)) n++; }); return n / Math.max(1, a.size + b.size - n); };
  // fixed structure of an open overlay: class + the labels / group headers / titles / button texts inside it (data such as case numbers is ignored)
  const structOf = ov => { const inside = c => { for (let p = c.getParent && c.getParent(), n = 0; p && n++ < 40; p = p.getParent && p.getParent()) if (p === ov) return true; return false; };
    const t = all().filter(c => inside(c) && /^sap\.m\.(Label|GroupHeaderListItem|Button|Title)$/.test(nm(c))).map(c => { try { return c.getText ? c.getText() : c.getTitle(); } catch (e) { return ''; } }).filter(Boolean);
    return nm(ov) + '|' + [...new Set(t)].sort().join(','); };
  const normalize = async () => {
    all().filter(c => nm(c) === 'sap.f.DynamicPage').forEach(p => { try { p.setHeaderExpanded(true); } catch (e) {} try { p.getScrollDelegate().scrollTo(0, 0, 0); } catch (e) {} });
    all().filter(c => /^sap\.m\.(ScrollContainer|Page)$/.test(nm(c))).forEach(p => { try { p.scrollTo(0, 0, 0); } catch (e) {} });
    await sleep(500);
  };
  const first = (arr, n) => arr.filter(vis).slice(0, n);
  // wait until an open popup / a new screen has finished drawing: its box and the number of visible controls stay the same for two checks
  const settle = async ov => { let last = ''; for (let i = 0; i < 9; i++) { all().filter(c => nm(c) === 'sap.m.Bar').forEach(b => { try { b._handleResize && b._handleResize(); } catch (e) {} }); const sig = ov.map(o => { const r = o.getDomRef && o.getDomRef(), b = r ? r.getBoundingClientRect() : {}; return [b.left, b.top, b.width, b.height].map(Math.round).join(','); }).join('|') + '#' + all().filter(vis).length; if (sig === last) return; last = sig; await sleep(400); } };
  // a real click on the control's DOM (for apps that listen to the click and not to the UI5 event we fire)
  const domClick = c => { const d = c && c.getDomRef && c.getDomRef(); if (!d) return; const t = d.querySelector('a,button,[role=button],[role=option],[tabindex]') || d;
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(ev => { try { t.dispatchEvent(new MouseEvent(ev, { bubbles: true, cancelable: true, view: window })); } catch (e) {} }); };
  const cands = [];

  // 1. a navigation row of a list / table → its detail dialog
  { const seenVal = new Set(), vals = c => { try { return (c.getCells ? c.getCells() : []).filter(x => /ObjectStatus$/.test(nm(x)) && x.getState && String(x.getState()) !== 'None').map(x => String(x.getState()) + ':' + x.getText()); } catch (e) { return []; } }, rowSig = c => vals(c).join('/');
    all().filter(c => /^sap\.m\.(ColumnListItem|StandardListItem|CustomListItem|ObjectListItem|FeedListItem)$/.test(nm(c)) && c.getType && /Navigation|Active/.test(String(c.getType())) && vis(c))
      .filter((c, i) => { const v = vals(c), fresh = v.filter(x => !seenVal.has(x)); if (i > 0 && v.length && !fresh.length) return false; v.forEach(x => seenVal.add(x)); return true; }).slice(0, 5)   // only a row that shows a status / priority value not seen before
      .forEach((c, i) => cands.push({ name: 'Row', kind: 'popup', sig: rowSig(c) || ('r' + i), run: () => c.firePress(), alt: () => domClick(c) })); }
  // 2. buttons that open a dialog / popover (never a button that changes data)
  first(all().filter(c => /^sap\.m\.(Button|OverflowButton|MenuButton)$/.test(nm(c)) && !BAD.test(label(c)) && /sort|setting|filter|column|view|detail|info|help|notif|bell|user|profile|avatar|more|share|feedback|search|message|sys-help|action/i.test(label(c))), 4)
    .forEach(c => cands.push({ name: clean(label(c)).slice(0, 30) || 'Button', kind: 'popup', run: () => c.firePress(), alt: () => domClick(c) }));
  // 3. every dropdown and picker → its popover
  first(all().filter(c => /^sap\.m\.(Select|ComboBox|MultiComboBox|DatePicker|DateRangeSelection)$/.test(nm(c))), 6).forEach(c => {
    const nmx = nm(c).split('.').pop(), ph = (c.getPlaceholder && c.getPlaceholder()) || '';
    cands.push({ name: nmx + (ph ? ' ' + ph : ''), kind: 'popup', run: () => {
      if (c.toggleOpen) c.toggleOpen(true); else if (c.open) c.open();
      if (!overlays().length) { try { const ic = c.getAggregation('_endIcon'); (Array.isArray(ic) ? ic[0] : ic).firePress(); } catch (e) {} }
    }, restore: () => { try { c.close && c.close(); } catch (e) {} } });
  });
  // 4. interactive KPI cards / tiles → they filter the list (another screen); a second press puts the filter back
  all().filter(c => /^sap\.f\.cards\.(NumericHeader|Header)$/.test(nm(c)) && c.getInteractive && c.getInteractive() && c.getDomRef && c.getDomRef()).slice(0, 4).forEach(c => {
    const t = (c.getTitle && c.getTitle()) || 'Card';
    cands.push({ name: 'Card ' + t, kind: 'screen', run: () => c.firePress(), alt: () => domClick(c), restore: () => { try { c.firePress(); } catch (e) {} } });
  });
  // 5. side navigation → another screen
  all().filter(c => nm(c) === 'sap.tnt.NavigationListItem' && vis(c) && !(c.getItems && c.getItems().length)).forEach(c => {
    const l = c.getParent(), orig = l && l.getSelectedItem && l.getSelectedItem(); if (!l || !l.setSelectedItem || c === orig || BAD.test(label(c))) return;
    cands.push({ name: 'Page ' + clean(label(c)).slice(0, 30), kind: 'screen', run: () => { l.setSelectedItem(c); l.fireItemSelect({ item: c }); }, alt: () => domClick(c), restore: () => { if (orig) { l.setSelectedItem(orig); l.fireItemSelect({ item: orig }); } } });
  });
  // 6. icon tabs → another screen
  all().filter(c => nm(c) === 'sap.m.IconTabFilter' && c.getKey && c.getKey() && vis(c)).forEach(c => {
    let bar = c.getParent(); if (bar && nm(bar) === 'sap.m.IconTabHeader' && bar.getParent() && nm(bar.getParent()) === 'sap.m.IconTabBar') bar = bar.getParent();
    if (!bar || !bar.setSelectedKey || !bar.getSelectedKey) return; const orig = bar.getSelectedKey(), key = c.getKey(); if (key === orig) return;
    cands.push({ name: 'Tab ' + clean(label(c)).slice(0, 30), kind: 'screen', run: () => bar.setSelectedKey(key), alt: () => domClick(c), restore: () => bar.setSelectedKey(orig) });
  });

  const info = { v: 6, env: { vis: document.visibilityState, w: innerWidth, h: innerHeight, focus: document.hasFocus(), top: window === window.top, ui5: sap.ui.version }, cands: cands.map(c => c.kind + ':' + c.name), log: [] };
  const states = [];
  await closeAll(); await normalize();
  let main = null; try { const r0 = await READ(); main = r0 && r0.dump; } catch (e) {}
  let drift = null;
  const baseT = texts(), seenScreens = [baseT], seenOv = new Set(), deadline = Date.now() + (opt.budgetMs || 40000);
  for (const c of cands.slice(0, opt.max || 14)) {
    if (Date.now() > deadline) { info.log.push('deadline'); break; }
    if (!(await closeAll())) { info.log.push(c.name + ' skipped (a popup stayed open)'); continue; }
    await normalize();
    try { c.run(); } catch (e) { info.log.push(c.name + ' ERR ' + String(e && e.message || e).slice(0, 60)); continue; }
    const maxWait = c.kind === 'screen' ? 1500 : 4000;
    let ov = overlays(), waited = 0, viaDom = false;
    while (!ov.length && waited < maxWait) { await sleep(300); waited += 300; ov = overlays(); }          // a popup may need a moment (animation, slow machine)
    if (!ov.length && c.alt && alike(texts(), baseT) >= 0.85) {                                         // nothing changed: press it the way a person does, with a click
      try { c.alt(); viaDom = true; } catch (e) {}
      waited = 0; while (!ov.length && waited < maxWait) { await sleep(300); waited += 300; ov = overlays(); }
    }
    if (!ov.length) await sleep(400);
    const domCount = document.querySelectorAll('.sapMDialog,.sapMPopover,.sapMPopup-CTX,.sapUiPopupContent').length;
    let kind = null, why = '';
    if (ov.length) {
      const k = ov.map(structOf).join('||') + (c.sig ? '|' + c.sig : '');
      if (seenOv.has(k)) why = 'same popup as before'; else { seenOv.add(k); kind = 'popup'; }
    } else {
      const t = texts(); if (drift) why = 'page had drifted'; else if (alike(t, baseT) >= 0.85 || seenScreens.some(s => alike(t, s) >= 0.85)) why = 'same screen as before'; else { seenScreens.push(t); kind = 'screen'; }
    }
    if (kind) { await settle(ov); try { const r = await READ(); if (r && r.dump) states.push({ name: c.name, kind, dump: r.dump }); } catch (e) { why = 'read failed'; } }
    if (kind === 'popup' && ov.length) {                                    // inside the popup: click every other icon tab / segment and read each one too (a person would)
      const inside = x => { for (let p = x.getParent && x.getParent(), n = 0; p && n++ < 40; p = p.getParent && p.getParent()) if (ov.includes(p)) return true; return false; };
      const tabs = all().filter(x => nm(x) === 'sap.m.IconTabFilter' && x.getKey && x.getKey() && inside(x));
      for (const tf of tabs) {
        let bar = tf.getParent(); if (bar && nm(bar) === 'sap.m.IconTabHeader' && bar.getParent() && nm(bar.getParent()) === 'sap.m.IconTabBar') bar = bar.getParent();
        if (!bar || !bar.setSelectedKey || !bar.getSelectedKey) continue; const orig = bar.getSelectedKey(), key = tf.getKey(); if (key === orig) continue;
        try { bar.setSelectedKey(key); try { bar.fireSelect && bar.fireSelect({ key, item: tf }); } catch (e) {} } catch (e) { continue; }
        await sleep(700); await settle(ov);
        try { const r = await READ(); if (r && r.dump) { states.push({ name: c.name + ' · ' + clean(label(tf)).slice(0, 24), kind: 'popup', dump: r.dump }); info.log.push(c.name + ' → tab ' + clean(label(tf)) + ' read'); } } catch (e) { info.log.push('tab read failed'); }
        try { bar.setSelectedKey(orig); try { bar.fireSelect && bar.fireSelect({ key: orig }); } catch (e) {} } catch (e) {}
        await sleep(400);
      }
    }
    info.log.push(c.name + ' → ' + (kind || 'skipped (' + (why || 'nothing opened') + ')') + (ov.length ? ' [' + ov.map(o => nm(o).split('.').pop()).join(',') + ']' : '') + ' ovMs=' + waited + (viaDom ? ' viaClick' : '') + ' dom=' + domCount + (ov.length ? '' : ' alike=' + Math.round(alike(texts(), baseT) * 100)));
    await closeAll();
    if (c.restore) { try { c.restore(); } catch (e) {} }
    await sleep(600);
    if (!drift && alike(texts(), baseT) < 0.9) { drift = c.name; info.log.push('DRIFT: the page did not return to its start state after ' + c.name + ' — no more screens are recorded'); }
  }
  await closeAll(); await normalize();
  states.info = info; states.main = main;
  return states;
}
