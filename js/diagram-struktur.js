const state = {
  nodes: [],
  elements: [],
  loads: [],
  nextNodeId: 1,
  nextElementId: 1,
  nextLoadId: 1,
  sfdChart: null,
  bmdChart: null
};

const $ = selector => document.querySelector(selector);
const svg = $('#beamCanvas');
const message = $('#modelMessage');
const fmt = value => Number(value).toLocaleString('id-ID', { maximumFractionDigits: 3 });
const eps = 1e-9;

const controls = {
  nodeX: $('#nodeX'),
  elementStart: $('#elementStart'),
  elementEnd: $('#elementEnd'),
  supportNode: $('#supportNode'),
  supportType: $('#supportType'),
  pointLoadTarget: $('#pointLoadTarget'),
  pointLoadValue: $('#pointLoadValue'),
  pointLoadNode: $('#pointLoadNode'),
  pointLoadElement: $('#pointLoadElement'),
  pointLoadOffset: $('#pointLoadOffset'),
  udlElement: $('#udlElement'),
  udlValue: $('#udlValue'),
  diagramOutput: $('#diagramOutput')
};

const showMessage = (text, ok = false) => {
  message.textContent = text;
  message.classList.toggle('ok', ok);
};

const getNode = id => state.nodes.find(node => node.id === Number(id));
const getElement = id => state.elements.find(element => element.id === Number(id));
const sortedNodes = () => [...state.nodes].sort((a, b) => a.x - b.x || a.id - b.id);

const elementEnds = element => {
  const a = getNode(element.startNode);
  const b = getNode(element.endNode);
  return a.x <= b.x ? { left: a, right: b, length: b.x - a.x } : { left: b, right: a, length: a.x - b.x };
};

const option = (value, label) => `<option value="${value}">${label}</option>`;

function refreshSelects() {
  const nodeOptions = sortedNodes().map(node => option(node.id, `N${node.id} - x=${fmt(node.x)} m`)).join('');
  const elementOptions = state.elements.map(element => {
    const ends = elementEnds(element);
    return option(element.id, `E${element.id} - N${element.startNode} ke N${element.endNode} (${fmt(ends.length)} m)`);
  }).join('');

  [controls.elementStart, controls.elementEnd, controls.supportNode, controls.pointLoadNode].forEach(select => { select.innerHTML = nodeOptions; });
  [controls.pointLoadElement, controls.udlElement].forEach(select => { select.innerHTML = elementOptions; });

  controls.pointLoadElement.closest('div').style.display = controls.pointLoadTarget.value === 'element' ? '' : 'none';
  controls.pointLoadOffset.closest('div').style.display = controls.pointLoadTarget.value === 'element' ? '' : 'none';
  controls.pointLoadNode.closest('div').style.display = controls.pointLoadTarget.value === 'node' ? '' : 'none';
}

function renderModelList() {
  const nodes = sortedNodes().map(node => `<p>N${node.id}: x=${fmt(node.x)} m, support=${node.support}</p>`).join('') || '<p>Belum ada node.</p>';
  const elements = state.elements.map(element => {
    const ends = elementEnds(element);
    return `<p>E${element.id}: N${element.startNode}-N${element.endNode}, L=${fmt(ends.length)} m</p>`;
  }).join('') || '<p>Belum ada element.</p>';
  const loads = state.loads.map(load => load.type === 'point'
    ? `<p>${load.label}: P=${fmt(load.p)} kN di x=${fmt(load.x)} m</p>`
    : `<p>${load.label}: w=${fmt(load.w)} kN/m di E${load.elementId}</p>`).join('') || '<p>Belum ada beban.</p>';
  $('#modelList').innerHTML = `<article><h3>Node</h3>${nodes}</article><article><h3>Element</h3>${elements}</article><article><h3>Beban</h3>${loads}</article>`;
}

