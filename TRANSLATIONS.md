# Bible versions in Selah

Selah reads scripture from a small SQLite database (books + verses + meta).
The app ships **one** public-domain version so it works offline immediately,
and can download others on demand so the app download stays small.

## What ships vs. what downloads

| Version | License | Ships in app | Download |
|---|---|---|---|
| WEB (World English Bible) | Public domain | Yes (offline default) | n/a |
| KJV, ASV | Public domain | No | Yes, when hosted |
| BSB (Berean Standard) | Freely licensed, attribution | No | Yes, when hosted |
| **NKJV** (default preference) | **Copyrighted (Thomas Nelson)** | **No** | Only from a licensed source |

The user's chosen version is a preference. Until it is downloaded, Selah reads
the bundled WEB so there is always something to read. `NKJV` is set as the
default *preference*; because it is copyrighted it is never bundled or hosted
by us and shows a lock until a licensed source is configured.

## Licensing (read before adding a version)

Only distribute text you have the right to distribute. Public-domain versions
(WEB, KJV, ASV) and freely licensed ones (BSB, with attribution) are fine to
host. **NKJV, ESV, NIV and most modern translations are copyrighted** and must
not be bundled or redistributed. To offer them, license the text or use a
licensed Bible API (for example API.Bible), and point Selah at your own hosted,
licensed database. This rule is recorded in `CLAUDE.md`.

## Hosting downloadable versions

1. Build a database with the same schema as the bundled one (see
   `scripts/build-scripture-db.mjs`; point it at a source for the version and
   write `bible-<id>.db`, e.g. `bible-kjv.db`).
2. Host the files at a base URL (a CDN, object storage, or GitHub release).
3. Set that base in `app.json`:
   ```json
   "extra": { "bibleBaseUrl": "https://your-host.example/bibles" }
   ```
   Selah downloads `"<bibleBaseUrl>/bible-<id>.db"` and opens it offline.

To keep downloads light, host gzip-compressed DBs behind a CDN that serves
`Content-Encoding: gzip`, or trim unused columns; each version is ~4.5 MB raw.

## Code map

| Piece | Path |
|---|---|
| Registry (ids, licenses, sizes) | `src/lib/scripture/translations.ts` |
| Download / install / remove | `src/lib/scripture/downloads.ts` |
| Active + effective version | `src/repo/translations.ts` |
| Open a version by id (+ fallback) | `src/db/client.ts` |
| Active scripture in the app | `src/db/DbProvider.tsx` |
| Choose / download UI | `src/app/versions.tsx` |
