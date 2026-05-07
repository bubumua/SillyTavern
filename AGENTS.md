# AGENTS.md — SillyTavern Project Guide

## Project Overview

**SillyTavern** is a self-hosted, browser-based LLM frontend (chat interface) that acts as a universal client for interacting with numerous AI text generation backends. It is **not** a model host — it connects to external APIs and local inference servers.

- **Version**: 1.16.0
- **License**: AGPL-3.0
- **Repo**: https://github.com/SillyTavern/SillyTavern
- **This fork**: https://github.com/bubumua/SillyTavern (branch: `private`)
- **Runtime**: Node.js >= 18 (ESM modules, `"type": "module"`)

## Quick Start

```bash
# Install dependencies
npm install

# Start the server (default port 8181)
npm start              # or: node server.js
npm run debug          # with --inspect
npm run start:no-csrf  # disable CSRF for dev
```

The server auto-opens `http://localhost:8181` in the browser.

## Architecture

### High-Level

```
┌─────────────────────────────────┐
│         Browser (Client)        │
│  public/index.html + script.js  │
│  jQuery + Webpack-bundled libs  │
└──────────────┬──────────────────┘
               │ HTTP/WS (Express)
┌──────────────▼──────────────────┐
│        Node.js Server          │
│  server.js → src/server-main.js │
│  Express + middleware pipeline  │
└──────────────┬──────────────────┘
               │ HTTP/gRPC/WS
┌──────────────▼──────────────────┐
│    External AI Backends         │
│  OpenAI, Codex, Gemini, etc.   │
└─────────────────────────────────┘
```

### Server Side (`src/`)

| File / Directory | Purpose |
|---|---|
| `server.js` | Entry point. Parses CLI args, sets globals, imports `server-main.js` |
| `src/server-main.js` | Express app setup: middleware pipeline, static files, routes, startup chain |
| `src/server-startup.js` | HTTP/HTTPS listener creation, IPv4/IPv6 handling, all route registrations |
| `src/command-line.js` | CLI argument parsing (merges `config.yaml` + CLI flags) |
| `src/config-init.js` | Config file loading & validation |
| `src/users.js` | User account system, session management, directory scaffolding |
| `src/constants.js` | Shared constants: `CHAT_COMPLETION_SOURCES`, `TEXTGEN_TYPES`, user directory templates |
| `src/util.js` | Server utilities (color, config access, file ops) |
| `src/prompt-converters.js` | Converts between chat/text completion prompt formats |
| `src/endpoints/` | **43 route modules** — each exports an Express `router` |
| `src/middleware/` | Auth, whitelist, CORS proxy, cache buster, host validation, webpack serving |
| `src/png/` | PNG chunk encoding for character card metadata |
| `src/character-card-parser.js` | Read/write character data from PNG `tEXt` chunks (`chara`/`ccv3`) |

### Client Side (`public/`)

| File / Directory | Purpose |
|---|---|
| `public/index.html` | Main SPA page (~727KB, massive HTML with all UI panels inline) |
| `public/script.js` | **Main frontend module** (~496KB, 12K+ lines). App state, generation logic, chat rendering |
| `public/lib.js` | Library bundling entry (Webpack). Exposes lodash, Fuse, DOMPurify, hljs, etc. |
| `public/style.css` | Primary stylesheet (~147KB) |
| `public/scripts/` | **71 JS modules + 6 subdirectories** for all frontend features |
| `public/css/` | 36 CSS files for specific UI components |
| `public/scripts/extensions/` | Built-in extensions (TTS, SD, regex, vectors, quick-reply, etc.) |
| `public/locales/` | Internationalization files |

### Key Frontend Modules

| Module | Purpose |
|---|---|
| `scripts/openai.js` | Chat completion API handling (OpenAI, Codex, Gemini, etc.) — **284KB** |
| `scripts/world-info.js` | World Info / Lorebook system — **262KB** |
| `scripts/slash-commands.js` | Slash command engine — **246KB** |
| `scripts/power-user.js` | Power user settings & UI customization — **180KB** |
| `scripts/tags.js` | Tag system for characters/groups |
| `scripts/group-chats.js` | Group chat logic |
| `scripts/personas.js` | User persona management |
| `scripts/extensions.js` | Extension loader and lifecycle |
| `scripts/reasoning.js` | LLM reasoning/thinking output handling |
| `scripts/tool-calling.js` | Function/tool calling support |
| `scripts/st-context.js` | `getContext()` — the API surface exposed to extensions via `SillyTavern.getContext()` |
| `scripts/events.js` | EventEmitter-based event system (`eventSource`, `event_types`) |
| `scripts/char-data.js` | TypeDefs for Character Card V1/V2/V3 data model |
| `scripts/character-card-editor.js` | Custom character card editor (user-modified) |

## Data Model

### Character Card (V2/V3 — PNG `tEXt` metadata)

The character data is stored as base64-encoded JSON in PNG metadata chunks:
- `chara` chunk → V2 format
- `ccv3` chunk → V3 format (takes precedence when reading)

