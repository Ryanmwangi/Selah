/**
 * Registers the Android widget headless task. Imported (guarded) from
 * index.js only in native builds, importing this file pulls in the widget
 * library's native module, which is absent in Expo Go.
 */
import { registerWidgetTaskHandler } from 'react-native-android-widget';
import { widgetTaskHandler } from './widget-task-handler';

registerWidgetTaskHandler(widgetTaskHandler);
