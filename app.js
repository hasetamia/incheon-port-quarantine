const navItems = Array.from(document.querySelectorAll(".nav-item"));
const navTriggers = Array.from(document.querySelectorAll(".nav-trigger"));

function closeMenus(except = null) {
  navItems.forEach((item) => {
    if (item !== except) {
      item.classList.remove("is-open");
      item.querySelector(".nav-trigger")?.setAttribute("aria-expanded", "false");
    }
  });
}

navTriggers.forEach((trigger) => {
  trigger.addEventListener("click", (event) => {
    event.stopPropagation();
    const item = trigger.closest(".nav-item");
    const willOpen = !item.classList.contains("is-open");
    closeMenus(item);
    item.classList.toggle("is-open", willOpen);
    trigger.setAttribute("aria-expanded", String(willOpen));
  });
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".primary-nav")) closeMenus();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeMenus();
    document.querySelector(".mobile-menu-toggle")?.setAttribute("aria-expanded", "false");
    document.querySelector(".primary-nav")?.classList.remove("is-open");
    closeYearList();
  }
});

const mobileToggle = document.querySelector(".mobile-menu-toggle");
const primaryNav = document.querySelector(".primary-nav");
mobileToggle?.addEventListener("click", () => {
  const isOpen = mobileToggle.getAttribute("aria-expanded") === "true";
  mobileToggle.setAttribute("aria-expanded", String(!isOpen));
  primaryNav.classList.toggle("is-open", !isOpen);
});

document.querySelectorAll(".dropdown-menu a").forEach((link) => {
  link.addEventListener("click", () => {
    closeMenus();
    mobileToggle?.setAttribute("aria-expanded", "false");
    primaryNav?.classList.remove("is-open");
  });
});

const countryNames = {
  AE: "아랍에미리트", AU: "호주", BD: "방글라데시", BJ: "베냉", BN: "브루나이",
  CN: "중국", EG: "이집트", ES: "스페인", GH: "가나", HK: "홍콩",
  ID: "인도네시아", IN: "인도", IR: "이란", JP: "일본", KH: "캄보디아",
  KR: "대한민국", LY: "리비아", MM: "미얀마", MY: "말레이시아", NG: "나이지리아",
  OM: "오만", PH: "필리핀", RU: "러시아", SG: "싱가포르", TG: "토고",
  TH: "태국", TW: "대만", US: "미국", VN: "베트남", ZA: "남아프리카공화국"
};

const state = { year: null, month: null, port: null, scenario: null };
const yearToggle = document.getElementById("year-toggle");
const yearLabel = document.getElementById("selected-year");
const yearOptions = document.getElementById("year-options");
const previousYear = document.getElementById("previous-year");
const nextYear = document.getElementById("next-year");
const monthButtons = Array.from(document.querySelectorAll(".month-option"));
const monthHint = document.getElementById("month-hint");
const selectedPeriod = document.getElementById("selected-period");
const selectedCountry = document.getElementById("selected-country");
const selectedPortName = document.getElementById("selected-port-name");
const volumeInput = document.getElementById("volume-input");
const scenarioButtons = Array.from(document.querySelectorAll(".scenario-choice"));
const scenarioVolumeSummary = document.getElementById("scenario-volume-summary");
const analyzeButton = document.getElementById("analyze-button");
const analysisFeedback = document.getElementById("analysis-feedback");
const countryFilter = document.getElementById("country-filter");
const portSearch = document.getElementById("port-search");
const portSuggestions = document.getElementById("port-suggestions");
const portCount = document.getElementById("port-count");
const years = Array.from({ length: 17 }, (_, index) => 2010 + index);

function countryLabel(code) {
  return countryNames[code] || code || "국가 선택 전";
}

function openYearList() {
  yearOptions.hidden = false;
  yearToggle.setAttribute("aria-expanded", "true");
}

function closeYearList() {
  if (!yearOptions) return;
  yearOptions.hidden = true;
  yearToggle?.setAttribute("aria-expanded", "false");
}

function renderYearOptions() {
  yearOptions.replaceChildren();
  years.forEach((year) => {
    const option = document.createElement("button");
    option.type = "button";
    option.className = "year-option";
    option.setAttribute("role", "option");
    option.setAttribute("aria-selected", String(state.year === year));
    option.textContent = String(year);
    option.addEventListener("click", () => {
      state.year = year;
      closeYearList();
      updateDateDisplay();
    });
    yearOptions.append(option);
  });
}

