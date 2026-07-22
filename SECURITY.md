# Selah — Security & Privacy Model

Selah is a private journal. The security posture is **local-first, zero-knowledge by default**: in v1 there is no account, no server, and no network call carrying user content — the attack surface is the device itself.

## What we protect

| Asset | Sensitivity |
|---|---|
| Journal entries (title, body, mood) | **High** — intimate, personal, spiritual |
| Verse links, tags, search history | Medium — reveals themes of someone's inner life |
| PIN / keys | High — gate to all of the above |

## Controls

### Data at rest
- `journal.db` lives in the app's **private sandbox** (no shared/external storage), covered by OS full-file encryption — iOS Data Protection and Android file-based encryption — on any device with a passcode.
- **All key material is in expo-secure-store** (iOS Keychain / Android Keystore), created with `WHEN_UNLOCKED_THIS_DEVICE_ONLY`: never backed up off-device, never in SQLite, never in plain files.
- Android backup of the raw DB is implicitly excluded from cloud backup surface area by design review before enabling any `allowBackup` behavior. *(Verify `android:allowBackup` is false in the prebuild manifest before store submission.)*

### App lock (Phase 5)
- **Biometric-first** (Face ID / Touch ID / fingerprint via `expo-local-authentication`) with `disableDeviceFallback` — the device PIN is not accepted for the journal.
- **App-PIN fallback**: the PIN is never stored. We store a PBKDF2-HMAC-SHA256 verifier (30k iterations, 16-byte random salt) in SecureStore. Verification is constant-time.
- **Escalating backoff** after failed attempts (5s → 30s → 60s → 300s) as the primary brute-force control; the verifier itself only exists inside keystore-protected storage.
- **Auto-lock**: locks on cold start and after >20s in background.
- **Privacy cover**: an opaque cover replaces app content in the OS app switcher the moment Selah is backgrounded.

### Cryptography (exports today, sync in Phase 7)
- Envelope: **AES-256-CTR + HMAC-SHA256, encrypt-then-MAC**, independent 32-byte keys, random 16-byte IV per message, version byte for agility. MAC verified in constant time before any decryption.
- Primitives (pure-TS SHA-256/HMAC/PBKDF2) are **tested byte-for-byte against `node:crypto`** in CI (`tests/crypto.test.ts`), including tamper-detection tests flipping bytes across the envelope.
- Phase 7 cloud backup will reuse this envelope so **plaintext never leaves the device**; the server (Supabase) only ever stores ciphertext.

### Input handling
- All SQL uses **parameterized queries** — user text is never interpolated into SQL.
- FTS5 search input is **re-tokenized and quoted** before `MATCH` (see `src/lib/search/query.ts`); FTS query syntax (`OR`, `NEAR(`, `"`) from users is inert. Hostile-input tests cover this (`tests/db.test.ts`).
- Route params (verse refs) are strictly validated (`decodeVerseParam`).

### Telemetry
- **No analytics or crash SDK is wired.** `src/lib/analytics.ts` is a no-op that documents the contract: if Sentry/PostHog are added post-launch, they may receive event *names* only — never journal content, titles, tags, search terms, or verse selections.

### Permissions
- iOS: Face ID usage string only. Android: notification permission for the local daily reminder; `RECORD_AUDIO` explicitly blocked in `app.json`.
- No network permission is exercised by any user-content code path in v1.

## Known limitations (v1)
- SQLite pages themselves are not application-layer encrypted (FTS5 must read plaintext to index). Mitigations: OS file encryption + sandbox + app lock. If a stronger requirement emerges, migrate to SQLCipher via `op-sqlite` — the `Sql` interface isolates that swap.
- Disabling app lock requires only an unlocked app (by design — same trust boundary as changing the PIN).
- The Markdown export shares plaintext by the OS share sheet; that is the user's explicit choice.

## Reporting
Security issue? Email forensicdiscoverygmbh@gmail.com.
