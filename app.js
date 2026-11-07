const scenarioContent = {
  ecology: {
    name: "생태위험 우선",
    formula: "√V × R",
    description: "외래종 위험도 변화에 더 민감한 관점입니다.",
  },
  balanced: {
    name: "균형형",
    formula: "V × R",
    description: "물동량과 외래종 위험도를 같은 지수로 반영합니다.",
  },
  volume: {
    name: "물동량 우선",
    formula: "V × √R",
    description: "공컨테이너 물동량 변화에 더 민감한 관점입니다.",
  },
};

const scenarioCards = [...document.querySelectorAll(".scenario-card")];
const selectedName = document.querySelector("#selected-scenario-name");
const selectedFormula = document.querySelector("#selected-scenario-formula");
const selectedDescription = document.querySelector("#selected-scenario-description");

function selectScenario(key) {
  const scenario = scenarioContent[key];
  if (!scenario) return;

  scenarioCards.forEach((card) => {
    const isSelected = card.dataset.scenario === key;
    card.classList.toggle("is-selected", isSelected);
    card.setAttribute("aria-pressed", String(isSelected));
  });

  selectedName.textContent = scenario.name;
  selectedFormula.textContent = scenario.formula;
  selectedDescription.textContent = scenario.description;
}

scenarioCards.forEach((card) => {
  card.addEventListener("click", () => selectScenario(card.dataset.scenario));
});

const navItems = [...document.querySelectorAll(".nav-item")];
const navTriggers = [...document.querySelectorAll(".nav-trigger")];

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