function updateDateDisplay() {
  yearLabel.textContent = state.year === null ? "연도 선택" : String(state.year);
  previousYear.disabled = state.year === null || state.year <= years[0];
  nextYear.disabled = state.year === null || state.year >= years[years.length - 1];
  monthButtons.forEach((button) => {
    button.disabled = state.year === null;
    button.setAttribute("aria-pressed", String(Number(button.dataset.month) === state.month));
  });
  monthHint.textContent = state.year === null ? "먼저 연도를 선택하세요" : "1월부터 12월";
  selectedPeriod.textContent = state.year === null || state.month === null
    ? "연도와 월 선택 전"
    : state.year + "년 " + state.month + "월";
  renderYearOptions();
  updateAnalysisState();
}

yearToggle.addEventListener("click", () => {
  if (yearOptions.hidden) openYearList();
  else closeYearList();
});

previousYear.addEventListener("click", () => {
  if (state.year !== null && state.year > years[0]) {
    state.year -= 1;
    updateDateDisplay();
  }
});

nextYear.addEventListener("click", () => {
  if (state.year !== null && state.year < years[years.length - 1]) {
    state.year += 1;
    updateDateDisplay();
  }
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".year-picker-wrap")) closeYearList();
});

monthButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (state.year === null) return;
    state.month = Number(button.dataset.month);
    updateDateDisplay();
  });
});

scenarioButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.scenario = button.dataset.scenario;
    scenarioButtons.forEach((choice) => {
      choice.setAttribute("aria-pressed", String(choice === button));
    });
    updateAnalysisState();
  });
});

function getVolume() {
  if (volumeInput.value.trim() === "") return null;
  const value = Number(volumeInput.value);
  if (!Number.isInteger(value) || value < 0 || value > 100000) return null;
  return value;
}

function updateCountryDisplay() {
  const countryCode = countryFilter.value || state.port?.country;
  selectedCountry.textContent = countryCode ? countryLabel(countryCode) : "국가 선택 전";
}

function updateScenarioContext() {
  const volume = getVolume();
  if (!state.port) {
    scenarioVolumeSummary.textContent = "항만과 물동량을 선택하면 여기에 표시됩니다";
  } else if (volume === null) {
    scenarioVolumeSummary.textContent = state.port.ko + " · 물동량 입력 전";
  } else {
    scenarioVolumeSummary.textContent = state.port.ko + " · " + volume.toLocaleString("ko-KR") + " TEU";
  }
}

function updateAnalysisState() {
  updateCountryDisplay();
  updateScenarioContext();
  const complete = state.year !== null
    && state.month !== null
    && state.port !== null
    && getVolume() !== null
    && state.scenario !== null;
  analyzeButton.disabled = !complete;
  analysisFeedback.classList.toggle("is-error", false);
  analysisFeedback.textContent = complete
    ? "선택 조건이 준비되었습니다."
    : "연도, 월, 항만, 물동량과 시나리오를 선택하세요.";
}

function clearPortSelection() {
  state.port = null;
  portSearch.value = "";
  selectedPortName.textContent = "항만을 선택하세요";
  volumeInput.value = "";
  updateAnalysisState();
}

const records = Array.isArray(window.PORT_DATA) ? window.PORT_DATA : [];

function availablePorts() {
  const country = countryFilter.value;
  return records.filter((port) => !country || port.country === country);
}

function renderPortSuggestions() {
  const ports = availablePorts();
  portSuggestions.replaceChildren();
  ports.forEach((port) => {
    const option = document.createElement("option");
    option.value = port.en + " (" + port.ko + ")";
    portSuggestions.append(option);
  });
  portCount.textContent = ports.length + "개 항만";
}

function findAvailablePort(value) {
  return availablePorts().find((port) => port.en + " (" + port.ko + ")" === value);
}

function populatePortControls() {
  const countryCodes = Array.from(new Set(records.map((port) => port.country)));
  countryCodes.sort((a, b) => countryLabel(a).localeCompare(countryLabel(b), "ko"));
  countryCodes.forEach((code) => {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = countryLabel(code);
    countryFilter.append(option);
  });
  renderPortSuggestions();
}

function selectPort(port, shouldZoom = true) {
  if (state.port?.id !== port.id) volumeInput.value = "";
  state.port = port;
  countryFilter.value = port.country;
  portSearch.value = port.en + " (" + port.ko + ")";
  selectedPortName.textContent = port.en + " · " + port.ko;
  updateAnalysisState();
  renderPortSuggestions();
  renderMarkers(false);
  if (shouldZoom && map) map.flyTo([port.lat, port.lon], Math.max(map.getZoom(), 5), { duration: 0.45 });
}

