// Core game state + round logic. No UI in here — main.js drives the screens.

const Game = (() => {
  const state = {
    players: [],
    pack: null,          // { label, sport, players: [] }
    imposterCount: 1,
    hintOn: false,
    roundSeconds: 120,
    round: 0,
    current: null,       // per-round data
    prevImposters: "",   // to avoid repeating the exact same ringer set
    prevStarter: -1      // to avoid the same person opening twice in a row
  };

  const MAX_PLAYERS = 8;
  const MIN_PLAYERS = 3;

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sample(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  // Max ringers that still leaves the crew in the majority.
  function maxImposters() {
    return Math.max(1, Math.ceil(state.players.length / 2) - 1);
  }

  function setPlayers(list) {
    state.players = list.slice(0, MAX_PLAYERS);
    if (state.imposterCount > maxImposters()) state.imposterCount = maxImposters();
  }

  function canStart() {
    return state.players.length >= MIN_PLAYERS && state.pack && state.pack.players.length >= 4;
  }

  // Pick the ringer indices for this round. Rotates: never repeats the exact
  // same lineup back-to-back, so a new person is on the hook each round.
  function pickImposters() {
    const n = state.players.length;
    const count = Math.min(state.imposterCount, maxImposters());
    let pick;
    for (let tries = 0; tries < 20; tries++) {
      pick = sample([...Array(n).keys()], count).sort((a, b) => a - b);
      if (pick.join(",") !== state.prevImposters) break;
    }
    state.prevImposters = pick.join(",");
    return new Set(pick);
  }

  // Entries may be [name, hint] tuples (built-in packs) or plain name strings
  // (AI-generated packs, which carry no hint).
  function entryName(e) { return Array.isArray(e) ? e[0] : e; }
  function entryHint(e) { return Array.isArray(e) ? e[1] : null; }

  function startRound() {
    const entry = state.pack.players[Math.floor(Math.random() * state.pack.players.length)];
    const star = entryName(entry);
    const starHint = entryHint(entry);
    const imposters = pickImposters();
    // A different player opens each round.
    let starter = Math.floor(Math.random() * state.players.length);
    if (state.players.length > 1) {
      while (starter === state.prevStarter) starter = Math.floor(Math.random() * state.players.length);
    }
    state.prevStarter = starter;

    state.round += 1;
    state.current = {
      star,
      sport: state.pack.sport,
      noun: state.pack.noun || "pick",
      imposters,               // Set of player indices
      starter,                 // index of player who speaks first
      hint: state.hintOn ? starHint : null,   // vague attribute clue, or null
      order: rotateFrom(state.players.length, starter)
    };
    return state.current;
  }

  function rotateFrom(n, start) {
    const order = [];
    for (let i = 0; i < n; i++) order.push((start + i) % n);
    return order;
  }

  function roleFor(idx) {
    const c = state.current;
    if (c.imposters.has(idx)) {
      return { ringer: true, hint: c.hint };
    }
    return { ringer: false, star: c.star, sport: c.sport };
  }

  function reset() {
    state.round = 0;
    state.current = null;
    state.prevImposters = "";
    state.prevStarter = -1;
  }

  return {
    state, MAX_PLAYERS, MIN_PLAYERS,
    setPlayers, canStart, maxImposters,
    startRound, roleFor, reset,
    // expose helpers used by UI
    imposterNames: () => [...state.current.imposters].map((i) => state.players[i]),
    starterName: () => state.players[state.current.starter]
  };
})();
