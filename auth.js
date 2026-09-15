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

  function saveUser(user) {
    if (!user) return;
    const metadata = user.user_metadata || {};
    const fullName = metadata.full_name || metadata.name || user.email?.split("@")[0] || "Клиент";
    localStorage.setItem("bizomedia-user-name", fullName);
    localStorage.setItem("bizomedia-user-business", metadata.business || "Моят бизнес");
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
    if (localStorage.getItem("bizomedia-demo") === "1") return;
    if (!client) {
      location.replace("login.html");
      return;
    }
    const { data, error } = await client.auth.getSession();
    if (error || !data.session) {
      location.replace("login.html");
      return;
    }
    saveUser(data.session.user);
  }

  protectDashboard();
  window.BizomediaAuth = { client, configured };
})();
