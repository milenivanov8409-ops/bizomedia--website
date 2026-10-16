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

  document.querySelectorAll(".connect-button:not(.connected)").forEach((button) => {
    button.addEventListener("click", () => {
      button.textContent = "Demo: API setup";
      setTimeout(() => { button.textContent = "Свържи"; }, 1500);
    });
  });

  function getCachedProfile() {
    const readProfileValue = (key) => sessionStorage.getItem(key) ?? localStorage.getItem(key);
    return {
      full_name: readProfileValue("bizomedia-user-name") || "Клиент",
      business_name: readProfileValue("bizomedia-user-business") || "Моят бизнес",
      preferred_language: localStorage.getItem("bizomedia-language") || "bg",
      primary_channel: "Instagram",
      social_channels: ["Instagram"],
      plan: readProfileValue("bizomedia-user-plan") || "essential",
      requested_plan: readProfileValue("bizomedia-requested-plan") || "essential",
      logo_url: readProfileValue("bizomedia-user-logo") || ""
    };
  }

  const planNames = { essential: "Essential", growth: "Growth", business: "Business" };
  const settingsLogoInput = document.querySelector("[data-settings-logo]");
  const settingsLogoPreview = document.querySelector("[data-settings-logo-preview]");
  const settingsLogoPlaceholder = document.querySelector("[data-settings-logo-placeholder]");
  const settingsLogoRemove = document.querySelector("[data-settings-logo-remove]");
  const settingsMessage = document.querySelector("[data-settings-message]");
  let removeSettingsLogo = false;
  let settingsLogoPreviewUrl = "";

  function showSettingsLogo(url) {
    if (!settingsLogoPreview) return;
    settingsLogoPreview.style.backgroundImage = url ? `url(${JSON.stringify(url)})` : "";
    settingsLogoPreview.classList.toggle("has-logo", Boolean(url));
    if (settingsLogoPlaceholder) settingsLogoPlaceholder.hidden = Boolean(url);
    if (settingsLogoRemove) settingsLogoRemove.hidden = !url;
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
    document.querySelectorAll("[data-user-initials]").forEach((element) => {
      element.textContent = initials;
      element.style.backgroundImage = "";
      element.classList.remove("has-logo");
      if (profile.logo_url) {
        try {
          const logoUrl = new URL(profile.logo_url, location.href);
          if (["https:", "http:"].includes(logoUrl.protocol)) {
            element.textContent = "";
            element.style.backgroundImage = `url(${JSON.stringify(logoUrl.href)})`;
            element.classList.add("has-logo");
          }
        } catch (_) {
          // Keep initials when a saved logo URL is invalid.
        }
      }
    });

    const nameInput = document.querySelector("[data-settings-name]");
    const businessInput = document.querySelector("[data-settings-business]");
    const emailInput = document.querySelector("[data-settings-email]");
    const languageInput = document.querySelector("[data-settings-language]");
    const channelInput = document.querySelector("[data-settings-channel]");
    const requestedPlanInput = document.querySelector("[data-settings-requested-plan]");
    const activePlan = document.querySelector("[data-settings-active-plan]");
    if (nameInput) nameInput.value = fullName;
    if (businessInput) businessInput.value = businessName;
    if (emailInput) emailInput.value = email || sessionStorage.getItem("bizomedia-user-email") || localStorage.getItem("bizomedia-user-email") || "";
    if (languageInput) languageInput.value = profile.preferred_language || "bg";
    if (channelInput) channelInput.value = profile.primary_channel || "Instagram";
    if (requestedPlanInput) requestedPlanInput.value = profile.requested_plan || "essential";
    if (activePlan) activePlan.textContent = planNames[profile.plan] || planNames.essential;
    document.querySelectorAll("[data-settings-social]").forEach((input) => {
      input.checked = (profile.social_channels || [profile.primary_channel || "Instagram"]).includes(input.value);
    });
    if (!settingsLogoPreviewUrl && !removeSettingsLogo) showSettingsLogo(profile.logo_url || "");
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

  settingsLogoInput?.addEventListener("change", () => {
    const file = settingsLogoInput.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/) || file.size > 2 * 1024 * 1024) {
      settingsLogoInput.value = "";
      if (settingsMessage) {
        settingsMessage.textContent = "Избери PNG, JPG или WebP файл до 2 MB.";
        settingsMessage.className = "settings-message error";
      }
      return;
    }
    if (settingsLogoPreviewUrl) URL.revokeObjectURL(settingsLogoPreviewUrl);
    settingsLogoPreviewUrl = URL.createObjectURL(file);
    removeSettingsLogo = false;
    showSettingsLogo(settingsLogoPreviewUrl);
  });

  settingsLogoRemove?.addEventListener("click", () => {
    if (settingsLogoPreviewUrl) URL.revokeObjectURL(settingsLogoPreviewUrl);
    settingsLogoPreviewUrl = "";
    if (settingsLogoInput) settingsLogoInput.value = "";
    removeSettingsLogo = true;
    showSettingsLogo("");
  });

  const contentStatus = {
    draft: { label: "Чернова", className: "draft" },
    requested: { label: "Заявена", className: "requested" },
    in_progress: { label: "Подготвя се", className: "in-progress" },
    pending: { label: "За одобрение", className: "pending" },
    approved: { label: "Одобрена", className: "approved" },
    scheduled: { label: "Планирана", className: "approved" },
    published: { label: "Публикувана", className: "approved" },
    changes_requested: { label: "За корекция", className: "draft" },
    cancelled: { label: "Отказана", className: "cancelled" }
  };

  const channelMarks = {
    Instagram: { label: "◎", className: "ig" },
    Facebook: { label: "f", className: "fb" },
    LinkedIn: { label: "in", className: "li" },
    X: { label: "X", className: "x" },
    TikTok: { label: "♪", className: "tt" },
    "Google Ads": { label: "G", className: "ga" },
    Email: { label: "@", className: "li" }
  };

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[character]);
  }

  function formatContentDate(value, includeTime = false) {
    if (!value) return "Без дата";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Без дата";
    return new Intl.DateTimeFormat("bg-BG", {
      day: "numeric",
      month: "short",
      ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {})
    }).format(date);
  }

  function statusPill(status) {
    const meta = contentStatus[status] || contentStatus.draft;
    return `<span class="status-pill ${meta.className}">${meta.label}</span>`;
  }

  let contentPosts = [];

  function getDemoPosts() {
    const now = new Date();
    const futureDate = (days, hour) => {
      const value = new Date(now);
      value.setDate(value.getDate() + days);
      value.setHours(hour, 0, 0, 0);
      return value.toISOString();
    };
    return [
      { id: "demo-pending", title: "Лятна кампания", caption: "Свежо лятно предложение, което представя бизнеса ясно и насочва хората към запитване.", channel: "Instagram", status: "pending", scheduled_at: futureDate(2, 11), reach: 0, client_feedback: "", signed_media_url: "" },
      { id: "demo-requested", title: "Представяне на услугата", caption: "Основна идея и насоки за нова публикация.", channel: "Facebook", status: "requested", scheduled_at: futureDate(5, 14), reach: 0, client_feedback: "", signed_media_url: "" },
      { id: "demo-approved", title: "Полезен съвет за клиента", caption: "Кратък експертен съвет с ясен призив за действие.", channel: "LinkedIn", status: "approved", scheduled_at: futureDate(7, 10), reach: 0, client_feedback: "", signed_media_url: "" }
    ];
  }

  function renderContentWorkspace(posts) {
    const postsBody = document.querySelector('[data-panel="posts"] tbody');
    const approvalsBody = document.querySelector('[data-panel="approvals"] tbody');
    const calendarList = document.querySelector("[data-calendar-list]");
    const pendingPosts = posts.filter((post) => post.status === "pending");

    document.querySelectorAll("[data-approval-count]").forEach((element) => {
      element.textContent = String(pendingPosts.length);
      element.hidden = pendingPosts.length === 0;
    });
    const approvalSummary = document.querySelector("[data-approval-summary]");
    if (approvalSummary) approvalSummary.textContent = pendingPosts.length === 1
      ? "1 чака решение"
      : `${pendingPosts.length} чакат решение`;

    if (postsBody) {
      postsBody.innerHTML = posts.length
        ? posts.map((post) => {
          const mark = channelMarks[post.channel] || channelMarks.Instagram;
          const result = post.reach ? `${Number(post.reach).toLocaleString("bg-BG")} reach` : "—";
          return `<tr><td data-label="Публикация">${escapeHtml(post.title)}</td><td data-label="Канал"><span class="table-channel"><i class="mini-platform">${mark.label}</i>${escapeHtml(post.channel)}</span></td><td data-label="Дата">${formatContentDate(post.scheduled_at)}</td><td data-label="Статус">${statusPill(post.status)}</td><td data-label="Резултат">${result}</td></tr>`;
        }).join("")
        : '<tr><td colspan="5"><div class="content-empty">Все още няма публикации. Създай първата заявка.</div></td></tr>';
    }

    if (approvalsBody) {
      approvalsBody.innerHTML = pendingPosts.length
        ? pendingPosts.map((post) => `<tr><td data-label="Материал">${escapeHtml(post.title)}</td><td data-label="Канал">${escapeHtml(post.channel)}</td><td data-label="Публикуване">${formatContentDate(post.scheduled_at, true)}</td><td data-label="Статус">${statusPill(post.status)}</td><td data-label="Действие"><button class="table-action approve" data-review-post="${post.id}">Прегледай</button></td></tr>`).join("")
        : '<tr><td colspan="5"><div class="content-empty">Няма публикации, които чакат решение.</div></td></tr>';
    }

    if (calendarList) {
      const plannedPosts = posts.filter((post) => post.scheduled_at && post.status !== "cancelled").slice(0, 14);
      calendarList.innerHTML = plannedPosts.length
        ? plannedPosts.map((post) => {
          const date = new Date(post.scheduled_at);
          const mark = channelMarks[post.channel] || channelMarks.Instagram;
          const weekday = new Intl.DateTimeFormat("bg-BG", { weekday: "long" }).format(date);
          const media = post.signed_media_url
            ? `<img src="${escapeHtml(post.signed_media_url)}" alt="${escapeHtml(post.title)}">`
            : "";
          return `<div class="day-column"><div class="day-name"><strong>${date.getDate()}</strong>${escapeHtml(weekday)}</div><div class="calendar-thumb${media ? " has-image" : ""}">${media}<span class="social-dot ${mark.className}">${mark.label}</span></div><p class="calendar-content-title">${escapeHtml(post.title)}</p>${statusPill(post.status)}</div>`;
        }).join("")
        : '<div class="content-empty">Календарът е свободен. Създай заявка и избери дата.</div>';
    }
  }

  function showContentError(message) {
    const safeMessage = escapeHtml(message);
    const postsBody = document.querySelector('[data-panel="posts"] tbody');
    const approvalsBody = document.querySelector('[data-panel="approvals"] tbody');
    const calendarList = document.querySelector("[data-calendar-list]");
    if (postsBody) postsBody.innerHTML = `<tr><td colspan="5"><div class="content-empty content-error">${safeMessage}</div></td></tr>`;
    if (approvalsBody) approvalsBody.innerHTML = `<tr><td colspan="5"><div class="content-empty content-error">${safeMessage}</div></td></tr>`;
    if (calendarList) calendarList.innerHTML = `<div class="content-empty content-error">${safeMessage}</div>`;
  }

  async function loadContentPosts() {
    if (localStorage.getItem("bizomedia-demo") === "1") {
      if (!contentPosts.length) contentPosts = getDemoPosts();
      renderContentWorkspace(contentPosts);
      return;
    }
    const auth = window.BizomediaAuth;
    if (!auth?.client) {
      showContentError("Съдържанието временно не е достъпно.");
      return;
    }
    const { data: sessionData } = await auth.client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) return;
    const { data, error } = await auth.client
      .from("posts")
      .select("id,title,caption,channel,status,scheduled_at,media_url,media_path,reach,client_feedback,decision_at,created_at")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) {
      showContentError("Активирай модула за публикации в Supabase.");
      return;
    }
    contentPosts = data || [];
    const mediaPaths = contentPosts.map((post) => post.media_path).filter(Boolean);
    if (mediaPaths.length) {
      const { data: signedMedia } = await auth.client.storage
        .from("post-media")
        .createSignedUrls(mediaPaths, 3600);
      const signedByPath = new Map((signedMedia || []).map((item) => [item.path, item.signedUrl]));
      contentPosts = contentPosts.map((post) => ({
        ...post,
        signed_media_url: post.media_path ? signedByPath.get(post.media_path) || "" : post.media_url || ""
      }));
    } else {
      contentPosts = contentPosts.map((post) => ({ ...post, signed_media_url: post.media_url || "" }));
    }
    renderContentWorkspace(contentPosts);
  }

  const postDialog = document.querySelector("[data-post-dialog]");
  const postForm = document.querySelector("[data-post-form]");
  const postFormMessage = document.querySelector("[data-post-form-message]");
  const postMediaInput = document.querySelector("[data-post-media]");
  const mediaPreview = document.querySelector("[data-media-preview]");
  let mediaPreviewUrl = "";

  function resetMediaPreview() {
    if (mediaPreviewUrl) URL.revokeObjectURL(mediaPreviewUrl);
    mediaPreviewUrl = "";
    if (mediaPreview) {
      mediaPreview.src = "";
      mediaPreview.hidden = true;
    }
  }

  postMediaInput?.addEventListener("change", () => {
    resetMediaPreview();
    const file = postMediaInput.files?.[0];
    if (!file || !mediaPreview) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 10 * 1024 * 1024) {
      postMediaInput.value = "";
      if (postFormMessage) postFormMessage.textContent = "Избери JPG, PNG или WebP снимка до 10 MB.";
      return;
    }
    mediaPreviewUrl = URL.createObjectURL(file);
    mediaPreview.src = mediaPreviewUrl;
    mediaPreview.hidden = false;
    if (postFormMessage) postFormMessage.textContent = "";
  });

  document.querySelectorAll("[data-open-post-form]").forEach((button) => {
    button.addEventListener("click", () => postDialog?.showModal());
  });

  const scheduleInput = postForm?.querySelector('[name="scheduledAt"]');
  if (scheduleInput) {
    const minimumDate = new Date(Date.now() + 60 * 60 * 1000);
    minimumDate.setMinutes(minimumDate.getMinutes() - minimumDate.getTimezoneOffset());
    scheduleInput.min = minimumDate.toISOString().slice(0, 16);
  }
  document.querySelector("[data-close-post-form]")?.addEventListener("click", () => postDialog?.close());
  postDialog?.addEventListener("click", (event) => {
    if (event.target === postDialog) postDialog.close();
  });

  postForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = postForm.querySelector('button[type="submit"]');
    const formData = new FormData(postForm);
    const auth = window.BizomediaAuth;
    submit.disabled = true;
    submit.textContent = "Изпращане…";
    if (postFormMessage) {
      postFormMessage.textContent = "";
      postFormMessage.className = "post-form-message";
    }

    try {
      if (localStorage.getItem("bizomedia-demo") === "1") {
        const scheduledAt = String(formData.get("scheduledAt") || "");
        contentPosts.push({
          id: `demo-${crypto.randomUUID()}`,
          title: String(formData.get("title") || "").trim(),
          caption: String(formData.get("caption") || "").trim(),
          channel: String(formData.get("channel") || "Instagram"),
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          status: "requested",
          reach: 0,
          client_feedback: "",
          signed_media_url: mediaPreviewUrl
        });
        renderContentWorkspace(contentPosts);
        postForm.reset();
        if (postFormMessage) {
          postFormMessage.textContent = "Демо заявката е изпратена за подготовка.";
          postFormMessage.classList.add("success");
        }
        setTimeout(() => {
          resetMediaPreview();
          postDialog?.close();
        }, 750);
        return;
      }
      if (!auth?.client) throw new Error("Връзката със защитената платформа не е достъпна.");
      const { data: sessionData } = await auth.client.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error("Сесията е изтекла. Влез отново.");
      const scheduledAt = String(formData.get("scheduledAt") || "");
      const mediaFile = postMediaInput?.files?.[0];
      let mediaPath = null;
      if (mediaFile) {
        const fileExtensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
        const extension = fileExtensions[mediaFile.type];
        if (!extension || mediaFile.size > 10 * 1024 * 1024) throw new Error("Избери JPG, PNG или WebP снимка до 10 MB.");
        mediaPath = `${user.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await auth.client.storage
          .from("post-media")
          .upload(mediaPath, mediaFile, { cacheControl: "3600", upsert: false, contentType: mediaFile.type });
        if (uploadError) throw uploadError;
      }
      const { error } = await auth.client.from("posts").insert({
        user_id: user.id,
        title: String(formData.get("title") || "").trim(),
        caption: String(formData.get("caption") || "").trim(),
        channel: String(formData.get("channel") || "Instagram"),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        media_path: mediaPath
      });
      if (error) {
        if (mediaPath) await auth.client.storage.from("post-media").remove([mediaPath]);
        throw error;
      }
      postForm.reset();
      resetMediaPreview();
      if (postFormMessage) {
        postFormMessage.textContent = "Заявката е изпратена към Bizomedia за подготовка.";
        postFormMessage.classList.add("success");
      }
      await loadContentPosts();
      setTimeout(() => postDialog?.close(), 750);
    } catch (error) {
      if (postFormMessage) postFormMessage.textContent = error?.message || "Заявката не може да бъде изпратена.";
    } finally {
      submit.disabled = false;
      submit.textContent = "Изпрати заявката";
    }
  });

  const reviewDialog = document.querySelector("[data-review-dialog]");
  const reviewForm = document.querySelector("[data-review-form]");
  const reviewMessage = document.querySelector("[data-review-message]");
  let activeReviewPostId = "";

  function closeReviewDialog() {
    activeReviewPostId = "";
    reviewDialog?.classList.remove("requesting-correction");
    reviewForm?.reset();
    if (reviewMessage) reviewMessage.textContent = "";
    reviewDialog?.close();
  }

  function openReviewDialog(postId) {
    const post = contentPosts.find((item) => item.id === postId);
    if (!post || !reviewDialog) return;
    activeReviewPostId = postId;
    reviewDialog.classList.remove("requesting-correction");
    if (reviewMessage) reviewMessage.textContent = "";
    const title = document.querySelector("[data-review-title]");
    const channel = document.querySelector("[data-review-channel]");
    const date = document.querySelector("[data-review-date]");
    const caption = document.querySelector("[data-review-caption]");
    const media = document.querySelector("[data-review-media]");
    const image = document.querySelector("[data-review-image]");
    if (title) title.textContent = post.title;
    if (channel) channel.textContent = post.channel;
    if (date) date.textContent = formatContentDate(post.scheduled_at, true);
    if (caption) caption.textContent = post.caption || "Няма добавен текст.";
    if (image) image.src = post.signed_media_url || "";
    if (media) media.hidden = !post.signed_media_url;
    reviewDialog.showModal();
  }

  async function submitReviewDecision(status) {
    const post = contentPosts.find((item) => item.id === activeReviewPostId);
    if (!post || post.status !== "pending") return;
    const feedback = reviewForm?.elements.feedback?.value.trim() || "";
    if (status === "changes_requested" && !feedback) {
      reviewDialog?.classList.add("requesting-correction");
      if (reviewMessage) reviewMessage.textContent = "Напиши какво точно да коригираме.";
      reviewForm?.elements.feedback?.focus();
      return;
    }

    const buttons = [...reviewDialog.querySelectorAll("button")];
    buttons.forEach((button) => { button.disabled = true; });
    if (reviewMessage) reviewMessage.textContent = "Запазване на решението…";
    try {
      if (localStorage.getItem("bizomedia-demo") === "1") {
        post.status = status;
        post.client_feedback = status === "changes_requested" ? feedback : "";
        renderContentWorkspace(contentPosts);
      } else {
        const auth = window.BizomediaAuth;
        const { data: sessionData } = await auth.client.auth.getSession();
        const user = sessionData?.session?.user;
        if (!user) throw new Error("Сесията е изтекла. Влез отново.");
        const { error } = await auth.client
          .from("posts")
          .update({ status, client_feedback: status === "changes_requested" ? feedback : "" })
          .eq("id", post.id)
          .eq("user_id", user.id)
          .eq("status", "pending");
        if (error) throw error;
        await loadContentPosts();
      }
      closeReviewDialog();
    } catch (error) {
      if (reviewMessage) reviewMessage.textContent = error?.message || "Решението не може да бъде запазено.";
    } finally {
      buttons.forEach((button) => { button.disabled = false; });
    }
  }

  document.querySelector('[data-panel="approvals"] tbody')?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-review-post]");
    if (button) openReviewDialog(button.dataset.reviewPost);
  });
  document.querySelector("[data-close-review]")?.addEventListener("click", closeReviewDialog);
  document.querySelector("[data-review-approve]")?.addEventListener("click", () => submitReviewDecision("approved"));
  document.querySelector("[data-review-correction]")?.addEventListener("click", () => {
    if (!reviewDialog?.classList.contains("requesting-correction")) {
      reviewDialog?.classList.add("requesting-correction");
      reviewForm?.elements.feedback?.focus();
      return;
    }
    submitReviewDecision("changes_requested");
  });
  reviewDialog?.addEventListener("click", (event) => {
    if (event.target === reviewDialog) closeReviewDialog();
  });

  loadContentPosts();

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
        primary_channel: document.querySelector("[data-settings-channel]")?.value,
        social_channels: [...document.querySelectorAll("[data-settings-social]:checked")].map((input) => input.value),
        requested_plan: document.querySelector("[data-settings-requested-plan]")?.value
      };

      if (!updates.social_channels.length) {
        if (settingsMessage) {
          settingsMessage.textContent = "Избери поне един активен канал.";
          settingsMessage.className = "settings-message error";
        }
        button.disabled = false;
        button.textContent = originalText;
        return;
      }
      if (!updates.social_channels.includes(updates.primary_channel)) {
        updates.primary_channel = updates.social_channels[0];
      }

      let uploadedLogoPath = "";
      let previousLogoPathForCleanup = "";
      try {
        if (localStorage.getItem("bizomedia-demo") === "1") {
          localStorage.setItem("bizomedia-user-name", updates.full_name || "Демо клиент");
          localStorage.setItem("bizomedia-user-business", updates.business_name || "Bizomedia Demo");
          activeProfile = { ...activeProfile, ...updates };
        } else {
          const auth = window.BizomediaAuth;
          const { data: sessionData, error: sessionError } = await auth.client.auth.getSession();
          const user = sessionData?.session?.user;
          if (sessionError || !user) throw new Error("Сесията е изтекла. Влез отново.");

          const previousLogoPath = activeProfile.logo_path || "";
          previousLogoPathForCleanup = previousLogoPath;
          let logoPath = removeSettingsLogo ? "" : previousLogoPath;
          const logoFile = settingsLogoInput?.files?.[0];
          if (logoFile) {
            logoPath = `${user.id}/profile/logo`;
            const { error: uploadError } = await auth.client.storage
              .from("post-media")
              .upload(logoPath, logoFile, { upsert: true, cacheControl: "3600", contentType: logoFile.type });
            if (uploadError) throw uploadError;
            uploadedLogoPath = logoPath;
          }
          updates.logo_path = logoPath;
          activeProfile = await window.BizomediaAuth.updateProfile(updates);
          if (previousLogoPath && previousLogoPath !== logoPath) {
            await auth.client.storage.from("post-media").remove([previousLogoPath]);
          }
          if (settingsLogoPreviewUrl) URL.revokeObjectURL(settingsLogoPreviewUrl);
          settingsLogoPreviewUrl = "";
          if (settingsLogoInput) settingsLogoInput.value = "";
          removeSettingsLogo = false;
        }
        renderProfile(activeProfile);
        button.textContent = "Запазено ✓";
        if (settingsMessage) {
          settingsMessage.textContent = "Промените са запазени в твоя защитен профил.";
          settingsMessage.classList.add("success");
        }
      } catch (error) {
        if (uploadedLogoPath && uploadedLogoPath !== previousLogoPathForCleanup) {
          await window.BizomediaAuth?.client?.storage.from("post-media").remove([uploadedLogoPath]);
        }
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
