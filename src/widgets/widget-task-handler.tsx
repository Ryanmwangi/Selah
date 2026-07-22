/**
 * The headless JS task Android runs to (re)draw the Selah widget — on add,
 * on periodic update, and on tap. It reads the last-published payload from
 * the app's SQLite settings row (the same one the bridge writes) and renders.
 *
 * Native-only: registered from index.js behind an Expo Go guard.
 */
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { openJournalDb } from '../db/client';
import { parseWidgetPayload } from '../lib/widget/payload';
import { getSetting } from '../repo/settings';
import { renderSelahWidget } from './render';

export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  const name = props.widgetInfo.widgetName;
  if (name !== 'Selah') return;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      let payload = null;
      try {
        const db = await openJournalDb();
        payload = parseWidgetPayload(await getSetting(db, 'widget_payload'));
      } catch {
        // fall through with a friendly empty state
      }
      props.renderWidget(renderSelahWidget(payload));
      break;
    }
    case 'WIDGET_DELETED':
    default:
      break;
  }
}