function drawSupport(node, x, y) {
  if (node.support === 'free') return '';
  if (node.support === 'fixed') return `<rect class="diagram-support" x="${x - 8}" y="${y - 56}" width="16" height="112" rx="2"></rect><line x1="${x - 18}" y1="${y - 48}" x2="${x - 8}" y2="${y - 58}" stroke="#0f4d3a"/><line x1="${x - 18}" y1="${y - 24}" x2="${x - 8}" y2="${y - 34}" stroke="#0f4d3a"/><line x1="${x - 18}" y1="${y}" x2="${x - 8}" y2="${y - 10}" stroke="#0f4d3a"/><line x1="${x - 18}" y1="${y + 24}" x2="${x - 8}" y2="${y + 14}" stroke="#0f4d3a"/>`;
  const roller = node.support === 'roller' ? `<circle cx="${x - 10}" cy="${y + 44}" r="5" fill="#fff" stroke="#0f4d3a"/><circle cx="${x + 10}" cy="${y + 44}" r="5" fill="#fff" stroke="#0f4d3a"/>` : '';
  return `<polygon class="diagram-support" points="${x},${y + 18} ${x - 26},${y + 48} ${x + 26},${y + 48}"></polygon>${roller}<line x1="${x - 34}" y1="${y + 56}" x2="${x + 34}" y2="${y + 56}" stroke="#0f4d3a" stroke-width="3"/>`;
}

function renderSvg() {
  const nodes = sortedNodes();
  if (!nodes.length) {
    svg.innerHTML = '<text class="diagram-label" x="300" y="170">Tambahkan node untuk mulai menggambar balok.</text><line x1="90" y1="220" x2="870" y2="220" stroke="#dce6e2" stroke-width="2"/>';
    return;
  }
  const minX = Math.min(...nodes.map(node => node.x), 0);
  const maxX = Math.max(...nodes.map(node => node.x), 1);
  const span = Math.max(maxX - minX, 1);
  const left = 90;
  const right = 870;
  const y = 175;
  const sx = x => left + ((x - minX) / span) * (right - left);

  let content = `
    <defs><marker id="arrowDown" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#c93434"/></marker><marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#d67a00"/></marker></defs>
    <line x1="${left}" y1="${y + 92}" x2="${right}" y2="${y + 92}" stroke="#dce6e2" stroke-width="2"/>
  `;

  state.elements.forEach(element => {
    const a = getNode(element.startNode);
    const b = getNode(element.endNode);
    content += `<line class="diagram-element" x1="${sx(a.x)}" y1="${y}" x2="${sx(b.x)}" y2="${y}"></line><text class="diagram-label" x="${(sx(a.x) + sx(b.x)) / 2 - 16}" y="${y - 18}">E${element.id}</text>`;
  });

  state.loads.forEach(load => {
    if (load.type === 'point') {
      const x = sx(load.x);
      content += `<line class="diagram-load" x1="${x}" y1="${y - 78}" x2="${x}" y2="${y - 20}"></line><text class="diagram-label" x="${x - 24}" y="${y - 88}">${load.label} ${fmt(load.p)} kN</text>`;
    } else {
      const ends = elementEnds(getElement(load.elementId));
      const x1 = sx(ends.left.x);
      const x2 = sx(ends.right.x);
      for (let x = x1 + 14; x < x2; x += 34) content += `<line class="diagram-udl" x1="${x}" y1="${y - 72}" x2="${x}" y2="${y - 18}"></line>`;
      content += `<line x1="${x1}" y1="${y - 72}" x2="${x2}" y2="${y - 72}" stroke="#d67a00" stroke-width="2"/><text class="diagram-label" x="${x1 + 8}" y="${y - 88}">${load.label} ${fmt(load.w)} kN/m</text>`;
    }
  });

  nodes.forEach(node => {
    const x = sx(node.x);
    content += drawSupport(node, x, y);
    content += `<circle class="diagram-node" cx="${x}" cy="${y}" r="8"></circle><text class="diagram-label" x="${x - 16}" y="${y + 86}">N${node.id}</text><text class="diagram-label" x="${x - 26}" y="${y + 106}">${fmt(node.x)} m</text>`;
  });

  svg.innerHTML = content;
}