Key fields in `v2CharData`:
```
name, description, personality, scenario, first_mes, mes_example,
creator_notes, system_prompt, post_history_instructions, creator,
tags[], alternate_greetings[], character_book (embedded World Info),
extensions { talkativeness, fav, world, depth_prompt, regex_scripts }
```

### User Data Layout (`data/default-user/`)

```
data/default-user/
├── settings.json          # All user settings (huge, ~696KB)
├── secrets.json           # API keys (encrypted)
├── characters/            # Character card PNGs
├── chats/                 # Chat histories (JSONL per character)
├── groups/                # Group definitions
├── group chats/           # Group chat histories
├── worlds/                # World Info books
├── User Avatars/          # Persona images
├── backgrounds/           # Chat backgrounds
├── themes/                # UI themes
├── extensions/            # Per-user extension data
├── OpenAI Settings/       # Chat completion presets
├── TextGen Settings/      # Text completion presets
├── KoboldAI Settings/     # KoboldAI presets
├── NovelAI Settings/      # NovelAI presets
├── instruct/              # Instruct mode templates
├── context/               # Context templates
├── sysprompt/             # System prompt presets
├── reasoning/             # Reasoning templates
├── QuickReplies/          # Quick reply sets
├── vectors/               # Vector DB data
└── thumbnails/            # Cached thumbnails
```

## API Endpoints

All private endpoints are behind authentication middleware. API prefix: `/api/`.

### Core Endpoints

| Route | Module | Purpose |
|---|---|---|
| `/api/characters/*` | `characters.js` | CRUD operations for character cards |
| `/api/chats/*` | `chats.js` | Save/load/delete/export chat histories |
| `/api/groups/*` | `groups.js` | Group management |
| `/api/worldinfo/*` | `worldinfo.js` | World Info book management |
| `/api/settings/*` | `settings.js` | User settings |
| `/api/presets/*` | `presets.js` | Preset management |
| `/api/secrets/*` | `secrets.js` | API key management |

### AI Backend Endpoints

| Route | Module | Purpose |
|---|---|---|
| `/api/backends/chat-completions` | `chat-completions.js` | Unified chat completion proxy (OpenAI, Codex, Gemini, etc.) |
| `/api/backends/text-completions` | `text-completions.js` | Text completion proxy (ooba, vLLM, etc.) |
| `/api/backends/kobold` | `kobold.js` | KoboldAI proxy |
| `/api/openai/*` | `openai.js` | OpenAI-specific endpoints |
| `/api/anthropic/*` | `anthropic.js` | Codex-specific endpoints |
| `/api/google/*` | `google.js` | Gemini/Vertex AI endpoints |
| `/api/novelai/*` | `novelai.js` | NovelAI endpoints |

### Utility Endpoints

| Route | Module | Purpose |
|---|---|---|
| `/api/extensions/*` | `extensions.js` | Extension install/update/delete |
| `/api/sd/*` | `stable-diffusion.js` | Image generation |
| `/api/speech/*` | `speech.js` | TTS/STT |
| `/api/translate/*` | `translate.js` | Translation |
| `/api/tokenizers/*` | `tokenizers.js` | Token counting |
| `/api/vector/*` | `vectors.js` | Vector/RAG operations |

## Supported AI Backends

### Chat Completion Sources
OpenAI, Codex, OpenRouter, Google Gemini/Vertex AI, Mistral AI, Cohere, DeepSeek, Groq, xAI, Perplexity, AI21, Azure OpenAI, NanoGPT, AI/ML API, Pollinations, Moonshot, Fireworks, Chutes, ElectronHub, SiliconFlow, Custom OpenAI-compatible

### Text Completion Sources
oobabooga (text-generation-webui), KoboldCpp, vLLM, Aphrodite, TabbyAPI, llama.cpp, Ollama, Together AI, Mancer, InfermaticAI, DreamGen, OpenRouter, Featherless, HuggingFace, Generic

### KoboldAI
KoboldAI (original), KoboldAI Horde

## Extension System

### Built-in Extensions (`public/scripts/extensions/`)
- **assets** — Asset management
- **attachments** — File attachments
- **caption** — Image captioning
- **connection-manager** — Connection profiles
- **expressions** — Character sprite expressions
- **gallery** — Image gallery
- **memory** — Chat summarization
- **quick-reply** — Quick reply macros
- **regex** — Regex processing scripts
- **stable-diffusion** — Image generation
- **third-party** — Third-party extension directory
- **token-counter** — Token counting display
- **translate** — Real-time translation
- **tts** — Text-to-speech
- **vectors** — RAG/vector search

### Extension API

Extensions access the app through `SillyTavern.getContext()` (defined in `st-context.js`), which exposes:
- Chat state (`chat`, `characters`, `groups`, `chatMetadata`)
- Generation functions (`generate`, `generateRaw`, `generateQuietPrompt`)
- Event system (`eventSource`, `eventTypes`)
- Slash command registration (`SlashCommandParser`)
- Tool registration (`ToolManager`)
- Macro registration (`macros.register`)
- UI helpers (`Popup`, `callGenericPopup`, `showLoader`)
- Localization (`t`, `translate`)

