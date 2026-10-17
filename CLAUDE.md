# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

JPHacks hackathon project **Packet-Crafter**: a game-like web app where the player acts as a router to learn network traffic flow and packet structure. UI design should stay fairly plain (not heavily game-styled) for now. `README.md` is the JPHacks submission template and is still unfilled.

Three independent parts, each in its own directory with no shared tooling at the root:

- `frontend/` — Vite + React 19 + TypeScript, UI built with Chakra UI v3, routing via `react-router` (v8, imported from `'react-router'`, not `react-router-dom`)
- `backend/` — Go + Gin HTTP server (currently only `GET /ping`)
- `database/` — PostgreSQL 16 via Docker Compose

The frontend calls the backend's `GET /getstages` (stage list: id / title / description only) and `GET /getstages/:stageID` (one stage with `topology`). The backend has no DB connection yet. Don't modify `backend/` unless asked.

## Commands

Frontend (run inside `frontend/`):

```sh
npm install
npm run dev      # dev server on http://localhost:5173 (host: true, so reachable from Windows host under WSL)
npm run build    # tsc -b && vite build — this is the type check
npm run lint     # eslint
```

No test framework is set up.

Backend (run inside `backend/`):

```sh
go run .         # Gin defaults to :8080
```

`go.mod` lists all deps as `// indirect` (including an unused mongo-driver); `go mod tidy` will clean this up.

Database (run inside `database/`):

```sh
docker compose up -d
```

Requires `POSTGRES_PASSWORD` in `database/.env` (gitignored). `init.sql` runs only on first volume creation and creates `test_user` / `test_password`, database `test_db`, and a sample `users` table. To re-run it, remove the `postgres_data` volume.

## Frontend structure

Naming rules are in `frontend/NAMING.md` — follow them (named exports only, fixed verbs like `parse`/`format`/`build`/`resolve`, no abbreviations). Directories are at most one level below `src/`:

| Directory | Contents |
|---|---|
| `main.tsx` | entry + `<Routes>` table — add new screens here |
| `pages/` | one file per route: `HomePage` (`/`) → `StageListPage` (`/stages`) → `StagePage` (`/stages/:stageId`, unknown ids redirect to `/stages`) |
| `components/` | shared UI: `PageLayout`, `NetworkBackground`, and `ui.tsx` (`PrimaryButton`, `SecondaryButton`, `ToggleButton`, `StageButton`, `Panel`, `SampleDataBadge`) |
| `workspace/` | stage play screen (router workspace), state held in `StageWorkspace` |
| `packet/` | packet logic without UI: `bytes.ts` (hex/MAC/IPv4 conversion), `protocols.ts` (header field definitions + `parseLayer` / `buildLayer`), `steps.ts` (compose drafts, analysis progress) |
| `stage/` | stage data: `types.ts`, `api.ts` (fetch + `useStages` / `useStageDetail`), `options.ts`, `actionButtons.ts`, `buildWorkspace.ts` |
| `data/` | fixed data: `sampleStages.ts` (fallback list), `workspaceText.ts` (table titles/columns/help, to-do list) |
| `test-data/` | temporary test stage JSON — delete it with the `TEST_STAGES` line in `stage/api.ts` |

- Stage data comes from the backend: `GET /getstages` (list) and `GET /getstages/:stageID` (detail with `topology`, loaded only when the list entry lacks it). `stage/types.ts` mirrors the Go structs in the backend `model` package (snake_case JSON keys like `node_id` are intentional) — keep both sides in sync. If the list request fails, `useStages` falls back to `data/sampleStages.ts` and pages show `SampleDataBadge`. The stage number shown in the UI is the array index + 1.
- `stage/buildWorkspace.ts` builds the workspace from the topology: the first router is the player; tables start with its connected/local routes and own ARP entries; received packets are sample frames generated from the topology until the WebSocket exists. Stages without a router show 「準備中」. Don't hard-code IP/MAC addresses — derive them from stage data or user input.
- Workspace layout: left = `TablePanel` (routing / ARP / MAC tables as tabs, Cisco `show`-style columns, scroll inside the frame, `?` help popover at each tab's bottom-right, row add/edit/delete when the option allows); right = `ReceivedPacketsPanel` and `WorkPanel` (action buttons + detail area). Selecting a received packet opens `PacketAnalyzer` (raw hex → analyze Ethernet first, then IP/ARP chosen by EtherType). A compose button opens `PacketComposer` (attach IP/ARP first, then Ethernet; data part in hex; sending disabled until the backend WebSocket exists). `PacketViews.tsx` holds `HexDump`, `LayerCard`, `LayerList`, `PacketOverview`.
- Stage options / action buttons: the stage JSON may carry `options` (object) and `action_buttons` (string array); the backend doesn't send them yet.
  - `stage/options.ts` — `StageOptions` (type) + `DEFAULT_OPTIONS` (everything enabled, most detailed) + `resolveOptions` (reads each key explicitly, warns about unknown keys / bad values). To add an option, add one line to each of the three. Keys: `routing_table_edit` / `arp_table_edit` / `mac_table_edit`, `visible_tables`, `packet_auto_fields` (`"ipv4"` or `"ipv4.checksum"`; only non-`input` fields can be auto-filled), `analysis_auto_layers`.
  - `stage/actionButtons.ts` — `ACTION_BUTTON_LABELS` (snake_case id → label) and `COMPOSE_SETTINGS` (settings for the packet-compose buttons); `resolveActionButtons` keeps JSON order, accepts `"arp request"`-style spelling, drops unknown ids. Empty → no buttons. What a non-compose button shows is written directly in `WorkPanel` (`getButtonView`) / `StageWorkspace`.
  - Table edits and packet drafts are local state in `StageWorkspace` for now (to be synced over WebSocket later).
- MAC addresses are always shown/entered as lowercase `xx:xx:xx:xx:xx:xx`.
- `StageButton`'s card design is approved by the user — don't change it unless asked.
- Color scheme: green accent (`green.500` primary buttons with white text, `colorPalette="green"` for secondary), headings `gray.800`, body text `gray.600`.
- UI text is in Japanese (`<html lang="ja">`).

## UI policy: Chakra UI

All UI is built with **Chakra UI v3** (`@chakra-ui/react` + `@emotion/react`, https://github.com/chakra-ui/chakra-ui) to keep a consistent, clean look across screens.

- `ChakraProvider value={defaultSystem}` wraps the app in `src/main.tsx`. Customize the theme via `createSystem` there rather than adding ad-hoc CSS.
- Build screens from Chakra components and style props (`Box`, `Stack`/`VStack`, `Center`, `Heading`, `Text`, `Button`, ...); don't add plain `.css` files or hard-coded colors — use semantic tokens such as `fg.muted`.
- This is the v3 API (e.g. `gap` not `spacing`, `colorPalette` not `colorScheme`, compound components like `Dialog.Root`). Don't write v2-style code.
- Color mode (dark mode) is not set up yet; Chakra v3 does this with `next-themes` via the CLI snippets (`npx @chakra-ui/cli snippet add`).
