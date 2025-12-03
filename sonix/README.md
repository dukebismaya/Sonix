# Sonix NEO · Jamendo Deck

A clean-room rebuild of Sonix focused on a futuristic control deck powered by the [Jamendo](https://developer.jamendo.com/v3.0) public API. The interface blends neon glassmorphism, real-time telemetry, and curated discovery filters so you can explore royalty-free catalogs in style.

## Highlights

- **Jamendo Discovery Modes** – Pulse Trending, Solar Launch, Night Pulse, and Artefact filters call the API with curated query presets.
- **Live Search Overlay** – Debounced catalog lookups with contextual empty states and filter reset logic.
- **Immersive Player** – Minimal chrome, timeline scrubbing, hardware-style controls, and live telemetry readouts.
- **Dual Theme Vectors** – Nebula and Sol palettes, persisted locally to keep the experience cohesive.
- **Client Key Drawer** – Built-in settings panel to drop in your Jamendo client ID without rebuilding the app.

## Getting Started

```bash
git clone https://github.com/dukebismaya/Sonix.git
cd Sonix/sonix
npm install
```

### Provider configuration

Sonix NEO can boot against different free catalogs. Pick your provider at build time:

```bash
# Jamendo (default)
set SONIX_PROVIDER=jamendo
set SONIX_JAMENDO_CLIENT_ID=your-client-id

# Audius (no client key needed)
set SONIX_PROVIDER=audius
set SONIX_AUDIUS_APP_NAME=sonix-deck

npm run dev
```

If you set `SONIX_JAMENDO_CLIENT_ID`, the UI starts unlocked without asking for credentials. During deployments you can choose the provider per environment by exporting these variables before running `npm run build`.

### Development

```bash
npm run dev
```

This launches `webpack-dev-server` on port `3000` with hot module reload.

### Production build

```bash
npm run build
```

Outputs hashed assets to `dist/`.

### Jamendo API access

1. Create a free account at [developer.jamendo.com](https://developer.jamendo.com/v3.0).
2. Register an application and copy the generated **client ID**.
3. Run Sonix NEO and pop open the _Configure Jamendo Access_ drawer.
4. Paste the client ID, hit **Save & Sync**, and the deck will start streaming.

The key is stored in `localStorage` under `sonix:client-id` for convenience. Remove it if you ever need to reset access.

## Scripts

| Command          | Description                              |
| ---------------- | ---------------------------------------- |
| `npm run dev`    | Run webpack dev server with HMR          |
| `npm run build`  | Production bundle + asset hashing        |
| `npm run clean`  | Remove the `dist/` directory             |
| `npm run lint`   | ESLint over `src/**/*.ts`                |
| `npm run type-check` | Strict TypeScript project validation |

## Architecture Snapshot

```
src
├── components
│   └── appShell.ts
├── services
│   └── jamendo.ts
├── state
│   └── store.ts
├── styles
│   └── main.css
├── types
│   └── music.ts
├── utils
│   ├── debounce.ts
│   └── format.ts
└── main.ts
```

## Licensing & Usage

- Code is MIT licensed (see `LICENSE`).
- Jamendo content streams are subject to their [API terms](https://devportal.jamendo.com/api_terms_of_use); Sonix NEO only consumes preview-quality streams for discovery.

Enjoy the ride ✨