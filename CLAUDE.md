# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Obsidian community plugin written in TypeScript, bundled to JavaScript via esbuild. Entry point is `src/main.ts` which compiles to `main.js`.

## Build Commands

```bash
npm install          # Install dependencies
npm run dev          # Watch mode development
npm run build        # Production build (type-check + bundle)
npm run lint         # Run ESLint
```

## Architecture

**Entry Point:** `src/main.ts` - Plugin class extending `Plugin` with lifecycle methods (`onload`/`onunload`)

**Settings:** `src/settings.ts` - Settings interface, defaults, and settings tab UI

**Build Output:** `main.js` at project root (bundled by esbuild, not committed to git)

**Release Artifacts:** `main.js`, `manifest.json`, `styles.css` (optional)

## Key Patterns

- Use `this.register*` helpers for all event listeners, intervals, and DOM events - ensures automatic cleanup on unload
- Persist settings via `this.loadData()` / `this.saveData()`
- Add commands via `this.addCommand()` with stable IDs (never rename after release)
- Keep `main.ts` minimal - delegate feature logic to separate modules

## Testing

Manual install for testing: copy `main.js`, `manifest.json`, `styles.css` to:
```
<Vault>/.obsidian/plugins/<plugin-id>/
```
Then reload Obsidian and enable in **Settings → Community plugins**.

## Important Constraints

- Default to local/offline operation; network requests require explicit user opt-in
- Never change plugin `id` in manifest.json after release
- Bundle everything into `main.js` (no external runtime dependencies)
- For mobile compatibility, avoid Node/Electron APIs unless `isDesktopOnly: true`
