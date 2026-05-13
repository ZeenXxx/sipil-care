const state = {
  nodes: [],
  elements: [],
  loads: [],
  nextNodeId: 1,
  nextElementId: 1,
  nextLoadId: 1,
  afdChart: null,
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
  pointLoadAngle: $('#pointLoadAngle'),
  pointLoadNode: $('#pointLoadNode'),
  pointLoadElement: $('#pointLoadElement'),
  pointLoadOffset: $('#pointLoadOffset'),
  udlStartNode: $('#udlStartNode'),
  udlEndNode: $('#udlEndNode'),
  udlValue: $('#udlValue'),
  diagramOutput: $('#diagramOutput')
};

const showMessage = (text, ok = false) => {
  message.textContent = text;
  message.classList.toggle('ok', ok);
};

const getNode = id => state.nodes.find(node => node.id === Number(id));
const getElement = id => state.elements.find(element => element.id === Number(id));
const pointFx = load => Number.isFinite(load.fx) ? load.fx : (load.direction === 'horizontal' ? load.p : 0);
const pointFy = load => Number.isFinite(load.fy) ? load.fy : (load.direction === 'horizontal' ? 0 : load.p);
const sortedNodes = () => [...state.nodes].sort((a, b) => a.x - b.x || a.id - b.id);

const elementEnds = element => {
  const a = getNode(element.startNode);
  const b = getNode(element.endNode);
  return a.x <= b.x ? { left: a, right: b, length: b.x - a.x } : { left: b, right: a, length: a.x - b.x };
};

function udlRange(load) {
  if (load.startNode && load.endNode) {
    const a = getNode(load.startNode);
    const b = getNode(load.endNode);
    if (!a || !b) return { a: 0, b: 0, length: 0 };
    const left = Math.min(a.x, b.x);
    const right = Math.max(a.x, b.x);
    return { a: left, b: right, length: right - left };
  }
  const ends = elementEnds(getElement(load.elementId));
  return { a: ends.left.x, b: ends.right.x, length: ends.length };
}

function isUdlRangeCovered(startNode, endNode) {
  const leftX = Math.min(startNode.x, endNode.x);
  const rightX = Math.max(startNode.x, endNode.x);
  const intervals = state.elements
    .map(element => elementEnds(element))
    .map(ends => ({ a: ends.left.x, b: ends.right.x }))
    .sort((a, b) => a.a - b.a || a.b - b.b);
  let coveredUntil = leftX;
  for (const interval of intervals) {
    if (interval.b <= coveredUntil + eps) continue;
    if (interval.a > coveredUntil + eps) return false;
    coveredUntil = Math.max(coveredUntil, interval.b);
    if (coveredUntil >= rightX - eps) return true;
  }
  return false;
}

const option = (value, label) => `<option value="${value}">${label}</option>`;

