(() => {
  const t = window.BizomediaAuthText || ((text) => text);
  const config = window.BIZOMEDIA_SUPABASE || {};
  const TERMS_VERSION = "2026-09-16";
  const SESSION_ONLY_KEY = "bizomedia-auth-session-only";
  const PENDING_EMAIL_KEY = "bizomedia-pending-confirmation-email";
  const PROFILE_CACHE_KEYS = [
    "bizomedia-user-name",
    "bizomedia-user-business",
    "bizomedia-user-plan",
    "bizomedia-requested-plan",
    "bizomedia-user-logo",
    "bizomedia-user-email"
  ];
  const authStorage = {
    getItem(key) {
      return sessionStorage.getItem(key) ?? localStorage.getItem(key);
    },
    setItem(key, value) {
      const sessionOnly = sessionStorage.getItem(SESSION_ONLY_KEY) === "1";
      const target = sessionOnly ? sessionStorage : localStorage;
      const other = sessionOnly ? localStorage : sessionStorage;
      target.setItem(key, value);
      other.removeItem(key);
    },
    removeItem(key) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }
  };
  const configured = Boolean(config.url && config.anonKey && window.supabase);
  const client = configured
    ? window.supabase.createClient(config.url, config.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: authStorage
        }
      })
    : null;

  const messageBox = document.querySelector(".auth-message");
  const authForm = document.querySelector("[data-auth-form]");
  const banner = document.querySelector(".auth-mode-banner");
  const resendButton = document.querySelector("[data-resend-confirmation]");
  let pendingConfirmationEmail = sessionStorage.getItem(PENDING_EMAIL_KEY) || "";

  function showMessage(text, type = "") {
    if (!messageBox) return;
    messageBox.textContent = t(text);
    messageBox.className = `auth-message ${type}`.trim();
  }

  function setBusy(isBusy) {
    const submit = authForm?.querySelector("button[type='submit']");
    if (!submit) return;
    submit.disabled = isBusy;
    submit.dataset.originalText ||= submit.textContent;
    submit.textContent = isBusy ? t("Моля, изчакай…") : submit.dataset.originalText;
  }

  function setResendVisible(isVisible) {
    if (resendButton) resendButton.hidden = !isVisible;
  }

  function translateAuthError(error) {
    const message = String(error?.message || "");
    const localErrors = ["Паролата трябва да съдържа поне 10 символа.", "Паролата трябва да съдържа главна и малка буква и цифра.", "Профилът временно не е достъпен.", "Сесията е изтекла. Влез отново.", "Паролите не съвпадат.", "Потвърди Общите условия и Политиката за поверителност.", "Паролите не съвпадат."];
    if (localErrors.includes(message)) return message;
    const normalized = message.toLowerCase();
    if (normalized.includes("invalid login credentials")) return "Невалиден имейл или парола.";
    if (normalized.includes("email not confirmed")) return "Потвърди имейла си, преди да влезеш.";
    if (normalized.includes("user already registered")) return "Вече има профил с този имейл.";
    if (normalized.includes("email rate limit")) return "Изпратени са твърде много имейли. Опитай отново след малко.";
    if (normalized.includes("password") && normalized.includes("weak")) return "Избери по-сигурна парола.";
    if (normalized.includes("same password")) return "Новата парола трябва да е различна от старата.";
    if (normalized.includes("expired") || normalized.includes("otp")) return "Линкът е изтекъл или вече е използван. Поискай нов.";
    return "Възникна грешка. Провери данните и опитай отново.";
  }

  function validatePassword(password) {
    if (password.length < 10) throw new Error("Паролата трябва да съдържа поне 10 символа.");
    if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
      throw new Error("Паролата трябва да съдържа главна и малка буква и цифра.");
    }
  }

  function getFallbackProfile(user) {
    const metadata = user?.user_metadata || {};
    return {
      full_name: metadata.full_name || metadata.name || user?.email?.split("@")[0] || "Клиент",
      business_name: metadata.business || "Моят бизнес",
      preferred_language: metadata.preferred_language || localStorage.getItem("bizomedia-language") || "bg",
      primary_channel: metadata.primary_channel || "Instagram",
      social_channels: Array.isArray(metadata.social_channels) ? metadata.social_channels : ["Instagram"],
      plan: "essential",
      requested_plan: metadata.requested_plan || "essential",
      logo_path: metadata.logo_path || "",
      logo_url: "",
      onboarding_step: Number(metadata.onboarding_step) || 1,
      onboarding_completed: metadata.onboarding_completed === true
    };
  }

  function cacheProfile(profile, user) {
    if (!profile) return;
    const sessionOnly = sessionStorage.getItem(SESSION_ONLY_KEY) === "1";
    const target = sessionOnly ? sessionStorage : localStorage;
    const other = sessionOnly ? localStorage : sessionStorage;
    const values = {
      "bizomedia-user-name": profile.full_name || "Клиент",
      "bizomedia-user-business": profile.business_name || "Моят бизнес",
      "bizomedia-user-plan": profile.plan || "essential",
      "bizomedia-requested-plan": profile.requested_plan || "essential",
      "bizomedia-user-logo": profile.logo_url || "",
      "bizomedia-user-email": user?.email || ""
    };
    PROFILE_CACHE_KEYS.forEach((key) => {
      if (values[key]) target.setItem(key, values[key]);
      else target.removeItem(key);
      other.removeItem(key);
    });
    localStorage.setItem("bizomedia-language", profile.preferred_language || "bg");
  }

  function clearProfileCache() {
    PROFILE_CACHE_KEYS.forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }

  function saveUser(user) {
    if (!user) return;
    cacheProfile(getFallbackProfile(user), user);
  }

  async function withSignedLogo(profile) {
    if (!client || !profile?.logo_path) return { ...profile, logo_url: "" };
    const { data, error } = await client.storage
      .from("post-media")
      .createSignedUrl(profile.logo_path, 60 * 60);
    if (error) {
      console.warn("Bizomedia logo could not be loaded:", error.message);
      return { ...profile, logo_url: "" };
    }
    return { ...profile, logo_url: data.signedUrl };
  }

  async function loadProfile(user) {
    const fallback = getFallbackProfile(user);
    if (!client || !user) return fallback;

    const { data, error } = await client
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.warn("Bizomedia profile could not be loaded:", error.message);
      cacheProfile(fallback, user);
      return fallback;
    }

    const profile = await withSignedLogo({ ...fallback, ...(data || {}) });
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
    const current = await loadProfile(user);
    const allowedChannels = ["Instagram", "Facebook", "LinkedIn", "X", "TikTok", "Google Ads", "Email"];
    const requestedChannels = Array.isArray(updates.social_channels)
      ? updates.social_channels.filter((channel) => allowedChannels.includes(channel))
      : current.social_channels;
    const requestedPlan = ["essential", "growth", "business"].includes(updates.requested_plan)
      ? updates.requested_plan
      : current.requested_plan;
    const profileUpdates = {
      full_name: String(updates.full_name || current.full_name).trim(),
      business_name: String(updates.business_name || current.business_name).trim(),
      preferred_language: updates.preferred_language
        ? (updates.preferred_language === "en" ? "en" : "bg")
        : current.preferred_language,
      primary_channel: String(updates.primary_channel || current.primary_channel),
      social_channels: requestedChannels.length ? requestedChannels : ["Instagram"],
      requested_plan: requestedPlan,
      logo_path: updates.logo_path === undefined ? current.logo_path : String(updates.logo_path || ""),
      onboarding_step: updates.onboarding_step === undefined
        ? current.onboarding_step
        : Math.min(3, Math.max(1, Number(updates.onboarding_step) || 1)),
      onboarding_completed: updates.onboarding_completed === undefined
        ? current.onboarding_completed
        : Boolean(updates.onboarding_completed)
    };

    const { data, error } = await client
      .from("profiles")
      .update(profileUpdates)
      .eq("id", user.id)
      .select("*")
      .single();
    if (error) throw error;

    await client.auth.updateUser({
      data: {
        full_name: data.full_name,
        business: data.business_name,
        preferred_language: data.preferred_language,
        primary_channel: data.primary_channel,
        social_channels: data.social_channels,
        requested_plan: data.requested_plan,
        logo_path: data.logo_path,
        onboarding_step: data.onboarding_step,
        onboarding_completed: data.onboarding_completed
      }
    });
    const hydratedProfile = await withSignedLogo(data);
    cacheProfile(hydratedProfile, user);
    return hydratedProfile;
  }

  document.querySelectorAll(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const input = button.parentElement.querySelector("input");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      button.setAttribute("aria-label", t(input.type === "password" ? "Покажи паролата" : "Скрий паролата"));
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
    if (banner) banner.textContent = t("Входът временно не е достъпен. Моля, опитай отново по-късно.");
  }

  if (new URLSearchParams(location.search).get("confirmed") === "1") {
    sessionStorage.removeItem(PENDING_EMAIL_KEY);
    showMessage("Имейлът е потвърден. Вече можеш да влезеш.", "success");
  }

  resendButton?.addEventListener("click", async () => {
    if (!client || !pendingConfirmationEmail) return;
    resendButton.disabled = true;
    const originalText = resendButton.textContent;
    resendButton.textContent = t("Изпращане…");
    try {
      const emailRedirectTo = new URL("login.html?confirmed=1", location.href).href;
      const { error } = await client.auth.resend({
        type: "signup",
        email: pendingConfirmationEmail,
        options: { emailRedirectTo }
      });
      if (error) throw error;
      showMessage("Изпратихме нов имейл за потвърждение.", "success");
    } catch (error) {
      showMessage(translateAuthError(error), "error");
    } finally {
      resendButton.disabled = false;
      resendButton.textContent = originalText;
    }
  });

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
          const remember = Boolean(data.get("remember"));
          if (remember) sessionStorage.removeItem(SESSION_ONLY_KEY);
          else sessionStorage.setItem(SESSION_ONLY_KEY, "1");
          pendingConfirmationEmail = String(data.get("email") || "").trim();
          const { data: result, error } = await client.auth.signInWithPassword({
            email: pendingConfirmationEmail,
            password: String(data.get("password") || "")
          });
          if (error) throw error;
          sessionStorage.removeItem(PENDING_EMAIL_KEY);
          setResendVisible(false);
          localStorage.removeItem("bizomedia-demo");
          const profile = await loadProfile(result.user);
          location.href = profile.onboarding_completed ? "dashboard.html" : "onboarding.html";
          return;
        }

        if (type === "register") {
          const password = String(data.get("password") || "");
          const confirmPassword = String(data.get("confirmPassword") || "");
          validatePassword(password);
          if (password !== confirmPassword) throw new Error("Паролите не съвпадат.");
          if (!data.get("legalConsent")) throw new Error("Потвърди Общите условия и Политиката за поверителност.");

          const fullName = String(data.get("fullName") || "").trim();
          const business = String(data.get("business") || "").trim();
          const email = String(data.get("email") || "").trim();
          const emailRedirectTo = new URL("login.html?confirmed=1", location.href).href;
          const { data: result, error } = await client.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo,
              data: {
                full_name: fullName,
                business,
                preferred_language: localStorage.getItem("bizomedia-language") || "bg",
                primary_channel: "Instagram",
                social_channels: ["Instagram"],
                requested_plan: "essential",
                terms_accepted: true,
                terms_version: TERMS_VERSION,
                onboarding_step: 1,
                onboarding_completed: false
              }
            }
          });
          if (error) throw error;
          saveUser(result.user);
          if (result.session) {
            location.href = "onboarding.html";
          } else {
            pendingConfirmationEmail = email;
            sessionStorage.setItem(PENDING_EMAIL_KEY, email);
            setResendVisible(true);
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
          validatePassword(password);
          if (password !== confirmPassword) throw new Error("Паролите не съвпадат.");
          const { error } = await client.auth.updateUser({ password });
          if (error) throw error;
          await client.auth.signOut({ scope: "local" });
          sessionStorage.removeItem("bizomedia-password-recovery");
          sessionStorage.removeItem(SESSION_ONLY_KEY);
          sessionStorage.removeItem(PENDING_EMAIL_KEY);
          clearProfileCache();
          authForm.reset();
          showMessage("Паролата е променена успешно. Вече можеш да влезеш.", "success");
          setTimeout(() => { location.href = "login.html"; }, 1400);
        }
      } catch (error) {
        const translated = translateAuthError(error);
        showMessage(t(translated), "error");
        if (String(error?.message || "").toLowerCase().includes("email not confirmed")) {
          sessionStorage.setItem(PENDING_EMAIL_KEY, pendingConfirmationEmail);
          setResendVisible(true);
        }
      } finally {
        setBusy(false);
      }
    });
  }

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      localStorage.removeItem("bizomedia-demo");
      if (client) await client.auth.signOut();
      sessionStorage.removeItem(SESSION_ONLY_KEY);
      sessionStorage.removeItem(PENDING_EMAIL_KEY);
      clearProfileCache();
      location.href = "login.html";
    });
  });

  async function preparePasswordRecovery() {
    if (document.body.dataset.page !== "reset-password" || !authForm) return;
    const submit = authForm.querySelector("button[type='submit']");
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(location.search);
    const recoveryHint = hash.get("type") === "recovery" || search.get("type") === "recovery" || search.has("code");
    const authError = search.get("error_description") || hash.get("error_description");

    if (!client) {
      if (submit) submit.disabled = true;
      return;
    }

    client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        sessionStorage.setItem("bizomedia-password-recovery", "1");
        if (submit) submit.disabled = false;
        showMessage("Линкът е потвърден. Въведи новата си парола.", "success");
      }
    });

    const { data, error } = await client.auth.getSession();
    const recoveryReady = Boolean(data.session) && (recoveryHint || sessionStorage.getItem("bizomedia-password-recovery") === "1");
    if (recoveryHint && data.session) sessionStorage.setItem("bizomedia-password-recovery", "1");
    if (submit) submit.disabled = !recoveryReady;
    if (authError || error || !recoveryReady) {
      showMessage(authError ? decodeURIComponent(authError.replace(/\+/g, " ")) : "Линкът е невалиден или е изтекъл. Поискай нов линк.", "error");
    }
  }

  async function protectDashboard() {
    if (!document.body.matches("[data-auth-required]")) return;
    const localPreview = document.body.dataset.page === "onboarding"
      && new URLSearchParams(location.search).get("preview") === "1"
      && ["", "localhost", "127.0.0.1"].includes(location.hostname);
    if (localPreview) {
      document.body.classList.add("auth-ready");
      setTimeout(() => {
        document.dispatchEvent(new CustomEvent("bizomedia:profile-ready", {
          detail: {
            user: { email: "preview@bizomedia.local" },
            profile: {
              full_name: "Милен Иванов",
              business_name: "Твоят бизнес",
              preferred_language: "bg",
              primary_channel: "Instagram",
              social_channels: ["Instagram", "Facebook", "LinkedIn"],
              plan: "growth",
              logo_path: "",
              logo_url: "",
              onboarding_completed: false
            }
          }
        }));
      }, 0);
      return;
    }
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
      const isOnboarding = document.body.dataset.page === "onboarding";
      if (!profile.onboarding_completed && !isOnboarding) {
        location.replace("onboarding.html");
        return;
      }
      if (profile.onboarding_completed && isOnboarding) {
        location.replace("dashboard.html");
        return;
      }
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

  async function redirectSignedInVisitor() {
    if (!client || !["login", "register"].includes(authForm?.dataset.authForm)) return;
    const hash = new URLSearchParams(location.hash.replace(/^#/, ""));
    const search = new URLSearchParams(location.search);
    if (hash.get("type") === "recovery" || search.get("type") === "recovery") {
      location.replace(`reset-password.html${location.search}${location.hash}`);
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session?.user) return;
      const profile = await loadProfile(data.session.user);
      localStorage.removeItem("bizomedia-demo");
      location.replace(profile.onboarding_completed ? "dashboard.html" : "onboarding.html");
    } catch {
      showMessage("Възникна грешка. Провери данните и опитай отново.", "error");
    } finally {
      setBusy(false);
    }
  }

  redirectSignedInVisitor();
  protectDashboard();
  preparePasswordRecovery();
  window.BizomediaAuth = { client, configured, loadProfile, updateProfile };
})();
