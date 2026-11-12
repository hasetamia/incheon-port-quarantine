const R = window.QUARANTINE_REFERENCE;
const M = window.QuarantineModel;
const $ = id => document.getElementById(id);
const tabs = [...document.querySelectorAll('.workspace-tab')];
const roles = { port: '항만 ID 또는 이름', volume: '물동량', country: '국가', year: '연도', month: '월', period: '연월', inspection: '검사량', previous: '전월 검사량', source: '물동량 출처', species: '외래종 목록', latitude: '위도', longitude: '경도' };
const sources = { measured: '실측', estimated: '추정', uploaded: '업로드', mixed: '혼합', none: '값 없음', 'n/a': '기후 전용' };
const countryNames = new Intl.DisplayNames(['ko'], { type: 'region' });
const suitabilityLoads = new Map();
const weatherCache = new Map();
const state = { workbook: null, fileName: '', sheetRows: [], headerRow: 0, records: [], visible: [], selected: '', source: '', sourceTitle: '', issues: {}, assignedPeriod: false, weatherController: null };
const format = value => Number(value).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
const dateLabel = date => date ? `${date.slice(0, 4)}년 ${Number(date.slice(5))}월` : '연월 미지정';
function countryLabel(code) { try { return /^[A-Z]{2}$/.test(code) ? countryNames.of(code) : code || '국가 미확인'; } catch { return code || '국가 미확인'; } }
function localMonth() { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`; }
function showView(id) {
  for (const tab of tabs) {
    const active = tab.dataset.view === id;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    $(tab.dataset.view).hidden = !active;
  }
}
tabs.forEach(tab => tab.addEventListener('click', () => { if (!tab.disabled) showView(tab.dataset.view); }));
$('workspace-tabs').addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  const enabled = tabs.filter(tab => !tab.disabled);
  const index = enabled.indexOf(document.activeElement);
  if (index < 0) return;
  event.preventDefault();
  const next = enabled[(index + (event.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
  showView(next.dataset.view); next.focus();
});
$('replace-file').addEventListener('click', () => showView('upload-view'));
$('back-to-all').addEventListener('click', () => selectPort(''));

for (const [role, label] of Object.entries(roles)) {
  const field = document.createElement('label'); field.className = 'form-field'; field.htmlFor = `map-${role}`;
  field.append(document.createTextNode(label + (['port', 'volume'].includes(role) ? ' *' : '')));
  const select = document.createElement('select'); select.id = `map-${role}`; select.addEventListener('change', updateReadyState); field.append(select);
  $('column-mapping').append(field);
}
function getMapping() { return Object.fromEntries(Object.keys(roles).map(role => [role, $(`map-${role}`).value === '' ? -1 : Number($(`map-${role}`).value)])); }
function updateReadyState() { const map = getMapping(); $('show-operations').disabled = map.port < 0 || map.volume < 0; }
function setFeedback(message, error = false) { $('upload-feedback').textContent = message; $('upload-feedback').classList.toggle('is-error', error); }
function configureSheet(name) {
  const sheet = state.workbook.Sheets[name];
  state.sheetRows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: null });
  state.headerRow = M.detectHeader(state.sheetRows);
  const headers = state.sheetRows[state.headerRow] || [];
  const mapping = M.mappingFor(headers);
  for (const role of Object.keys(roles)) {
    const select = $(`map-${role}`); select.replaceChildren(new Option('연결 안 함', ''));
    headers.forEach((header, index) => select.append(new Option(`${window.XLSX.utils.encode_col(index)} · ${String(header ?? '제목 없음')}`, String(index))));
    select.value = mapping[role] >= 0 ? String(mapping[role]) : '';
  }
  $('file-options').hidden = false;
  $('file-prompt').textContent = state.fileName;
  $('mapping-details').open = mapping.port < 0 || mapping.volume < 0;
  setFeedback(`${name} 시트 · 제목 ${state.headerRow + 1}행 · ${Math.max(0, state.sheetRows.length - state.headerRow - 1)}개 자료 행`);
  updateReadyState();
}
function applyUpload() {
  const map = getMapping();
  if (map.port < 0 || map.volume < 0) { setFeedback('항만과 물동량 열을 연결해 주세요.', true); return; }
  const selected = $('reference-month').value;
  const result = M.readRows(state.sheetRows.slice(state.headerRow + 1), map, { ports: R.ports, defaultPeriod: selected || localMonth(), SSF: window.XLSX.SSF });
  if (!result.records.length) { setFeedback('읽을 수 있는 항만 자료가 없습니다. 항만·연월·물동량 열을 확인해 주세요.', true); return; }
  state.records = result.records; state.issues = result.issues; state.assignedPeriod = result.assignedPeriod;
  state.source = 'upload'; state.sourceTitle = `${state.fileName} / ${$('sheet-select').value}`;
  const dates = [...new Set(result.records.map(row => row.period))].sort();
  $('reference-month').value = dates.includes(selected) ? selected : dates.at(-1);
  state.selected = ''; tabs[1].disabled = false; renderOperations(); showView('operations-view');
}
async function loadWorkbook(file) {
  if (!window.XLSX) throw new Error('엑셀 읽기 파일을 찾지 못했습니다. vendor 폴더를 확인해 주세요.');
  if (file.size > 20 * 1024 * 1024) throw new Error('20MB 이하 파일을 선택해 주세요.');
  if (!/\.(xlsx|xls|xlsb|csv)$/i.test(file.name)) throw new Error('엑셀 또는 CSV 파일을 선택해 주세요.');
  setFeedback('파일을 읽고 있습니다…');
  const workbook = window.XLSX.read(await file.arrayBuffer(), { cellDates: true });
  if (!workbook.SheetNames?.length) throw new Error('읽을 수 있는 시트가 없습니다.');
  state.workbook = workbook; state.fileName = file.name;
  $('sheet-select').replaceChildren(...workbook.SheetNames.map(name => new Option(name, name)));
  $('sheet-select').value = workbook.SheetNames.includes('port_month') ? 'port_month' : workbook.SheetNames[0];
  configureSheet($('sheet-select').value);
  if (!$('show-operations').disabled) applyUpload();
}
async function acceptFile(file) { if (!file) return; try { await loadWorkbook(file); } catch (error) { setFeedback(error.message || '파일을 읽지 못했습니다.', true); } }
$('workbook-input').addEventListener('change', async event => { await acceptFile(event.target.files?.[0]); event.target.value = ''; });
$('file-drop').addEventListener('dragover', event => { event.preventDefault(); $('file-drop').classList.add('is-dragging'); });
$('file-drop').addEventListener('dragleave', () => $('file-drop').classList.remove('is-dragging'));
$('file-drop').addEventListener('drop', async event => { event.preventDefault(); $('file-drop').classList.remove('is-dragging'); await acceptFile(event.dataTransfer.files?.[0]); });
$('sheet-select').addEventListener('change', () => configureSheet($('sheet-select').value));
$('show-operations').addEventListener('click', applyUpload);
$('open-history').addEventListener('click', () => {
  state.records = M.referenceRecords(R); state.source = 'reference'; state.sourceTitle = '제공된 월별 기준자료'; state.issues = {}; state.assignedPeriod = false; state.selected = '';
  if (!$('reference-month').value) $('reference-month').value = [...new Set(state.records.map(row => row.period))].sort().at(-1);
  tabs[1].disabled = false; renderOperations(); showView('operations-view');
});
$('reference-month').addEventListener('change', () => { if (state.records.length) { state.selected = ''; renderOperations(); } });

function cell(row, value, className = '') { const td = document.createElement('td'); td.textContent = value; td.className = className; row.append(td); return td; }
function renderOperations() {
  const date = $('reference-month').value;
  state.visible = state.records.filter(row => row.period === date).sort((a, b) => countryLabel(a.country).localeCompare(countryLabel(b.country), 'ko') || a.name.localeCompare(b.name, 'ko'));
  $('source-caption').textContent = `${state.sourceTitle} · ${dateLabel(date)}`;
  $('manifest-period').textContent = dateLabel(date);
  $('summary-ports').textContent = format(state.visible.length);
  const completeVolumes = state.visible.every(row => row.volume !== null);
  $('summary-volume').textContent = state.visible.length && completeVolumes ? format(state.visible.reduce((sum, row) => sum + row.volume, 0)) : '—';
  const knownInspections = state.visible.filter(row => row.inspection !== null);
  $('summary-inspections').textContent = state.visible.length && knownInspections.length === state.visible.length ? format(knownInspections.reduce((sum, row) => sum + row.inspection, 0)) : '—';
  $('inspection-summary-note').textContent = knownInspections.length ? `${knownInspections.length}/${state.visible.length}개 항만의 원본 검사량` : '검사량 산식 연결 대기';
  const counts = Object.entries(sources).map(([key, label]) => { const count = state.visible.filter(row => row.source === key).length; return count ? `${label} ${count}` : ''; }).filter(Boolean);
  $('volume-summary-note').textContent = counts.join(' · ') || '표시할 자료 없음';
  const zeroCount = state.visible.filter(row => row.volume === 0).length;
  if (zeroCount) $('volume-summary-note').textContent += ` · 0 TEU ${zeroCount}항만 포함`;
  const warnings = [];
  if (!state.visible.length) warnings.push(`${dateLabel(date)} 자료가 없습니다. 다른 연월을 선택하거나 해당 월 파일을 등록해 주세요.`);
  if (state.visible.some(row => row.source === 'estimated')) warnings.push('추정 물동량이 포함되어 있습니다.');
  if (state.visible.some(row => row.volume === null)) warnings.push('물동량이 없는 행을 0으로 처리하지 않았습니다.');
  if (state.issues.invalidPeriod) warnings.push(`연월을 읽지 못한 ${state.issues.invalidPeriod}개 행은 제외했습니다.`);
  if (state.issues.missingPort) warnings.push(`항만이 없는 ${state.issues.missingPort}개 행은 제외했습니다.`);
  if (state.issues.unknownPort) warnings.push(`기준목록에 없는 ${state.issues.unknownPort}개 행은 입력 이름으로 표시합니다.`);
  if (state.issues.referenceOnly) warnings.push(`기후 전용·물동량 미제공 ${state.issues.referenceOnly}개 행은 입항 목록에서 제외했습니다.`);
  if (state.assignedPeriod) warnings.push('연월 열이 없는 파일은 등록할 때 선택한 기준월에 배정했습니다.');
  $('data-warning').hidden = !warnings.length; $('data-warning').textContent = warnings.join(' ');
  renderRail(); renderTable(); selectPort('');
}
function renderRail() {
  const fragment = document.createDocumentFragment();
  for (const item of [{ id: '', name: `전체 항만 · ${state.visible.length}` }, ...state.visible]) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'port-chip'; button.dataset.port = item.id;
    button.textContent = item.name; button.setAttribute('aria-pressed', 'false');
    if (item.country) button.title = `${countryLabel(item.country)} · ${item.id}`;
    button.addEventListener('click', () => selectPort(item.id)); fragment.append(button);
  }
  $('port-rail').replaceChildren(fragment); $('port-list-count').textContent = `${state.visible.length}개 항만`;
}
function renderTable() {
  const fragment = document.createDocumentFragment();
  for (const item of state.visible) {
    const row = document.createElement('tr'); cell(row, countryLabel(item.country));
    const nameCell = cell(row, ''); const button = document.createElement('button'); button.type = 'button'; button.className = 'port-select'; button.textContent = item.name;
    button.addEventListener('click', () => selectPort(item.id)); nameCell.append(button);
    const code = document.createElement('small'); code.className = 'port-code'; code.textContent = item.id.startsWith('custom:') ? '기준목록 외 항만' : item.id; nameCell.append(code);
    cell(row, item.volume === null ? '값 없음' : `${format(item.volume)} TEU`, 'numeric');
    cell(row, item.inspection === null ? '계산 대기' : format(item.inspection), item.inspection === null ? 'numeric pending-value' : 'numeric');
    const source = cell(row, ''); const badge = document.createElement('span'); badge.className = `source-label source-label--${item.source}`; badge.textContent = sources[item.source] || '업로드'; source.append(badge);
    fragment.append(row);
  }
  if (!state.visible.length) { const row = document.createElement('tr'); const td = cell(row, '해당 연월에 표시할 입항 자료가 없습니다.', 'empty-table'); td.colSpan = 5; fragment.append(row); }
  $('manifest-body').replaceChildren(fragment);
}
function selectPort(id) {
  state.selected = id;
  document.querySelectorAll('.port-chip').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.port === id)));
  $('manifest-card').hidden = Boolean(id); $('port-detail').hidden = !id;
  state.weatherController?.abort();
  if (!id) return;
  const item = state.visible.find(row => row.id === id); if (!item) return;
  $('detail-title').textContent = item.name;
  $('detail-country').textContent = `${countryLabel(item.country)} · ${item.id.startsWith('custom:') ? '기준목록 외 항만' : item.id} · ${dateLabel(item.period)} · ${item.volume === null ? '물동량 값 없음' : format(item.volume) + ' TEU'}`;
  $('detail-status').textContent = item.inspection === null ? '검사량 산식 연결 대기' : `검사량 ${format(item.inspection)} (원본 단위)`;
  renderSpecies(item); renderChange(item); loadWeather(item); resetForecast(item); renderClimate(item);
  $('port-detail').scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
function suitabilityFor(date) {
  if (window.QUARANTINE_S?.[date]) return Promise.resolve(window.QUARANTINE_S[date]);
  if (!R.months[date]) return Promise.resolve(null);
  const [year, month] = date.split('-');
  const quarter = `${year}-Q${Math.ceil(Number(month) / 3)}`;
  if (!suitabilityLoads.has(quarter)) suitabilityLoads.set(quarter, new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `data/suitability/${quarter}.js`;
    script.onload = () => resolve();
    script.onerror = () => { suitabilityLoads.delete(quarter); script.remove(); reject(new Error('서식 적합도 파일을 읽지 못했습니다.')); };
    document.head.append(script);
  }));
  return suitabilityLoads.get(quarter).then(() => window.QUARANTINE_S?.[date] || null);
}
async function renderSpecies(item) {
  const climateDate = M.shiftMonth(item.period, -12);
  $('species-list').textContent = '서식 적합도를 불러오고 있습니다…';
  $('species-basis').textContent = `${dateLabel(climateDate)} 기후 기반`;
  try {
    const month = await suitabilityFor(climateDate);
    if (state.selected !== item.id || $('reference-month').value !== item.period) return;
    const scores = month?.[item.id];
    if (!scores) {
      $('species-list').textContent = `이 항만의 ${dateLabel(climateDate)} 서식 적합도 자료가 없습니다.`;
      if (item.species.length) { const p = document.createElement('p'); p.className = 'uploaded-species'; p.textContent = `업로드 종 목록: ${item.species.join(', ')}`; $('species-list').append(p); }
      return;
    }
    const rows = R.species.map((species, index) => ({ ...species, score: scores[index] })).filter(row => Number.isFinite(row.score)).sort((a, b) => b.score - a.score);
    const table = document.createElement('table'); table.className = 'species-table';
    const head = document.createElement('thead'); const tr = document.createElement('tr');
    for (const name of ['종 정보', '서식 적합도']) { const th = document.createElement('th'); th.scope = 'col'; th.textContent = name; tr.append(th); } head.append(tr); table.append(head);
    const body = document.createElement('tbody');
    for (const species of rows) {
      const row = document.createElement('tr'); const name = cell(row, '');
      const strong = document.createElement('strong'); strong.textContent = species.name || species.scientific;
      const scientific = document.createElement('small'); scientific.textContent = species.scientific;
      const gbif = document.createElement('small'); const records = R.gbif[item.id]?.[species.key]; gbif.textContent = `GBIF 100km 기록 ${records ? format(records) + '건' : '—'}`;
      name.append(strong, scientific, gbif);
      const score = cell(row, '', 'numeric'); const text = document.createElement('strong'); text.textContent = species.score < .001 ? species.score.toExponential(2) : species.score.toFixed(3);
      const bar = document.createElement('span'); bar.className = 'score-track'; const fill = document.createElement('span'); fill.style.width = `${species.score * 100}%`; bar.append(fill); score.append(text, bar);
      body.append(row);
    }
    table.append(body); $('species-list').replaceChildren(table);
    $('species-basis').textContent = `${dateLabel(climateDate)} 기후 · ${rows.length}종`;
  } catch (error) { if (state.selected === item.id && $('reference-month').value === item.period) $('species-list').textContent = error.message; }
}
function renderChange(item) {
  const previousDate = M.shiftMonth(item.period, -1);
  const previous = item.previousInspection ?? state.records.find(row => row.period === previousDate && row.id === item.id)?.inspection ?? null;
  $('inspection-change').className = 'change-value';
  if (item.inspection === null || previous === null) { $('inspection-change').textContent = '비교 자료 없음'; $('change-caption').textContent = `${dateLabel(previousDate)}와 현재 검사량이 모두 있어야 비교할 수 있습니다.`; return; }
  const difference = item.inspection - previous;
  const percent = previous > 0 ? ` (${difference > 0 ? '+' : ''}${(difference / previous * 100).toFixed(1)}%)` : '';
  $('inspection-change').textContent = `${difference > 0 ? '+' : ''}${format(difference)}${percent}`;
  $('inspection-change').classList.toggle('is-positive', difference > 0); $('inspection-change').classList.toggle('is-negative', difference < 0);
  $('change-caption').textContent = `이번 달 ${format(item.inspection)} · 전월 ${format(previous)} (원본 단위)`;
}
function weatherDescription(code) {
  if (code === 0) return '맑음'; if (code === 1) return '대체로 맑음'; if (code === 2) return '구름 조금'; if (code === 3) return '흐림';
  if ([45, 48].includes(code)) return '안개'; if ([51, 53, 55, 56, 57].includes(code)) return '이슬비';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '비'; if ([71, 73, 75, 77, 85, 86].includes(code)) return '눈';
  return [95, 96, 99].includes(code) ? '뇌우' : '현재 기상';
}
async function loadWeather(item) {
  $('weather-time').textContent = '현재 시점'; $('weather-main').textContent = '불러오는 중'; $('weather-caption').textContent = '항만 좌표의 현재 기상을 조회합니다.';
  if (item.lat === null || item.lon === null) { $('weather-main').textContent = '좌표 없음'; $('weather-caption').textContent = '위도·경도 열을 연결하면 조회할 수 있습니다.'; return; }
  const controller = new AbortController(); state.weatherController = controller; const timer = setTimeout(() => controller.abort(), 10000);
  const key = `${item.lat},${item.lon}`;
  try {
    let data = weatherCache.get(key);
    if (!data) {
      const params = new URLSearchParams({ latitude: item.lat, longitude: item.lon, current: 'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code', timezone: 'auto' });
      const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal: controller.signal });
      if (!response.ok) throw new Error('기상 조회 실패'); data = await response.json(); if (!data.current) throw new Error('기상 값 없음'); weatherCache.set(key, data);
    }
    if (state.selected !== item.id || controller.signal.aborted) return;
    const current = data.current;
    $('weather-main').textContent = `${Math.round(current.temperature_2m)}°C · ${weatherDescription(current.weather_code)}`;
    $('weather-time').textContent = current.time.replace('T', ' ');
    $('weather-caption').textContent = `습도 ${current.relative_humidity_2m}% · 풍속 ${current.wind_speed_10m} km/h · 강수 ${current.precipitation} mm`;
  } catch { if (state.selected === item.id && state.weatherController === controller) { $('weather-main').textContent = '현재 기상 조회 불가'; $('weather-caption').textContent = '인터넷 연결 또는 기상 서비스 상태를 확인해 주세요.'; } }
  finally { clearTimeout(timer); }
}
function renderClimate(item) {
  const date = M.shiftMonth(item.period, -12), row = R.months[date]?.find(row => row[0] === item.id);
  const mean = row?.[3 + R.climateFields.indexOf('x_tmean_c')];
  $('climate-caption').textContent = mean === undefined || mean === null ? '모형 기준 기후 자료 없음' : `모형 기준 기후: ${dateLabel(date)} 평균 ${format(mean)}°C`;
}
function resetForecast(item) {
  // shortcut: 검사량 산식과 출력 단위가 확정되면 이 입력에 배분 계산을 연결합니다.
  const ceiling = Math.max(100000, Math.ceil((item.volume || 0) * 2 / 10000) * 10000);
  $('forecast-period').textContent = dateLabel(M.shiftMonth(item.period, 1));
  $('forecast-range').max = String(ceiling); $('forecast-range').value = String(item.volume || 0); $('forecast-range').disabled = false;
  $('forecast-value').value = String(item.volume || 0); $('forecast-range-max').textContent = `${format(ceiling)} TEU`;
  $('forecast-value').removeAttribute('aria-invalid'); $('forecast-feedback').textContent = '';
  $('forecast-inspection').textContent = '산식 연결 대기';
}
$('forecast-range').addEventListener('input', event => { $('forecast-value').value = event.target.value; $('forecast-value').removeAttribute('aria-invalid'); $('forecast-feedback').textContent = ''; });
$('forecast-value').addEventListener('input', event => {
  const value = M.number(event.target.value);
  $('forecast-value').setAttribute('aria-invalid', String(value === null)); $('forecast-feedback').textContent = value === null ? '0 이상의 물동량을 입력해 주세요.' : '';
  if (value === null) return;
  if (value > Number($('forecast-range').max)) { const max = Math.ceil(value / 10000) * 10000; $('forecast-range').max = String(max); $('forecast-range-max').textContent = `${format(max)} TEU`; }
  $('forecast-range').value = String(value);
});
$('history-caption').textContent = `185개 항만 · 분석 74종 · 물동량 2016.01–2026.09`;
