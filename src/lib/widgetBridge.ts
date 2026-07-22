/**
 * The bridge between the app and the native home/lock-screen widgets.
 *
 * Widgets live in a separate OS process that can't run our JS or open our
 * SQLite, so publishing means: (1) stash the payload where the widget can
 * read it, and (2) ask the OS to redraw.
 *
 *   iOS      → write to the App Group's shared UserDefaults via
 *              @bacons/apple-targets' ExtensionStorage, then reload WidgetKit
 *              timelines. The SwiftUI widget (targets/widget) reads the key.
 *   Android  → the JSON is already persisted (settings table) by the caller;
 *              ask react-native-android-widget to re-render from it.
 *
 * Everything is guarded: `publishWidget` returns immediately unless we're in a
 * native build that can host widgets, so in Expo Go the guarded requires below
 * are never reached and their native modules are never touched. Requires are
 * static strings (Metro can't bundle a dynamic `require(variable)`).
 */
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { serializeWidgetPayload, type WidgetPayload } from './widget/payload';

export const WIDGET_STORE_KEY = 'selahWidgetPayload';
export const ANDROID_WIDGET_NAME = 'Selah';

/** True only in a native build that can host widgets (never in Expo Go). */
export function widgetsSupported(): boolean {
  return Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
}

function pushIOS(json: string): void {
  let ExtensionStorage: {
    set(key: string, value: string): void;
    reloadWidget(name?: string): void;
  } | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ExtensionStorage = require('@bacons/apple-targets').ExtensionStorage;
  } catch {
    return;
  }
  if (!ExtensionStorage) return;
  ExtensionStorage.set(WIDGET_STORE_KEY, json);
  ExtensionStorage.reloadWidget();
}

async function pushAndroid(payload: WidgetPayload): Promise<void> {
  let requestWidgetUpdate:
    | ((opts: {
        widgetName: string;
        renderWidget: (info: unknown) => unknown;
        widgetNotFound?: () => void;
      }) => Promise<void>)
    | undefined;
  let renderSelahWidget: ((p: WidgetPayload) => unknown) | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    requestWidgetUpdate = require('react-native-android-widget').requestWidgetUpdate;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    renderSelahWidget = require('../widgets/render').renderSelahWidget;
  } catch {
    return;
  }
  if (!requestWidgetUpdate || !renderSelahWidget) return;
  const render = renderSelahWidget;
  await requestWidgetUpdate({
    widgetName: ANDROID_WIDGET_NAME,
    renderWidget: () => render(payload),
    widgetNotFound: () => {
      // no widget placed on the home screen yet — nothing to update
    },
  });
}

/**
 * Publish a payload to the widgets. Caller persists the JSON in the settings
 * table first (so the Android task and in-app preview can read it); this then
 * pokes the OS. Safe to call anywhere — no-ops without native support.
 */
export async function publishWidget(payload: WidgetPayload): Promise<void> {
  if (!widgetsSupported()) return;
  const json = serializeWidgetPayload(payload);
  try {
    if (Platform.OS === 'ios') pushIOS(json);
    else if (Platform.OS === 'android') await pushAndroid(payload);
  } catch {
    // Never let a widget refresh crash journaling.
  }
}
