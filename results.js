const resultCountryNames = {
  AE: "아랍에미리트", AU: "호주", BD: "방글라데시", BJ: "베냉", BN: "브루나이",
  CN: "중국", EG: "이집트", ES: "스페인", GH: "가나", HK: "홍콩",
  ID: "인도네시아", IN: "인도", IR: "이란", JP: "일본", KH: "캄보디아",
  KR: "대한민국", LY: "리비아", MM: "미얀마", MY: "말레이시아", NG: "나이지리아",
  OM: "오만", PH: "필리핀", RU: "러시아", SG: "싱가포르", TG: "토고",
  TH: "태국", TW: "대만", US: "미국", VN: "베트남", ZA: "남아프리카공화국"
};

const scenarios = [
  {
    id: "ecology",
    step: "3-1",
    name: "생태위협 우선",
    description: "외래종 위험을 상대적으로 우선 반영하는 시나리오입니다.",
    exampleBars: [76, 55, 38, 23]
  },
  {
    id: "balanced",
    step: "3-2",
    name: "균형형",
    description: "생태위협과 물동량을 균형 있게 반영하는 시나리오입니다.",
    exampleBars: [63, 52, 41, 30]
  },
  {
    id: "volume",
    step: "3-3",
    name: "물동량 우선",
    description: "물동량을 상대적으로 우선 반영하는 시나리오입니다.",
    exampleBars: [52, 65, 44, 34]
  }
];

const params = new URLSearchParams(window.location.search);
const selectedPortId = params.get("port");
const selectedPort = (window.PORT_DATA || []).find((port) => port.id === selectedPortId);
const selectedYear = Number(params.get("year"));
const selectedMonth = Number(params.get("month"));
const volumeParam = params.get("volume");
const selectedVolume = volumeParam === null || volumeParam === "" ? Number.NaN : Number(volumeParam);
const selectedScenario = scenarios.some((scenario) => scenario.id === params.get("scenario"))
  ? params.get("scenario")
  : "ecology";

const resultStep = document.getElementById("results-step");
const resultTitle = document.getElementById("results-title");
const resultExplanation = document.getElementById("scenario-explanation");
const resultPeriod = document.getElementById("result-period");
const resultPort = document.getElementById("result-port");
const resultCountry = document.getElementById("result-country");
const resultVolume = document.getElementById("result-volume");
const chart = document.getElementById("allocation-chart");
const scenarioTabs = Array.from(document.querySelectorAll(".scenario-tab"));

function textForPort(port) {
  return port ? port.en + " · " + port.ko : "항만 정보 없음";
}

function shortenLabel(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength - 1) + "…" : text;
}

function makeSvgElement(name, attributes, text) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, String(value)));
  if (text !== undefined) element.textContent = text;
  return element;
}

function drawExampleChart(scenario) {
  chart.replaceChildren();
  const svg = makeSvgElement("svg", {
    viewBox: "0 0 760 300",
    role: "img",
    "aria-labelledby": "chart-title chart-description"
  });
  svg.append(
    makeSvgElement("title", { id: "chart-title" }, "임의 예시값을 사용한 검역자원 배분 그래프"),
    makeSvgElement("desc", { id: "chart-description" }, "선택 항만과 비교 항만의 막대 길이는 실제 분석 결과가 아닌 화면 예시입니다.")
  );

  const chartStart = 218;
  const trackWidth = 470;
  for (let index = 0; index <= 5; index += 1) {
    const x = chartStart + (trackWidth / 5) * index;
    svg.append(makeSvgElement("line", {
      x1: x,
      y1: 20,
      x2: x,
      y2: 278,
      class: "chart-gridline"
    }));
  }

  const portLabel = selectedPort
    ? shortenLabel(selectedPort.ko + " · " + selectedPort.en, 22)
    : "선택 항만";
  const rows = [
    { label: portLabel, value: scenario.exampleBars[0], selected: true },
    { label: "비교 항만 A", value: scenario.exampleBars[1], selected: false },
    { label: "비교 항만 B", value: scenario.exampleBars[2], selected: false },
    { label: "비교 항만 C", value: scenario.exampleBars[3], selected: false }
  ];

  rows.forEach((row, index) => {
    const y = 42 + index * 62;
    svg.append(
      makeSvgElement("text", { x: 8, y: y + 18, class: "chart-label" }, row.label),
      makeSvgElement("rect", { x: chartStart, y: y, width: trackWidth, height: 26, rx: 7, class: "chart-track" }),
      makeSvgElement("rect", {
        x: chartStart,
        y: y,
        width: (trackWidth * row.value) / 100,
        height: 26,
        rx: 7,
        class: row.selected ? "chart-bar-selected" : "chart-bar-other"
      })
    );
  });

  chart.append(svg);
}

function activateScenario(id) {
  const scenario = scenarios.find((item) => item.id === id) || scenarios[0];
  resultStep.textContent = scenario.step;
  resultTitle.textContent = scenario.name;
  resultExplanation.textContent = scenario.description;
  scenarioTabs.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scenario === scenario.id));
  });
  drawExampleChart(scenario);
}

const yearValid = Number.isInteger(selectedYear) && selectedYear >= 2010 && selectedYear <= 2026;
const monthValid = Number.isInteger(selectedMonth) && selectedMonth >= 1 && selectedMonth <= 12;
const volumeValid = Number.isFinite(selectedVolume) && selectedVolume >= 0 && selectedVolume <= 100000;

resultPeriod.textContent = yearValid && monthValid ? selectedYear + "년 " + selectedMonth + "월" : "선택 정보 없음";
resultPort.textContent = textForPort(selectedPort);
resultCountry.textContent = selectedPort
  ? (resultCountryNames[selectedPort.country] || selectedPort.country)
  : "국가 정보 없음";
resultVolume.textContent = volumeValid ? selectedVolume.toLocaleString("ko-KR") + " TEU" : "입력 정보 없음";

scenarioTabs.forEach((button) => {
  button.addEventListener("click", () => activateScenario(button.dataset.scenario));
});

activateScenario(selectedScenario);
