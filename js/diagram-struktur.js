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

  // Pastikan SVG punya viewBox yang konsisten
  svg.setAttribute('viewBox', '0 0 960 300');
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  if (!nodes.length) {
    svg.innerHTML = `
      <rect x="0" y="0" width="960" height="300" fill="#f9fcfb" rx="8"/>
      <text font-family="Inter,sans-serif" font-size="14" fill="#7aab97" text-anchor="middle" x="480" y="155">Tambahkan node untuk mulai menggambar balok.</text>
      <line x1="80" y1="170" x2="880" y2="170" stroke="#dce6e2" stroke-width="1" stroke-dasharray="6,4"/>
    `;
    return;
  }

  const minX = Math.min(...nodes.map(n => n.x));
  const maxX = Math.max(...nodes.map(n => n.x));
  const span = Math.max(maxX - minX, 1);
  const left = 80;
  const right = 880;
  const beamY = 150;         // garis tengah balok
  const beamH = 18;          // setengah tinggi balok (balok tampak 3D)
  const sx = x => left + ((x - minX) / span) * (right - left);

  // Hitung apakah ada beban UDL (untuk beri ruang atas)
  const hasUdl = state.loads.some(l => l.type === 'udl');
  const topClearance = hasUdl ? 90 : 55;

  let defs = `
    <defs>
      <!-- Shadow balok -->
      <filter id="beamShadow" x="-5%" y="-20%" width="110%" height="160%">
        <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#0f4d3a22"/>
      </filter>
      <!-- Shadow node -->
      <filter id="nodeShadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0f4d3a33"/>
      </filter>
      <!-- Gradient balok -->
      <linearGradient id="beamGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#2e8c67"/>
        <stop offset="40%"  stop-color="#17664e"/>
        <stop offset="100%" stop-color="#0d3d2e"/>
      </linearGradient>
      <!-- Gradient sisi bawah balok (bayangan) -->
      <linearGradient id="beamBottom" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0d3d2e"/>
        <stop offset="100%" stop-color="#06201a"/>
      </linearGradient>
      <!-- Highlight atas balok -->
      <linearGradient id="beamHighlight" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stop-color="#ffffff" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#ffffff" stop-opacity="0.00"/>
      </linearGradient>
      <!-- Gradien node -->
      <radialGradient id="nodeGrad" cx="35%" cy="30%" r="60%">
        <stop offset="0%"   stop-color="#4fc49a"/>
        <stop offset="100%" stop-color="#0f5e42"/>
      </radialGradient>
      <!-- Marker panah beban vertikal -->
      <marker id="arrowV" markerWidth="8" markerHeight="8" refX="4" refY="7" orient="auto">
        <path d="M1,1 L4,7 L7,1" fill="none" stroke="#c93434" stroke-width="1.5" stroke-linejoin="round"/>
      </marker>
      <!-- Marker panah beban horizontal -->
      <marker id="arrowH" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
        <path d="M1,1 L7,4 L1,7" fill="none" stroke="#6b4fd8" stroke-width="1.5" stroke-linejoin="round"/>
      </marker>
      <!-- Marker panah UDL -->
      <marker id="arrowUDL" markerWidth="7" markerHeight="7" refX="3.5" refY="6.5" orient="auto">
        <path d="M1,1 L3.5,6.5 L6,1" fill="none" stroke="#d67a00" stroke-width="1.5" stroke-linejoin="round"/>
      </marker>
    </defs>
  `;

  // Background
  let content = `<rect x="0" y="0" width="960" height="300" fill="#f5faf8" rx="0"/>`;

  // Grid referensi horizontal tipis
  content += `<line x1="${left}" y1="${beamY}" x2="${right}" y2="${beamY}" stroke="#dce6e2" stroke-width="1" stroke-dasharray="4,6"/>`;

  // ---- Render elemen balok (tampak 3D) ----
  state.elements.forEach(element => {
    const a = getNode(element.startNode);
    const b = getNode(element.endNode);
    const x1 = sx(a.x);
    const x2 = sx(b.x);
    const xLeft  = Math.min(x1, x2);
    const xRight = Math.max(x1, x2);
    const bTop   = beamY - beamH;
    const bBot   = beamY + beamH;
    const depth  = 6;   // kedalaman efek 3D sisi bawah

    // Badan balok utama
    content += `<rect x="${xLeft}" y="${bTop}" width="${xRight - xLeft}" height="${beamH * 2}"
      fill="url(#beamGrad)" rx="2" filter="url(#beamShadow)"/>`;
    // Sisi bawah 3D
    content += `<polygon points="${xLeft},${bBot} ${xRight},${bBot} ${xRight + depth},${bBot + depth} ${xLeft + depth},${bBot + depth}"
      fill="url(#beamBottom)" opacity="0.85"/>`;
    // Sisi kanan 3D
    content += `<polygon points="${xRight},${bTop} ${xRight + depth},${bTop + depth} ${xRight + depth},${bBot + depth} ${xRight},${bBot}"
      fill="#0a2e22" opacity="0.6"/>`;
    // Highlight atas
    content += `<rect x="${xLeft}" y="${bTop}" width="${xRight - xLeft}" height="${beamH}"
      fill="url(#beamHighlight)" rx="2"/>`;
    // Label E pada tengah balok
    const mx = (xLeft + xRight) / 2;
    content += `
      <rect x="${mx - 18}" y="${bTop - 26}" width="36" height="20" rx="4" fill="#0f4d3a" opacity="0.88"/>
      <text font-family="Inter,sans-serif" font-size="11" font-weight="700" fill="#a8f0d0"
        text-anchor="middle" x="${mx}" y="${bTop - 11}">E${element.id}</text>
    `;
  });

  // ---- Render beban ----
  state.loads.forEach(load => {
    if (load.type === 'point') {
      const px = sx(load.x);
      const fx = pointFx(load);
      const fy = pointFy(load);
      const isHorizontal = Math.abs(fx) > Math.abs(fy);
      const arrowLen = 52;

      if (isHorizontal) {
        // Beban horizontal
        const dir = fx >= 0 ? 1 : -1;
        const x1 = px - dir * arrowLen;
        const x2 = px - dir * 2;
        content += `
          <line x1="${x1}" y1="${beamY}" x2="${x2}" y2="${beamY}"
            stroke="#6b4fd8" stroke-width="2.5" marker-end="url(#arrowH)"/>
          <rect x="${Math.min(x1, x2) - 2}" y="${beamY - 22}" width="${Math.abs(x2-x1)+4}" height="18" rx="3" fill="#6b4fd820"/>
          <text font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="#6b4fd8"
            text-anchor="middle" x="${(x1+x2)/2}" y="${beamY - 9}">${load.label} ${fmt(load.p)}kN</text>
        `;
      } else {
        // Beban vertikal (ke bawah)
        const tipY = beamY - beamH - 4;
        const tailY = tipY - arrowLen;
        content += `
          <line x1="${px}" y1="${tailY}" x2="${px}" y2="${tipY}"
            stroke="#c93434" stroke-width="2.5" marker-end="url(#arrowV)"/>
          <rect x="${px - 32}" y="${tailY - 20}" width="64" height="18" rx="3" fill="#c9343415"/>
          <text font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="#c93434"
            text-anchor="middle" x="${px}" y="${tailY - 7}">${load.label} ${fmt(load.p)}kN</text>
        `;
      }
    } else {
      // Beban merata (UDL)
      const range = udlRange(load);
      const x1 = sx(range.a);
      const x2 = sx(range.b);
      const udlTop = beamY - beamH - 48;
      const udlBot = beamY - beamH - 4;
      const step = Math.max((x2 - x1) / Math.round((x2 - x1) / 28), 20);

      // Area UDL
      content += `<rect x="${x1}" y="${udlTop}" width="${x2 - x1}" height="${udlBot - udlTop}"
        fill="#d67a0018" rx="2"/>`;
      // Garis atas UDL
      content += `<line x1="${x1}" y1="${udlTop}" x2="${x2}" y2="${udlTop}"
        stroke="#d67a00" stroke-width="2"/>`;
      // Anak panah UDL
      for (let ax = x1 + step / 2; ax <= x2 - step / 2 + 1; ax += step) {
        content += `<line x1="${ax}" y1="${udlTop}" x2="${ax}" y2="${udlBot}"
          stroke="#d67a00" stroke-width="1.8" marker-end="url(#arrowUDL)"/>`;
      }
      // Label UDL
      content += `
        <rect x="${(x1+x2)/2 - 38}" y="${udlTop - 22}" width="76" height="18" rx="3" fill="#d67a0020"/>
        <text font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="#a35a00"
          text-anchor="middle" x="${(x1+x2)/2}" y="${udlTop - 9}">${load.label} ${fmt(load.w)} kN/m</text>
      `;
    }
  });

  // ---- Render support & node ----
  nodes.forEach(node => {
    const nx = sx(node.x);
    const bBot = beamY + beamH;

    // Gambar support
    if (node.support === 'fixed') {
      // Dinding jepit
      const wallX = nx - 10;
      const wallH = 60;
      content += `
        <rect x="${wallX - 16}" y="${beamY - wallH/2}" width="16" height="${wallH}"
          fill="#17664e" rx="2"/>
        <rect x="${wallX - 20}" y="${beamY - wallH/2}" width="4" height="${wallH}"
          fill="#0a2e22"/>
      `;
      // Garis arsir jepit
      for (let hy = beamY - wallH/2 + 6; hy < beamY + wallH/2; hy += 10) {
        content += `<line x1="${wallX - 20}" y1="${hy}" x2="${wallX - 32}" y2="${hy + 8}"
          stroke="#0a2e22" stroke-width="1.5" opacity="0.6"/>`;
      }
    } else if (node.support === 'pin') {
      // Segitiga pin
      const triH = 24;
      content += `
        <polygon points="${nx},${bBot} ${nx - 16},${bBot + triH} ${nx + 16},${bBot + triH}"
          fill="#17664e" stroke="#0a2e22" stroke-width="1"/>
        <line x1="${nx - 22}" y1="${bBot + triH + 6}" x2="${nx + 22}" y2="${bBot + triH + 6}"
          stroke="#17664e" stroke-width="3"/>
        <line x1="${nx - 22}" y1="${bBot + triH + 11}" x2="${nx + 22}" y2="${bBot + triH + 11}"
          stroke="#c8e6dc" stroke-width="1.5"/>
      `;
    } else if (node.support === 'roller') {
      // Segitiga + roda
      const triH = 22;
      content += `
        <polygon points="${nx},${bBot} ${nx - 14},${bBot + triH} ${nx + 14},${bBot + triH}"
          fill="#2e8c67" stroke="#0a2e22" stroke-width="1"/>
        <circle cx="${nx - 8}" cy="${bBot + triH + 7}" r="5"
          fill="#f5faf8" stroke="#17664e" stroke-width="1.5"/>
        <circle cx="${nx + 8}" cy="${bBot + triH + 7}" r="5"
          fill="#f5faf8" stroke="#17664e" stroke-width="1.5"/>
        <line x1="${nx - 22}" y1="${bBot + triH + 14}" x2="${nx + 22}" y2="${bBot + triH + 14}"
          stroke="#17664e" stroke-width="2.5"/>
      `;
    }

    // Node circle (di atas balok, di tepi balok)
    content += `
      <circle cx="${nx}" cy="${beamY}" r="9"
        fill="url(#nodeGrad)" stroke="#fff" stroke-width="2" filter="url(#nodeShadow)"/>
      <circle cx="${nx}" cy="${beamY}" r="3.5" fill="#fff" opacity="0.85"/>
    `;

    // Label node di bawah
    const labelY = bBot + 58;
    content += `
      <text font-family="Inter,sans-serif" font-size="12" font-weight="800" fill="#0f4d3a"
        text-anchor="middle" x="${nx}" y="${labelY}">N${node.id}</text>
      <text font-family="Inter,sans-serif" font-size="11" fill="#5c8f7a"
        text-anchor="middle" x="${nx}" y="${labelY + 15}">${fmt(node.x)} m</text>
    `;
  });

  svg.innerHTML = defs + content;
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