function refreshSelects() {
  const nodeOptions = sortedNodes().map(node => option(node.id, `N${node.id} - x=${fmt(node.x)} m`)).join('');
  const elementOptions = state.elements.map(element => {
    const ends = elementEnds(element);
    return option(element.id, `E${element.id} - N${element.startNode} ke N${element.endNode} (${fmt(ends.length)} m)`);
  }).join('');

  [controls.elementStart, controls.elementEnd, controls.supportNode, controls.pointLoadNode, controls.udlStartNode, controls.udlEndNode].forEach(select => { select.innerHTML = nodeOptions; });
  [controls.pointLoadElement].forEach(select => { select.innerHTML = elementOptions; });

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
  const loads = state.loads.map(load => {
    if (load.type === 'point') return `<p>${load.label}: P=${fmt(load.p)} kN, sudut=${fmt(load.angle ?? 90)}&deg;, Fx=${fmt(pointFx(load))} kN, Fy=${fmt(pointFy(load))} kN di x=${fmt(load.x)} m</p>`;
    const range = udlRange(load);
    return `<p>${load.label}: w=${fmt(load.w)} kN/m dari N${load.startNode} ke N${load.endNode} (${fmt(range.a)}-${fmt(range.b)} m)</p>`;
  }).join('') || '<p>Belum ada beban.</p>';
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
    <defs><marker id="arrowDown" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#c93434"/></marker><marker id="arrowRight" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#6b4fd8"/></marker><marker id="arrowOrange" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 Z" fill="#d67a00"/></marker></defs>
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
      const fx = pointFx(load);
      const fy = pointFy(load);
      const magnitude = Math.hypot(fx, fy) || 1;
      const ux = fx / magnitude;
      const uy = fy / magnitude;
      const endX = x;
      const endY = y - 20;
      const startX = endX - ux * 66;
      const startY = endY - uy * 66;
      const lineClass = Math.abs(fx) > Math.abs(fy) ? 'diagram-hload' : 'diagram-load';
      content += `<line class="${lineClass}" x1="${startX}" y1="${startY}" x2="${endX}" y2="${endY}"></line><text class="diagram-label" x="${Math.min(startX, endX) - 8}" y="${Math.min(startY, endY) - 12}">${load.label} ${fmt(load.p)} kN @ ${fmt(load.angle ?? 90)}&deg;</text>`;
    } else {
      const range = udlRange(load);
      const x1 = sx(range.a);
      const x2 = sx(range.b);
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
      const startNode = getNode(load.startNode);
      const endNode = getNode(load.endNode);
      if (!startNode || !endNode) throw new Error(`${load.label} harus punya node awal dan node akhir.`);
      if (Math.abs(startNode.x - endNode.x) < eps) throw new Error(`${load.label} tidak boleh memiliki panjang nol.`);
      if (!isUdlRangeCovered(startNode, endNode)) throw new Error(`${load.label} harus berada pada rentang node yang terhubung element.`);
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
  const horizontalLoads = state.loads.filter(load => load.type === 'point' && Math.abs(pointFx(load)) > eps);
  const horizontalSupports = state.nodes.filter(node => ['pin', 'fixed'].includes(node.support));

  if (horizontalLoads.length && horizontalSupports.length < 1) throw new Error('Beban horizontal membutuhkan support pin atau fixed.');
  if (horizontalLoads.length && horizontalSupports.length > 1) throw new Error('Model dengan lebih dari satu restraint horizontal belum didukung pada versi awal.');

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
    if (load.type === 'point') return { ...load, fx: pointFx(load), fy: pointFy(load) };
    const range = udlRange(load);
    return { ...load, a: range.a, b: range.b, total: load.w * range.length, centroid: (range.a + range.b) / 2 };
  });
}