function validateModel() {
  if (state.nodes.length < 2) throw new Error('Minimal ada 2 node.');
  if (state.elements.length < 1) throw new Error('Minimal ada 1 element.');

  for (const element of state.elements) {
    const ends = elementEnds(element);
    if (Math.abs(ends.length) < eps) throw new Error(`Panjang E${element.id} tidak boleh nol.`);
  }

  for (const load of state.loads) {
    if (load.type === 'udl') {
      const element = getElement(load.elementId);
      if (!element) throw new Error(`${load.label} berada pada element yang tidak ada.`);
    }
    if (load.type === 'point') {
      const insideAny = state.elements.some(element => {
        const ends = elementEnds(element);
        return load.x >= ends.left.x - eps && load.x <= ends.right.x + eps;
      });
      if (!insideAny) throw new Error(`${load.label} berada di luar panjang element.`);
    }
  }

  const fixed = state.nodes.filter(node => node.support === 'fixed');
  const verticalSupports = state.nodes.filter(node => ['pin', 'roller', 'fixed'].includes(node.support));
  const simpleSupports = state.nodes.filter(node => ['pin', 'roller'].includes(node.support));

  if (fixed.length === 1 && verticalSupports.length === 1) return { type: 'cantilever', supports: fixed };
  if (fixed.length === 0 && simpleSupports.length === 2) {
    if (Math.abs(simpleSupports[0].x - simpleSupports[1].x) < eps) throw new Error('Dua support tidak boleh berada pada posisi X yang sama.');
    return { type: 'simple', supports: [...simpleSupports].sort((a, b) => a.x - b.x) };
  }

  if (verticalSupports.length < 1) throw new Error('Struktur harus punya support yang cukup.');
  throw new Error('Model ini belum didukung pada versi awal.');
}

function normalizeLoads() {
  return state.loads.map(load => {
    if (load.type === 'point') return { ...load };
    const ends = elementEnds(getElement(load.elementId));
    return { ...load, a: ends.left.x, b: ends.right.x, total: load.w * ends.length, centroid: (ends.left.x + ends.right.x) / 2 };
  });
}

function solveReactions(model, loads) {
  const reactions = [];
  const pointAndUdl = loads.map(load => load.type === 'point'
    ? { total: load.p, x: load.x }
    : { total: load.total, x: load.centroid });
  const totalLoad = pointAndUdl.reduce((sum, load) => sum + load.total, 0);

  if (model.type === 'simple') {
    const [a, b] = model.supports;
    const span = b.x - a.x;
    const momentAboutA = pointAndUdl.reduce((sum, load) => sum + load.total * (load.x - a.x), 0);
    const rb = momentAboutA / span;
    const ra = totalLoad - rb;
    reactions.push({ nodeId: a.id, x: a.x, vertical: ra, moment: 0 });
    reactions.push({ nodeId: b.id, x: b.x, vertical: rb, moment: 0 });
  }

  if (model.type === 'cantilever') {
    const support = model.supports[0];
    const minX = Math.min(...state.nodes.map(node => node.x));
    const maxX = Math.max(...state.nodes.map(node => node.x));
    const isLeftFixed = Math.abs(support.x - minX) < eps;
    const momentMagnitude = pointAndUdl.reduce((sum, load) => sum + load.total * Math.abs(load.x - support.x), 0);
    reactions.push({ nodeId: support.id, x: support.x, vertical: totalLoad, moment: -momentMagnitude, includeMomentInLeftExpression: isLeftFixed });
    if (Math.abs(support.x - minX) > eps && Math.abs(support.x - maxX) > eps) throw new Error('Model ini belum didukung pada versi awal.');
  }

  return reactions;
}

function shearAt(x, loads, reactions) {
  let shear = 0;
  reactions.forEach(reaction => { if (x >= reaction.x - eps) shear += reaction.vertical; });
  loads.forEach(load => {
    if (load.type === 'point' && x >= load.x - eps) shear -= load.p;
    if (load.type === 'udl' && x > load.a + eps) shear -= load.w * Math.min(x - load.a, load.b - load.a);
  });
  return Math.abs(shear) < 1e-7 ? 0 : shear;
}