countryFilter.addEventListener("change", () => {
  if (state.port && countryFilter.value && state.port.country !== countryFilter.value) clearPortSelection();
  else if (!state.port) portSearch.value = "";
  updateCountryDisplay();
  renderPortSuggestions();
  renderMarkers(true);
});

portSearch.addEventListener("change", () => {
  const value = portSearch.value.trim();
  const match = findAvailablePort(value);
  if (match) selectPort(match);
});

portSearch.addEventListener("input", () => {
  const value = portSearch.value.trim();
  const match = findAvailablePort(value);
  if (match) selectPort(match);
  else if (state.port && value !== state.port.en + " (" + state.port.ko + ")") {
    const searchValue = portSearch.value;
    clearPortSelection();
    portSearch.value = searchValue;
    renderMarkers(false);
  }
});

volumeInput.addEventListener("input", () => {
  const invalid = volumeInput.value !== "" && getVolume() === null;
  volumeInput.setCustomValidity(invalid ? "물동량은 0에서 100,000 사이의 정수로 입력해 주세요." : "");
  updateAnalysisState();
  if (invalid) {
    analysisFeedback.classList.add("is-error");
    analysisFeedback.textContent = "물동량은 0~100,000 TEU 사이의 값으로 입력하세요.";
  }
});

analyzeButton.addEventListener("click", () => {
  const volume = getVolume();
  if (analyzeButton.disabled || !state.port || volume === null) return;
  const destination = new URL("results.html", window.location.href);
  destination.searchParams.set("year", String(state.year));
  destination.searchParams.set("month", String(state.month));
  destination.searchParams.set("port", state.port.id);
  destination.searchParams.set("volume", String(volume));
  destination.searchParams.set("scenario", state.scenario);
  const opened = window.open(destination.toString(), "_blank");
  if (opened) opened.opener = null;
  else window.location.assign(destination.toString());
});

let map = null;
let markerLayer = null;
const markersById = new Map();

function markerStyle(port) {
  const selected = state.port?.id === port.id;
  return {
    radius: selected ? 7 : 4.5,
    color: selected ? "#ffffff" : "#2f659f",
    weight: selected ? 2.5 : 1.4,
    fillColor: selected ? "#316db2" : "#00a2a4",
    fillOpacity: selected ? 1 : 0.84
  };
}

function renderMarkers(fitToCountry) {
  if (!map || !markerLayer) return;
  markerLayer.clearLayers();
  markersById.clear();
  const filter = countryFilter.value;
  const visible = availablePorts();
  visible.forEach((port) => {
    const isSelected = state.port?.id === port.id;
    const marker = L.circleMarker([port.lat, port.lon], markerStyle(port));
    const label = port.ko + " · " + port.en;
    marker.bindTooltip(label, {
      direction: "top",
      offset: [0, -8],
      sticky: true,
      permanent: isSelected,
      opacity: 0.98,
      className: isSelected ? "leaflet-tooltip-selected" : ""
    });
    marker.on("click", () => selectPort(port, true));
    marker.addTo(markerLayer);
    markersById.set(port.id, marker);
  });
  if (fitToCountry && visible.length) {
    if (visible.length === 1) map.setView([visible[0].lat, visible[0].lon], 5);
    else map.fitBounds(L.featureGroup(visible.map((port) => markersById.get(port.id))).getBounds().pad(0.12), { maxZoom: 5 });
  }
}

function initializeMap() {
  const fallback = document.getElementById("map-fallback");
  if (!window.L || records.length === 0) {
    fallback.hidden = false;
    if (records.length === 0) portCount.textContent = "항만 자료 없음";
    return;
  }

  map = L.map("world-map", {
    minZoom: 1,
    maxZoom: 9,
    zoomControl: true,
    scrollWheelZoom: false,
    worldCopyJump: true
  }).setView([25, 70], 1.7);
  markerLayer = L.layerGroup().addTo(map);
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    minZoom: 1,
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  let tileErrors = 0;
  tiles.on("tileerror", () => {
    tileErrors += 1;
    if (tileErrors >= 3) {
      fallback.hidden = false;
      fallback.textContent = "지도 배경을 불러오지 못했습니다. 항만 이름 검색은 계속 사용할 수 있습니다.";
    }
  });
  tiles.on("load", () => {
    fallback.hidden = true;
  });
  tiles.addTo(map);
  renderMarkers(false);
  window.setTimeout(() => map.invalidateSize(), 120);
}

populatePortControls();
updateDateDisplay();
initializeMap();