function solveReactions(model, loads) {
  const reactions = [];
  const verticalLoads = loads
    .filter(load => load.type === 'udl' || Math.abs(pointFy(load)) > eps)
    .map(load => load.type === 'point' ? { total: pointFy(load), x: load.x } : { total: load.total, x: load.centroid });
  const horizontalLoads = loads.filter(load => load.type === 'point' && Math.abs(pointFx(load)) > eps);
  const totalLoad = verticalLoads.reduce((sum, load) => sum + load.total, 0);
  const totalHorizontal = horizontalLoads.reduce((sum, load) => sum + pointFx(load), 0);
  const horizontalSupport = state.nodes.find(node => ['pin', 'fixed'].includes(node.support));

  const applyHorizontalReaction = reaction => {
    reaction.horizontal = horizontalSupport && reaction.nodeId === horizontalSupport.id ? -totalHorizontal : 0;
    return reaction;
  };

  if (model.type === 'simple') {
    const [a, b] = model.supports;
    const span = b.x - a.x;
    const momentAboutA = verticalLoads.reduce((sum, load) => sum + load.total * (load.x - a.x), 0);
    const rb = momentAboutA / span;
    const ra = totalLoad - rb;
    reactions.push(applyHorizontalReaction({ nodeId: a.id, x: a.x, vertical: ra, moment: 0 }));
    reactions.push(applyHorizontalReaction({ nodeId: b.id, x: b.x, vertical: rb, moment: 0 }));
  }

  if (model.type === 'cantilever') {
    const support = model.supports[0];
    const minX = Math.min(...state.nodes.map(node => node.x));
    const maxX = Math.max(...state.nodes.map(node => node.x));
    const isLeftFixed = Math.abs(support.x - minX) < eps;
    const momentMagnitude = verticalLoads.reduce((sum, load) => sum + load.total * Math.abs(load.x - support.x), 0);
    reactions.push(applyHorizontalReaction({ nodeId: support.id, x: support.x, vertical: totalLoad, moment: -momentMagnitude, includeMomentInLeftExpression: isLeftFixed }));
    if (Math.abs(support.x - minX) > eps && Math.abs(support.x - maxX) > eps) throw new Error('Model ini belum didukung pada versi awal.');
  }

  return reactions;
}
function shearAt(x, loads, reactions) {
  let shear = 0;
  reactions.forEach(reaction => { if (x >= reaction.x - eps) shear += reaction.vertical; });
  loads.forEach(load => {
    if (load.type === 'point' && x >= load.x - eps) shear -= pointFy(load);
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
    if (load.type === 'point' && x >= load.x - eps) moment -= pointFy(load) * (x - load.x);
    if (load.type === 'udl' && x > load.a + eps) {
      const length = Math.min(x - load.a, load.b - load.a);
      const centroid = load.a + length / 2;
      moment -= load.w * length * (x - centroid);
    }
  });
  return Math.abs(moment) < 1e-7 ? 0 : moment;
}

function axialAt(x, loads, reactions) {
  let sumFxLeft = 0;
  reactions.forEach(reaction => { if (x >= reaction.x - eps) sumFxLeft += reaction.horizontal || 0; });
  loads.forEach(load => { if (load.type === 'point' && x >= load.x - eps) sumFxLeft += pointFx(load); });
  const axial = -sumFxLeft;
  return Math.abs(axial) < 1e-7 ? 0 : axial;
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

  return [...samples].sort((a, b) => a - b).map(x => ({ x, axial: axialAt(x, loads, reactions), shear: shearAt(x, loads, reactions), moment: momentAt(x, loads, reactions) }));
}

