const json = (res, status, payload) => {
  res.status(status).json(payload);
};

const allowedOrigin = origin => (/^https:\/\/sipil-care\.vercel\.app$/.test(origin) || /^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin)
  ? origin
  : 'https://sipil-care.vercel.app');

const numberText = value => {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0';
  return String(Number(number.toFixed(9))).replace(/\.0+$/, '');
};

const fetchBatch = async points => {
  const latitudes = points.map(point => numberText(point[0])).join(',');
  const longitudes = points.map(point => numberText(point[1])).join(',');
  const url = `https://api.open-meteo.com/v1/elevation?latitude=${encodeURIComponent(latitudes)}&longitude=${encodeURIComponent(longitudes)}`;
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.reason || data.error || `Elevation API gagal (${response.status}).`);
  return Array.isArray(data.elevation) ? data.elevation.map(Number) : [];
};

module.exports = async (req, res) => {
  const origin = req.headers.origin || '';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin(origin));
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    json(res, 405, { ok: false, message: 'Method not allowed.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const points = Array.isArray(body.points) ? body.points : [];
    const cleanPoints = points
      .map(point => [Number(point?.[0]), Number(point?.[1])])
      .filter(point => Number.isFinite(point[0]) && Number.isFinite(point[1]));

    if (!cleanPoints.length) {
      json(res, 400, { ok: false, message: 'Koordinat tidak valid.' });
      return;
    }
    if (cleanPoints.length > 5000) {
      json(res, 413, { ok: false, message: 'Maksimal 5000 titik per konversi.' });
      return;
    }

    const chunks = [];
    for (let start = 0; start < cleanPoints.length; start += 80) chunks.push(cleanPoints.slice(start, start + 80));
    const elevations = (await Promise.all(chunks.map(fetchBatch))).flat();

    json(res, 200, { ok: true, elevations });
  } catch (error) {
    console.error('Elevation proxy failed:', error);
    json(res, 502, { ok: false, message: error.message || 'Gagal mengambil elevasi terrain.' });
  }
};
