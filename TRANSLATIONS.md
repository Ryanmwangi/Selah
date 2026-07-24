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

At launch, every listed version is public domain or freely licensed, so every
download is free and requires no license. WEB is both the bundled version and
the default preference, so scripture works fully offline the moment the app
opens.

## Licensing (read before adding a version)

Only distribute text you have the right to distribute. Public-domain versions
(WEB, KJV, ASV) and freely licensed ones (BSB, with attribution) are fine to
host. **Copyrighted translations (NKJV, ESV, NIV, and most modern versions)
must not be bundled or redistributed.** To add one later, license the text or
use a licensed Bible API (for example API.Bible), add a registry row with
`distributable: false`, and point Selah at your own hosted, licensed database;
the app already renders a lock icon for any non-distributable, not-yet-installed
version. This rule is recorded in `CLAUDE.md`.

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
