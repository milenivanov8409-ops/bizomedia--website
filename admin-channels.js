(() => {
  const openButton = document.querySelector("[data-open-admin-channels]");
  const dialog = document.querySelector("[data-admin-channels-dialog]");
  const list = document.querySelector("[data-admin-channel-list]");
  const badge = document.querySelector("[data-admin-channel-count]");
  const summary = document.querySelector("[data-admin-channel-summary]");
  const message = document.querySelector("[data-admin-channel-message]");
  if (!openButton || !dialog || !list) return;

  const demoKey = "bizomedia-demo-channel-connections-v1";
  const providers = {
    Instagram: { icon: "◎", className: "instagram" },
    Facebook: { icon: "f", className: "facebook" },
    LinkedIn: { icon: "in", className: "linkedin" },
    X: { icon: "X", className: "x" },
    TikTok: { icon: "♪", className: "tiktok" },
    "Google Ads": { icon: "G", className: "google" },
    Email: { icon: "✉", className: "email" }
  };
  let connections = [];
  let profiles = new Map();

  const isDemo = () => new URLSearchParams(location.search).get("demo") === "1" || localStorage.getItem("bizomedia-admin-demo") === "1";

  function element(tag, value = "", className = "") {
    const node = document.createElement(tag);
    node.textContent = value;
    if (className) node.className = className;
    return node;
  }

  function readDemo() {
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem(demoKey) || "[]"); } catch (_) { stored = []; }
    if (!stored.length) {
      stored = [
        { id: "demo-instagram", user_id: "client-a", provider: "Instagram", account_name: "Urban Café", account_identifier: "@urbancafe", status: "connected", posts_synced: 12, reach_30d: 48200 },
        { id: "demo-facebook", user_id: "client-a", provider: "Facebook", account_name: "Urban Café Varna", account_identifier: "facebook.com/urbancafe", status: "requested", posts_synced: 0, reach_30d: 0 }
      ];
    }
    connections = stored.map((item) => ({ ...item, user_id: item.user_id || "client-a" }));
    profiles = new Map([
      ["client-a", { full_name: "Мария Николова", business_name: "Urban Café" }],
      ["client-b", { full_name: "Иван Петров", business_name: "FitZone" }]
    ]);
  }

  function updateBadge() {
    const count = connections.filter((item) => item.status === "requested" || item.status === "action_required").length;
    badge.textContent = String(count);
    badge.hidden = count === 0;
    if (summary) summary.textContent = `${connections.length} канала · ${count} чакат действие`;
  }

  function render() {
    updateBadge();
    if (!connections.length) {
      list.replaceChildren(element("div", "Все още няма заявки за свързване на канали.", "admin-message-empty"));
      return;
    }
    const rows = connections.map((connection) => {
      const profile = profiles.get(connection.user_id) || { full_name: "Клиент", business_name: "Клиентски профил" };
      const meta = providers[connection.provider] || { icon: "•", className: "email" };
      const row = document.createElement("article");
      row.className = "admin-channel-row";

      const client = document.createElement("div");
      client.className = "admin-channel-client";
      client.append(element("strong", profile.business_name || "Клиентски профил"), element("small", profile.full_name || "Клиент"));

      const account = document.createElement("div");
      account.className = "admin-channel-provider";
      account.append(element("span", meta.icon, `platform-logo ${meta.className}`));
      const accountText = document.createElement("div");
      accountText.className = "admin-channel-account";
      accountText.append(element("strong", connection.provider === "Email" ? "Email Marketing" : connection.provider), element("small", `${connection.account_name} · ${connection.account_identifier}`));
      account.append(accountText);

      const select = document.createElement("select");
      select.className = "admin-channel-state";
      [["requested", "Заявено"], ["connected", "Свързан"], ["action_required", "Нужно действие"]].forEach(([value, label]) => {
        const option = element("option", label);
        option.value = value;
        option.selected = connection.status === value;
        select.append(option);
      });

      const save = element("button", "Запази", "admin-channel-save");
      save.type = "button";
      save.addEventListener("click", () => saveStatus(connection, select, save));
      row.append(client, account, select, save);
      return row;
    });
    list.replaceChildren(...rows);
  }

  function setMessage(value = "", type = "") {
    if (!message) return;
    message.textContent = value;
    message.className = `admin-message-status ${type}`.trim();
  }

  async function load() {
    setMessage();
    if (isDemo()) {
      readDemo();
      render();
      return;
    }
    const auth = window.BizomediaAuth;
    if (!auth?.client) return;
    const [{ data: channelRows, error: channelError }, { data: profileRows, error: profileError }] = await Promise.all([
      auth.client.from("channel_connections").select("id,user_id,provider,account_name,account_identifier,status,posts_synced,reach_30d,last_synced_at,updated_at").order("updated_at", { ascending: false }),
      auth.client.from("profiles").select("id,full_name,business_name")
    ]);
    if (channelError || profileError) {
      setMessage(channelError?.message || profileError?.message || "Каналите не могат да бъдат заредени.", "error");
      return;
    }
    connections = channelRows || [];
    profiles = new Map((profileRows || []).map((profile) => [profile.id, profile]));
    render();
  }

  async function saveStatus(connection, select, button) {
    const status = select.value;
    button.disabled = true;
    button.textContent = "Запазваме…";
    setMessage();
    try {
      if (isDemo()) {
        connections = connections.map((item) => item.id === connection.id ? { ...item, status, last_synced_at: status === "connected" ? new Date().toISOString() : item.last_synced_at } : item);
        localStorage.setItem(demoKey, JSON.stringify(connections));
      } else {
        const updates = { status, last_synced_at: status === "connected" ? new Date().toISOString() : connection.last_synced_at };
        const { error } = await window.BizomediaAuth.client.from("channel_connections").update(updates).eq("id", connection.id);
        if (error) throw error;
        await load();
      }
      render();
      setMessage("Статусът на канала е запазен.", "success");
    } catch (error) {
      setMessage(error?.message || "Статусът не може да бъде запазен.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Запази";
    }
  }

  openButton.addEventListener("click", () => { dialog.showModal(); load(); });
  dialog.querySelector("[data-close-admin-channels]")?.addEventListener("click", () => dialog.close());
  dialog.querySelector("[data-admin-channel-refresh]")?.addEventListener("click", load);
  dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); });
  load();
})();
