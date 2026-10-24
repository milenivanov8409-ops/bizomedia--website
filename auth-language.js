(() => {
  const translations = {
  "Вход": "Login",
  "Регистрация": "Register",
  "Възстановяване на парола": "Password recovery",
  "Нова парола": "New password",
  "Съдържание и реклами.": "Content and advertising.",
  "Под твой контрол.": "Under your control.",
  "Календар, одобрения и резултати за Facebook, Instagram, LinkedIn, X и Google Ads — в една защитена клиентска платформа.": "Plan and review your content in your client workspace. Publishing and reporting are managed by our team.",
  "Календар, одобрения и резултати за Instagram, Facebook, LinkedIn, X, TikTok, Google Ads и Email Marketing — в една защитена клиентска платформа.": "Plan and review your content in your client workspace. Publishing and reporting are managed by our team.",
  "© 2026 Bizomedia · Варна, България": "© 2026 Bizomedia · Varna, Bulgaria",
  "← Обратно към сайта": "← Back to website",
  "Добре дошъл": "Welcome back",
  "Влез в своето My Bizomedia Studio.": "Log in to My Bizomedia Studio.",
  "ИМЕЙЛ": "EMAIL",
  "ПАРОЛА": "PASSWORD",
  "Запомни ме": "Remember me",
  "Забравена парола?": "Forgot password?",
  "Изпрати отново имейла за потвърждение": "Resend confirmation email",
  "или разгледай платформата": "or explore a sample workspace",
  "Разгледай демо с примерни данни": "Explore demo with sample data",
  "Демо режимът показва примерни данни. За своя бизнес използвай вход или регистрация.": "Demo mode shows sample data. Log in or register to access your business workspace.",
  "Нямаш профил?": "New here?",
  "Създай профил": "Create account",
  "Създай профил, а след потвърждението ще настроиш каналите, пакета и своето лого.": "Create an account, then confirm your email to set up your channels, package and logo.",
  "ИМЕ И ФАМИЛИЯ": "FULL NAME",
  "БИЗНЕС": "BUSINESS",
  "Иван Петров": "Your full name",
  "ПОВТОРИ ПАРОЛАТА": "CONFIRM PASSWORD",
  "Поне 10 символа": "At least 10 characters",
  "Повтори паролата": "Repeat password",
  "Минимум 10 символа, главна и малка буква и цифра.": "At least 10 characters, including uppercase, lowercase and a number.",
  "Съгласявам се с": "I agree to the",
  "Общите условия": "Terms of Service",
  "и": "and",
  "Политиката за поверителност": "Privacy Policy",
  "Вече имаш профил?": "Already have an account?",
  "← Обратно към вход": "← Back to login",
  "Забравена парола": "Forgot password",
  "Въведи имейла на профила си.": "Enter the email address for your account.",
  "Изпрати линк": "Send reset link",
  "Сигурен достъп.": "Secure access.",
  "Нова парола.": "New password.",
  "Избери нова парола за своя Bizomedia профил.": "Choose a new password for your Bizomedia account.",
  "Създай нова парола": "Create a new password",
  "Паролата трябва да съдържа поне 10 символа, главна и малка буква и цифра.": "Use at least 10 characters, including uppercase, lowercase and a number.",
  "НОВА ПАРОЛА": "NEW PASSWORD",
  "Запази новата парола": "Save new password",
  "Покажи паролата": "Show password",
  "Скрий паролата": "Hide password",
  "Моля, изчакай…": "Please wait…",
  "Невалиден имейл или парола.": "Invalid email or password.",
  "Потвърди имейла си, преди да влезеш.": "Confirm your email before logging in.",
  "Вече има профил с този имейл.": "An account with this email already exists.",
  "Изпратени са твърде много имейли. Опитай отново след малко.": "Too many emails sent. Please try again shortly.",
  "Избери по-сигурна парола.": "Choose a stronger password.",
  "Новата парола трябва да е различна от старата.": "Your new password must be different from your old password.",
  "Линкът е изтекъл или вече е използван. Поискай нов.": "This link has expired or has already been used. Request a new one.",
  "Възникна грешка. Провери данните и опитай отново.": "Something went wrong. Check your details and try again.",
  "Паролата трябва да съдържа поне 10 символа.": "Your password must have at least 10 characters.",
  "Паролата трябва да съдържа главна и малка буква и цифра.": "Include uppercase, lowercase and a number in your password.",
  "Входът временно не е достъпен. Моля, опитай отново по-късно.": "Login is temporarily unavailable. Please try again later.",
  "Входът временно не е достъпен.": "Login is temporarily unavailable.",
  "Имейлът е потвърден. Вече можеш да влезеш.": "Email confirmed. You can now log in.",
  "Изпращане…": "Sending…",
  "Изпратихме нов имейл за потвърждение.": "We sent a new confirmation email.",
  "Паролите не съвпадат.": "Passwords do not match.",
  "Потвърди Общите условия и Политиката за поверителност.": "Accept the Terms of Service and Privacy Policy.",
  "Профилът е създаден. Провери имейла си и потвърди регистрацията.": "Account created. Check your email to confirm your registration.",
  "Изпратихме ти линк за възстановяване на паролата.": "If an account exists for this email, you will receive a password reset link.",
  "Паролата е променена успешно. Вече можеш да влезеш.": "Password changed. You can now log in.",
  "Линкът е потвърден. Въведи новата си парола.": "Link confirmed. Enter your new password.",
  "Линкът е невалиден или е изтекъл. Поискай нов линк.": "This link is invalid or expired. Request a new link."
};
  let language = localStorage.getItem("bizomedia-language") === "en" ? "en" : "bg";
  const textNodes = [];
  const walker = document.createTreeWalker(document.querySelector(".auth-page"), NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (translations[node.textContent.trim()]) textNodes.push([node, node.textContent]);
  }
  const attributes = [];
  document.querySelectorAll("[placeholder], [aria-label]").forEach(element => {
    ["placeholder", "aria-label"].forEach(name => {
      const value = element.getAttribute(name);
      if (translations[value]) attributes.push([element, name, value]);
    });
  });
  const title = document.title;
  function translate(text) { return language === "en" ? (translations[text] || text) : text; }
  function apply() {
    document.documentElement.lang = language;
    textNodes.forEach(([node, original]) => { node.textContent = original.replace(original.trim(), translate(original.trim())); });
    attributes.forEach(([element, name, original]) => element.setAttribute(name, translate(original)));
    document.title = title.split(" · ").map(translate).join(" · ");
    document.querySelectorAll("[data-auth-language]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.authLanguage === language));
    });
  }
  document.querySelectorAll("[data-auth-language]").forEach(button => button.addEventListener("click", () => {
    language = button.dataset.authLanguage;
    localStorage.setItem("bizomedia-language", language);
    // Reload so validation, loading labels and any existing messages use the selected language.
    location.reload();
  }));
  window.BizomediaAuthText = translate;
  apply();
})();
