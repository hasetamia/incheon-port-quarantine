(function (root) {
  const aliases = {
    port: ['port_id', 'port_name_kr', '항만코드', '항만명', '항만', '기항지', '출항항', '출발항', 'port', 'portname'],
    country: ['country', 'iso2', '국가코드', '국가명', '국가', '출항국가'],
    volume: ['empty_teu', '물동량', '월물동량', '공컨테이너물동량', 'teu', 'volume'],
    inspection: ['inspection', 'inspection_volume', '검사량', '검역량', '당월검사량'],
    previous: ['previous_inspection', 'prev_inspection', '전월검사량', '전월검역량'],
    period: ['period', 'date', '기준연월', '연월', '조회연월'],
    year: ['year', '연도', '년도', '년'], month: ['month', '월'],
    source: ['volume_source', '물동량출처', '자료출처'],
    species: ['species', '외래종목록', '외래종'],
    latitude: ['lat', 'latitude', '위도'], longitude: ['lon', 'lng', 'longitude', '경도']
  };
  const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
  const number = (value, signed = false) => {
    const raw = String(value ?? '').trim().replace(/[\s,]/g, '').replace(/(TEU|개|명)$/i, '');
    if (!raw) return null;
    const result = Number(raw);
    return Number.isFinite(result) && (signed || result >= 0) ? result : null;
  };
  function period(value, SSF) {
    if (value instanceof Date && Number.isFinite(value.valueOf())) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
    const raw = String(value ?? '').trim();
    let match = raw.match(/^(20\d{2})[-./년\s]*(0?[1-9]|1[0-2])(?:월|[-./T\s].*)?$/);
    if (match) return `${match[1]}-${String(Number(match[2])).padStart(2, '0')}`;
    match = raw.match(/^(0?[1-9]|1[0-2])\/(20\d{2})$/);
    if (match) return `${match[2]}-${String(Number(match[1])).padStart(2, '0')}`;
    if (SSF && /^\d{5}(\.\d+)?$/.test(raw)) {
      const d = SSF.parse_date_code(Number(raw));
      if (d && d.y >= 2000 && d.y <= 2100) return `${d.y}-${String(d.m).padStart(2, '0')}`;
    }
    return '';
  }
  function shiftMonth(value, offset) {
    const [year, month] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
  function mappingFor(headers) {
    const normalized = headers.map(normalize);
    return Object.fromEntries(Object.entries(aliases).map(([role, names]) => {
      let index = -1;
      for (const alias of names) {
        index = normalized.indexOf(normalize(alias));
        if (index >= 0) break;
      }
      return [role, index];
    }));
  }
  function detectHeader(rows) {
    let best = { index: 0, score: -1 };
    rows.slice(0, 15).forEach((row, index) => {
      const map = mappingFor(row);
      const score = Number(map.port >= 0) * 2 + Number(map.volume >= 0) * 2 + Number(map.country >= 0);
      if (score > best.score) best = { index, score };
    });
    return best.index;
  }
  function findPort(value, country, ports) {
    const wanted = normalize(value);
    const exact = ports.find(port => normalize(port.id) === wanted);
    if (exact) return exact;
    const matches = ports.filter(port => normalize(port.name) === wanted && (!country || country.toUpperCase() === port.country));
    return matches.length === 1 ? matches[0] : undefined;
  }
  function aggregate(records) {
    const groups = new Map();
    for (const record of records) {
      const key = `${record.period}|${record.id}`;
      const prior = groups.get(key);
      if (!prior) { groups.set(key, { ...record, species: [...(record.species || [])] }); continue; }
      for (const field of ['volume', 'inspection', 'previousInspection']) prior[field] = prior[field] === null || record[field] === null ? null : prior[field] + record[field];
      prior.species = [...new Set([...prior.species, ...(record.species || [])])];
      if (prior.source !== record.source) prior.source = 'mixed';
    }
    return [...groups.values()];
  }
  function readRows(rows, map, { ports, defaultPeriod, SSF }) {
    const value = (row, role) => map[role] >= 0 ? row[map[role]] : '';
    const hasDates = map.period >= 0 || map.year >= 0 || map.month >= 0;
    const records = [], issues = { invalidPeriod: 0, invalidVolume: 0, missingPort: 0, unknownPort: 0, referenceOnly: 0 };
    for (const row of rows) {
      if (!row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '')) continue;
      const portValue = String(value(row, 'port') ?? '').trim();
      if (!portValue) { issues.missingPort++; continue; }
      let date = map.period >= 0 ? period(value(row, 'period'), SSF) : '';
      if (!date && map.year >= 0 && map.month >= 0) date = period(`${value(row, 'year')}-${value(row, 'month')}`);
      if (!hasDates) date = defaultPeriod;
      if (!date) { issues.invalidPeriod++; continue; }
      const country = String(value(row, 'country') ?? '').trim();
      const known = findPort(portValue, country, ports);
      if (!known) issues.unknownPort++;
      const volume = number(value(row, 'volume'));
      const source = String(value(row, 'source') ?? '');
      if (volume === null && ['none', 'n/a'].includes(source)) { issues.referenceOnly++; continue; }
      if (volume === null) issues.invalidVolume++;
      let lat = number(value(row, 'latitude'), true), lon = number(value(row, 'longitude'), true);
      if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180) { lat = known?.lat ?? null; lon = known?.lon ?? null; }
      records.push({ id: known?.id || `custom:${encodeURIComponent(country.toUpperCase())}:${encodeURIComponent(portValue.toLowerCase())}`, name: known?.name || portValue, country: known?.country || country, period: date, volume,
        inspection: map.inspection >= 0 ? number(value(row, 'inspection')) : null,
        previousInspection: map.previous >= 0 ? number(value(row, 'previous')) : null,
        source: ['measured', 'estimated', 'none', 'n/a'].includes(source) ? source : 'uploaded', lat, lon,
        species: map.species >= 0 ? String(value(row, 'species') ?? '').split(/[;,|\n、]+/).map(v => v.trim()).filter(Boolean) : [] });
    }
    return { records: aggregate(records), issues, assignedPeriod: !hasDates };
  }
  function referenceRecords(reference) {
    const ports = new Map(reference.ports.map(port => [port.id, port]));
    return Object.entries(reference.months).flatMap(([date, rows]) => rows.filter(row => row[1] !== null && row[1] >= 0).map(row => ({
      ...ports.get(row[0]), period: date, volume: row[1], source: row[2], inspection: null, previousInspection: null, species: []
    })));
  }
  const api = { aliases, normalize, number, period, shiftMonth, mappingFor, detectHeader, findPort, aggregate, readRows, referenceRecords };
  root.QuarantineModel = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(globalThis);
