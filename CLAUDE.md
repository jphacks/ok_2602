# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

JPHacks hackathon project **NetSim Lab** (formerly Packet-Crafter): a game-like web app where the player acts as a router to learn network traffic flow and packet structure. UI design should stay fairly plain (not heavily game-styled) for now. `README.md` is the JPHacks submission template (partly filled in).

Three independent parts, each in its own directory with no shared tooling at the root:

- `frontend/` — Vite + React 19 + TypeScript, UI built with Chakra UI v3, routing via `react-router` (v8, imported from `'react-router'`, not `react-router-dom`)
- `backend/` — Go + Gin HTTP server (currently only `GET /ping`)
- `database/` — PostgreSQL 16 via Docker Compose

The frontend calls the backend's `GET /getstages` (stage list: id / title / description only) and `GET /getstages/:stageID` (one stage with `topology`), and plays the stage over the WebSocket `/ws/:stageID` (backend reads stages/scenarios from PostgreSQL). Don't modify `backend/` unless asked.

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
go run .                 # Gin defaults to :8080, DB on localhost:5432
DB_PORT=5433 go run .    # connect to another DB container (see below)
```

`go.mod` lists all deps as `// indirect` (including an unused mongo-driver); `go mod tidy` will clean this up.

Database (run inside `database/`):

```sh
docker compose up -d
# a separate container for another branch (own volume, port 5433):
DB_CONTAINER_NAME=postgres-stage02 DB_PORT=5433 docker compose -p netsim-stage02 up -d
```

Requires `POSTGRES_PASSWORD` and `BACKUSER_PASSWORD` in `database/.env` (gitignored). `init.sh` runs only on first volume creation: it creates user `backuser`, database `app_db`, the `stages` table (`topology` / `scenario` JSONB), and inserts stage-01 and stage-02. To re-run it, remove the volume (`docker compose down -v`, with the same `-p` for a separate project).

## Frontend structure

Naming rules are in `frontend/NAMING.md` — follow them (named exports only, fixed verbs like `parse`/`format`/`build`/`resolve`, no abbreviations). Directories are at most one level below `src/`:

| Directory | Contents |
|---|---|
| `main.tsx` | entry + `<Routes>` table — add new screens here |
| `pages/` | one file per route: `HomePage` (`/`) → `StageListPage` (`/stages`) → `StagePage` (`/stages/:stageId`, unknown ids redirect to `/stages`); `AboutPage` (`/about`, 「NetSim Labとは」: short summary + detailed how-to-play, linked from the home screen) |
| `components/` | shared UI: `PageLayout`, `NetworkBackground`, and `ui.tsx` (`PrimaryButton`, `SecondaryButton`, `ToggleButton`, `StageButton`, `Panel`) |
| `workspace/` | stage play screen (router workspace), state held in `StageWorkspace` |
| `packet/` | packet logic without UI: `bytes.ts` (hex/MAC/IPv4 conversion), `protocols.ts` (header definitions for Ethernet / ARP / IPv4 / UDP / RIP / RIP entry, `getUpperProtocol` (EtherType → IP protocol → UDP port), `parseLayer` / `buildLayer` / `buildPacketJson`), `steps.ts` (compose drafts, `analyzePacket`) |
| `stage/` | stage data: `types.ts`, `api.ts` (fetch + `useStages` / `useStageDetail` + WebSocket `useStageSocket`), `options.ts`, `actionButtons.ts`, `todoList.ts`, `buildWorkspace.ts` |
| `data/` | fixed data: `workspaceText.ts` (table titles/columns/help, to-do list), `aboutText.ts` (`AboutPage` text — keep it in sync when workspace button labels or flow change) |

