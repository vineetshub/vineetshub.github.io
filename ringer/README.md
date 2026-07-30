# Ringer

A local, pass-and-play party game about sports. Everyone at the table gets the
same secret player — everyone except the **ringer**, who has to fake it. Go
around the circle dropping one-word clues, then argue it out and vote *out loud,
in person*. The app only deals the roles and runs the clock; the actual game
happens around the table.

Think Spyfall, but built for arguing about the NBA and NFL.

## How it plays

1. Add 3–8 players on one phone.
2. Pick a sport — **NBA** or **NFL**. The app draws a random player from a pool
   of ~150 notable names (or generate your own pool with AI).
3. Choose how many ringers are in the mix and set a discussion timer.
4. Pass the phone around — each player taps to privately see their role. The
   crew sees the secret player; the ringer just sees that they're the ringer.
5. Everyone gives a clue in the on-screen order. The ringer bluffs. Talk it out
   and vote on the faker out loud — no tapping suspects on the screen.
6. Tap **Reveal the answer** to see who the ringer was and which player it was.

The ringer and the player who opens the round both rotate every round, so the
pressure moves around the table.

### The hint toggle

Turn on **Ringer hint** and the faker gets a short list of a few candidate
names that includes the real player — enough to bluff more convincingly and
have a fighting chance on a steal, but never a giveaway. Leave it off for a
harder mode where the ringer is flying blind.

## AI categories (optional)

Beyond the built-in NBA and NFL pools, you can generate a fresh one on the fly —
"2000s point guards", "Hall of Fame receivers", whatever. Open the **AI** panel
in the top corner and add a key:

- **OpenAI** — paste an API key, default model `gpt-4o-mini`.
- **Anthropic** — paste an API key, default model `claude-3-5-haiku-latest`.
- **Ollama** — point it at a local instance (`http://localhost:11434`), no key
  needed. Run Ollama with `OLLAMA_ORIGINS=*` so the browser can reach it.

The key is stored only in your browser's `localStorage` and calls go straight to
the provider. Nothing is sent anywhere else. The built-in categories work with
no key at all.

## Running it

It's a static site — no build step.

```bash
# any static server works
python3 -m http.server 8000
# then open http://localhost:8000
```

Or just open `index.html` directly (AI calls need the page served over http/https
to avoid CORS issues; the offline categories work either way).

### Deploy to GitHub Pages

Push the repo, then in **Settings → Pages** set the source to your default
branch. It'll be live at `https://<you>.github.io/<repo>/`.

## Project layout

```
index.html        markup + screens
css/style.css     styling and animation
js/data.js        built-in NBA / NFL player pools
js/game.js        round logic, role assignment, rotation
js/ai.js          optional pool generation
js/main.js        UI wiring
```

## License

MIT — see [LICENSE](LICENSE).