function buildElementTable(loads, reactions) {
  return state.elements.map(element => {
    const ends = elementEnds(element);
    const mid = (ends.left.x + ends.right.x) / 2;
    return {
      id: element.id,
      start: ends.left.x,
      end: ends.right.x,
      nStart: axialAt(ends.left.x + 1e-6, loads, reactions),
      nEnd: axialAt(ends.right.x - 1e-6, loads, reactions),
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
    const horizontal = reaction.horizontal ? '<span>Rx = ' + fmt(reaction.horizontal) + ' kN</span>' : '';
    return '<article class="result-card-small"><span>N' + reaction.nodeId + ' @ x=' + fmt(reaction.x) + ' m</span><strong>Ry = ' + fmt(reaction.vertical) + ' kN</strong>' + horizontal + supportMoment + '</article>';
  }).join('');
  const sign = maxMoment.moment >= 0 ? 'Sagging' : 'Hogging';
  const mmaxCard = '<article class="result-card-small highlight"><span>Mmax @ x=' + fmt(maxMoment.x) + ' m</span><strong>' + fmt(maxMoment.moment) + ' kNm</strong><span>' + sign + '</span></article>';
  $('#reactionResults').innerHTML = reactionCards + mmaxCard;
}
function renderTable(rows) {
  $('#forceTableBody').innerHTML = rows.map(row => `<tr><td>E${row.id}</td><td>${fmt(row.start)} m</td><td>${fmt(row.end)} m</td><td>${fmt(row.nStart)} kN</td><td>${fmt(row.nEnd)} kN</td><td>${fmt(row.vStart)} kN</td><td>${fmt(row.vEnd)} kN</td><td>${fmt(row.mStart)} kNm</td><td>${fmt(row.mMid)} kNm</td><td>${fmt(row.mEnd)} kNm</td></tr>`).join('');
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
  const afdData = samples.map(item => item.axial);
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

  if (state.afdChart) state.afdChart.destroy();
  if (state.sfdChart) state.sfdChart.destroy();
  if (state.bmdChart) state.bmdChart.destroy();
  state.afdChart = new Chart($('#afdChart'), { type: 'line', data: { labels, datasets: [chartDataset('N', afdData, '#6b4fd8', 'kN')] }, options: baseOptions('N (kN)', afdData), plugins: [valueLabelPlugin] });
  state.sfdChart = new Chart($('#sfdChart'), { type: 'line', data: { labels, datasets: [chartDataset('V', sfdData, '#004dff', 'kN')] }, options: baseOptions('V (kN)', sfdData), plugins: [valueLabelPlugin] });
  state.bmdChart = new Chart($('#bmdChart'), { type: 'line', data: { labels, datasets: [chartDataset('M', bmdData, '#d40000', 'kNm')] }, options: { ...baseOptions('M (kNm)', bmdData), scales: { ...baseOptions('M (kNm)', bmdData).scales, y: { ...baseOptions('M (kNm)', bmdData).scales.y, reverse: true } } }, plugins: [valueLabelPlugin] });
  updateChartVisibility();
}
function updateChartVisibility() {
  const mode = controls.diagramOutput.value;
  $('#afdCard').style.display = mode !== 'all' && mode !== 'afd' ? 'none' : '';
  $('#sfdCard').style.display = mode !== 'all' && mode !== 'sfd' ? 'none' : '';
  $('#bmdCard').style.display = mode !== 'all' && mode !== 'bmd' ? 'none' : '';
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
    $('#forceTableBody').innerHTML = '<tr><td colspan="10">Belum ada hasil analisis.</td></tr>';
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
  const angle = Number(controls.pointLoadAngle.value || 90);
  if (!Number.isFinite(angle)) return showMessage('Sudut beban harus berupa angka derajat.');
  const radians = (angle * Math.PI) / 180;
  const fx = Math.abs(p * Math.cos(radians)) < 1e-7 ? 0 : p * Math.cos(radians);
  const fy = Math.abs(p * Math.sin(radians)) < 1e-7 ? 0 : p * Math.sin(radians);
  state.loads.push({ id: state.nextLoadId, type: 'point', direction: 'inclined', x, p, angle, fx, fy, label: `P${state.nextLoadId}` });
  state.nextLoadId += 1;
  controls.pointLoadValue.value = '';
  controls.pointLoadAngle.value = '90';
  refresh();
}

function addUdl() {
  const startNode = getNode(controls.udlStartNode.value);
  const endNode = getNode(controls.udlEndNode.value);
  const w = Number(controls.udlValue.value);
  if (!startNode || !endNode) return showMessage('Pilih node awal dan node akhir beban merata.');
  if (startNode.id === endNode.id || Math.abs(startNode.x - endNode.x) < eps) return showMessage('Rentang beban merata tidak boleh nol.');
  if (!isUdlRangeCovered(startNode, endNode)) return showMessage('Rentang beban merata harus mengikuti element yang sudah dibuat.');
  if (!Number.isFinite(w) || Math.abs(w) < eps) return showMessage('Nilai beban merata harus diisi.');
  state.loads.push({ id: state.nextLoadId, type: 'udl', startNode: startNode.id, endNode: endNode.id, w, label: `w${state.nextLoadId}` });
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
  if (state.afdChart) state.afdChart.destroy();
  if (state.sfdChart) state.sfdChart.destroy();
  if (state.bmdChart) state.bmdChart.destroy();
  state.afdChart = null;
  state.sfdChart = null;
  state.bmdChart = null;
  $('#reactionResults').innerHTML = '';
  $('#forceTableBody').innerHTML = '<tr><td colspan="10">Belum ada hasil analisis.</td></tr>';
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
