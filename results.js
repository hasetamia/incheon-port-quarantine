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
    name: "생태위협 우선",
    description: "외래종 위험을 상대적으로 우선 반영하도록 설계한 시나리오입니다."
  },
  {
    id: "balanced",
    name: "균형형",
    description: "생태위협과 물동량을 균형 있게 반영하도록 설계한 시나리오입니다."
  },
  {
    id: "volume",
    name: "물동량 우선",
    description: "물동량을 상대적으로 우선 반영하도록 설계한 시나리오입니다."
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

const resultTitle = document.getElementById("results-title");
const resultExplanation = document.getElementById("scenario-explanation");
const resultPeriod = document.getElementById("result-period");
const resultPort = document.getElementById("result-port");
const resultCountry = document.getElementById("result-country");
const resultVolume = document.getElementById("result-volume");
const scenarioTabs = Array.from(document.querySelectorAll(".scenario-tab"));

function textForPort(port) {
  return port ? port.en + " · " + port.ko : "항만 정보 없음";
}

function activateScenario(id) {
  const scenario = scenarios.find((item) => item.id === id) || scenarios[0];
  resultTitle.textContent = scenario.name;
  resultExplanation.textContent = scenario.description;
  scenarioTabs.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.scenario === scenario.id));
  });
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
