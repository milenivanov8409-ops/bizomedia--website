(() => {
  const copy = {
    bg: {
      account: "Вход / Регистрация",
      pill: "СЪДЪРЖАНИЕ · РЕКЛАМИ · ДИЗАЙН",
      hero1: "Твоят бранд",
      hero2: "Нашата стратегия",
      hero3: "Реални резултати",
      description: "Всичко необходимо за онлайн присъствието на бизнеса ти — планирано и управлявано вместо теб.",
      start: "Получи безплатен календар",
      seeProcess: "Как работи Bizomedia",
      earlyEyebrow: "ПЪРВИТЕ ИСТОРИИ ПРЕДСТОЯТ",
      earlyTitle: "Изграждаме първите си партньорства",
      earlyText: "Bizomedia е ново маркетинг студио. Скоро тук ще споделяме реални резултати и мнения от бизнесите, с които работим.",
      earlyCta: "Стани сред първите ни партньори",
      storyTitle1: "Вдъхновена от нуждите",
      storyTitle2: "на малкия бизнес",
      storyP1: "Bizomedia е маркетинг студио от Варна, България, създадено, за да помага на малкия бизнес да расте онлайн.",
      storyP2: "Разбираме колко време и енергия са нужни за развитието на един бизнес. Затова поемаме стратегията, съдържанието, дизайна и рекламата, за да можеш да се фокусираш върху това, което правиш най-добре.",
      storyP3: "Всеки проект започва с безплатен 30-дневен календар — ясна посока за твоя бранд, преди да вземеш решение.",
      studioCalendar: "Календар",
      studioContent: "Съдържание",
      studioApprovals: "Одобрения",
      studioThisWeek: "ТАЗИ СЕДМИЦА",
      studioReadyTitle: "Съдържанието ти е готово",
      studioPostCount: "12 от 12 публикации",
      studioPostType: "Instagram публикация",
      studioToday: "Днес · 18:30",
      studioPostCaption: "Нова седмица, ново съдържание ✨",
      studioReady: "✓ ГОТОВО",
      studioReviewTitle: "Последен преглед",
      studioReviewText: "Визията, текстът и графикът са подготвени.",
      studioAutoPublish: "Автоматично публикуване",
      studioApprove: "Одобри публикацията",
      studioNext: "Следващи",
      studioMon: "Пон",
      studioTue: "Вто",
      studioWed: "Сря",
      studioThu: "Чет",
      studioOnSchedule: "Всичко е по план",
      phoneLocation: "Варна, България",
      phoneDay: "Ден 12/30",
      phoneLikes: "Харесано от 247 души",
      phoneCaption: "Съдържание, което работи за твоя бизнес ✨",
      phoneTags: "#маркетинг #социалнимрежи"
    },
    en: {
      account: "Login / Register",
      pill: "CONTENT · ADS · DESIGN",
      hero1: "Your brand",
      hero2: "Our strategy",
      hero3: "Real results",
      description: "Everything your business needs to succeed online — planned and managed for you.",
      start: "Get your free calendar",
      seeProcess: "How Bizomedia works",
      earlyEyebrow: "FIRST STORIES COMING SOON",
      earlyTitle: "We’re building our first partnerships",
      earlyText: "Bizomedia is a new marketing studio. Soon, this space will feature real results and honest feedback from the businesses we work with.",
      earlyCta: "Become one of our first partners",
      storyTitle1: "Inspired by the needs",
      storyTitle2: "of small business",
      storyP1: "Bizomedia is a marketing studio based in Varna, Bulgaria, created to help small businesses grow online.",
      storyP2: "We understand how much time and energy it takes to grow a business. That is why we handle strategy, content, design and advertising, so you can focus on what you do best.",
      storyP3: "Every project starts with a free 30-day calendar — a clear direction for your brand before you make a commitment.",
      studioCalendar: "Calendar",
      studioContent: "Content",
      studioApprovals: "Approvals",
      studioThisWeek: "THIS WEEK",
      studioReadyTitle: "Your content is ready",
      studioPostCount: "12 of 12 posts",
      studioPostType: "Instagram post",
      studioToday: "Today · 6:30 PM",
      studioPostCaption: "A new week, fresh content ✨",
      studioReady: "✓ READY",
      studioReviewTitle: "Final review",
      studioReviewText: "The visual, caption and schedule are ready.",
      studioAutoPublish: "Automatic publishing",
      studioApprove: "Approve post",
      studioNext: "Up next",
      studioMon: "Mon",
      studioTue: "Tue",
      studioWed: "Wed",
      studioThu: "Thu",
      studioOnSchedule: "Everything is on schedule",
      phoneLocation: "Varna, Bulgaria",
      phoneDay: "Day 12/30",
      phoneLikes: "Liked by 247 people",
      phoneCaption: "Content that works for your business ✨",
      phoneTags: "#marketing #socialmedia"
    }
  };

  function applyExtraLanguage(lang) {
    const selected = copy[lang] ? lang : "bg";
    document.querySelectorAll("[data-lang-key]").forEach((element) => {
      const value = copy[selected][element.dataset.langKey];
      if (value) element.textContent = value;
    });
  }

  document.querySelectorAll(".lang-btn").forEach((button) => {
    button.addEventListener("click", () => applyExtraLanguage(button.dataset.lang));
  });

  applyExtraLanguage(localStorage.getItem("bizomedia-language") || "bg");
})();
