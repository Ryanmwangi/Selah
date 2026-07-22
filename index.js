// Custom entry: register the Android widget task handler before the app boots,
// but only in a native build. In Expo Go the widget library's native module is
// absent, so we guard the require and the app runs normally (widgets inert).
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';

if (
  Platform.OS === 'android' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient
) {
  try {
    require('./src/widgets/register');
  } catch (e) {
    // Widget support is optional; never block app startup on it.
  }
}

import 'expo-router/entry';
