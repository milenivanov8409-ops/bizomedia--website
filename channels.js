(() => {
  const grid = document.querySelector("[data-channel-grid]");
  const summary = document.querySelector("[data-channel-summary]");
  const mode = document.querySelector("[data-channel-mode]");
  const dialog = document.querySelector("[data-channel-dialog]");
  const form = document.querySelector("[data-channel-form]");
  if (!grid || !summary || !dialog || !form) return;

  const providers = [
    { id: "Instagram", label: "Instagram", icon: "◎", className: "instagram", identifierLabel: "ПОТРЕБИТЕЛСКО ИМЕ", placeholder: "Например: @bizomedia", detail: "Публикации, Reels и Stories" },
    { id: "Facebook", label: "Facebook", icon: "f", className: "facebook", identifierLabel: "СТРАНИЦА ИЛИ URL", placeholder: "Например: facebook.com/bizomedia", detail: "Страница, публикации и Meta кампании" },
    { id: "LinkedIn", label: "LinkedIn", icon: "in", className: "linkedin", identifierLabel: "СТРАНИЦА ИЛИ URL", placeholder: "Например: linkedin.com/company/bizomedia", detail: "Фирмена страница и професионално съдържание" },
    { id: "X", label: "X", icon: "X", className: "x", identifierLabel: "ПОТРЕБИТЕЛСКО ИМЕ", placeholder: "Например: @bizomedia", detail: "Кратки публикации и новини" },
    { id: "TikTok", label: "TikTok", icon: "♪", className: "tiktok", identifierLabel: "ПОТРЕБИТЕЛСКО ИМЕ", placeholder: "Например: @bizomedia", detail: "Кратки видеа и съдържателен график" },
    { id: "Google Ads", label: "Google Ads", icon: "G", className: "google", identifierLabel: "CUSTOMER ID", placeholder: "Например: 123-456-7890", detail: "Search, Display и Performance Max" },
    { id: "Email", label: "Email Marketing", icon: "✉", className: "email", identifierLabel: "ИМЕЙЛ ИЛИ ПЛАТФОРМА", placeholder: "Например: hello@business.com / Mailchimp", detail: "Кампании, бюлетини и автоматизации" }
  ];
  const statusMeta = {
    requested: { label: "Заявено", button: "Редактирай", className: "requested" },
    connected: { label: "Свързан", button: "Управлявай", className: "connected" },
    action_required: { label: "Нужно действие", button: "Провери", className: "action-required" },
    disconnected: { label: "Не е свързан", button: "Добави", className: "" }
  };
  const demoKey = "bizomedia-demo-channel-connections-v1";
  let connections = [];
  let activeProvider = null;

  const isDemo = () => localStorage.getItem("bizomedia-demo") === "1" || new URLSearchParams(location.search).get("demo") === "1";
  const byProvider = (provider) => connections.find((item) => item.provider === provider);
  const number = (value) => new Intl.NumberFormat("bg-BG", { notation: Number(value) >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(Number(value) || 0);

  function demoConnections() {
    try {
      const cached = JSON.parse(localStorage.getItem(demoKey) || "null");
      if (Array.isArray(cached)) return cached;
    } catch (_) {
      // Rebuild a clean local preview when its cache is invalid.
    }
    const initial = [
      { id: "demo-instagram", provider: "Instagram", account_name: "Bizomedia Studio", account_identifier: "@bizomedia", status: "connected", posts_synced: 12, reach_30d: 48200, last_synced_at: new Date().toISOString() },
      { id: "demo-facebook", provider: "Facebook", account_name: "Bizomedia Studio", account_identifier: "facebook.com/bizomedia", status: "requested", posts_synced: 0, reach_30d: 0, last_synced_at: null }
    ];
    localStorage.setItem(demoKey, JSON.stringify(initial));
    return initial;
  }

  function text(tag, value, className = "") {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    return element;
  }

  function renderSummary() {
    summary.replaceChildren();
    const connected = connections.filter((item) => item.status === "connected").length;
    const requested = connections.filter((item) => item.status === "requested" || item.status === "action_required").length;
    const published = connections.reduce((total, item) => total + (Number(item.posts_synced) || 0), 0);
    [["Свързани", connected], ["Чакат потвърждение", requested], ["Синхронизирани публикации", published]].forEach(([label, value]) => {
      const card = document.createElement("article");
      card.className = "channel-summary-card";
      card.append(text("span", label), text("strong", String(value)));
      summary.append(card);
    });
  }

  function renderCard(provider) {
    const connection = byProvider(provider.id);
    const state = statusMeta[connection?.status] || statusMeta.disconnected;
    const card = document.createElement("article");
    card.className = "channel-card";
    card.dataset.provider = provider.id;

    const head = document.createElement("div");
    head.className = "channel-card-head";
    const logo = text("div", provider.icon, `platform-logo ${provider.className}`);
    const identity = document.createElement("div");
    identity.append(text("strong", provider.label), text("span", connection?.account_identifier || "Не е добавен профил"));
    const badge = text("i", state.label, `channel-state-label ${state.className}`.trim());
    head.append(logo, identity, badge);

    const detail = text("p", connection?.account_name || provider.detail, "channel-detail");
    const metrics = document.createElement("div");
    metrics.className = "channel-meta";
    const metricOne = document.createElement("div");
    const metricTwo = document.createElement("div");
    metricOne.append(text("span", provider.id === "Google Ads" ? "Кампании" : "Публикации"), text("strong", connection?.status === "connected" ? number(connection.posts_synced) : "—", connection?.status === "connected" ? "" : "empty"));
    metricTwo.append(text("span", provider.id === "Google Ads" ? "Конверсии" : "Reach · 30 дни"), text("strong", connection?.status === "connected" ? number(connection.reach_30d) : "—", connection?.status === "connected" ? "" : "empty"));
    metrics.append(metricOne, metricTwo);

    const button = text("button", state.button, `connect-button ${state.className}`.trim());
    button.type = "button";
    button.addEventListener("click", () => openDialog(provider.id));
    card.append(head, detail, metrics, button);
    return card;
  }

  function render() {
    renderSummary();
    grid.replaceChildren(...providers.map(renderCard));
    mode.textContent = isDemo() ? "Локален демо режим" : "Защитени връзки";
  }

  function setMessage(message = "", type = "") {
    const element = dialog.querySelector("[data-channel-message]");
    if (!element) return;
    element.textContent = message;
    element.className = `post-form-message ${type}`.trim();
  }

  function openDialog(providerId) {
    activeProvider = providers.find((item) => item.id === providerId);
    if (!activeProvider) return;
    const connection = byProvider(providerId);
    const state = statusMeta[connection?.status] || statusMeta.disconnected;
    const logo = dialog.querySelector("[data-channel-dialog-icon]");
    logo.textContent = activeProvider.icon;
    logo.className = `platform-logo ${activeProvider.className}`;
    dialog.querySelector("[data-channel-dialog-provider]").textContent = activeProvider.label;
    dialog.querySelector("[data-channel-dialog-state]").textContent = state.label;
    dialog.querySelector("[data-channel-dialog-title]").textContent = connection ? `Управлявай ${activeProvider.label}` : `Добави ${activeProvider.label}`;
    dialog.querySelector("[data-channel-dialog-copy]").textContent = connection ? "Провери или промени данните за този канал." : "Добави профила, който искаш да управляваме.";
    dialog.querySelector("[data-channel-identifier-label]").textContent = activeProvider.identifierLabel;
    form.elements.accountName.value = connection?.account_name || "";
    form.elements.accountIdentifier.value = connection?.account_identifier || "";
    form.elements.accountIdentifier.placeholder = activeProvider.placeholder;
    dialog.querySelector("[data-save-channel]").textContent = connection ? "Запази промените" : "Добави канала";
    dialog.querySelector("[data-remove-channel]").hidden = !connection;
    setMessage();
    dialog.showModal();
  }

  function closeDialog() {
    if (dialog.open) dialog.close();
    activeProvider = null;
    setMessage();
  }

  async function load() {
    if (isDemo()) {
      connections = demoConnections();
      render();
      return;
    }
    const auth = window.BizomediaAuth;
    if (!auth?.client) return;
    const { data: sessionData } = await auth.client.auth.getSession();
    if (!sessionData.session?.user) return;
    const { data, error } = await auth.client
      .from("channel_connections")
      .select("id,provider,account_name,account_identifier,status,posts_synced,reach_30d,last_synced_at,updated_at")
      .order("created_at", { ascending: true });
    if (error) {
      grid.replaceChildren(text("div", "Каналите ще станат активни след добавяне на базата данни.", "channel-loading"));
      mode.textContent = "Необходима настройка";
      return;
    }
    connections = data || [];
    render();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeProvider) return;
    const accountName = form.elements.accountName.value.trim();
    const accountIdentifier = form.elements.accountIdentifier.value.trim();
    if (!accountName || !accountIdentifier) return setMessage("Попълни и двете полета.", "error");
    const button = dialog.querySelector("[data-save-channel]");
    button.disabled = true;
    button.textContent = "Запазваме…";
    try {
      const existing = byProvider(activeProvider.id);
      if (isDemo()) {
        const next = { id: existing?.id || `demo-${Date.now()}`, provider: activeProvider.id, account_name: accountName, account_identifier: accountIdentifier, status: existing?.status === "connected" ? "connected" : "requested", posts_synced: existing?.posts_synced || 0, reach_30d: existing?.reach_30d || 0, last_synced_at: existing?.last_synced_at || null };
        connections = existing ? connections.map((item) => item.provider === activeProvider.id ? next : item) : [...connections, next];
        localStorage.setItem(demoKey, JSON.stringify(connections));
      } else {
        const auth = window.BizomediaAuth;
        const { data: sessionData, error: sessionError } = await auth.client.auth.getSession();
        const user = sessionData?.session?.user;
        if (sessionError || !user) throw new Error("Сесията е изтекла. Влез отново.");
        const payload = { account_name: accountName, account_identifier: accountIdentifier };
        const query = existing
          ? auth.client.from("channel_connections").update(payload).eq("id", existing.id)
          : auth.client.from("channel_connections").insert({ ...payload, user_id: user.id, provider: activeProvider.id });
        const { error } = await query;
        if (error) throw error;
        await load();
      }
      render();
      closeDialog();
    } catch (error) {
      setMessage(error?.message || "Каналът не може да бъде запазен в момента.", "error");
    } finally {
      button.disabled = false;
      button.textContent = byProvider(activeProvider?.id)?.id ? "Запази промените" : "Добави канала";
    }
  });

  dialog.querySelector("[data-remove-channel]")?.addEventListener("click", async () => {
    if (!activeProvider) return;
    const existing = byProvider(activeProvider.id);
    if (!existing || !window.confirm(`Да премахнем ли ${activeProvider.label} от твоите канали?`)) return;
    try {
      if (isDemo()) {
        connections = connections.filter((item) => item.provider !== activeProvider.id);
        localStorage.setItem(demoKey, JSON.stringify(connections));
      } else {
        const { error } = await window.BizomediaAuth.client.from("channel_connections").delete().eq("id", existing.id);
        if (error) throw error;
        await load();
      }
      render();
      closeDialog();
    } catch (error) {
      setMessage(error?.message || "Каналът не може да бъде премахнат в момента.", "error");
    }
  });

  dialog.querySelector("[data-close-channel]")?.addEventListener("click", closeDialog);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeDialog(); });
  document.addEventListener("bizomedia:profile-ready", load, { once: true });
  load();
})();
