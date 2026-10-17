# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

JPHacks hackathon project **Packet-Crafter**: a game-like web app where the player acts as a router to learn network traffic flow and packet structure. UI design should stay fairly plain (not heavily game-styled) for now. `README.md` is the JPHacks submission template and is still unfilled.

Three independent parts, each in its own directory with no shared tooling at the root:

- `frontend/` — Vite + React 19 + TypeScript, UI built with Chakra UI v3, routing via `react-router` (v8, imported from `'react-router'`, not `react-router-dom`)
- `backend/` — Go + Gin HTTP server (currently only `GET /ping`)
- `database/` — PostgreSQL 16 via Docker Compose

The frontend calls the backend's `GET /getstages` (not implemented yet; the backend must also allow CORS from the Vite origin). The backend has no DB connection yet. Don't modify `backend/` unless asked.

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

- `src/main.tsx` wraps the app in `BrowserRouter`; `src/App.tsx` holds the `<Routes>` table — add new screens there.
- Screens live in `src/pages/`: `Home` (`/`) → `Stages` (`/stages`, grid of stage cards) → `Stage` (`/stages/:stageId`, `stageId` is `Stage.id`; unknown ids redirect to `/stages`).
- Stage data comes from the backend: `src/api/stages.ts` does `GET http://localhost:8080/getstages`, which returns a JSON `Stage[]`. Types in `src/types/stage.ts` mirror the Go structs in the backend `model` package (snake_case JSON keys like `node_id` are intentional) — keep both sides in sync.
- `src/hooks/useStages.ts` fetches the list; if the request fails (backend not implemented yet / CORS), it falls back to `src/data/dummyStages.ts` and pages show `DummyDataNotice`. The stage number shown in the UI is the array index + 1, not part of the data.
- Buttons are shared components in `src/components/`: `PrimaryButton` (green main action), `SecondaryButton` (outline, used for back navigation), `StageButton` (stage card: number / title / separator / description). Reuse these instead of styling `Button` inline in pages.
- Pages wrap their content in `src/components/PageLayout.tsx` (full-height centered column, light green→gray background gradient). Pass `back={{ to, label }}` for the top-left back button (don't put back buttons at the bottom of pages) and `background` for a decorative layer (Home uses `NetworkBackground`, an animated SVG network).
- `StageButton`'s card design is approved by the user — don't change it unless asked.
- Stage play screen (router workspace) lives in `src/components/workspace/`, assembled by `StageWorkspace`: left column = three `NetworkTable`s (routing / ARP / MAC address table, Cisco `show`-style columns, scroll inside the table, `?` popover with help like the `show ip route` Codes legend), right column = `ReceivedPackets` and `WorkPanel` (action buttons + "やることリスト"; the right-hand area shows the to-do list by default, or the frame overview (`FrameView`) of a selected packet/action — per-field editing via a sub-menu is planned). Shared frame is `Panel`. Types in `src/types/workspace.ts`; currently only stage 1 renders it, with local data from `src/data/stage1Workspace.ts`.
- Color scheme: green accent (`green.500` primary buttons with white text, `colorPalette="green"` for secondary), headings `gray.800`, body text `gray.600`.
- UI text is in Japanese (`<html lang="ja">`).

## UI policy: Chakra UI

All UI is built with **Chakra UI v3** (`@chakra-ui/react` + `@emotion/react`, https://github.com/chakra-ui/chakra-ui) to keep a consistent, clean look across screens.

- `ChakraProvider value={defaultSystem}` wraps the app in `src/main.tsx`. Customize the theme via `createSystem` there rather than adding ad-hoc CSS.
- Build screens from Chakra components and style props (`Box`, `Stack`/`VStack`, `Center`, `Heading`, `Text`, `Button`, ...); don't add plain `.css` files or hard-coded colors — use semantic tokens such as `fg.muted`.
- This is the v3 API (e.g. `gap` not `spacing`, `colorPalette` not `colorScheme`, compound components like `Dialog.Root`). Don't write v2-style code.
- Color mode (dark mode) is not set up yet; Chakra v3 does this with `next-themes` via the CLI snippets (`npx @chakra-ui/cli snippet add`).
