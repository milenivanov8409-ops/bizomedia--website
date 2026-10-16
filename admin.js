(() => {
  const shell = document.querySelector("[data-admin-shell]");
  const gate = document.querySelector("[data-admin-gate]");
  const gateTitle = document.querySelector("[data-gate-title]");
  const gateMessage = document.querySelector("[data-gate-message]");
  const gateAction = document.querySelector("[data-gate-action]");
  const list = document.querySelector("[data-admin-list]");
  const searchInput = document.querySelector("[data-admin-search]");
  const statusSelect = document.querySelector("[data-admin-status]");
  const sidebar = document.querySelector(".admin-sidebar");
  const dialog = document.querySelector("[data-admin-dialog]");
  const form = document.querySelector("[data-admin-form]");
  const message = document.querySelector("[data-admin-message]");
  const generateButton = document.querySelector("[data-generate-ai]");
  const aiResult = document.querySelector("[data-ai-result]");
  const aiVisual = document.querySelector("[data-ai-visual]");
  const generateVisualButton = document.querySelector("[data-generate-visual]");
  const visualFileInput = document.querySelector("[data-visual-file]");
  const visualPreview = document.querySelector("[data-visual-preview]");
  const visualPlaceholder = document.querySelector("[data-visual-placeholder]");
  const visualImage = document.querySelector("[data-visual-image]");
  const visualDraft = document.querySelector("[data-visual-draft]");
  const removeVisualButton = document.querySelector("[data-remove-visual]");
  const planDialog = document.querySelector("[data-plan-dialog]");
  const planForm = document.querySelector("[data-plan-form]");
  const planClientSelect = document.querySelector("[data-plan-client]");
  const planMonthInput = document.querySelector("[data-plan-month]");
  const generatePlanButton = document.querySelector("[data-generate-plan]");
  const planResults = document.querySelector("[data-plan-results]");
  const planList = document.querySelector("[data-plan-list]");
  const planMessage = document.querySelector("[data-plan-message]");
  const savePlanButton = document.querySelector("[data-save-plan]");
  const auth = window.BizomediaAuth;
  const localHosts = new Set(["127.0.0.1", "localhost", ""]);
  const demoMode = localHosts.has(location.hostname) && new URLSearchParams(location.search).get("demo") === "1";

  const statusMeta = {
    draft: { label: "Чернова", rank: 8 },
    requested: { label: "Заявена", rank: 1 },
    in_progress: { label: "Подготвя се", rank: 2 },
    pending: { label: "За одобрение", rank: 3 },
    changes_requested: { label: "За корекция", rank: 0 },
    approved: { label: "Одобрена", rank: 4 },
    scheduled: { label: "Планирана", rank: 5 },
    published: { label: "Публикувана", rank: 6 },
    cancelled: { label: "Отказана", rank: 9 }
  };
  const channelMarks = { Instagram: "◎", Facebook: "f", LinkedIn: "in", X: "X", TikTok: "♪", "Google Ads": "G", Email: "@" };
  const terminalStatuses = new Set(["published", "cancelled"]);
  let posts = [];
  let profiles = new Map();
  let activeFilter = "all";
  let activePostId = "";
  let staffRole = "";
  let pendingVisual = null;
  let visualObjectUrl = "";
  let removeExistingVisual = false;
  let previewSequence = 0;
  let generatedPlan = [];

  function demoData() {
    const date = (days, hour) => {
      const value = new Date();
      value.setDate(value.getDate() + days);
      value.setHours(hour, 0, 0, 0);
      return value.toISOString();
    };
    profiles = new Map([
      ["client-a", { id: "client-a", full_name: "Мария Николова", business_name: "Urban Café", preferred_language: "bg", social_channels: ["Instagram", "Facebook"], primary_channel: "Instagram" }],
      ["client-b", { id: "client-b", full_name: "Иван Петров", business_name: "FitZone", preferred_language: "bg", social_channels: ["Instagram", "Facebook", "Email"], primary_channel: "Instagram" }],
      ["client-c", { id: "client-c", full_name: "Стефан Димов", business_name: "Next Level", preferred_language: "bg", social_channels: ["LinkedIn", "X"], primary_channel: "LinkedIn" }]
    ]);
    posts = [
      { id: "admin-demo-1", user_id: "client-a", title: "Лятна промоция", caption: "Представи новото лятно меню и покани хората да резервират маса.", channel: "Instagram", status: "requested", scheduled_at: date(3, 11), client_feedback: "", created_at: date(-1, 10) },
      { id: "admin-demo-2", user_id: "client-b", title: "Тренировка за начинаещи", caption: "Кратък полезен пост с три лесни упражнения за старт.", channel: "Facebook", status: "in_progress", scheduled_at: date(5, 18), client_feedback: "", created_at: date(-2, 12) },
      { id: "admin-demo-3", user_id: "client-c", title: "5 начина AI да спести време", caption: "Практични идеи за автоматизация с ясен призив за консултация.", channel: "LinkedIn", status: "pending", scheduled_at: date(7, 9), client_feedback: "", created_at: date(-3, 9) },
      { id: "admin-demo-4", user_id: "client-a", title: "Зад кулисите", caption: "Покажи екипа и подготовката преди отваряне.", channel: "Instagram", status: "changes_requested", scheduled_at: date(4, 8), client_feedback: "Искам да сменим първото изречение и да добавим работното време.", created_at: date(-4, 8) }
    ];
  }

  function showGate(title, text, actionText = "") {
    shell.hidden = true;
    gate.hidden = false;
    gateTitle.textContent = title;
    gateMessage.textContent = text;
    gateAction.hidden = !actionText;
    if (actionText) gateAction.textContent = actionText;
  }

  function showShell(userName = "Bizomedia", isDemo = false) {
    gate.hidden = true;
    shell.hidden = false;
    const initials = userName.split(/\s+/).filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "BI";
    document.querySelector("[data-admin-name]").textContent = userName;
    document.querySelector("[data-admin-initials]").textContent = initials;
    document.querySelector("[data-admin-mode]").textContent = isDemo ? "Локален демо режим" : "Защитен достъп";
  }

  function formatDate(value, withTime = false) {
    if (!value) return "Без дата";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Без дата";
    return new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) }).format(date);
  }

  function toLocalInput(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }

  function getProfile(post) {
    return profiles.get(post.user_id) || { full_name: "Клиент", business_name: "Непознат бизнес" };
  }

  function setText(selector, value) {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  }

  function updateMetrics() {
    const count = (status) => posts.filter((post) => post.status === status).length;
    const active = posts.filter((post) => !terminalStatuses.has(post.status)).length;
    setText("[data-metric-active]", active);
    setText("[data-metric-requested]", count("requested"));
    setText("[data-metric-progress]", count("in_progress"));
    setText("[data-metric-pending]", count("pending"));
    setText("[data-count-requested]", count("requested"));
    setText("[data-count-progress]", count("in_progress"));
    setText("[data-count-pending]", count("pending"));
    setText("[data-count-corrections]", count("changes_requested"));
  }

  function filteredPosts() {
    const query = searchInput.value.trim().toLocaleLowerCase("bg-BG");
    const selectedStatus = statusSelect.value;
    return posts
      .filter((post) => activeFilter === "all" || post.status === activeFilter)
      .filter((post) => selectedStatus === "all" || post.status === selectedStatus)
      .filter((post) => {
        if (!query) return true;
        const profile = getProfile(post);
        return [post.title, post.caption, post.channel, profile.full_name, profile.business_name]
          .some((value) => String(value || "").toLocaleLowerCase("bg-BG").includes(query));
      })
      .sort((a, b) => {
        const rankDifference = (statusMeta[a.status]?.rank ?? 99) - (statusMeta[b.status]?.rank ?? 99);
        return rankDifference || new Date(b.created_at) - new Date(a.created_at);
      });
  }

  function requestCard(post) {
    const profile = getProfile(post);
    const article = document.createElement("article");
    article.className = "admin-request";
    const title = document.createElement("div");
    title.className = "admin-request-title";
    const icon = document.createElement("span");
    icon.className = "admin-channel-icon";
    icon.textContent = channelMarks[post.channel] || "•";
    const titleText = document.createElement("div");
    const strong = document.createElement("strong");
    strong.textContent = post.title;
    const small = document.createElement("small");
    small.textContent = `${post.channel} · получена ${formatDate(post.created_at)}`;
    titleText.append(strong, small);
    title.append(icon, titleText);

    const client = document.createElement("div");
    client.className = "admin-client-name";
    const clientStrong = document.createElement("strong");
    clientStrong.textContent = profile.business_name || "Моят бизнес";
    const clientSmall = document.createElement("small");
    clientSmall.textContent = profile.full_name || "Клиент";
    client.append(clientStrong, clientSmall);

    const date = document.createElement("div");
    date.className = "admin-request-date";
    date.textContent = formatDate(post.scheduled_at, true);
    const status = document.createElement("span");
    status.className = `admin-status ${post.status}`;
    status.textContent = statusMeta[post.status]?.label || post.status;
    const open = document.createElement("button");
    open.className = "admin-open";
    open.type = "button";
    open.dataset.adminPost = post.id;
    open.textContent = "Отвори";
    article.append(title, client, date, status, open);
    return article;
  }

  function render() {
    updateMetrics();
    const visiblePosts = filteredPosts();
    const activeLabel = activeFilter === "all" ? "Всички заявки" : statusMeta[activeFilter]?.label || "Заявки";
    setText("[data-list-title]", activeLabel);
    setText("[data-list-summary]", visiblePosts.length === 1 ? "1 материал" : `${visiblePosts.length} материала`);
    list.replaceChildren();
    if (!visiblePosts.length) {
      const empty = document.createElement("div");
      empty.className = "admin-empty";
      empty.textContent = "Няма заявки, които отговарят на избрания филтър.";
      list.append(empty);
      return;
    }
    visiblePosts.forEach((post) => list.append(requestCard(post)));
  }

  function setVisualPreview(url = "", { draft = false } = {}) {
    if (visualObjectUrl) {
      URL.revokeObjectURL(visualObjectUrl);
      visualObjectUrl = "";
    }
    visualImage.hidden = !url;
    visualPlaceholder.hidden = Boolean(url);
    visualDraft.hidden = !url || !draft;
    removeVisualButton.hidden = !url;
    visualPreview.classList.toggle("is-empty", !url);
    visualPreview.classList.remove("is-loading");
    if (url) visualImage.src = url;
    else visualImage.removeAttribute("src");
  }

  async function loadExistingVisual(post) {
    const sequence = ++previewSequence;
    pendingVisual = null;
    removeExistingVisual = false;
    setVisualPreview();
    if (demoMode && post._demoVisualBlob) {
      const objectUrl = URL.createObjectURL(post._demoVisualBlob);
      setVisualPreview(objectUrl);
      visualObjectUrl = objectUrl;
      return;
    }
    if (!post.media_path && !post.media_url) return;
    visualPreview.classList.add("is-loading");
    try {
      let url = post.media_url || "";
      if (!demoMode && post.media_path && auth?.client) {
        const { data, error } = await auth.client.storage.from("post-media").createSignedUrl(post.media_path, 3600);
        if (error) throw error;
        url = data?.signedUrl || "";
      }
      if (sequence === previewSequence && activePostId === post.id) setVisualPreview(url);
    } catch {
      if (sequence === previewSequence) setVisualPreview();
    }
  }

  function openEditor(postId) {
    const post = posts.find((item) => item.id === postId);
    if (!post) return;
    const profile = getProfile(post);
    activePostId = post.id;
    form.elements.title.value = post.title || "";
    form.elements.channel.value = post.channel || "Instagram";
    form.elements.scheduledAt.value = toLocalInput(post.scheduled_at);
    form.elements.status.value = post.status || "requested";
    form.elements.caption.value = post.caption || "";
    form.elements.aiGoal.value = "engagement";
    form.elements.aiTone.value = "professional";
    form.elements.aiBrief.value = "";
    setText("[data-edit-heading]", post.title || "Публикация");
    setText("[data-edit-business]", profile.business_name || "Моят бизнес");
    setText("[data-edit-client]", profile.full_name || "Клиент");
    setText("[data-edit-client-initials]", (profile.business_name || "К").slice(0, 1).toUpperCase());
    const status = document.querySelector("[data-edit-current-status]");
    status.className = `admin-status ${post.status}`;
    status.textContent = statusMeta[post.status]?.label || post.status;
    const feedback = document.querySelector("[data-edit-feedback]");
    feedback.hidden = !post.client_feedback;
    setText("[data-edit-feedback-text]", post.client_feedback || "");
    message.textContent = "";
    message.className = "admin-form-message";
    aiResult.hidden = true;
    aiVisual.textContent = "";
    dialog.showModal();
    loadExistingVisual(post);
  }

  function closeEditor() {
    previewSequence += 1;
    pendingVisual = null;
    removeExistingVisual = false;
    setVisualPreview();
    activePostId = "";
    form.reset();
    message.textContent = "";
    if (dialog.open) dialog.close();
  }

  function demoGeneration({ businessName, channel, goal, tone, currentTitle, extraBrief }) {
    const goalLines = {
      engagement: "Сподели мнението си в коментар и запази публикацията за по-късно.",
      sales: "Пиши ни, за да получиш повече информация и персонално предложение.",
      awareness: "Последвай ни, за да виждаш още идеи и новини от нашия бранд.",
      education: "Запази тези насоки и ги използвай, когато планираш следващата си стъпка."
    };
    const toneOpeners = {
      professional: "Доброто съдържание започва с ясна идея и точна цел.",
      friendly: "Имаме нещо полезно, което искаме да споделим с теб.",
      confident: "Време е добрите идеи да носят видими резултати.",
      premium: "Всеки детайл има значение, когато изграждаш силно присъствие.",
      playful: "Готов ли си да превърнем една добра идея в страхотно съдържание?"
    };
    const cleanTitle = currentTitle || `${businessName}: нова идея за ${channel}`;
    const direction = extraBrief ? `\n\n${extraBrief}` : "";
    const hashtag = businessName.replace(/[^\p{L}\p{N}]+/gu, "");
    return {
      title: cleanTitle.slice(0, 120),
      caption: `${toneOpeners[tone]}\n\n${cleanTitle} — представено по ясен и полезен начин за аудиторията на ${businessName}.${direction}\n\n${goalLines[goal]}\n\n#${hashtag || "бизнес"} #съдържание #маркетинг`.slice(0, 1200),
      visualBrief: `Премиум продуктова композиция за ${businessName}, без хора, тъмен фон с cyan и violet акценти, подходяща за ${channel}.`
    };
  }

  function escapeSvg(value) {
    return String(value || "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[character]));
  }

  function demoVisual({ businessName, channel, title }) {
    const shortTitle = title.length > 48 ? `${title.slice(0, 45)}…` : title;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><defs><radialGradient id="a" cx="25%" cy="15%"><stop stop-color="#123c52"/><stop offset=".55" stop-color="#07131e"/><stop offset="1" stop-color="#03070d"/></radialGradient><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#22ead7"/><stop offset=".5" stop-color="#278dff"/><stop offset="1" stop-color="#8a4dff"/></linearGradient><filter id="g"><feGaussianBlur stdDeviation="35"/></filter></defs><rect width="1024" height="1024" rx="72" fill="url(#a)"/><circle cx="790" cy="190" r="210" fill="#713cff" opacity=".18" filter="url(#g)"/><circle cx="230" cy="790" r="260" fill="#11dccc" opacity=".15" filter="url(#g)"/><path d="M-60 760C220 600 410 920 1080 470" fill="none" stroke="url(#b)" stroke-width="4" opacity=".65"/><path d="M-60 800C260 620 500 930 1080 540" fill="none" stroke="#25dcd2" stroke-width="1.5" opacity=".26"/><rect x="92" y="84" width="840" height="856" rx="54" fill="#07111b" fill-opacity=".65" stroke="#79fff2" stroke-opacity=".16"/><g transform="translate(128 120)"><rect width="160" height="42" rx="21" fill="#0e2834" stroke="#2be0d0" stroke-opacity=".35"/><text x="80" y="27" fill="#78eee7" text-anchor="middle" font-family="Inter,Arial" font-size="15" font-weight="700">${escapeSvg(channel.toUpperCase())}</text></g><g transform="translate(128 490)"><text fill="#7feee8" font-family="Inter,Arial" font-size="24" font-weight="700" letter-spacing="3">${escapeSvg(businessName.toUpperCase())}</text><text y="78" fill="#fff" font-family="Inter,Arial" font-size="58" font-weight="800">${escapeSvg(shortTitle)}</text><rect y="126" width="250" height="8" rx="4" fill="url(#b)"/></g><g transform="translate(670 180)"><rect width="190" height="270" rx="38" fill="#0a1823" stroke="url(#b)" stroke-width="3"/><circle cx="95" cy="92" r="48" fill="none" stroke="#2be0d0" stroke-width="8"/><path d="M62 186h66M62 212h92" stroke="#8170ff" stroke-width="10" stroke-linecap="round"/></g><text x="128" y="874" fill="#718694" font-family="Inter,Arial" font-size="18">BIZOMEDIA AI · LOCAL PREVIEW</text></svg>`;
    return new Blob([svg], { type: "image/svg+xml" });
  }

  function base64ToBlob(base64, mimeType) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return new Blob([bytes], { type: mimeType });
  }

  function usePendingVisual(blob, source = "ai") {
    if (visualObjectUrl) URL.revokeObjectURL(visualObjectUrl);
    pendingVisual = { blob, mimeType: blob.type || "image/webp", source };
    removeExistingVisual = false;
    visualObjectUrl = URL.createObjectURL(blob);
    visualImage.hidden = false;
    visualImage.src = visualObjectUrl;
    visualPlaceholder.hidden = true;
    visualDraft.hidden = false;
    removeVisualButton.hidden = false;
    visualPreview.classList.remove("is-empty", "is-loading");
  }

  async function generateVisualWithAi() {
    const post = posts.find((item) => item.id === activePostId);
    if (!post) return;
    const generationPostId = post.id;
    const profile = getProfile(post);
    const payload = {
      businessName: profile.business_name || "Моят бизнес",
      channel: form.elements.channel.value,
      title: form.elements.title.value.trim(),
      caption: form.elements.caption.value.trim(),
      visualBrief: aiVisual.textContent.trim() || form.elements.aiBrief.value.trim()
    };
    if (!payload.title && !payload.visualBrief) {
      message.textContent = "Първо подготви текста или добави идея за визията.";
      return;
    }

    generateVisualButton.disabled = true;
    generateVisualButton.dataset.originalText ||= generateVisualButton.innerHTML;
    generateVisualButton.textContent = "AI рисува визията…";
    message.textContent = demoMode ? "Създаваме локална демо визия без кредити…" : "AI създава визуална чернова…";
    message.className = "admin-form-message ai-working";
    visualPreview.classList.add("is-loading");
    try {
      let blob;
      if (demoMode) {
        await new Promise((resolve) => setTimeout(resolve, 850));
        blob = demoVisual(payload);
      } else {
        const { data, error } = await auth.client.auth.getSession();
        const accessToken = data?.session?.access_token;
        if (error || !accessToken) throw new Error("Сесията е изтекла. Влез отново.");
        const response = await fetch("/api/generate-visual", {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "AI визията временно не може да бъде създадена.");
        blob = base64ToBlob(result.imageBase64, result.mimeType || "image/webp");
      }
      if (activePostId !== generationPostId || !dialog.open) return;
      usePendingVisual(blob);
      message.textContent = "AI визията е готова за преглед. Тя още не е запазена към публикацията.";
      message.className = "admin-form-message success";
    } catch (error) {
      visualPreview.classList.remove("is-loading");
      message.textContent = error?.message || "Визията не можа да бъде генерирана.";
      message.className = "admin-form-message";
    } finally {
      generateVisualButton.disabled = false;
      generateVisualButton.innerHTML = generateVisualButton.dataset.originalText;
    }
  }

  function chooseVisualFile(file) {
    const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
    if (!file || !allowedTypes.has(file.type)) {
      message.textContent = "Избери PNG, JPG или WebP изображение.";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      message.textContent = "Изображението трябва да бъде до 5 MB.";
      return;
    }
    usePendingVisual(file, "upload");
    message.textContent = "Файлът е готов за преглед и ще се качи при запазване.";
    message.className = "admin-form-message success";
  }

  async function generateWithAi() {
    const post = posts.find((item) => item.id === activePostId);
    if (!post) return;
    const generationPostId = post.id;
    const profile = getProfile(post);
    const payload = {
      businessName: profile.business_name || "Моят бизнес",
      channel: form.elements.channel.value,
      goal: form.elements.aiGoal.value,
      tone: form.elements.aiTone.value,
      language: profile.preferred_language === "en" ? "en" : "bg",
      currentTitle: form.elements.title.value.trim(),
      clientRequest: form.elements.caption.value.trim(),
      extraBrief: form.elements.aiBrief.value.trim()
    };
    if (!payload.currentTitle && !payload.clientRequest) {
      message.textContent = "Добави заглавие или кратко описание на желаното съдържание.";
      message.className = "admin-form-message";
      return;
    }

    generateButton.disabled = true;
    const workflowButtons = [...form.querySelectorAll(".admin-dialog-actions button")];
    workflowButtons.forEach((button) => { button.disabled = true; });
    generateButton.dataset.originalText ||= generateButton.innerHTML;
    generateButton.textContent = "AI подготвя съдържанието…";
    message.textContent = demoMode ? "Генерираме демо вариант без използване на кредити…" : "AI анализира заявката и подготвя текста…";
    message.className = "admin-form-message ai-working";
    try {
      let generated;
      if (demoMode) {
        await new Promise((resolve) => setTimeout(resolve, 700));
        generated = demoGeneration(payload);
      } else {
        const { data, error } = await auth.client.auth.getSession();
        const accessToken = data?.session?.access_token;
        if (error || !accessToken) throw new Error("Сесията е изтекла. Влез отново.");
        const response = await fetch("/api/generate-content", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "AI услугата временно не отговаря.");
        generated = result;
      }
      if (activePostId !== generationPostId || !dialog.open) return;
      form.elements.title.value = generated.title || payload.currentTitle;
      form.elements.caption.value = generated.caption || payload.clientRequest;
      aiVisual.textContent = generated.visualBrief || "";
      aiResult.hidden = !generated.visualBrief;
      message.textContent = "AI вариантът е готов. Прегледай го и го запази, когато си доволен.";
      message.className = "admin-form-message success";
      form.elements.title.focus();
    } catch (error) {
      message.textContent = error?.message || "Съдържанието не можа да бъде генерирано.";
      message.className = "admin-form-message";
    } finally {
      generateButton.disabled = false;
      generateButton.innerHTML = generateButton.dataset.originalText;
      workflowButtons.forEach((button) => { button.disabled = false; });
    }
  }

  async function savePost(forcedStatus = "") {
    const post = posts.find((item) => item.id === activePostId);
    if (!post) return;
    const nextStatus = forcedStatus || form.elements.status.value;
    const title = form.elements.title.value.trim();
    const caption = form.elements.caption.value.trim();
    if (!title) {
      message.textContent = "Добави заглавие на публикацията.";
      form.elements.title.focus();
      return;
    }
    if (nextStatus === "pending" && !caption) {
      message.textContent = "Добави готовия текст, преди да изпратиш публикацията за одобрение.";
      form.elements.caption.focus();
      return;
    }
    const scheduledValue = form.elements.scheduledAt.value;
    const updates = {
      title,
      caption,
      channel: form.elements.channel.value,
      status: nextStatus,
      scheduled_at: scheduledValue ? new Date(scheduledValue).toISOString() : null,
      client_feedback: nextStatus === "pending" ? "" : post.client_feedback || ""
    };
    let uploadedPath = "";
    const previousMediaPath = post.media_path || "";
    const buttons = [...dialog.querySelectorAll("button")];
    buttons.forEach((button) => { button.disabled = true; });
    message.textContent = "Запазване…";
    try {
      if (demoMode) {
        if (pendingVisual) {
          post._demoVisualBlob = pendingVisual.blob;
          updates.media_url = null;
        }
        if (removeExistingVisual) {
          delete post._demoVisualBlob;
          updates.media_url = null;
          updates.media_path = null;
        }
        Object.assign(post, updates, { updated_at: new Date().toISOString() });
      } else {
        if (pendingVisual) {
          const extension = pendingVisual.mimeType === "image/png" ? "png" : pendingVisual.mimeType === "image/jpeg" ? "jpg" : "webp";
          const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          uploadedPath = `${post.user_id}/ai/${post.id}-${uniqueId}.${extension}`;
          message.textContent = "Качваме одобрената визия…";
          const { error: uploadError } = await auth.client.storage.from("post-media").upload(uploadedPath, pendingVisual.blob, {
            contentType: pendingVisual.mimeType,
            upsert: false,
            cacheControl: "31536000"
          });
          if (uploadError) throw uploadError;
          updates.media_path = uploadedPath;
          updates.media_url = null;
        } else if (removeExistingVisual) {
          updates.media_path = null;
          updates.media_url = null;
        }
        const { data, error } = await auth.client
          .from("posts")
          .update(updates)
          .eq("id", post.id)
          .select("id,user_id,title,caption,channel,status,scheduled_at,media_url,media_path,reach,client_feedback,decision_at,created_at,updated_at")
          .single();
        if (error) throw error;
        Object.assign(post, data);
        if (previousMediaPath && previousMediaPath !== uploadedPath && staffRole === "admin") {
          auth.client.storage.from("post-media").remove([previousMediaPath]).catch(() => {});
        }
      }
      message.textContent = nextStatus === "pending" ? "Публикацията е изпратена за одобрение." : "Промените са запазени.";
      message.className = "admin-form-message success";
      render();
      setTimeout(closeEditor, 650);
    } catch (error) {
      if (uploadedPath && staffRole === "admin") auth.client.storage.from("post-media").remove([uploadedPath]).catch(() => {});
      message.textContent = error?.message || "Промените не могат да бъдат запазени.";
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  function defaultPlanMonth() {
    const date = new Date();
    date.setMonth(date.getMonth() + 1, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function populatePlanClients() {
    planClientSelect.replaceChildren();
    [...profiles.values()]
      .filter((profile) => profile.business_name)
      .sort((a, b) => a.business_name.localeCompare(b.business_name, "bg"))
      .forEach((profile) => {
        const option = document.createElement("option");
        option.value = profile.id;
        option.textContent = `${profile.business_name} · ${profile.full_name || "Клиент"}`;
        planClientSelect.append(option);
      });
  }

  function openPlanDialog() {
    populatePlanClients();
    if (!planClientSelect.options.length) {
      planMessage.textContent = "Няма клиентски профили, за които да създадем план.";
    } else {
      planMessage.textContent = "";
    }
    planMonthInput.value = defaultPlanMonth();
    generatedPlan = [];
    planList.replaceChildren();
    planResults.hidden = true;
    generatePlanButton.disabled = false;
    generatePlanButton.textContent = generatePlanButton.dataset.originalText || "✦ Създай месечен план";
    savePlanButton.disabled = true;
    savePlanButton.textContent = "Добави избраните към календара →";
    document.querySelector("[data-plan-toggle]").textContent = "Премахни избора";
    planDialog.showModal();
  }

  function closePlanDialog() {
    generatedPlan = [];
    planForm.reset();
    planList.replaceChildren();
    planResults.hidden = true;
    planMessage.textContent = "";
    generatePlanButton.disabled = false;
    generatePlanButton.textContent = generatePlanButton.dataset.originalText || "✦ Създай месечен план";
    savePlanButton.disabled = true;
    savePlanButton.textContent = "Добави избраните към календара →";
    if (planDialog.open) planDialog.close();
  }

  function dateFromPlanDay(month, day) {
    const [year, monthNumber] = month.split("-").map(Number);
    return new Date(year, monthNumber - 1, day, 10, 0, 0, 0).toISOString();
  }

  function demoMonthlyPlan({ businessName, channels, month, count, goal, brief }) {
    const [year, monthNumber] = month.split("-").map(Number);
    const totalDays = new Date(year, monthNumber, 0).getDate();
    const themes = [
      ["Полезен съвет", "Споделяме практична идея, която можеш да използваш още днес."],
      ["Как работим", "Показваме как добрата подготовка превръща една идея в ясен резултат."],
      ["Често задаван въпрос", "Отговаряме кратко и ясно на въпрос, който получаваме често."],
      ["Фокус върху услугата", "Представяме ползата от услугата по естествен и разбираем начин."],
      ["Мит или факт", "Разглеждаме популярно твърдение и даваме полезен, честен контекст."],
      ["Идея за тази седмица", "Малка стъпка, която може да направи голяма разлика за клиента."],
      ["Зад добрия резултат", "Разказваме за вниманието към детайла без измислени обещания."],
      ["Въпрос към аудиторията", "Каним хората да споделят своя опит и мнение в коментар."],
      ["Практичен списък", "Подреждаме най-важното в кратък списък, лесен за запазване."],
      ["Преди да избереш", "Даваме ясни ориентири, които помагат за информирано решение."],
      ["Тема на месеца", "Свързваме бранда с актуална сезонна тема по естествен начин."],
      ["Следващата стъпка", "Завършваме месеца с ясен и ненатрапчив призив за контакт."]
    ];
    return Array.from({ length: count }, (_, index) => {
      const [theme, body] = themes[index % themes.length];
      const day = Math.max(1, Math.min(totalDays, Math.round(((index + 1) * totalDays) / (count + 1))));
      const channel = channels[index % channels.length];
      const direction = brief ? ` Фокусът този месец е: ${brief}.` : "";
      return {
        title: `${theme} · ${businessName}`.slice(0, 120),
        caption: `${body}${direction}\n\nРазкажи ни какво е важно за теб.\n\n#${businessName.replace(/[^\p{L}\p{N}]+/gu, "")} #съдържание #бизнес`.slice(0, 1200),
        channel,
        day,
        visualBrief: `Премиум people-free композиция за ${businessName}, свързана с „${theme}", подходяща за ${channel}.`,
        selected: true,
        goal
      };
    });
  }

  function updatePlanSelection() {
    const selectedCount = generatedPlan.filter((item) => item.selected).length;
    savePlanButton.disabled = selectedCount === 0;
    savePlanButton.textContent = selectedCount ? `Добави ${selectedCount} към календара →` : "Избери поне една идея";
  }

  function renderGeneratedPlan() {
    planList.replaceChildren();
    const month = planMonthInput.value;
    generatedPlan.forEach((item, index) => {
      const card = document.createElement("label");
      card.className = "admin-plan-item";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.selected;
      checkbox.addEventListener("change", () => {
        item.selected = checkbox.checked;
        card.classList.toggle("is-unselected", !item.selected);
        updatePlanSelection();
      });
      const date = new Date(dateFromPlanDay(month, item.day));
      const dateLabel = new Intl.DateTimeFormat("bg-BG", { day: "numeric", month: "short", weekday: "short" }).format(date);
      const meta = document.createElement("div");
      meta.className = "admin-plan-item-meta";
      const channel = document.createElement("span");
      channel.textContent = `${channelMarks[item.channel] || "•"} ${item.channel}`;
      const scheduled = document.createElement("time");
      scheduled.textContent = dateLabel;
      meta.append(channel, scheduled);
      const title = document.createElement("strong");
      title.textContent = item.title;
      const caption = document.createElement("p");
      caption.textContent = item.caption;
      const visual = document.createElement("small");
      visual.textContent = `Визия: ${item.visualBrief}`;
      const content = document.createElement("div");
      content.append(meta, title, caption, visual);
      card.append(checkbox, content);
      planList.append(card);
    });
    planResults.hidden = false;
    updatePlanSelection();
  }

  async function generateMonthlyPlan() {
    const profile = profiles.get(planClientSelect.value);
    if (!profile || !planMonthInput.value) {
      planMessage.textContent = "Избери клиент и месец.";
      return;
    }
    const channels = Array.isArray(profile.social_channels) && profile.social_channels.length ? profile.social_channels : [profile.primary_channel || "Instagram"];
    const payload = {
      businessName: profile.business_name,
      language: profile.preferred_language === "en" ? "en" : "bg",
      channels,
      month: planMonthInput.value,
      count: Number(planForm.elements.planCount.value),
      goal: planForm.elements.planGoal.value,
      brief: planForm.elements.planBrief.value.trim()
    };
    generatePlanButton.disabled = true;
    generatePlanButton.dataset.originalText ||= generatePlanButton.textContent;
    generatePlanButton.textContent = "AI подготвя календара…";
    planMessage.textContent = demoMode ? "Създаваме локален план без използване на кредити…" : "AI анализира каналите и разпределя темите…";
    planMessage.className = "admin-plan-message working";
    try {
      let items;
      if (demoMode) {
        await new Promise((resolve) => setTimeout(resolve, 850));
        items = demoMonthlyPlan(payload);
      } else {
        const { data, error } = await auth.client.auth.getSession();
        const accessToken = data?.session?.access_token;
        if (error || !accessToken) throw new Error("Сесията е изтекла. Влез отново.");
        const response = await fetch("/api/generate-plan", { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "AI планерът временно не отговаря.");
        items = result.items;
      }
      generatedPlan = items.map((item) => ({ ...item, selected: true }));
      renderGeneratedPlan();
      planMessage.textContent = "Планът е готов. Прегледай идеите и избери кои да добавим.";
      planMessage.className = "admin-plan-message success";
    } catch (error) {
      planMessage.textContent = error?.message || "Месечният план не можа да бъде създаден.";
      planMessage.className = "admin-plan-message";
    } finally {
      generatePlanButton.disabled = false;
      generatePlanButton.textContent = generatePlanButton.dataset.originalText;
    }
  }

  async function saveMonthlyPlan(event) {
    event.preventDefault();
    const profile = profiles.get(planClientSelect.value);
    const selected = generatedPlan.filter((item) => item.selected);
    if (!profile || !selected.length) return;
    const month = planMonthInput.value;
    const rows = selected.map((item) => ({ user_id: profile.id, title: item.title, caption: item.caption, channel: item.channel, status: "in_progress", scheduled_at: dateFromPlanDay(month, item.day) }));
    savePlanButton.disabled = true;
    generatePlanButton.disabled = true;
    planMessage.textContent = "Добавяме избраните идеи към календара…";
    try {
      let created;
      if (demoMode) {
        created = rows.map((row) => ({ ...row, id: `plan-${crypto.randomUUID()}`, reach: 0, client_feedback: "", created_at: new Date().toISOString(), updated_at: new Date().toISOString() }));
      } else {
        const { data, error } = await auth.client.from("posts").insert(rows).select("id,user_id,title,caption,channel,status,scheduled_at,media_url,media_path,reach,client_feedback,decision_at,created_at,updated_at");
        if (error) throw error;
        created = data || [];
      }
      posts.push(...created);
      render();
      planMessage.textContent = `${created.length} публикации са добавени към календара за подготовка.`;
      planMessage.className = "admin-plan-message success";
      setTimeout(closePlanDialog, 850);
    } catch (error) {
      planMessage.textContent = error?.message || "Планът не може да бъде добавен към календара.";
      planMessage.className = "admin-plan-message";
      savePlanButton.disabled = false;
      generatePlanButton.disabled = false;
    }
  }

  async function loadData() {
    if (demoMode) {
      demoData();
      showShell("Bizomedia Team", true);
      populatePlanClients();
      render();
      return;
    }
    if (!auth?.client) {
      showGate("Панелът не е свързан", "Липсва конфигурация за защитен достъп.", "Към входа");
      return;
    }
    const { data: userData, error: userError } = await auth.client.auth.getUser();
    const user = userData?.user;
    if (userError || !user) {
      showGate("Необходим е вход", "Влез със своя Bizomedia администраторски профил.", "Към входа");
      return;
    }
    const role = user.app_metadata?.bizomedia_role;
    if (!new Set(["admin", "editor"]).has(role)) {
      showGate("Нямаш администраторски достъп", "Този екран е достъпен само за екипа на Bizomedia.", "Към клиентския профил");
      gateAction.href = "dashboard.html";
      return;
    }
    staffRole = role;
    showShell(user.user_metadata?.full_name || user.email?.split("@")[0] || "Bizomedia Team");
    list.innerHTML = '<div class="admin-empty">Зареждаме клиентските заявки…</div>';
    const { data: postData, error: postError } = await auth.client
      .from("posts")
      .select("id,user_id,title,caption,channel,status,scheduled_at,media_url,media_path,reach,client_feedback,decision_at,created_at,updated_at")
      .order("created_at", { ascending: false });
    if (postError) {
      list.innerHTML = '<div class="admin-empty">Активирай локалната миграция за администраторски достъп, преди да използваш панела.</div>';
      return;
    }
    posts = postData || [];
    const { data: profileData, error: profileError } = await auth.client
      .from("profiles")
      .select("id,full_name,business_name,preferred_language,primary_channel,social_channels,logo_path,plan")
      .order("business_name", { ascending: true });
    if (!profileError) profiles = new Map((profileData || []).map((profile) => [profile.id, profile]));
    populatePlanClients();
    render();
  }

  document.querySelectorAll("[data-admin-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.adminFilter;
      document.querySelectorAll("[data-admin-filter]").forEach((item) => item.classList.toggle("active", item === button));
      sidebar.classList.remove("open");
      render();
    });
  });
  searchInput.addEventListener("input", render);
  statusSelect.addEventListener("change", render);
  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-post]");
    if (button) openEditor(button.dataset.adminPost);
  });
  document.querySelector("[data-admin-menu]").addEventListener("click", () => sidebar.classList.toggle("open"));
  document.querySelector("[data-admin-close]").addEventListener("click", closeEditor);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) closeEditor(); });
  form.addEventListener("submit", (event) => { event.preventDefault(); savePost(); });
  document.querySelector("[data-mark-progress]").addEventListener("click", () => savePost("in_progress"));
  document.querySelector("[data-send-approval]").addEventListener("click", () => savePost("pending"));
  generateButton.addEventListener("click", generateWithAi);
  generateVisualButton.addEventListener("click", generateVisualWithAi);
  visualFileInput.addEventListener("change", () => chooseVisualFile(visualFileInput.files?.[0]));
  removeVisualButton.addEventListener("click", () => {
    pendingVisual = null;
    removeExistingVisual = true;
    setVisualPreview();
    visualFileInput.value = "";
    message.textContent = "Визията ще бъде премахната, когато запазиш промените.";
    message.className = "admin-form-message";
  });
  document.querySelector("[data-admin-refresh]").addEventListener("click", loadData);
  document.querySelector("[data-open-plan]").addEventListener("click", openPlanDialog);
  document.querySelectorAll("[data-close-plan]").forEach((button) => button.addEventListener("click", closePlanDialog));
  planDialog.addEventListener("click", (event) => { if (event.target === planDialog) closePlanDialog(); });
  generatePlanButton.addEventListener("click", generateMonthlyPlan);
  planForm.addEventListener("submit", saveMonthlyPlan);
  document.querySelector("[data-plan-toggle]").addEventListener("click", () => {
    const shouldSelect = generatedPlan.some((item) => !item.selected);
    generatedPlan.forEach((item) => { item.selected = shouldSelect; });
    renderGeneratedPlan();
    document.querySelector("[data-plan-toggle]").textContent = shouldSelect ? "Премахни избора" : "Избери всички";
  });
  document.querySelector("[data-admin-logout]").addEventListener("click", async () => {
    if (!demoMode && auth?.client) await auth.client.auth.signOut();
    location.href = "login.html";
  });

  loadData();
})();
