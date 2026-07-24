# Selah ‖

*A scripture-native journal. Selah, the pause in the Psalms, is the moment this app is built around.*

Every entry can be linked to a verse, so your reflections become a searchable record of **"what God said in this season."** Offline-first, private by default: no account, no server, your words never leave your phone.

Built per [../BUILD.md](../BUILD.md), phases 0–6 core (M1–M3 complete: journaling, scripture-linking, search, prompts, app lock).

## Design language

Two moods, both typeset like a well-printed psalter:
- **Dawn**, warm parchment, dark ink, ember accents, gold-leaf details.
- **Vigil**, candlelit night ink for late reflection.

**Fraunces** carries the journal's voice (titles, entries, scripture); **Inter** whispers the UI. The brand mark is the caesura **‖**, a pause, held (the ember diamond).

## What's inside

| Area | Detail |
|---|---|
| Capture | Open → write → done. Autosaved as you type; empty entries evaporate. Markdown subset (**bold**, *italic*, lists, quotes, headings). Daily prompt appears as a gentle placeholder, never a block. |
| Moments | Attach **photos** (copied into the app's private sandbox, no library references), note **where you were** (tap-to-capture, tap-to-remove), and mark **multiple moods** per entry. |
| Scripture | Full Bible bundled offline (public-domain **WEB**, 31,103 verses, 4.5MB). **Read any passage** from the Bible tab: browse book → chapter, read with prev/next chapter navigation, reflect on what you read. Attach verses to entries by typing "Ps 46:10" (live preview) or browsing. Verses render inline, typeset with sage verse numbers, in the app's own reading type. |
| Versions | Choose your translation and **download versions to read offline** (Settings → Bible). Ships one public-domain version (WEB) so the app stays small and works offline immediately; more public-domain versions download on demand, free, no license needed. See [TRANSLATIONS.md](./TRANSLATIONS.md). |
| For how you feel | 15 moods, each with a **curated, healthy set of passages** (Scripture for the anxious, weary, grateful, tempted…). Reachable from the Bible tab or while choosing a mood on an entry. Read the whole chapter or start a reflection from any verse. |
| Widgets | Home & lock-screen widgets (iOS 16+; Android home screen) that leave you a verse, a note to yourself, or your rhythm. See [WIDGETS.md](./WIDGETS.md). |
| Insights | Days journaled, current & longest **streaks** (a streak survives until a full day is missed), words written, photos kept, mood distribution, most-reflected books, recurring tags, and a **gentle weekly goal** (default 3 days, shown, never nagged). |
| Calendar | Scrollable month grid back to your first entry; journaled days glow; tap a day to revisit it. |
| Search | FTS5 full-text (prefix matching, hostile-input-safe) + filters: tag, mood, book, date. Type "Psalm 23" in search to jump to every reflection on a passage. |
| Rhythm | Verse-of-the-day line on the timeline; prompt library in six categories; a daily reflection reminder at **any time you choose**. "On this day" resurfaces past seasons. |
| Privacy | Biometric app lock + PIN fallback with escalating backoff, auto-lock, app-switcher privacy cover. Location & photos stay on-device like everything else. See [SECURITY.md](./SECURITY.md). |
| Ownership | One-tap Markdown export of the whole journal (now with moods, places, photo counts). |

**Design:** minimal and airy, no boxed cards; whitespace does the composing. One floating pill (calendar · write · insights) is the only chrome on the timeline.

## Develop

```bash
npm install
npm run build:scripture   # regenerates assets/scripture/web.db (cached download)
npm start                 # Expo dev server → iOS/Android
npm test                  # typecheck + 79 unit/DB/crypto/scripture tests
```

Tests run the *real* repositories against real SQLite (better-sqlite3 with FTS5) and verify the crypto against `node:crypto`, no mocks of the things that matter. `better-sqlite3` lives in `tests/package.json`, not the root one — it's a native Node addon needed only to run tests, and keeping it out of the app's own `package.json` means EAS/Metro never tries to install or compile it when building the actual app. `npm test` installs it automatically (`pretest`); nothing extra to run by hand.

## Architecture notes

- `src/db/sql.ts`, a 4-method async SQL interface; expo-sqlite satisfies it in the app, better-sqlite3 in tests. (The build plan suggested Drizzle; raw parameterized SQL through this seam proved simpler for FTS5-heavy queries and made the whole data layer testable in Node, same call, deliberate.)
- `src/db/migrations.ts`, append-only migrations behind `PRAGMA user_version`; FTS5 external-content table kept in sync by triggers.
- `src/repo/*`, all queries; screens never touch SQL.
- `src/lib/crypto/*`, SHA-256/HMAC/PBKDF2/AES-CTR envelope, Phase-7-ready.
- `scripts/build-scripture-db.mjs`, WEB JSON → compact SQLite asset.

## Ship (Phase 6)

```bash
npx eas build --platform all
npx eas submit
```

Store metadata still needed: screenshots, listing copy, privacy policy URL.