- Stage data comes from the backend: `GET /getstages` (list) and `GET /getstages/:stageID` (detail with `topology`, loaded only when the list entry lacks it). `stage/types.ts` mirrors the Go structs in the backend `model` package (snake_case JSON keys like `node_id` are intentional) — keep both sides in sync. Stages exist only in the DB (`database/init.sh`: stage-01, stage-02); if the list request fails, `useStages` returns an empty list with `hasError` and the stage list shows an error message. The stage number shown in the UI is the array index + 1.
- `stage/buildWorkspace.ts` builds the workspace from the topology: the first router is the player; tables start with its connected/local routes, own ARP entries, and the `mac_table` nodes. Received packets come only from the WebSocket (no sample packets). Stages without a router show 「準備中」. Don't hard-code IP/MAC addresses — derive them from stage data or user input.
- Workspace layout: left = `TablePanel` (routing / ARP / MAC tables as tabs, Cisco `show`-style columns, scroll inside the frame, `?` help popover at each tab's bottom-right, row add/edit/delete when the option allows); right = `ReceivedPacketsPanel` and `WorkPanel` (action buttons + detail area). The first button in `WorkPanel` is always 「ルータの情報」 (shown on every stage, independent of `action_buttons`); it opens `RouterInfoView` with the player router's interfaces (IP/prefix, subnet mask, network, MAC, neighbor from `edges`), built as `WorkspaceData.router` in `stage/buildWorkspace.ts`. Selecting a received packet opens `PacketAnalyzer` (raw hex → analyze from Ethernet upward; the next layer is decided by the lower layer's EtherType / IP protocol / UDP port, and analyzing RIP also shows every RIP entry). A compose button opens `PacketComposer` (data part first — hex, or RIP entries with add/remove — then the headers in `ComposeSettings.layers` from high to low, Ethernet last; 「送信する」 sends it via `buildPacketJson`). Routing table C / L rows show `[0/0]` (AD 0) and the `?` help lists Cisco default ADs. `PacketViews.tsx` holds `HexDump`, `LayerCard`, `FieldRow`, `LayerList`, `PacketOverview`.
- Stage options / action buttons / to-do list: the stage JSON may carry `options` (object), `action_buttons` (string array), `todo_list` (`{ "項番": "やること" }`) and `mac_table` (node ids pre-listed in the MAC table; MAC and router port are looked up from `topology`). The backend stores them inside the `topology` JSONB column (sent as a string), so `fetchStage` in `stage/api.ts` parses `topology` and lifts them to the top level of `Stage` when missing there; test JSON has them at the top level.
  - `stage/options.ts` — `StageOptions` (type) + `DEFAULT_OPTIONS` (everything enabled, most detailed) + `resolveOptions` (reads each key explicitly, warns about unknown keys / bad values). To add an option, add one line to each of the three. Keys: `routing_table_edit` / `arp_table_edit` / `mac_table_edit`, `visible_tables`, `packet_auto_fields` (`"ipv4"` or `"ipv4.checksum"`; only non-`input` fields can be auto-filled), `analysis_auto_layers`.
  - `stage/actionButtons.ts` — `ACTION_BUTTON_LABELS` (snake_case id → label) and `COMPOSE_SETTINGS` (settings for the packet-compose buttons); `resolveActionButtons` keeps JSON order, accepts `"arp request"`-style spelling, drops unknown ids. Empty → no stage-specific buttons (the fixed 「ルータの情報」 button still shows). What a non-compose button shows is written directly in `WorkPanel` (`getButtonView`) / `StageWorkspace`.
  - `stage/todoList.ts` — `resolveTodoList` sorts `todo_list` by 項番 (numeric-aware, `"2-1"` OK), drops non-string values, and falls back to `WORKSPACE_TODOS` when empty. `WorkPanel` shows each 項番 as a badge.
  - Table edits and packet drafts are local state in `StageWorkspace` (not sent to the backend).
- Game flow (`useStageSocket` in `stage/api.ts`, used by `StageWorkspace`): connects to `/ws/:stageID` on mount. The server sends `WSMessage` (`event`: `packet` → appended to パケット受信 with id `step-<n>`; `eval_result` → shown as a toast; `info` → ステージクリア dialog (閉じる / ステージ選択に戻る) plus a persistent alert in パケット受信; `error` → error alert); the client sends a bare `PacketJson`. These types are in `stage/types.ts` (mirror `model/pingpacket.go` and `WSMessage` in `model/scenario.go`). After a wrong answer the server keeps the connection and waits at the same step for a resent packet. Until the first packet arrives, パケット受信 shows a 「受信待ち」 spinner; a stage without a scenario in the DB shows 「サーバーに接続できませんでした」.
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
