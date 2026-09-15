(() => {
  const buttons = document.querySelectorAll("[data-legal-lang]");
  const languageBlocks = document.querySelectorAll("[data-language]");

  function setLegalLanguage(language) {
    const selected = language === "en" ? "en" : "bg";
    document.documentElement.lang = selected;
    languageBlocks.forEach((block) => {
      block.hidden = block.dataset.language !== selected;
    });
    document.querySelectorAll("[data-bg][data-en]").forEach((element) => {
      element.textContent = selected === "en" ? element.dataset.en : element.dataset.bg;
    });
    buttons.forEach((button) => button.classList.toggle("active", button.dataset.legalLang === selected));
    document.title = selected === "en" ? document.body.dataset.titleEn : document.body.dataset.titleBg;
    localStorage.setItem("bizomedia-language", selected);
  }

  buttons.forEach((button) => button.addEventListener("click", () => setLegalLanguage(button.dataset.legalLang)));
  setLegalLanguage(localStorage.getItem("bizomedia-language") || "bg");
})();
