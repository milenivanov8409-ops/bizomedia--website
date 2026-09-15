(() => {
  const config = window.BIZOMEDIA_SUPABASE || {};
  const configured = Boolean(config.url && config.anonKey && window.supabase);
  const client = configured
    ? window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      })
    : null;

  const messageBox = document.querySelector(".auth-message");
  const authForm = document.querySelector("[data-auth-form]");
  const banner = document.querySelector(".auth-mode-banner");

  function showMessage(text, type = "") {
    if (!messageBox) return;
    messageBox.textContent = text;
    messageBox.className = `auth-message ${type}`.trim();
  }

  function setBusy(isBusy) {
    const submit = authForm?.querySelector("button[type='submit']");
    if (!submit) return;
    submit.disabled = isBusy;
    submit.dataset.originalText ||= submit.textContent;
    submit.textContent = isBusy ? "Моля, изчакай…" : submit.dataset.originalText;
  }

  function getFallbackProfile(user) {
    const metadata = user?.user_metadata || {};
    return {
      full_name: metadata.full_name || metadata.name || user?.email?.split("@")[0] || "Клиент",
      business_name: metadata.business || "Моят бизнес",
      preferred_language: metadata.preferred_language || localStorage.getItem("bizomedia-language") || "bg",
      primary_channel: metadata.primary_channel || "Instagram"
    };
  }

  function cacheProfile(profile, user) {
    if (!profile) return;
    localStorage.setItem("bizomedia-user-name", profile.full_name || "Клиент");
    localStorage.setItem("bizomedia-user-business", profile.business_name || "Моят бизнес");
    localStorage.setItem("bizomedia-language", profile.preferred_language || "bg");
    if (user?.email) localStorage.setItem("bizomedia-user-email", user.email);
  }

  function saveUser(user) {
    if (!user) return;
    cacheProfile(getFallbackProfile(user), user);
  }

  async function loadProfile(user) {
    const fallback = getFallbackProfile(user);
    if (!client || !user) return fallback;

    const { data, error } = await client
      .from("profiles")
      .select("full_name,business_name,preferred_language,primary_channel")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("Bizomedia profile could not be loaded:", error.message);
      cacheProfile(fallback, user);
      return fallback;
    }

    const profile = { ...fallback, ...(data || {}) };
    cacheProfile(profile, user);
    return profile;
  }

  async function updateProfile(updates) {
    if (!client) throw new Error("Профилът временно не е достъпен.");

    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      throw new Error("Сесията е изтекла. Влез отново.");
    }

    const user = sessionData.session.user;
    const current = getFallbackProfile(user);
    const profile = {
      id: user.id,
      full_name: String(updates.full_name || current.full_name).trim(),
      business_name: String(updates.business_name || current.business_name).trim(),
      preferred_language: updates.preferred_language === "en" ? "en" : "bg",
      primary_channel: String(updates.primary_channel || current.primary_channel),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await client
      .from("profiles")
      .upsert(profile, { onConflict: "id" })
      .select("full_name,business_name,preferred_language,primary_channel")
      .single();
    if (error) throw error;

    await client.auth.updateUser({
      data: {
        full_name: data.full_name,
        business: data.business_name,
        preferred_language: data.preferred_language,
        primary_channel: data.primary_channel
      }
    });
    cacheProfile(data, user);
    return data;
  }

  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      button.setAttribute("aria-label", input.type === "password" ? "Покажи паролата" : "Скрий паролата");
    });
  });

  document.querySelectorAll(".demo-login").forEach((button) => {
    button.addEventListener("click", () => {
      localStorage.setItem("bizomedia-demo", "1");
      localStorage.setItem("bizomedia-user-name", "Демо клиент");
      localStorage.setItem("bizomedia-user-business", "Bizomedia Demo");
      location.href = "dashboard.html";
    });
  });

  if (!configured) {
    banner?.classList.add("show");
    if (banner) banner.textContent = "Входът временно не е достъпен. Моля, опитай отново по-късно.";
  }

  if (new URLSearchParams(location.search).get("confirmed") === "1") {
    showMessage("Имейлът е потвърден. Вече можеш да влезеш.", "success");
  }

  if (authForm) {
    authForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      showMessage("");

      if (!client) {
        showMessage("Входът временно не е достъпен.", "error");
        return;
      }

      const type = authForm.dataset.authForm;
      const data = new FormData(authForm);
      setBusy(true);

      try {
        if (type === "login") {
          const { data: result, error } = await client.auth.signInWithPassword({
            email: String(data.get("email") || "").trim(),
            password: String(data.get("password") || "")
          });
          if (error) throw error;
          localStorage.removeItem("bizomedia-demo");
          saveUser(result.user);
          location.href = "dashboard.html";
          return;
        }

        if (type === "register") {
          const password = String(data.get("password") || "");
          const confirmPassword = String(data.get("confirmPassword") || "");
          if (password !== confirmPassword) throw new Error("Паролите не съвпадат.");

          const fullName = String(data.get("fullName") || "").trim();
          const business = String(data.get("business") || "").trim();
          const emailRedirectTo = new URL("login.html?confirmed=1", location.href).href;
          const { data: result, error } = await client.auth.signUp({
            email: String(data.get("email") || "").trim(),
            password,
            options: {
              emailRedirectTo,
              data: { full_name: fullName, business }
            }
          });
          if (error) throw error;
          saveUser(result.user);
          if (result.session) {
            location.href = "dashboard.html";
          } else {
            authForm.reset();
            showMessage("Профилът е създаден. Провери имейла си и потвърди регистрацията.", "success");
          }
          return;
        }

        if (type === "forgot") {
          const redirectTo = new URL("reset-password.html", location.href).href;
          const { error } = await client.auth.resetPasswordForEmail(
            String(data.get("email") || "").trim(),
            { redirectTo }
          );
          if (error) throw error;
          authForm.reset();
          showMessage("Изпратихме ти линк за възстановяване на паролата.", "success");
          return;
        }

        if (type === "update") {
          const password = String(data.get("password") || "");
          const confirmPassword = String(data.get("confirmPassword") || "");
          if (password !== confirmPassword) throw new Error("Паролите не съвпадат.");
          const { error } = await client.auth.updateUser({ password });
          if (error) throw error;
          authForm.reset();
          showMessage("Паролата е променена успешно. Вече можеш да влезеш.", "success");
          setTimeout(() => { location.href = "login.html"; }, 1400);
        }
      } catch (error) {
        const fallback = "Възникна грешка. Провери данните и опитай отново.";
        showMessage(error?.message || fallback, "error");
      } finally {
        setBusy(false);
      }
    });
  }

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      localStorage.removeItem("bizomedia-demo");
      if (client) await client.auth.signOut();
      location.href = "login.html";
    });
  });

  async function protectDashboard() {
    if (!document.body.matches("[data-auth-required]")) return;
    if (!client) {
      if (localStorage.getItem("bizomedia-demo") === "1") {
        document.body.classList.add("auth-ready");
        return;
      }
      location.replace("login.html");
      return;
    }
    const { data, error } = await client.auth.getSession();
    if (!error && data.session) {
      localStorage.removeItem("bizomedia-demo");
      saveUser(data.session.user);
      const profile = await loadProfile(data.session.user);
      document.dispatchEvent(new CustomEvent("bizomedia:profile-ready", {
        detail: { user: data.session.user, profile }
      }));
      document.body.classList.add("auth-ready");
      return;
    }
    if (localStorage.getItem("bizomedia-demo") === "1") {
      document.body.classList.add("auth-ready");
      return;
    }
    if (error || !data.session) {
      location.replace("login.html");
      return;
    }
  }

  protectDashboard();
  window.BizomediaAuth = { client, configured, loadProfile, updateProfile };
})();
