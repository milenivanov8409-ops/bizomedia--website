(() => {
  const form = document.querySelector("[data-onboarding-form]");
  if (!form) return;

  const steps = [...document.querySelectorAll("[data-step]")];
  const dots = [...document.querySelectorAll("[data-step-dot]")];
  const businessInput = form.elements.business;
  const logoInput = form.elements.logo;
  const logoImage = document.querySelector("[data-logo-image]");
  const logoPlaceholder = document.querySelector("[data-logo-placeholder]");
  const removeLogoButton = document.querySelector("[data-remove-logo]");
  const message = document.querySelector("[data-onboarding-message]");
  const isLocalPreview = new URLSearchParams(location.search).get("preview") === "1"
    && ["", "localhost", "127.0.0.1"].includes(location.hostname);
  let currentStep = 1;
  let currentProfile = null;
  let removeLogo = false;
  let logoPreviewUrl = "";

  function showStep(step) {
    currentStep = Math.min(3, Math.max(1, step));
    steps.forEach((panel) => panel.classList.toggle("active", Number(panel.dataset.step) === currentStep));
    dots.forEach((dot) => {
      const number = Number(dot.dataset.stepDot);
      dot.classList.toggle("active", number === currentStep);
      dot.classList.toggle("complete", number < currentStep);
    });
  }

  function setLogoPreview(url) {
    if (url) {
      logoImage.src = url;
      logoImage.hidden = false;
      logoPlaceholder.hidden = true;
      if (removeLogoButton) removeLogoButton.hidden = false;
      return;
    }
    logoImage.removeAttribute("src");
    logoImage.hidden = true;
    logoPlaceholder.hidden = false;
    if (removeLogoButton) removeLogoButton.hidden = true;
  }

  function fillProfile(profile) {
    if (!profile) return;
    currentProfile = profile;
    businessInput.value = profile.business_name || "";
    setLogoPreview(profile.logo_url || "");

    const channels = Array.isArray(profile.social_channels) && profile.social_channels.length
      ? profile.social_channels
      : [profile.primary_channel || "Instagram"];
    form.querySelectorAll("input[name='channels']").forEach((input) => {
      input.checked = channels.includes(input.value);
    });

    const plan = form.querySelector(`input[name='plan'][value='${profile.requested_plan || "essential"}']`);
    if (plan) plan.checked = true;
    showStep(Number(profile.onboarding_step) || 1);
  }

  document.addEventListener("bizomedia:profile-ready", (event) => fillProfile(event.detail.profile));

  logoInput.addEventListener("change", () => {
    const file = logoInput.files?.[0];
    if (!file) return;
    if (!file.type.match(/^image\/(png|jpeg|webp)$/) || file.size > 2 * 1024 * 1024) {
      logoInput.value = "";
      message.textContent = "Избери PNG, JPG или WebP файл до 2 MB.";
      message.className = "onboarding-message error";
      return;
    }
    message.textContent = "";
    removeLogo = false;
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    logoPreviewUrl = URL.createObjectURL(file);
    setLogoPreview(logoPreviewUrl);
  });

  removeLogoButton?.addEventListener("click", () => {
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    logoPreviewUrl = "";
    logoInput.value = "";
    removeLogo = true;
    setLogoPreview("");
    message.textContent = "Логото ще бъде премахнато при запазване.";
    message.className = "onboarding-message";
  });

  async function uploadLogoIfNeeded(auth, user) {
    const previousPath = currentProfile?.logo_path || "";
    if (removeLogo) return { logoPath: "", previousPath };
    const logoFile = logoInput.files?.[0];
    if (!logoFile) return { logoPath: previousPath, previousPath: "" };

    const logoPath = `${user.id}/profile/logo`;
    const { error } = await auth.client.storage
      .from("post-media")
      .upload(logoPath, logoFile, { upsert: true, cacheControl: "3600", contentType: logoFile.type });
    if (error) throw error;
    return { logoPath, previousPath: previousPath !== logoPath ? previousPath : "" };
  }

  async function saveProgress(nextStep) {
    if (isLocalPreview) return;
    const auth = window.BizomediaAuth;
    if (!auth?.client) throw new Error("Профилът временно не е достъпен.");
    const { data: sessionData, error: sessionError } = await auth.client.auth.getSession();
    const user = sessionData?.session?.user;
    if (sessionError || !user) throw new Error("Сесията е изтекла. Влез отново.");

    const channels = [...form.querySelectorAll("input[name='channels']:checked")].map((input) => input.value);
    const logoFileSelected = currentStep === 1 && Boolean(logoInput.files?.[0]);
    const { logoPath, previousPath } = currentStep === 1
      ? await uploadLogoIfNeeded(auth, user)
      : { logoPath: currentProfile?.logo_path || "", previousPath: "" };
    let profile;
    try {
      profile = await auth.updateProfile({
        business_name: businessInput.value.trim(),
        primary_channel: channels[0] || currentProfile?.primary_channel || "Instagram",
        social_channels: channels.length ? channels : currentProfile?.social_channels,
        requested_plan: form.querySelector("input[name='plan']:checked")?.value || currentProfile?.requested_plan,
        logo_path: logoPath,
        onboarding_step: nextStep,
        onboarding_completed: false
      });
    } catch (error) {
      if (logoFileSelected && logoPath && logoPath !== currentProfile?.logo_path) {
        await auth.client.storage.from("post-media").remove([logoPath]);
      }
      throw error;
    }
    currentProfile = profile;
    removeLogo = false;
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    logoPreviewUrl = "";
    setLogoPreview(profile.logo_url || "");
    logoInput.value = "";
    if (previousPath) await auth.client.storage.from("post-media").remove([previousPath]);
  }

  document.querySelectorAll("[data-next-step]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (currentStep === 1 && !businessInput.reportValidity()) return;
      if (currentStep === 2 && !form.querySelector("input[name='channels']:checked")) {
        message.textContent = "Избери поне един канал.";
        message.className = "onboarding-message error";
        return;
      }
      message.textContent = "";
      const nextStep = currentStep + 1;
      const originalText = button.textContent;
      button.disabled = true;
      button.textContent = "Запазване…";
      try {
        await saveProgress(nextStep);
        showStep(nextStep);
      } catch (error) {
        message.textContent = error?.message || "Стъпката не можа да бъде запазена.";
        message.className = "onboarding-message error";
      } finally {
        button.disabled = false;
        button.textContent = originalText;
      }
    });
  });

  document.querySelectorAll("[data-prev-step]").forEach((button) => {
    button.addEventListener("click", () => showStep(currentStep - 1));
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const auth = window.BizomediaAuth;
    const submit = form.querySelector("button[type='submit']");
    const channels = [...form.querySelectorAll("input[name='channels']:checked")].map((input) => input.value);
    const requestedPlan = form.querySelector("input[name='plan']:checked")?.value;

    if (!channels.length) {
      showStep(2);
      message.textContent = "Избери поне един канал.";
      message.className = "onboarding-message error";
      return;
    }
    if (!requestedPlan) {
      message.textContent = "Избери план, за да продължиш.";
      message.className = "onboarding-message error";
      return;
    }
    if (!auth?.client) {
      message.textContent = "Профилът временно не е достъпен.";
      message.className = "onboarding-message error";
      return;
    }

    submit.disabled = true;
    submit.dataset.originalText ||= submit.textContent;
    submit.textContent = "Подготвяме студиото…";
    message.textContent = "";

    try {
      const { data: sessionData, error: sessionError } = await auth.client.auth.getSession();
      const user = sessionData?.session?.user;
      if (sessionError || !user) throw new Error("Сесията е изтекла. Влез отново.");

      const profile = await auth.updateProfile({
        business_name: businessInput.value.trim(),
        primary_channel: channels[0],
        social_channels: channels,
        requested_plan: requestedPlan,
        onboarding_step: 3,
        onboarding_completed: true
      });
      currentProfile = profile;
      message.textContent = "Готово — твоето студио е подготвено.";
      message.className = "onboarding-message success";
      setTimeout(() => { location.href = "dashboard.html"; }, 650);
    } catch (error) {
      message.textContent = error?.message || "Настройката не можа да бъде запазена. Опитай отново.";
      message.className = "onboarding-message error";
      submit.disabled = false;
      submit.textContent = submit.dataset.originalText;
    }
  });

  showStep(1);
})();
