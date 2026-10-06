# Selah, Home & Lock Screen Widgets

Selah can leave you something where you'll see it: **the verse of the day**, **a verse you want to keep**, **a note to yourself**, or **your journaling rhythm** (days + streak).

- **iOS 16+**, home-screen (small/medium) *and* lock-screen (rectangular / inline / circular) widgets.
- **Android**, home-screen widget. (Android has no general lock-screen widgets; that surface was removed in Android 5 and only partially returned, on tablets, in Android 16.)

## Why this needs a development build

Widgets are native (SwiftUI/WidgetKit on iOS, RemoteViews on Android). They **cannot run in Expo Go.** In Expo Go the app runs normally and the widget screen works as a preview, your choice is saved, but nothing is drawn on the home/lock screen until Selah is a real build.

Everything is guarded (`widgetsSupported()` in `src/lib/widgetBridge.ts`), so Expo Go never touches the native widget modules.

## How it works

```
In-app choice (Settings → Widgets)         src/app/widget.tsx
        │  saveWidgetConfig()               src/repo/widget.ts
        ▼
assembleWidgetPayload()  ── reads verse text / streak from SQLite
        │  → WidgetPayload (small, no secrets)   src/lib/widget/payload.ts
        ▼
refreshWidget():  store payload in settings table  +  publishWidget()
        │                                          src/lib/widgetBridge.ts
        ├─ iOS:     ExtensionStorage setString(key,json,group) → App Group UserDefaults
        │           reloadWidget()  → WidgetKit redraws
        │           targets/widget/index.swift reads the suite
        └─ Android: requestWidgetUpdate() → headless JS task
                    src/widgets/widget-task-handler.tsx reads the settings
                    row and renders src/widgets/render.tsx
```

Payload is refreshed on app launch, after every entry save, and when you change the widget settings, so the daily verse rolls over and the streak stays current.

## Enabling it (one-time)

1. ~~Set your Apple Team ID~~ done (`app.json` → `plugins` → `@bacons/apple-targets`).
2. **Create the App Group** `group.app.selah.journal` in your Apple Developer account and enable it for the app id `app.selah.journal`. It's already declared in `app.json` (`ios.entitlements`) and `targets/widget/expo-target.config.js`.
3. **Prebuild + build:**
   ```bash
   npx expo prebuild --clean          # generates ios/ and android/ with the widget targets
   npx eas build --profile development --platform all
   # or run locally:  npx expo run:ios   /   npx expo run:android
   ```
4. Install the dev build, open Selah once (this publishes the first payload), then **long-press the home screen → add the Selah widget**, and on iPhone **customize the lock screen → add the Selah accessory widget.**

**iOS deployment target must stay at 16.4 or higher** (`app.json` → `expo-build-properties`). The `ExtensionStorage` native module that writes the widget payload requires iOS 16.4, and Expo autolinking silently leaves out any pod whose minimum is above the app's target. Below 16.4 the app builds fine, but the widget never receives data (the app logs `ExtensionStorage native module is not in this build`).

## Files

| Piece | Path |
|---|---|
| Payload model (pure, tested) | `src/lib/widget/payload.ts` |
| Content assembly + refresh | `src/repo/widget.ts` |
| Native bridge (guarded) | `src/lib/widgetBridge.ts` |
| In-app config + preview | `src/app/widget.tsx`, `src/components/WidgetPreview.tsx` |
| iOS widget (SwiftUI) | `targets/widget/index.swift`, `targets/widget/expo-target.config.js` |
| Android widget (RemoteViews) | `src/widgets/render.tsx`, `widget-task-handler.tsx`, `register.ts` |
| Android registration entry | `index.js` |

## Privacy

A widget is visible on a **locked** screen, so only content you explicitly choose is ever written to the shared store, never your entries, tags, search, or keys. The payload carries a single verse/note/streak line and nothing else. See [SECURITY.md](./SECURITY.md).