function chartDataset(label, data, color, unit) {
  // Buat dua dataset terpisah: positif dan negatif, agar fill area tidak overlap di tengah baseline
  const positiveData = data.map(v => v >= 0 ? v : 0);
  const negativeData = data.map(v => v < 0 ? v : 0);
  return [
    {
      label: label + ' (+)',
      data: positiveData,
      unit,
      borderColor: color,
      backgroundColor: color + '30',
      fill: 'origin',
      tension: 0,
      pointRadius: 0,
      pointHitRadius: 8,
      borderWidth: 2,
      _originalData: data
    },
    {
      label: label + ' (-)',
      data: negativeData,
      unit,
      borderColor: color,
      backgroundColor: color + '18',
      fill: 'origin',
      tension: 0,
      pointRadius: 0,
      pointHitRadius: 8,
      borderWidth: 2,
      _originalData: data
    }
  ];
}

// Plugin khusus untuk label nilai max/min di chart dengan dua dataset (pos/neg)
const valueLabelPlugin = {
  id: 'valueLabelPlugin',
  afterDatasetsDraw(chart) {
    // Ambil data asli dari dataset pertama (positif)
    const ds0 = chart.data.datasets[0];
    const originalData = ds0?._originalData;
    if (!originalData?.length) return;
    const maxVal = Math.max(...originalData);
    const minVal = Math.min(...originalData);
    const targets = new Map();
    if (Math.abs(maxVal) > 1e-9) targets.set(originalData.indexOf(maxVal), maxVal);
    if (Math.abs(minVal) > 1e-9 && originalData.indexOf(minVal) !== originalData.indexOf(maxVal)) {
      targets.set(originalData.indexOf(minVal), minVal);
    }
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = '700 11px Inter, sans-serif';
    targets.forEach((value, index) => {
      // Gunakan dataset yang sesuai (positif atau negatif)
      const dsIndex = value >= 0 ? 0 : 1;
      const meta = chart.getDatasetMeta(dsIndex);
      const point = meta?.data[index];
      if (!point) return;
      ctx.fillStyle = ds0.borderColor;
      const text = fmt(value) + ' ' + ds0.unit;
      const textWidth = ctx.measureText(text).width;
      const px = Math.min(point.x + 6, chart.chartArea.right - textWidth - 4);
      const py = value >= 0 ? point.y - 8 : point.y + 16;
      ctx.fillText(text, px, py);
    });
    ctx.restore();
  }
};

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
    plugins: {
      legend: { display: false },
      // Pastikan filler plugin aktif untuk fill: 'origin'
      filler: { propagate: false }
    },
    scales: {
      x: { title: { display: true, text: 'x (m)' }, ticks: { maxTicksLimit: 8 } },
      y: { ...paddedRange(values), title: { display: true, text: unit }, ticks: { maxTicksLimit: 5 } }
    },
    interaction: { mode: 'index', intersect: false },
    elements: { line: { fill: true } }
  });

  if (state.afdChart) state.afdChart.destroy();
  if (state.sfdChart) state.sfdChart.destroy();
  if (state.bmdChart) state.bmdChart.destroy();

  // Setiap chart punya dua dataset terpisah (positif & negatif) dengan fill ke baseline y=0
  state.afdChart = new Chart($('#afdChart'), {
    type: 'line',
    data: { labels, datasets: chartDataset('N', afdData, '#6b4fd8', 'kN') },
    options: baseOptions('N (kN)', afdData),
    plugins: [valueLabelPlugin]
  });
  state.sfdChart = new Chart($('#sfdChart'), {
    type: 'line',
    data: { labels, datasets: chartDataset('V', sfdData, '#1a56ff', 'kN') },
    options: baseOptions('V (kN)', sfdData),
    plugins: [valueLabelPlugin]
  });
  const bmdOptions = baseOptions('M (kNm)', bmdData);
  bmdOptions.scales.y = { ...bmdOptions.scales.y, reverse: true };
  state.bmdChart = new Chart($('#bmdChart'), {
    type: 'line',
    data: { labels, datasets: chartDataset('M', bmdData, '#d40000', 'kNm') },
    options: bmdOptions,
    plugins: [valueLabelPlugin]
  });
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