function momentAt(x, loads, reactions) {
  let moment = 0;
  reactions.forEach(reaction => {
    if (x >= reaction.x - eps) {
      moment += reaction.vertical * (x - reaction.x);
      if (reaction.includeMomentInLeftExpression) moment += reaction.moment;
    }
  });
  loads.forEach(load => {
    if (load.type === 'point' && x >= load.x - eps) moment -= load.p * (x - load.x);
    if (load.type === 'udl' && x > load.a + eps) {
      const length = Math.min(x - load.a, load.b - load.a);
      const centroid = load.a + length / 2;
      moment -= load.w * length * (x - centroid);
    }
  });
  return Math.abs(moment) < 1e-7 ? 0 : moment;
}

function sampleBeam(loads, reactions) {
  const minX = Math.min(...state.nodes.map(node => node.x));
  const maxX = Math.max(...state.nodes.map(node => node.x));
  const samples = new Set();
  const breakpoints = new Set([minX, maxX]);

  for (let i = 0; i <= 120; i += 1) samples.add(minX + ((maxX - minX) * i) / 120);
  state.nodes.forEach(node => { samples.add(node.x); breakpoints.add(node.x); });
  reactions.forEach(reaction => breakpoints.add(reaction.x));
  loads.forEach(load => {
    if (load.type === 'point') { samples.add(load.x); breakpoints.add(load.x); }
    if (load.type === 'udl') { samples.add(load.a); samples.add(load.b); breakpoints.add(load.a); breakpoints.add(load.b); }
  });

  const sortedBreaks = [...breakpoints].sort((a, b) => a - b);
  for (let i = 0; i < sortedBreaks.length - 1; i += 1) {
    const left = sortedBreaks[i];
    const right = sortedBreaks[i + 1];
    if (right - left < eps) continue;
    const vLeft = shearAt(left + 1e-7, loads, reactions);
    const vRight = shearAt(right - 1e-7, loads, reactions);
    if (Math.abs(vLeft) < 1e-7) samples.add(left);
    if (Math.abs(vRight) < 1e-7) samples.add(right);
    if (vLeft * vRight < 0) {
      const root = left + (Math.abs(vLeft) / (Math.abs(vLeft) + Math.abs(vRight))) * (right - left);
      if (root > minX - eps && root < maxX + eps) samples.add(root);
    }
  }

  return [...samples].sort((a, b) => a - b).map(x => ({ x, shear: shearAt(x, loads, reactions), moment: momentAt(x, loads, reactions) }));
}

function buildElementTable(loads, reactions) {
  return state.elements.map(element => {
    const ends = elementEnds(element);
    const mid = (ends.left.x + ends.right.x) / 2;
    return {
      id: element.id,
      start: ends.left.x,
      end: ends.right.x,
      vStart: shearAt(ends.left.x + 1e-6, loads, reactions),
      vEnd: shearAt(ends.right.x - 1e-6, loads, reactions),
      mStart: momentAt(ends.left.x + 1e-6, loads, reactions),
      mMid: momentAt(mid, loads, reactions),
      mEnd: momentAt(ends.right.x - 1e-6, loads, reactions)
    };
  });
}

function renderSummary(reactions, samples) {
  const maxMoment = samples.reduce((max, item) => Math.abs(item.moment) > Math.abs(max.moment) ? item : max, samples[0] || { x: 0, moment: 0 });
  const reactionCards = reactions.map(reaction => {
    const supportMoment = reaction.moment ? '<span>M = ' + fmt(reaction.moment) + ' kNm</span>' : '';
    return '<article class="result-card-small"><span>N' + reaction.nodeId + ' @ x=' + fmt(reaction.x) + ' m</span><strong>Ry = ' + fmt(reaction.vertical) + ' kN</strong>' + supportMoment + '</article>';
  }).join('');
  const sign = maxMoment.moment >= 0 ? 'Sagging' : 'Hogging';
  const mmaxCard = '<article class="result-card-small highlight"><span>Mmax @ x=' + fmt(maxMoment.x) + ' m</span><strong>' + fmt(maxMoment.moment) + ' kNm</strong><span>' + sign + '</span></article>';
  $('#reactionResults').innerHTML = reactionCards + mmaxCard;
}
function renderTable(rows) {
  $('#forceTableBody').innerHTML = rows.map(row => `<tr><td>E${row.id}</td><td>${fmt(row.start)} m</td><td>${fmt(row.end)} m</td><td>${fmt(row.vStart)} kN</td><td>${fmt(row.vEnd)} kN</td><td>${fmt(row.mStart)} kNm</td><td>${fmt(row.mMid)} kNm</td><td>${fmt(row.mEnd)} kNm</td></tr>`).join('');
}

