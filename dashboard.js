(() => {
  const sidebar = document.querySelector(".dashboard-sidebar");
  const links = [...document.querySelectorAll(".sidebar-link")];
  const panels = [...document.querySelectorAll(".dashboard-panel")];

  document.querySelector(".mobile-sidebar-toggle")?.addEventListener("click", () => {
    sidebar?.classList.toggle("open");
  });

  function openView(view) {
    links.forEach((link) => link.classList.toggle("active", link.dataset.view === view));
    panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === view));
    const activeLink = links.find((link) => link.dataset.view === view);
    const title = activeLink?.textContent.trim().replace(/\d+$/, "") || "My Bizomedia Studio";
    const pageTitle = document.querySelector("[data-page-title]");
    if (pageTitle) pageTitle.textContent = title;
    sidebar?.classList.remove("open");
  }

  links.forEach((link) => link.addEventListener("click", () => openView(link.dataset.view)));
  document.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => openView(button.dataset.openView));
  });

  document.querySelectorAll("[data-approval-row]").forEach((row) => {
    row.querySelector(".approve")?.addEventListener("click", () => {
      const status = row.querySelector(".status-pill");
      if (status) {
        status.className = "status-pill approved";
        status.textContent = "Одобрено";
      }
      const actions = row.querySelector(".action-group");
      if (actions) actions.innerHTML = '<span style="color:#59e29c;font-size:11px">✓ Готово</span>';
    });

    row.querySelector(".reject")?.addEventListener("click", () => {
      const status = row.querySelector(".status-pill");
      if (status) {
        status.className = "status-pill draft";
        status.textContent = "За корекция";
      }
      const actions = row.querySelector(".action-group");
      if (actions) actions.innerHTML = '<span style="color:#b19cff;font-size:11px">Изпратено</span>';
    });
  });

  document.querySelectorAll(".connect-button:not(.connected)").forEach((button) => {
    button.addEventListener("click", () => {
      button.textContent = "Demo: API setup";
      setTimeout(() => { button.textContent = "Свържи"; }, 1500);
    });
  });

  function getCachedProfile() {
    return {
      full_name: localStorage.getItem("bizomedia-user-name") || "Клиент",
      business_name: localStorage.getItem("bizomedia-user-business") || "Моят бизнес",
      preferred_language: localStorage.getItem("bizomedia-language") || "bg",
      primary_channel: "Instagram"
    };
  }

  function renderProfile(profile, email = "") {
    const fullName = profile.full_name || "Клиент";
    const businessName = profile.business_name || "Моят бизнес";
    const initials = fullName
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "К";

    document.querySelectorAll("[data-user-name]").forEach((element) => { element.textContent = fullName; });
    document.querySelectorAll("[data-user-business]").forEach((element) => { element.textContent = businessName; });
    document.querySelectorAll("[data-user-first]").forEach((element) => { element.textContent = fullName.split(/\s+/)[0]; });
    document.querySelectorAll("[data-user-initials]").forEach((element) => { element.textContent = initials; });

    const nameInput = document.querySelector("[data-settings-name]");
    const businessInput = document.querySelector("[data-settings-business]");
    const emailInput = document.querySelector("[data-settings-email]");
    const languageInput = document.querySelector("[data-settings-language]");
    const channelInput = document.querySelector("[data-settings-channel]");
    if (nameInput) nameInput.value = fullName;
    if (businessInput) businessInput.value = businessName;
    if (emailInput) emailInput.value = email || localStorage.getItem("bizomedia-user-email") || "";
    if (languageInput) languageInput.value = profile.preferred_language || "bg";
    if (channelInput) channelInput.value = profile.primary_channel || "Instagram";
  }

  let activeProfile = getCachedProfile();
  renderProfile(activeProfile);

  document.addEventListener("bizomedia:profile-ready", (event) => {
    activeProfile = { ...activeProfile, ...event.detail.profile };
    renderProfile(activeProfile, event.detail.user?.email || "");
  });

  if (localStorage.getItem("bizomedia-demo") === "1") {
    const demoProfile = {
      full_name: "Демо клиент",
      business_name: "Bizomedia Demo",
      preferred_language: "bg",
      primary_channel: "Instagram"
    };
    activeProfile = demoProfile;
    renderProfile(demoProfile, "demo@bizomedia.bg");
  }

  async function hydrateAuthenticatedProfile() {
    const auth = window.BizomediaAuth;
    if (!auth?.client) return;

    const { data, error } = await auth.client.auth.getSession();
    const user = data?.session?.user;
    if (error || !user) return;

    localStorage.removeItem("bizomedia-demo");
    const profile = await auth.loadProfile(user);
    activeProfile = { ...activeProfile, ...profile };
    renderProfile(activeProfile, user.email || "");
  }

  hydrateAuthenticatedProfile();

  const settingsMessage = document.querySelector("[data-settings-message]");
  document.querySelectorAll("[data-save-settings]").forEach((button) => {
    button.addEventListener("click", async () => {
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Запазване…";
      if (settingsMessage) {
        settingsMessage.textContent = "";
        settingsMessage.className = "settings-message";
      }

      const updates = {
        full_name: document.querySelector("[data-settings-name]")?.value.trim(),
        business_name: document.querySelector("[data-settings-business]")?.value.trim(),
        preferred_language: document.querySelector("[data-settings-language]")?.value,
        primary_channel: document.querySelector("[data-settings-channel]")?.value
      };

      try {
        if (localStorage.getItem("bizomedia-demo") === "1") {
          localStorage.setItem("bizomedia-user-name", updates.full_name || "Демо клиент");
          localStorage.setItem("bizomedia-user-business", updates.business_name || "Bizomedia Demo");
          activeProfile = { ...activeProfile, ...updates };
        } else {
          activeProfile = await window.BizomediaAuth.updateProfile(updates);
        }
        renderProfile(activeProfile);
        button.textContent = "Запазено ✓";
        if (settingsMessage) {
          settingsMessage.textContent = "Промените са запазени в твоя защитен профил.";
          settingsMessage.classList.add("success");
        }
      } catch (error) {
        button.textContent = originalText;
        if (settingsMessage) {
          settingsMessage.textContent = error?.message || "Промените не могат да бъдат запазени в момента.";
          settingsMessage.classList.add("error");
        }
      } finally {
        setTimeout(() => {
          button.disabled = false;
          if (button.textContent === "Запазено ✓") button.textContent = originalText;
        }, 1300);
      }
    });
  });
})();