### Server Plugins

Server-side plugins go in the `plugins/` directory. Enabled via `enableServerPlugins: true` in `config.yaml`.

## Event System

The frontend uses an EventEmitter pattern. Key events:

| Event | When |
|---|---|
| `APP_READY` | App fully initialized |
| `MESSAGE_SENT` | User sends a message |
| `MESSAGE_RECEIVED` | AI response received |
| `CHAT_CHANGED` | Active chat changes |
| `GENERATION_STARTED/ENDED` | Generation lifecycle |
| `SETTINGS_LOADED` | Settings loaded from server |
| `CHARACTER_EDITED` | Character data modified |
| `STREAM_TOKEN_RECEIVED` | Streaming token arrives |

## Build System

- **Webpack** bundles `public/lib.js` → node_modules libraries into a single client-side module
- Config in `webpack.config.js`, cached in `data/_webpack/`
- The webpack middleware serves the bundle and compiles on startup
- **No frontend build step** for app code — ES modules loaded directly by the browser
- Server-side code uses native ESM (`"type": "module"`)

## Configuration

Primary config: `config.yaml` (root directory). Key sections:

| Section | Purpose |
|---|---|
| `port` | Server port (default: 8181) |
| `listen` | Accept external connections |
| `protocol` | IPv4/IPv6 settings |
| `ssl` | HTTPS configuration |
| `basicAuthMode` | HTTP basic auth |
| `enableUserAccounts` | Multi-user mode |
| `requestProxy` | Outgoing proxy (SOCKS5, HTTP) |
| `cors` | CORS settings |
| `extensions` | Extension auto-update, model configs |
| `Codex/openai/gemini/ollama` | Per-provider settings |
| `performance` | Lazy loading, caching |
| `thumbnails` | Image thumbnail settings |

## Code Style & Conventions

### Linting
```bash
npm run lint        # Check
npm run lint:fix    # Auto-fix
```

Rules (from `.eslintrc.cjs`):
- **Single quotes**, **semicolons required**
- **4-space indentation**
- Trailing commas in multiline
- No trailing spaces, EOL at file end
- `object-curly-spacing: always`
- Server files: Node + ESM
- Client files: Browser + jQuery globals + ESM

### Code Patterns

1. **Frontend state**: Global mutable exports in `script.js` (e.g., `export let characters = []`)
2. **jQuery**: Heavily used in frontend (`$('#selector')`, `$.ajax`, `toastr`)
3. **Debouncing**: Common pattern via `debounce()` from `utils.js`
4. **Event-driven**: Extensions communicate via `eventSource.on(event_types.X, handler)`
5. **CSRF**: All API requests include `X-CSRF-Token` header (fetched from `/csrf-token`)
6. **JSDoc**: Type annotations via JSDoc comments (checked by `checkJs: true` in jsconfig)

### Naming Conventions
- Filenames: `kebab-case.js`
- Functions/variables: `camelCase`
- Constants/enums: `UPPER_SNAKE_CASE`
- CSS classes: `kebab-case`
- API routes: `/api/resource/action`

## Testing

```bash
cd tests
npm install
npm test                    # Jest unit tests
npx playwright test         # E2E tests (Playwright)
```

Test files:
- `tests/util.test.js` — Server utility tests
- `tests/mock-server.test.js` — Mock server tests
- `tests/sample.e2e.js` — Sample E2E test
- `tests/frontend/` — Frontend test files

## Contributing

- PRs target `staging` branch (not `release`)
- Soft limit: **200 lines** per PR
- Run `npm run lint` before committing
- Enable "Allow edits from maintainers"
- English only for commits/PR descriptions

## Key Files Quick Reference

| What you're looking for | Where to look |
|---|---|
| Server entry point | `server.js` → `src/server-main.js` |
| All Express routes | `src/server-startup.js` (lines 137-184) |
| Frontend entry point | `public/script.js` |
| Main UI HTML | `public/index.html` |
| Main stylesheet | `public/style.css` |
| API key management | `src/endpoints/secrets.js` |
| Character CRUD | `src/endpoints/characters.js` |
| Chat completion proxy | `src/endpoints/backends/chat-completions.js` |
| Extension API surface | `public/scripts/st-context.js` |
| Event definitions | `public/scripts/events.js` |
| Character data types | `public/scripts/char-data.js` |
| Config file | `config.yaml` |
| User data root | `data/default-user/` |

## Local Customizations (This Fork)

This fork (`private` branch) includes:
- Custom character card editor (`public/character-card-editor.html`, `public/scripts/character-card-editor.js`, `public/css/character-card-editor.css`)
- Custom presets and characters in `preset_and_chara/`
- Modified `config.yaml` with proxy settings (SOCKS5 at `127.0.0.1:7890`)
- Tailscale host whitelist entry