const valueLabelPlugin = {
  id: 'valueLabelPlugin',
  afterDatasetsDraw(chart) {
    const dataset = chart.data.datasets[0];
    if (!dataset?.data?.length) return;
    const values = dataset.data;
    const indices = new Set([values.indexOf(Math.max(...values)), values.indexOf(Math.min(...values))]);
    const meta = chart.getDatasetMeta(0);
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = '700 11px Inter, sans-serif';
    ctx.fillStyle = dataset.borderColor;
    indices.forEach(index => {
      const point = meta.data[index];
      if (!point) return;
      const value = values[index];
      ctx.fillText(fmt(value) + ' ' + dataset.unit, point.x + 6, point.y + (value >= 0 ? -8 : 16));
    });
    ctx.restore();
  }
};

function chartDataset(label, data, color, unit) {
  return { label, data, unit, borderColor: color, backgroundColor: color + '10', fill: false, tension: 0, pointRadius: 0, pointHitRadius: 8, borderWidth: 2 };
}

function renderCharts(samples) {
  const labels = samples.map(item => fmt(item.x));
  const sfdData = samples.map(item => item.shear);
  const bmdData = samples.map(item => item.moment);
  const paddedRange = values => {
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 0);
    const pad = Math.max((max - min) * 0.18, 1);
    return { suggestedMin: min - pad, suggestedMax: max + pad };
  };
  const baseOptions = (unit, values) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { title: { display: true, text: 'x (m)' }, ticks: { maxTicksLimit: 8 } },
      y: { ...paddedRange(values), title: { display: true, text: unit }, ticks: { maxTicksLimit: 5 } }
    }
  });

  if (state.sfdChart) state.sfdChart.destroy();
  if (state.bmdChart) state.bmdChart.destroy();
  state.sfdChart = new Chart($('#sfdChart'), { type: 'line', data: { labels, datasets: [chartDataset('V', sfdData, '#004dff', 'kN')] }, options: baseOptions('V (kN)', sfdData), plugins: [valueLabelPlugin] });
  state.bmdChart = new Chart($('#bmdChart'), { type: 'line', data: { labels, datasets: [chartDataset('M', bmdData, '#d40000', 'kNm')] }, options: baseOptions('M (kNm)', bmdData), plugins: [valueLabelPlugin] });
  updateChartVisibility();
}
function updateChartVisibility() {
  const mode = controls.diagramOutput.value;
  $('#sfdCard').style.display = mode === 'bmd' ? 'none' : '';
  $('#bmdCard').style.display = mode === 'sfd' ? 'none' : '';
}

function analyze() {
  try {
    const model = validateModel();
    const loads = normalizeLoads();
    const reactions = solveReactions(model, loads);
    const samples = sampleBeam(loads, reactions);
    const table = buildElementTable(loads, reactions);
    renderSummary(reactions, samples);
    renderTable(table);
    renderCharts(samples);
    showMessage('Analisis berhasil untuk model ' + (model.type === 'simple' ? 'simply supported beam.' : 'fixed-end cantilever.'), true);
  } catch (error) {
    $('#reactionResults').innerHTML = '';
    $('#forceTableBody').innerHTML = '<tr><td colspan="8">Belum ada hasil analisis.</td></tr>';
    showMessage(error.message);
  }
}

function addNode() {
  const x = Number(controls.nodeX.value);
  if (!Number.isFinite(x)) return showMessage('Posisi node harus berupa angka.');
  if (state.nodes.some(node => Math.abs(node.x - x) < eps)) return showMessage('Sudah ada node pada posisi X tersebut.');
  state.nodes.push({ id: state.nextNodeId++, x, support: 'free' });
  controls.nodeX.value = '';
  refresh();
}

