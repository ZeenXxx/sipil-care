(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const state = { nodes: [], members: [], nextNode: 1, nextMember: 1, results: null };
  const fmt = (value, digits = 3) => Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: digits });
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const supportNames = { free: 'Bebas', fixed: 'Jepit', pin: 'Sendi', rollerY: 'Rol Y', rollerX: 'Rol X' };
  const defaultNodes = () => [
    { id: 1, x: 0, y: 0, support: 'fixed', fx: 0, fy: 0, mz: 0 },
    { id: 2, x: 6, y: 0, support: 'fixed', fx: 0, fy: 0, mz: 0 },
    { id: 3, x: 0, y: 4, support: 'free', fx: 0, fy: 0, mz: 0 },
    { id: 4, x: 6, y: 4, support: 'free', fx: 30, fy: 0, mz: 0 }
  ];
  const defaultMembers = () => [
    { id: 1, i: 1, j: 3, e: 200000, a: 100, inertia: 80000, q: 0 },
    { id: 2, i: 3, j: 4, e: 200000, a: 100, inertia: 80000, q: -10 },
    { id: 3, i: 2, j: 4, e: 200000, a: 100, inertia: 80000, q: 0 }
  ];

  const msg = (text, ok = false) => {
    $('portalMessage').textContent = text;
    $('portalMessage').classList.toggle('ok', ok);
  };
  const clearResults = () => {
    state.results = null;
    $('portalResultSummary').innerHTML = '<p>Model berubah. Tekan Analisis untuk menghitung ulang.</p>';
    $('portalNodeResults').innerHTML = '<tr><td colspan="7">Belum ada hasil.</td></tr>';
    $('portalMemberResults').innerHTML = '<tr><td colspan="7">Belum ada hasil.</td></tr>';
    $('portalDiagrams').innerHTML = '<p>Diagram akan ditampilkan setelah analisis.</p>';
  };
  const node = id => state.nodes.find(item => item.id === Number(id));
  const member = id => state.members.find(item => item.id === Number(id));
  const nodeLabel = id => `N${id}`;
  const supportOptions = selected => Object.entries(supportNames).map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');

  function updateSelects() {
    const nodeOptions = state.nodes.map(item => `<option value="${item.id}">${nodeLabel(item.id)} (${fmt(item.x, 2)}, ${fmt(item.y, 2)})</option>`).join('');
    ['portalMemberI', 'portalMemberJ', 'portalLoadNode'].forEach(id => { $(id).innerHTML = nodeOptions; });
    if (state.nodes.length > 1) $('portalMemberJ').value = state.nodes[1].id;
  }

  function renderModel() {
    $('portalNodeRows').innerHTML = state.nodes.map(item => `
      <tr>
        <td><b>${nodeLabel(item.id)}</b></td><td>${fmt(item.x, 3)}</td><td>${fmt(item.y, 3)}</td>
        <td><select class="control portal-support-select" data-node-support="${item.id}">${supportOptions(item.support)}</select></td>
        <td>${fmt(item.fx)}</td><td>${fmt(item.fy)}</td><td>${fmt(item.mz)}</td>
        <td><button class="btn btn-secondary portal-remove" type="button" data-remove-node="${item.id}" aria-label="Hapus ${nodeLabel(item.id)}">Hapus</button></td>
      </tr>`).join('') || '<tr><td colspan="8">Belum ada node.</td></tr>';
    $('portalMemberRows').innerHTML = state.members.map(item => {
      const n1 = node(item.i); const n2 = node(item.j);
      const length = n1 && n2 ? Math.hypot(n2.x - n1.x, n2.y - n1.y) : 0;
      return `<tr><td><b>B${item.id}</b></td><td>${nodeLabel(item.i)}–${nodeLabel(item.j)}</td><td>${fmt(length, 3)}</td><td>${fmt(item.a, 2)}</td><td>${fmt(item.inertia, 2)}</td><td>${fmt(item.e, 0)}</td><td>${fmt(item.q, 2)}</td><td><button class="btn btn-secondary portal-remove" type="button" data-remove-member="${item.id}" aria-label="Hapus batang B${item.id}">Hapus</button></td></tr>`;
    }).join('') || '<tr><td colspan="8">Belum ada batang.</td></tr>';
    renderGeometry();
  }

  function renderGeometry() {
    const svg = $('portalCanvas');
    if (!state.nodes.length) { svg.innerHTML = ''; return; }
    const minX = Math.min(...state.nodes.map(item => item.x)); const maxX = Math.max(...state.nodes.map(item => item.x));
    const minY = Math.min(...state.nodes.map(item => item.y)); const maxY = Math.max(...state.nodes.map(item => item.y));
    const spanX = Math.max(maxX - minX, 1); const spanY = Math.max(maxY - minY, 1);
    const scale = Math.min(690 / spanX, 340 / spanY);
    const offsetX = 105 + (690 - spanX * scale) / 2; const offsetY = 415 - (340 - spanY * scale) / 2;
    const xy = item => ({ x: offsetX + (item.x - minX) * scale, y: offsetY - (item.y - minY) * scale });
    const defs = '<defs><marker id="portalArrow" markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#c93434"/></marker></defs>';
    const members = state.members.map(item => {
      const a = node(item.i), b = node(item.j); if (!a || !b) return '';
      const p = xy(a), q = xy(b), midX = (p.x + q.x) / 2, midY = (p.y + q.y) / 2;
      const qLabel = item.q ? `<text x="${midX}" y="${midY - 14}" class="portal-svg-load-label">q=${fmt(item.q, 1)} kN/m</text>` : '';
      return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" class="portal-member-line"/><text x="${midX + 8}" y="${midY - 8}" class="portal-svg-member-label">B${item.id}</text>${qLabel}`;
    }).join('');
    const nodes = state.nodes.map(item => {
      const p = xy(item); let support = '';
      if (item.support === 'fixed') support = `<path d="M${p.x - 17} ${p.y + 3}h34 M${p.x - 14} ${p.y + 6}l-7 10m14-10-7 10m14-10-7 10m14-10-7 10" class="portal-support-mark"/>`;
      else if (item.support === 'rollerX') {
        support = `<path d="M${p.x - 4} ${p.y}l-18-12v24z" class="portal-support-triangle"/><circle cx="${p.x - 25}" cy="${p.y - 6}" r="3" class="portal-support-wheel"/><circle cx="${p.x - 25}" cy="${p.y + 6}" r="3" class="portal-support-wheel"/><path d="M${p.x - 32} ${p.y - 17}v34" class="portal-support-mark"/>`;
      } else if (item.support !== 'free') {
        support = `<path d="M${p.x} ${p.y + 4}l-12 16h24z" class="portal-support-triangle"/>`;
        if (item.support.startsWith('roller')) support += `<circle cx="${p.x - 6}" cy="${p.y + 23}" r="3" class="portal-support-wheel"/><circle cx="${p.x + 6}" cy="${p.y + 23}" r="3" class="portal-support-wheel"/>`;
        support += `<path d="M${p.x - 18} ${p.y + 28}h36" class="portal-support-mark"/>`;
      }
      let load = '';
      if (Math.abs(item.fx) + Math.abs(item.fy) > 1e-8) {
        const dx = item.fx ? Math.sign(item.fx) * 40 : 0, dy = item.fy ? -Math.sign(item.fy) * 40 : 0;
        const startX = p.x - dx, startY = p.y - dy;
        load += `<line x1="${startX}" y1="${startY}" x2="${p.x - dx * .22}" y2="${p.y - dy * .22}" class="portal-load-arrow" marker-end="url(#portalArrow)"/><text x="${startX}" y="${startY - 8}" class="portal-svg-load-label">(${fmt(item.fx)}, ${fmt(item.fy)}) kN</text>`;
      }
      if (Math.abs(item.mz) > 1e-8) load += `<text x="${p.x + 16}" y="${p.y - 20}" class="portal-svg-load-label">Mz=${fmt(item.mz)} kN·m</text>`;
      return `${support}<circle cx="${p.x}" cy="${p.y}" r="6" class="portal-node-dot"/><text x="${p.x + 10}" y="${p.y - 10}" class="portal-svg-node-label">${nodeLabel(item.id)}</text>${load}`;
    }).join('');
    svg.innerHTML = `${defs}<g>${members}${nodes}</g>`;
  }

  function addNode() {
    const xText = $('portalNodeX').value.trim(), yText = $('portalNodeY').value.trim();
    const x = Number(xText), y = Number(yText);
    if (!xText || !yText || !Number.isFinite(x) || !Number.isFinite(y)) return msg('Koordinat node harus diisi dengan angka.');
    state.nodes.push({ id: state.nextNode++, x, y, support: $('portalNodeSupport').value, fx: 0, fy: 0, mz: 0 });
    clearResults(); updateSelects(); renderModel(); msg('Node ditambahkan.', true);
  }

  function addMember() {
    const i = Number($('portalMemberI').value), j = Number($('portalMemberJ').value);
    const E = Number($('portalE').value), A = Number($('portalA').value), inertia = Number($('portalI').value), q = Number($('portalMemberQ').value || 0);
    if (i === j) return msg('Node i dan j harus berbeda.');
    if (![E, A, inertia, q].every(Number.isFinite) || E <= 0 || A <= 0 || inertia <= 0) return msg('E, A, dan I harus lebih besar dari nol.');
    state.members.push({ id: state.nextMember++, i, j, e: E, a: A, inertia, q });
    clearResults(); renderModel(); msg('Batang frame ditambahkan.', true);
  }

  function addNodeLoad() {
    const target = node($('portalLoadNode').value);
    if (!target) return msg('Tambahkan node terlebih dahulu.');
    const fx = Number($('portalLoadFx').value || 0), fy = Number($('portalLoadFy').value || 0), mz = Number($('portalLoadMz').value || 0);
    if (![fx, fy, mz].every(Number.isFinite)) return msg('Beban node harus berupa angka.');
    target.fx = fx; target.fy = fy; target.mz = mz;
    clearResults(); renderModel(); msg(`Beban pada ${nodeLabel(target.id)} disimpan.`, true);
  }

  function restraints(support) {
    if (support === 'fixed') return [true, true, true];
    if (support === 'pin') return [true, true, false];
    if (support === 'rollerX') return [true, false, false];
    if (support === 'rollerY') return [false, true, false];
    return [false, false, false];
  }

  function localStiffness(E, A, I, L) {
    const axial = E * A / L, a = 12 * E * I / (L ** 3), b = 6 * E * I / (L ** 2), c = 4 * E * I / L, d = 2 * E * I / L;
    return [
      [axial, 0, 0, -axial, 0, 0], [0, a, b, 0, -a, b], [0, b, c, 0, -b, d],
      [-axial, 0, 0, axial, 0, 0], [0, -a, -b, 0, a, -b], [0, b, d, 0, -b, c]
    ];
  }

  function transform(c, s) {
    return [
      [c, s, 0, 0, 0, 0], [-s, c, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0],
      [0, 0, 0, c, s, 0], [0, 0, 0, -s, c, 0], [0, 0, 0, 0, 0, 1]
    ];
  }

  const transpose = matrix => matrix[0].map((_, col) => matrix.map(row => row[col]));
  const multiply = (a, b) => a.map(row => b[0].map((_, j) => row.reduce((sum, value, k) => sum + value * b[k][j], 0)));
  const matVec = (a, x) => a.map(row => row.reduce((sum, value, j) => sum + value * x[j], 0));

  function solveLinear(matrix, rhs) {
    const n = rhs.length;
    const a = matrix.map((row, i) => [...row, rhs[i]]);
    for (let k = 0; k < n; k++) {
      let pivot = k, bestRatio = 0;
      for (let i = k; i < n; i++) {
        const rowScale = Math.max(...a[i].slice(k, n).map(Math.abs), 0);
        const ratio = rowScale ? Math.abs(a[i][k]) / rowScale : 0;
        if (ratio > bestRatio) { bestRatio = ratio; pivot = i; }
      }
      if (bestRatio < 1e-12 || Math.abs(a[pivot][k]) < 1e-18) throw new Error('Model tidak stabil atau memiliki mekanisme. Periksa konektivitas batang dan jenis tumpuan.');
      [a[k], a[pivot]] = [a[pivot], a[k]];
      for (let i = k + 1; i < n; i++) {
        const factor = a[i][k] / a[k][k];
        if (!factor) continue;
        for (let j = k; j <= n; j++) a[i][j] -= factor * a[k][j];
      }
    }
    const x = Array(n).fill(0);
    for (let i = n - 1; i >= 0; i--) {
      let value = a[i][n];
      for (let j = i + 1; j < n; j++) value -= a[i][j] * x[j];
      x[i] = value / a[i][i];
    }
    return x;
  }

  function analyze() {
    if (state.nodes.length < 2 || !state.members.length) throw new Error('Model memerlukan minimal dua node dan satu batang.');
    const nodeIndex = new Map(state.nodes.map((item, index) => [item.id, index]));
    const ndof = state.nodes.length * 3;
    const K = Array.from({ length: ndof }, () => Array(ndof).fill(0));
    const F = Array(ndof).fill(0);
    const prepared = [];
    state.nodes.forEach((item, index) => { F[index * 3] += item.fx; F[index * 3 + 1] += item.fy; F[index * 3 + 2] += item.mz; });
    state.members.forEach(item => {
      const ni = node(item.i), nj = node(item.j);
      if (!ni || !nj) throw new Error(`Batang B${item.id} menunjuk node yang tidak ditemukan.`);
      const dx = nj.x - ni.x, dy = nj.y - ni.y, L = Math.hypot(dx, dy);
      if (L <= 1e-9) throw new Error(`Panjang batang B${item.id} harus lebih besar dari nol.`);
      const c = dx / L, s = dy / L;
      const E = item.e * 1000; // MPa -> kN/m²
      const A = item.a * 1e-4; // cm² -> m²
      const I = item.inertia * 1e-8; // cm⁴ -> m⁴
      const kl = localStiffness(E, A, I, L);
      const T = transform(c, s), Tt = transpose(T), kg = multiply(multiply(Tt, kl), T);
      const fe = [0, item.q * L / 2, item.q * L * L / 12, 0, item.q * L / 2, -item.q * L * L / 12];
      const dofs = [nodeIndex.get(item.i) * 3, nodeIndex.get(item.i) * 3 + 1, nodeIndex.get(item.i) * 3 + 2, nodeIndex.get(item.j) * 3, nodeIndex.get(item.j) * 3 + 1, nodeIndex.get(item.j) * 3 + 2];
      for (let a = 0; a < 6; a++) {
        F[dofs[a]] += matVec(Tt, fe)[a];
        for (let b = 0; b < 6; b++) K[dofs[a]][dofs[b]] += kg[a][b];
      }
      prepared.push({ ...item, length: L, c, s, T, kl, fe, dofs });
    });
    const fixed = new Set();
    state.nodes.forEach((item, index) => restraints(item.support).forEach((isFixed, d) => { if (isFixed) fixed.add(index * 3 + d); }));
    const free = Array.from({ length: ndof }, (_, i) => i).filter(i => !fixed.has(i));
    if (!fixed.size) throw new Error('Model memerlukan setidaknya satu tumpuan.');
    const displacements = Array(ndof).fill(0);
    const Kff = free.map(i => free.map(j => K[i][j]));
    const Ff = free.map(i => F[i]);
    const solved = solveLinear(Kff, Ff);
    free.forEach((dof, i) => { displacements[dof] = solved[i]; });
    const reactions = matVec(K, displacements).map((value, i) => value - F[i]);
    const elementResults = prepared.map(item => {
      const dg = item.dofs.map(dof => displacements[dof]);
      const dl = matVec(item.T, dg);
      const forces = matVec(item.kl, dl).map((value, i) => value - item.fe[i]);
      return { ...item, forces };
    });
    return { displacements, reactions, elements: elementResults };
  }

  const diagramValues = (item, x) => ({
    n: -item.forces[0],
    v: item.forces[1] + item.q * x,
    m: -item.forces[2] + item.forces[1] * x + item.q * x * x / 2
  });

  function diagramSvg(item, key, label, unit) {
    const values = Array.from({ length: 41 }, (_, i) => diagramValues(item, item.length * i / 40)[key]);
    const max = Math.max(...values.map(Math.abs), 1e-8);
    const x0 = 84, x1 = 830, y0 = 48, amp = 27;
    const points = values.map((value, i) => `${(x0 + (x1 - x0) * i / (values.length - 1)).toFixed(1)},${(y0 - value / max * amp).toFixed(1)}`).join(' ');
    return `<div class="portal-diagram-row"><span><b>${label}</b><small>${unit}</small></span><svg viewBox="0 0 900 94" role="img" aria-label="Diagram ${label} batang B${item.id}"><line x1="${x0}" y1="${y0}" x2="${x1}" y2="${y0}" class="portal-diagram-axis"/><polyline points="${points}" class="portal-diagram-plot"/><text x="${x0}" y="84">i</text><text x="${x1}" y="84" text-anchor="end">j</text><text x="${x0}" y="15">${fmt(values[0])}</text><text x="${x1}" y="15" text-anchor="end">${fmt(values.at(-1))}</text><text x="${(x0+x1)/2}" y="15" text-anchor="middle">maks |${label}| = ${fmt(max)} ${unit}</text></svg></div>`;
  }

  function renderResults(result) {
    const reactionsAt = index => result.reactions.slice(index * 3, index * 3 + 3);
    const hasReaction = values => values.some(value => Math.abs(value) > 1e-7);
    const supportedCount = state.nodes.filter(item => item.support !== 'free').length;
    const maxDisp = Math.max(...state.nodes.map((_, i) => Math.hypot(result.displacements[i * 3], result.displacements[i * 3 + 1])));
    $('portalResultSummary').innerHTML = `<article><span>Node</span><b>${state.nodes.length}</b></article><article><span>Batang</span><b>${state.members.length}</b></article><article><span>Node bertumpuan</span><b>${supportedCount}</b></article><article><span>Perpindahan translasi maks.</span><b>${fmt(maxDisp * 1000, 3)} mm</b></article>`;
    $('portalNodeResults').innerHTML = state.nodes.map((item, i) => {
      const d = result.displacements.slice(i * 3, i * 3 + 3), r = reactionsAt(i);
      return `<tr><td>${nodeLabel(item.id)}</td><td>${fmt(d[0] * 1000, 4)}</td><td>${fmt(d[1] * 1000, 4)}</td><td>${fmt(d[2] * 1000, 4)}</td><td>${hasReaction(r) ? fmt(r[0]) : '—'}</td><td>${hasReaction(r) ? fmt(r[1]) : '—'}</td><td>${hasReaction(r) ? fmt(r[2]) : '—'}</td></tr>`;
    }).join('');
    $('portalMemberResults').innerHTML = result.elements.map(item => `<tr><td>B${item.id}</td><td>${fmt(-item.forces[0])}</td><td>${fmt(item.forces[1])}</td><td>${fmt(-item.forces[2])}</td><td>${fmt(item.forces[3])}</td><td>${fmt(-item.forces[4])}</td><td>${fmt(item.forces[5])}</td></tr>`).join('');
    $('portalDiagrams').innerHTML = result.elements.map(item => `<article class="portal-diagram-card"><h4>Batang B${item.id} · panjang ${fmt(item.length, 3)} m · arah lokal +y sesuai orientasi i→j</h4>${diagramSvg(item, 'n', 'AFD', 'kN')}${diagramSvg(item, 'v', 'SFD', 'kN')}${diagramSvg(item, 'm', 'BMD', 'kN·m')}</article>`).join('');
  }

  $('portalAddNode').addEventListener('click', addNode);
  $('portalAddMember').addEventListener('click', addMember);
  $('portalAddLoad').addEventListener('click', addNodeLoad);
  $('portalAnalyze').addEventListener('click', () => {
    try {
      const result = analyze(); state.results = result; renderResults(result); msg('Analisis selesai. Periksa kembali asumsi, satuan, dan tanda beban.', true);
      } catch (error) { clearResults(); $('portalResultSummary').innerHTML = '<p>Belum ada hasil analisis.</p>'; msg(error.message || 'Analisis gagal.'); }
  });
  $('portalReset').addEventListener('click', () => {
    state.nodes = defaultNodes(); state.members = defaultMembers(); state.nextNode = 5; state.nextMember = 4; state.results = null;
    updateSelects(); renderModel(); $('portalResultSummary').innerHTML = '<p>Model portal contoh dimuat. Tekan Analisis untuk menghitung.</p>';
    $('portalNodeResults').innerHTML = '<tr><td colspan="7">Belum ada hasil.</td></tr>';
    $('portalMemberResults').innerHTML = '<tr><td colspan="7">Belum ada hasil.</td></tr>';
    $('portalDiagrams').innerHTML = '<p>Diagram akan ditampilkan setelah analisis.</p>'; msg('Model contoh satu bentang satu lantai dimuat.', true);
  });
  $('portalNodeRows').addEventListener('change', event => {
    const id = Number(event.target.dataset.nodeSupport); const item = node(id);
    if (item) { item.support = event.target.value; clearResults(); renderGeometry(); }
  });
  $('portalNodeRows').addEventListener('click', event => {
    const id = Number(event.target.dataset.removeNode); if (!id) return;
    if (state.members.some(item => item.i === id || item.j === id)) return msg('Node masih dipakai batang. Hapus batang terkait terlebih dahulu.');
    state.nodes = state.nodes.filter(item => item.id !== id); clearResults(); updateSelects(); renderModel(); msg('Node dihapus.');
  });
  $('portalMemberRows').addEventListener('click', event => {
    const id = Number(event.target.dataset.removeMember); if (!id) return;
    state.members = state.members.filter(item => item.id !== id); clearResults(); renderModel(); msg('Batang dihapus.');
  });

  state.nodes = defaultNodes(); state.members = defaultMembers(); state.nextNode = 5; state.nextMember = 4;
  updateSelects(); renderModel(); msg('Model contoh satu bentang satu lantai siap dianalisis.');
})();
