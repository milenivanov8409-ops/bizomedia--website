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

  const contentStatus = {
    draft: { label: "Чернова", className: "draft" },
    pending: { label: "За одобрение", className: "pending" },
    approved: { label: "Одобрена", className: "approved" },
    scheduled: { label: "Планирана", className: "approved" },
    published: { label: "Публикувана", className: "approved" },
    changes_requested: { label: "За корекция", className: "draft" }
  };

  const channelMarks = {
    Instagram: { label: "◎", className: "ig" },
    Facebook: { label: "f", className: "fb" },
    LinkedIn: { label: "in", className: "li" },
    X: { label: "X", className: "x" },
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
          return `<tr><td>${escapeHtml(post.title)}</td><td><span class="table-channel"><i class="mini-platform">${mark.label}</i>${escapeHtml(post.channel)}</span></td><td>${formatContentDate(post.scheduled_at)}</td><td>${statusPill(post.status)}</td><td>${result}</td></tr>`;
        }).join("")
        : '<tr><td colspan="5"><div class="content-empty">Все още няма публикации. Създай първата заявка.</div></td></tr>';
    }

    if (approvalsBody) {
      approvalsBody.innerHTML = pendingPosts.length
        ? pendingPosts.map((post) => `<tr><td>${escapeHtml(post.title)}</td><td>${escapeHtml(post.channel)}</td><td>${formatContentDate(post.scheduled_at, true)}</td><td>${statusPill(post.status)}</td><td><div class="action-group"><button class="table-action approve" data-content-action="approved" data-post-id="${post.id}">Одобри</button><button class="table-action reject" data-content-action="changes_requested" data-post-id="${post.id}">Корекция</button></div></td></tr>`).join("")
        : '<tr><td colspan="5"><div class="content-empty">Няма публикации, които чакат решение.</div></td></tr>';
    }

    if (calendarList) {
      const plannedPosts = posts.filter((post) => post.scheduled_at).slice(0, 14);
      calendarList.innerHTML = plannedPosts.length
        ? plannedPosts.map((post) => {
          const date = new Date(post.scheduled_at);
          const mark = channelMarks[post.channel] || channelMarks.Instagram;
          const weekday = new Intl.DateTimeFormat("bg-BG", { weekday: "long" }).format(date);
          return `<div class="day-column"><div class="day-name"><strong>${date.getDate()}</strong>${escapeHtml(weekday)}</div><div class="calendar-thumb"><span class="social-dot ${mark.className}">${mark.label}</span></div><p class="calendar-content-title">${escapeHtml(post.title)}</p>${statusPill(post.status)}</div>`;
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
      .select("id,title,caption,channel,status,scheduled_at,media_url,reach,created_at")
      .eq("user_id", user.id)
      .order("scheduled_at", { ascending: true, nullsFirst: false });
    if (error) {
      showContentError("Активирай модула за публикации в Supabase.");
      return;
    }
    contentPosts = data || [];
    renderContentWorkspace(contentPosts);
  }

  const postDialog = document.querySelector("[data-post-dialog]");
  const postForm = document.querySelector("[data-post-form]");
  const postFormMessage = document.querySelector("[data-post-form-message]");

  document.querySelectorAll("[data-open-post-form]").forEach((button) => {
    button.addEventListener("click", () => postDialog?.showModal());
  });
  document.querySelector("[data-close-post-form]")?.addEventListener("click", () => postDialog?.close());
  postDialog?.addEventListener("click", (event) => {
    if (event.target === postDialog) postDialog.close();
  });

  postForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = postForm.querySelector('button[type="submit"]');
    const formData = new FormData(postForm);
    const auth = window.BizomediaAuth;
    if (!auth?.client) return;
    submit.disabled = true;
    submit.textContent = "Изпращане…";
    if (postFormMessage) {
      postFormMessage.textContent = "";
      postFormMessage.className = "post-form-message";
    }

    try {
      const { data: sessionData } = await auth.client.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error("Сесията е изтекла. Влез отново.");
      const scheduledAt = String(formData.get("scheduledAt") || "");
      const { error } = await auth.client.from("posts").insert({
        user_id: user.id,
        title: String(formData.get("title") || "").trim(),
        caption: String(formData.get("caption") || "").trim(),
        channel: String(formData.get("channel") || "Instagram"),
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status: "pending"
      });
      if (error) throw error;
      postForm.reset();
      if (postFormMessage) {
        postFormMessage.textContent = "Заявката е изпратена успешно.";
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

  document.querySelector('[data-panel="approvals"] tbody')?.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-content-action]");
    if (!button) return;
    const auth = window.BizomediaAuth;
    if (!auth?.client) return;
    button.disabled = true;
    const { data: sessionData } = await auth.client.auth.getSession();
    const user = sessionData?.session?.user;
    if (!user) {
      button.disabled = false;
      return;
    }
    const { error } = await auth.client
      .from("posts")
      .update({ status: button.dataset.contentAction, updated_at: new Date().toISOString() })
      .eq("id", button.dataset.postId)
      .eq("user_id", user.id);
    if (!error) await loadContentPosts();
    else button.disabled = false;
  });

  loadContentPosts();

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