function addElement() {
  const startNode = Number(controls.elementStart.value);
  const endNode = Number(controls.elementEnd.value);
  if (!startNode || !endNode || startNode === endNode) return showMessage('Node awal dan akhir element harus berbeda.');
  const a = getNode(startNode);
  const b = getNode(endNode);
  if (Math.abs(a.x - b.x) < eps) return showMessage('Panjang element tidak boleh nol.');
  const exists = state.elements.some(element => [element.startNode, element.endNode].sort().join('-') === [startNode, endNode].sort().join('-'));
  if (exists) return showMessage('Element tersebut sudah ada.');
  state.elements.push({ id: state.nextElementId++, startNode, endNode });
  refresh();
}

function setSupport() {
  const node = getNode(controls.supportNode.value);
  if (!node) return showMessage('Pilih node support.');
  node.support = controls.supportType.value;
  refresh();
}

function addPointLoad() {
  const p = Number(controls.pointLoadValue.value);
  if (!Number.isFinite(p) || Math.abs(p) < eps) return showMessage('Nilai beban titik harus diisi.');
  let x = null;
  if (controls.pointLoadTarget.value === 'node') {
    const node = getNode(controls.pointLoadNode.value);
    if (!node) return showMessage('Pilih node untuk beban titik.');
    x = node.x;
  } else {
    const element = getElement(controls.pointLoadElement.value);
    if (!element) return showMessage('Pilih element untuk beban titik.');
    const ends = elementEnds(element);
    const offset = Number(controls.pointLoadOffset.value);
    if (!Number.isFinite(offset) || offset < -eps || offset > ends.length + eps) return showMessage('Beban tidak boleh berada di luar panjang element.');
    x = getNode(element.startNode).x <= getNode(element.endNode).x ? getNode(element.startNode).x + offset : getNode(element.startNode).x - offset;
  }
  state.loads.push({ id: state.nextLoadId, type: 'point', x, p, label: `P${state.nextLoadId}` });
  state.nextLoadId += 1;
  controls.pointLoadValue.value = '';
  refresh();
}

function addUdl() {
  const element = getElement(controls.udlElement.value);
  const w = Number(controls.udlValue.value);
  if (!element) return showMessage('Pilih element untuk beban merata.');
  if (!Number.isFinite(w) || Math.abs(w) < eps) return showMessage('Nilai beban merata harus diisi.');
  state.loads.push({ id: state.nextLoadId, type: 'udl', elementId: element.id, w, label: `w${state.nextLoadId}` });
  state.nextLoadId += 1;
  controls.udlValue.value = '';
  refresh();
}

function resetModel() {
  state.nodes = [];
  state.elements = [];
  state.loads = [];
  state.nextNodeId = 1;
  state.nextElementId = 1;
  state.nextLoadId = 1;
  if (state.sfdChart) state.sfdChart.destroy();
  if (state.bmdChart) state.bmdChart.destroy();
  state.sfdChart = null;
  state.bmdChart = null;
  $('#reactionResults').innerHTML = '';
  $('#forceTableBody').innerHTML = '<tr><td colspan="8">Belum ada hasil analisis.</td></tr>';
  showMessage('Model direset. Tambahkan node sesuai panjang balok yang diinginkan.', true);
  refresh();
}
function refresh() {
  refreshSelects();
  renderSvg();
  renderModelList();
}

$('#addNodeBtn').addEventListener('click', addNode);
$('#addElementBtn').addEventListener('click', addElement);
$('#setSupportBtn').addEventListener('click', setSupport);
$('#addPointLoadBtn').addEventListener('click', addPointLoad);
$('#addUdlBtn').addEventListener('click', addUdl);
$('#analyzeBtn').addEventListener('click', analyze);
$('#resetBtn').addEventListener('click', resetModel);
controls.pointLoadTarget.addEventListener('change', refreshSelects);
controls.diagramOutput.addEventListener('change', updateChartVisibility);

refresh();
showMessage('Mulai dengan menambahkan node sesuai panjang balok yang diinginkan.', true);
