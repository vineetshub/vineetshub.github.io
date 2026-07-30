// Screen wiring + interactions.
(() => {
  const $ = (id) => document.getElementById(id);
  const packs = { ...PACKS }; // includes AI-generated packs added at runtime

  // ---- local setup state ----
  let players = [];
  let imposterCount = 1;
  let timerSeconds = 120;
  let hintOn = false;
  let selectedPack = DEFAULT_PACK;

  // ---- screen helper ----
  const screens = ["setup", "reveal", "play", "result"];
  function show(name) {
    screens.forEach((s) => $("screen-" + s).classList.toggle("active", s === name));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ================= SETUP ================= */
  function renderPlayers() {
    const list = $("playerList");
    list.innerHTML = "";
    players.forEach((name, i) => {
      const chip = document.createElement("span");
      chip.className = "chip";
      chip.innerHTML = `${escapeHtml(name)} <button data-i="${i}" aria-label="remove">✕</button>`;
      list.appendChild(chip);
    });
    list.querySelectorAll("button").forEach((b) =>
      b.addEventListener("click", () => { players.splice(+b.dataset.i, 1); afterPlayerChange(); })
    );
  }

  function afterPlayerChange() {
    renderPlayers();
    clampImposters();
    renderImposter();
  }

  function addPlayer() {
    const input = $("newPlayer");
    const name = input.value.trim();
    if (!name) return;
    if (players.length >= Game.MAX_PLAYERS) { flashError(`Up to ${Game.MAX_PLAYERS} players.`); return; }
    if (players.some((p) => p.toLowerCase() === name.toLowerCase())) { flashError("Name already added."); return; }
    players.push(name);
    input.value = "";
    input.focus();
    afterPlayerChange();
  }

  function renderPackSelect() {
    const sel = $("packSelect");
    sel.innerHTML = "";
    Object.entries(packs).forEach(([key, p]) => {
      const opt = document.createElement("option");
      opt.value = key;
      opt.textContent = p.label + (p.ai ? "  ·  ✨" : "");
      sel.appendChild(opt);
    });
    sel.value = selectedPack;
    renderPreview();
  }

  function renderPreview() {
    const p = packs[selectedPack];
    const box = $("packPreview");
    box.innerHTML = "";
    if (!p) return;
    p.players.slice(0, 6).forEach((n) => {
      const s = document.createElement("span");
      s.textContent = Array.isArray(n) ? n[0] : n;
      box.appendChild(s);
    });
    const more = document.createElement("span");
    more.textContent = `+${Math.max(0, p.players.length - 6)} more`;
    box.appendChild(more);
  }

  function clampImposters() {
    const max = players.length >= Game.MIN_PLAYERS
      ? Math.max(1, Math.ceil(players.length / 2) - 1) : 1;
    if (imposterCount > max) imposterCount = max;
    if (imposterCount < 1) imposterCount = 1;
  }
  function renderImposter() { $("impCount").textContent = imposterCount; }
  function renderTimer() {
    $("timeVal").textContent = fmt(timerSeconds);
  }

  function flashError(msg) {
    const el = $("setupError");
    el.textContent = msg;
    clearTimeout(flashError._t);
    flashError._t = setTimeout(() => (el.textContent = ""), 2600);
  }

  function startGame() {
    if (players.length < Game.MIN_PLAYERS) return flashError(`Need at least ${Game.MIN_PLAYERS} players.`);
    Game.setPlayers(players);
    Game.state.pack = packs[selectedPack];
    Game.state.imposterCount = imposterCount;
    Game.state.hintOn = hintOn;
    Game.state.roundSeconds = timerSeconds;
    Game.reset();
    if (!Game.canStart()) return flashError("Pick a valid category and players.");
    beginRound();
  }

  /* ================= REVEAL ================= */
  let revealIdx = 0;

  function beginRound() {
    Game.startRound();
    revealIdx = 0;
    show("reveal");
    renderReveal();
  }

  function renderReveal() {
    const card = $("revealCard");
    card.classList.remove("flipped");
    const name = Game.state.players[revealIdx];
    $("revealName").textContent = name;
    $("revealNext").textContent =
      revealIdx === Game.state.players.length - 1 ? "Everyone's in — start" : "Got it — next player";
    // fill the back now; it stays hidden until the flip
    const role = Game.roleFor(revealIdx);
    const noun = Game.state.current.noun;
    const back = $("revealBack");
    if (role.ringer) {
      let hintHtml = "";
      if (role.hint) {
        hintHtml = `<div class="role-hint">One vague clue about the secret ${escapeHtml(noun)}:<br>
          <strong class="role-clue">${escapeHtml(role.hint)}</strong><br>
          <span class="dim">Bluff accordingly.</span></div>`;
      } else {
        hintHtml = `<div class="role-hint">You're flying blind. Listen closely and blend in.</div>`;
      }
      back.innerHTML = `<div>
        <div class="role-tag">Your role</div>
        <div class="role-name ringer">You're the Ringer</div>
        ${hintHtml}
      </div>`;
    } else {
      back.innerHTML = `<div>
        <div class="role-tag">The secret ${escapeHtml(noun)} is</div>
        <div class="role-name">${escapeHtml(role.star)}</div>
        <div class="role-sport">${escapeHtml(role.sport)}</div>
        <div class="role-hint" style="margin-top:14px">Give a one-word clue on your turn. Don't be too obvious.</div>
      </div>`;
    }
  }

  function flipReveal() { $("revealCard").classList.toggle("flipped"); }

  function nextReveal() {
    if (!$("revealCard").classList.contains("flipped")) {
      // nudge: must peek before passing
      $("revealCard").classList.add("flipped");
      return;
    }
    revealIdx++;
    if (revealIdx >= Game.state.players.length) { startDiscussion(); return; }
    renderReveal();
  }

  /* ================= DISCUSSION ================= */
  let timerId = null, remaining = 0, paused = false;

  function startDiscussion() {
    show("play");
    renderClueOrder();
    remaining = Game.state.roundSeconds;
    paused = false;
    $("pauseBtn").textContent = "Pause";
    renderClock();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function renderClueOrder() {
    const box = $("clueOrder");
    box.innerHTML = "";
    Game.state.current.order.forEach((pIdx, i) => {
      const el = document.createElement("span");
      el.className = "who";
      el.innerHTML = `<span class="num">${i + 1}</span>${escapeHtml(Game.state.players[pIdx])}`;
      box.appendChild(el);
    });
  }

  function tick() {
    if (paused) return;
    remaining--;
    renderClock();
    if (remaining <= 0) { clearInterval(timerId); revealAnswer(); }
  }

  function renderClock() {
    const t = $("timer");
    t.textContent = fmt(Math.max(0, remaining));
    t.classList.toggle("low", remaining <= 15);
  }

  function togglePause() {
    paused = !paused;
    $("pauseBtn").textContent = paused ? "Resume" : "Pause";
  }

  /* ================= REVEAL ANSWER ================= */
  // No in-app voting — the group argues and votes out loud, then taps to reveal.
  function revealAnswer() {
    clearInterval(timerId);
    show("result");
    const star = Game.state.current.star;
    const ringers = Game.imposterNames();
    const many = ringers.length > 1;

    $("resultBanner").className = "banner win";
    $("resultBanner").textContent = many ? "The ringers were…" : "The ringer was…";

    $("resultBody").innerHTML = `
      <p class="big-name">${ringers.map(escapeHtml).join("<br>")}</p>
      <p class="who-list" style="margin-top:16px">The secret ${escapeHtml(Game.state.current.noun)} was</p>
      <p class="label" style="font-size:20px;color:var(--text);margin-top:4px">${escapeHtml(star)}</p>`;
  }

  /* ================= AI MODAL ================= */
  function openModal() {
    const cfg = AI.load();
    $("aiProvider").value = cfg.provider;
    $("aiModel").value = cfg.model;
    $("aiKey").value = cfg.key;
    $("aiUrl").value = cfg.url;
    toggleProviderRows();
    $("aiStatus").textContent = "";
    $("modal").classList.add("open");
  }
  function closeModal() { $("modal").classList.remove("open"); }
  function toggleProviderRows() {
    const p = $("aiProvider").value;
    $("ollamaRow").classList.toggle("hidden", p !== "ollama");
    $("keyRow").classList.toggle("hidden", p === "ollama");
    const ph = { openai: "gpt-4o-mini", anthropic: "claude-3-5-haiku-latest", ollama: "llama3.1" };
    if (!$("aiModel").value) $("aiModel").placeholder = ph[p];
  }
  function saveAi() {
    AI.save({
      provider: $("aiProvider").value,
      model: $("aiModel").value.trim(),
      key: $("aiKey").value.trim(),
      url: $("aiUrl").value.trim() || "http://localhost:11434"
    });
    const st = $("aiStatus");
    st.className = "hint ok";
    st.textContent = "Saved. You can generate categories now.";
  }

  async function generatePack() {
    if (!AI.ready()) { openModal(); $("aiStatus").className = "hint err"; $("aiStatus").textContent = "Add a provider key first."; return; }
    const theme = prompt("Describe a category of sports figures:\n(e.g. '2000s NBA point guards', 'Hall of Fame NFL wide receivers')");
    if (!theme) return;
    const btn = $("aiPackBtn");
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = "✨ Generating…";
    try {
      const pack = await AI.generatePack(theme);
      const key = "ai_" + Date.now();
      packs[key] = { ...pack, ai: true };
      selectedPack = key;
      renderPackSelect();
      flashError("");
    } catch (e) {
      flashError("Generation failed: " + e.message);
    } finally {
      btn.disabled = false;
      btn.textContent = original;
    }
  }

  /* ================= utils ================= */
  function fmt(sec) {
    const m = Math.floor(sec / 60), s = sec % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ================= bind ================= */
  function init() {
    renderPlayers();
    renderPackSelect();
    renderImposter();
    renderTimer();

    $("addPlayer").addEventListener("click", addPlayer);
    $("newPlayer").addEventListener("keydown", (e) => { if (e.key === "Enter") addPlayer(); });

    $("packSelect").addEventListener("change", (e) => { selectedPack = e.target.value; renderPreview(); });
    $("aiPackBtn").addEventListener("click", generatePack);

    $("impMinus").addEventListener("click", () => { imposterCount = Math.max(1, imposterCount - 1); renderImposter(); });
    $("impPlus").addEventListener("click", () => {
      const max = players.length >= Game.MIN_PLAYERS ? Math.max(1, Math.ceil(players.length / 2) - 1) : 1;
      if (imposterCount >= max) return flashError(`Max ${max} ringer${max > 1 ? "s" : ""} for ${players.length} players.`);
      imposterCount++; renderImposter();
    });

    $("timeMinus").addEventListener("click", () => { timerSeconds = Math.max(30, timerSeconds - 30); renderTimer(); });
    $("timePlus").addEventListener("click", () => { timerSeconds = Math.min(300, timerSeconds + 30); renderTimer(); });

    $("hintToggle").addEventListener("click", () => {
      hintOn = !hintOn;
      $("hintToggle").setAttribute("aria-checked", String(hintOn));
    });

    $("startBtn").addEventListener("click", startGame);

    $("revealCard").addEventListener("click", flipReveal);
    $("revealNext").addEventListener("click", nextReveal);

    $("pauseBtn").addEventListener("click", togglePause);
    $("revealBtn").addEventListener("click", revealAnswer);

    $("nextRoundBtn").onclick = beginRound;
    $("endGameBtn").addEventListener("click", () => { clearInterval(timerId); show("setup"); });

    $("settingsBtn").addEventListener("click", openModal);
    $("closeModal").addEventListener("click", closeModal);
    $("modal").addEventListener("click", (e) => { if (e.target === $("modal")) closeModal(); });
    $("aiProvider").addEventListener("change", toggleProviderRows);
    $("saveAi").addEventListener("click", saveAi);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
