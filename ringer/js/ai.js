// Optional AI layer. Generates a fresh themed category of players on demand.
// Talks to the provider directly from the browser; the key never leaves this device.

const AI = (() => {
  const STORE_KEY = "ringer.ai";

  const defaults = {
    provider: "openai",
    model: "gpt-4o-mini",
    key: "",
    url: "http://localhost:11434"
  };

  function load() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(STORE_KEY) || "{}") }; }
    catch { return { ...defaults }; }
  }

  function save(cfg) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(cfg)); } catch { /* storage unavailable */ }
  }

  function ready() {
    const c = load();
    return c.provider === "ollama" ? !!c.url : !!c.key;
  }

  const PROMPT = (theme) =>
    `You are helping build a party guessing game. Return a JSON object for a category ` +
    `of real, well-known sports figures based on this theme: "${theme}". ` +
    `Shape: {"label": string, "sport": string, "players": string[]}. ` +
    `Give exactly 16 distinct, famous, unambiguous full names. No commentary, JSON only.`;

  function extractJSON(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in response");
    return JSON.parse(text.slice(start, end + 1));
  }

  async function callOpenAI(cfg, prompt) {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.key}` },
      body: JSON.stringify({
        model: cfg.model || "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8
      })
    });
    if (!r.ok) throw new Error(`OpenAI ${r.status}`);
    const data = await r.json();
    return data.choices[0].message.content;
  }

  async function callAnthropic(cfg, prompt) {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": cfg.key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: JSON.stringify({
        model: cfg.model || "claude-3-5-haiku-latest",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }]
      })
    });
    if (!r.ok) throw new Error(`Anthropic ${r.status}`);
    const data = await r.json();
    return data.content[0].text;
  }

  async function callOllama(cfg, prompt) {
    const base = (cfg.url || "http://localhost:11434").replace(/\/$/, "");
    const r = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: cfg.model || "llama3.1", prompt, stream: false })
    });
    if (!r.ok) throw new Error(`Ollama ${r.status}`);
    const data = await r.json();
    return data.response;
  }

  async function generatePack(theme) {
    const cfg = load();
    const prompt = PROMPT(theme);
    let raw;
    if (cfg.provider === "anthropic") raw = await callAnthropic(cfg, prompt);
    else if (cfg.provider === "ollama") raw = await callOllama(cfg, prompt);
    else raw = await callOpenAI(cfg, prompt);

    const pack = extractJSON(raw);
    if (!pack.players || pack.players.length < 6) throw new Error("Not enough players returned");
    pack.label = pack.label || theme;
    pack.sport = pack.sport || "Sports";
    pack.players = pack.players.map((p) => String(p).trim()).filter(Boolean).slice(0, 16);
    return pack;
  }

  return { load, save, ready, generatePack };
})();
