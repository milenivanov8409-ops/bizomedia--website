(() => {
  const auth = window.BizomediaAuth;
  const localHosts = new Set(["127.0.0.1", "localhost", ""]);
  const localDemo = localHosts.has(location.hostname)
    && (new URLSearchParams(location.search).get("demo") === "1" || localStorage.getItem("bizomedia-demo") === "1");

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function initials(value = "Клиент") {
    return String(value).split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "К";
  }

  function createMessageRow(message, outgoing, admin = false) {
    const row = document.createElement("div");
    row.className = admin ? `admin-message-row ${outgoing ? "out" : "in"}` : `message-row ${outgoing ? "out" : "in"}`;
    const bubble = document.createElement("div");
    bubble.className = admin ? "admin-message-bubble" : `bubble ${outgoing ? "out" : "in"}`;
    bubble.textContent = message.body;
    const time = document.createElement("time");
    time.className = admin ? "admin-message-time" : "message-time";
    time.dateTime = message.created_at;
    time.textContent = formatTime(message.created_at);
    if (admin && message.needs_review) {
      const flag = document.createElement("span");
      flag.className = "admin-message-review";
      flag.textContent = message.reviewed_at ? "ПРЕГЛЕДАНО" : "ИСКА ВНИМАНИЕ";
      time.append(flag);
    }
    row.append(bubble, time);
    return row;
  }

  function scrollToLatest(element) {
    requestAnimationFrame(() => { element.scrollTop = element.scrollHeight; });
  }

  function demoAssistantReply(prompt) {
    const normalized = prompt.toLocaleLowerCase("bg-BG");
    if (/цена|план|essential|growth|business/.test(normalized)) {
      return { body: "Плановете са Essential (€49/месец, 12 публикации), Growth (€99/месец, 20 публикации и управление на реклами) и Business (€199/месец, 30 публикации, визуална идентичност и приоритетна поддръжка). Рекламният бюджет се заплаща отделно.", needs_review: false, review_reason: null };
    }
    if (/календар|публикац|съдържание|одобр/.test(normalized)) {
      return { body: "Можеш да следиш планираните материали в „Календар“, а готовите публикации ще се появят в „Одобрения“. Оттам можеш да ги одобриш или да поискаш конкретна корекция.", needs_review: false, review_reason: null };
    }
    if (/човек|фактура|плащ|възстанов|договор|правен|сигурност|проблем/.test(normalized)) {
      return { body: "Разбирам. Отбелязах този казус за преглед от Bizomedia, защото изисква конкретна проверка. Междувременно можеш да ми дадеш още подробности тук.", needs_review: true, review_reason: "Казус за човешки преглед" };
    }
    return { body: "Разбрах. Мога да помогна с идеи за съдържание, календар, статус на публикации, услуги и планове. Кажи ми какъв резултат искаш да постигнеш и ще ти предложа следваща стъпка.", needs_review: false, review_reason: null };
  }

  function initClientAssistant() {
    const thread = document.querySelector("[data-client-message-thread]");
    const form = document.querySelector("[data-client-message-form]");
    if (!thread || !form) return;
    const status = document.querySelector("[data-client-message-status]");
    const preview = document.querySelector("[data-message-preview]");
    const unreadBadge = document.querySelector("[data-message-unread]");
    const refresh = document.querySelector("[data-message-refresh]");
    const messagesLink = document.querySelector('[data-view="messages"]');
    const input = form.elements.message;
    const submit = form.querySelector('button[type="submit"]');
    let userId = localDemo ? "demo-client" : "";
    let messages = localDemo ? [
      { id: "demo-ai-welcome", client_id: "demo-client", role: "assistant", sender_id: null, body: "Здравей! Аз съм Bizomedia AI. Мога да ти помогна с въпроси за съдържанието, календара, услугите и твоя план.", client_read_at: null, needs_review: false, reviewed_at: null, created_at: new Date(Date.now() - 60_000).toISOString() }
    ] : [];

    function setComposer(enabled) {
      input.disabled = !enabled;
      submit.disabled = !enabled;
    }

    function render() {
      thread.replaceChildren();
      if (!messages.length) {
        const empty = document.createElement("div");
        empty.className = "message-empty";
        empty.textContent = "Попитай Bizomedia AI за твоето съдържание, календар или план.";
        thread.append(empty);
      } else {
        messages.forEach((message) => thread.append(createMessageRow(message, message.role === "client")));
      }
      const unread = messages.filter((message) => message.role === "assistant" && !message.client_read_at).length;
      if (unreadBadge) {
        unreadBadge.textContent = String(unread);
        unreadBadge.hidden = unread === 0;
      }
      if (preview) preview.textContent = messages.at(-1)?.body || "Твоят асистент за съдържание и маркетинг.";
      scrollToLatest(thread);
    }

    async function markRead() {
      const unread = messages.filter((message) => message.role === "assistant" && !message.client_read_at);
      if (!unread.length) return;
      const readAt = new Date().toISOString();
      if (!localDemo) {
        const { error } = await auth.client.from("messages").update({ client_read_at: readAt }).eq("client_id", userId).eq("role", "assistant").is("client_read_at", null);
        if (error) return;
      }
      unread.forEach((message) => { message.client_read_at = readAt; });
      render();
    }

    async function load(markAsRead = false) {
      setComposer(false);
      status.textContent = "";
      if (localDemo) {
        render();
        setComposer(true);
        if (markAsRead) await markRead();
        return;
      }
      if (!auth?.client) return;
      const { data: sessionData } = await auth.client.auth.getSession();
      userId = sessionData?.session?.user?.id || "";
      if (!userId) return;
      const { data, error } = await auth.client.from("messages").select("id,client_id,role,sender_id,body,client_read_at,needs_review,reviewed_at,created_at").eq("client_id", userId).order("created_at", { ascending: true });
      if (error) {
        thread.replaceChildren();
        const empty = document.createElement("div");
        empty.className = "message-empty";
        empty.textContent = "Активирай AI асистента в Supabase, за да използваш разговора.";
        thread.append(empty);
        return;
      }
      messages = data || [];
      render();
      setComposer(true);
      if (markAsRead) await markRead();
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const body = input.value.trim();
      if (!body || !userId) return;
      setComposer(false);
      status.textContent = "Bizomedia AI подготвя отговор…";
      status.className = "message-form-status";
      try {
        let clientMessage;
        let assistantMessage;
        if (localDemo) {
          clientMessage = { id: `demo-client-${Date.now()}`, client_id: userId, role: "client", sender_id: userId, body, client_read_at: null, needs_review: false, reviewed_at: null, created_at: new Date().toISOString() };
          messages.push(clientMessage);
          input.value = "";
          render();
          await new Promise((resolve) => setTimeout(resolve, 650));
          const reply = demoAssistantReply(body);
          assistantMessage = { id: `demo-ai-${Date.now()}`, client_id: userId, role: "assistant", sender_id: null, ...reply, client_read_at: null, reviewed_at: null, created_at: new Date().toISOString() };
        } else {
          const { data: sessionData, error: sessionError } = await auth.client.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (sessionError || !token) throw new Error("Сесията е изтекла. Влез отново.");
          const response = await fetch("/api/assistant-chat", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ message: body }) });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || "AI асистентът временно не отговаря.");
          clientMessage = result.clientMessage;
          assistantMessage = result.assistantMessage;
          input.value = "";
        }
        if (!messages.some((message) => message.id === clientMessage.id)) messages.push(clientMessage);
        messages.push(assistantMessage);
        render();
        await markRead();
        status.textContent = assistantMessage.needs_review ? "Казусът е отбелязан за преглед от Bizomedia." : "";
        status.className = "message-form-status success";
      } catch (error) {
        status.textContent = error?.message || "Съобщението не може да бъде изпратено.";
      } finally {
        setComposer(true);
        input.focus();
      }
    });
    messagesLink?.addEventListener("click", () => load(true));
    refresh?.addEventListener("click", () => load(true));
    load(false);
  }

  function initAdminReview() {
    const dialog = document.querySelector("[data-admin-messages-dialog]");
    if (!dialog) return;
    const openButton = document.querySelector("[data-open-admin-messages]");
    const closeButton = document.querySelector("[data-close-admin-messages]");
    const refresh = document.querySelector("[data-admin-message-refresh]");
    const markReviewed = document.querySelector("[data-mark-admin-reviewed]");
    const clientsList = document.querySelector("[data-admin-message-clients]");
    const thread = document.querySelector("[data-admin-message-thread]");
    const business = document.querySelector("[data-admin-message-business]");
    const clientName = document.querySelector("[data-admin-message-client]");
    const badge = document.querySelector("[data-admin-message-count]");
    const status = document.querySelector("[data-admin-message-status]");
    let selectedClientId = "";
    let profiles = [];
    let messages = [];
    const demoProfiles = [
      { id: "client-a", full_name: "Мария Николова", business_name: "Urban Café" },
      { id: "client-b", full_name: "Иван Петров", business_name: "FitZone" },
      { id: "client-c", full_name: "Стефан Димов", business_name: "Next Level" }
    ];
    const demoMessages = [
      { id: "demo-client-a", client_id: "client-a", role: "client", sender_id: "client-a", body: "Искам човек да провери защо фактурата ми е различна.", needs_review: false, reviewed_at: null, created_at: new Date(Date.now() - 5_600_000).toISOString() },
      { id: "demo-ai-a", client_id: "client-a", role: "assistant", sender_id: null, body: "Отбелязах въпроса за преглед от Bizomedia, защото е свързан с конкретно плащане.", needs_review: true, review_reason: "Фактура и плащане", reviewed_at: null, created_at: new Date(Date.now() - 5_500_000).toISOString() },
      { id: "demo-client-b", client_id: "client-b", role: "client", sender_id: "client-b", body: "Къде мога да одобря публикациите?", needs_review: false, reviewed_at: null, created_at: new Date(Date.now() - 86_400_000).toISOString() },
      { id: "demo-ai-b", client_id: "client-b", role: "assistant", sender_id: null, body: "Готовите материали са в секция „Одобрения“, откъдето можеш да ги одобриш или да поискаш корекция.", needs_review: false, reviewed_at: null, created_at: new Date(Date.now() - 86_300_000).toISOString() }
    ];
    const selectedProfile = () => profiles.find((profile) => profile.id === selectedClientId);
    const pendingFor = (clientId) => messages.filter((message) => message.client_id === clientId && message.needs_review && !message.reviewed_at).length;

    function renderThread() {
      const profile = selectedProfile();
      thread.replaceChildren();
      if (!profile) {
        business.textContent = "Избери клиент";
        clientName.textContent = "AI разговорът ще се покаже тук.";
        const empty = document.createElement("div");
        empty.className = "admin-message-empty";
        empty.textContent = "Все още няма избран разговор.";
        thread.append(empty);
        markReviewed.disabled = true;
        return;
      }
      business.textContent = profile.business_name || "Моят бизнес";
      clientName.textContent = `${profile.full_name || "Клиент"} · Bizomedia AI`;
      const history = messages.filter((message) => message.client_id === selectedClientId);
      if (!history.length) {
        const empty = document.createElement("div");
        empty.className = "admin-message-empty";
        empty.textContent = "Този клиент все още няма разговор с AI.";
        thread.append(empty);
      } else {
        history.forEach((message) => thread.append(createMessageRow(message, message.role === "assistant", true)));
      }
      markReviewed.disabled = pendingFor(selectedClientId) === 0;
      scrollToLatest(thread);
    }

    function renderClients() {
      clientsList.replaceChildren();
      profiles.forEach((profile) => {
        const history = messages.filter((message) => message.client_id === profile.id);
        const latest = history.at(-1);
        const pending = pendingFor(profile.id);
        const button = document.createElement("button");
        button.type = "button";
        button.className = `admin-message-client-button${profile.id === selectedClientId ? " active" : ""}`;
        button.dataset.messageClient = profile.id;
        const avatar = document.createElement("span");
        avatar.className = "admin-message-client-avatar";
        avatar.textContent = initials(profile.business_name || profile.full_name);
        const copy = document.createElement("span");
        copy.className = "admin-message-client-copy";
        const name = document.createElement("strong");
        name.textContent = profile.business_name || "Моят бизнес";
        const snippet = document.createElement("small");
        snippet.textContent = latest?.body || "Няма AI разговор";
        copy.append(name, snippet);
        button.append(avatar, copy);
        if (pending) {
          const count = document.createElement("i");
          count.className = "admin-message-unread";
          count.textContent = String(pending);
          button.append(count);
        }
        clientsList.append(button);
      });
      const total = profiles.reduce((sum, profile) => sum + pendingFor(profile.id), 0);
      badge.textContent = String(total);
      badge.hidden = total === 0;
      renderThread();
    }

    async function load() {
      status.textContent = "";
      if (localDemo) {
        profiles = demoProfiles;
        messages = demoMessages;
      } else {
        if (!auth?.client) return;
        const { data: userData } = await auth.client.auth.getUser();
        const role = userData?.user?.app_metadata?.bizomedia_role;
        if (!new Set(["admin", "editor"]).has(role)) return;
        const [profileResult, messageResult] = await Promise.all([
          auth.client.from("profiles").select("id,full_name,business_name").order("business_name", { ascending: true }),
          auth.client.from("messages").select("id,client_id,role,sender_id,body,needs_review,review_reason,reviewed_at,created_at").order("created_at", { ascending: true })
        ]);
        if (profileResult.error || messageResult.error) {
          clientsList.replaceChildren();
          const empty = document.createElement("div");
          empty.className = "admin-message-empty";
          empty.textContent = "Активирай supabase-messages.sql, за да виждаш AI разговорите.";
          clientsList.append(empty);
          return;
        }
        profiles = profileResult.data || [];
        messages = messageResult.data || [];
      }
      if (!selectedClientId || !profiles.some((profile) => profile.id === selectedClientId)) selectedClientId = profiles.find((profile) => pendingFor(profile.id))?.id || profiles[0]?.id || "";
      renderClients();
    }

    async function reviewSelected() {
      if (!selectedClientId || !pendingFor(selectedClientId)) return;
      const reviewedAt = new Date().toISOString();
      markReviewed.disabled = true;
      try {
        if (!localDemo) {
          const { error } = await auth.client.from("messages").update({ reviewed_at: reviewedAt }).eq("client_id", selectedClientId).eq("needs_review", true).is("reviewed_at", null);
          if (error) throw error;
        }
        messages.filter((message) => message.client_id === selectedClientId && message.needs_review && !message.reviewed_at).forEach((message) => { message.reviewed_at = reviewedAt; });
        status.textContent = "Казусът е маркиран като прегледан.";
        status.className = "admin-message-status success";
        renderClients();
      } catch (error) {
        status.textContent = error?.message || "Статусът не може да бъде променен.";
        markReviewed.disabled = false;
      }
    }

    function close() {
      if (dialog.open) dialog.close();
      openButton.classList.remove("active");
      status.textContent = "";
    }
    openButton.addEventListener("click", async () => {
      document.querySelectorAll("[data-admin-filter]").forEach((button) => button.classList.remove("active"));
      openButton.classList.add("active");
      document.querySelector(".admin-sidebar")?.classList.remove("open");
      dialog.showModal();
      await load();
    });
    closeButton.addEventListener("click", close);
    dialog.addEventListener("click", (event) => { if (event.target === dialog) close(); });
    refresh.addEventListener("click", load);
    markReviewed.addEventListener("click", reviewSelected);
    clientsList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-message-client]");
      if (!button) return;
      selectedClientId = button.dataset.messageClient;
      status.textContent = "";
      renderClients();
    });
    load();
  }

  initClientAssistant();
  initAdminReview();
})();
