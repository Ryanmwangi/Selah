/**
 * Android home-screen widget UI, built with react-native-android-widget
 * (renders to native RemoteViews — this is NOT the React Native app UI).
 *
 * This module imports the widget library at the top level, so it must only
 * ever be `require`d from a native build (the bridge and task handler do this
 * lazily). It is never evaluated in Expo Go.
 *
 * Colors are the Dawn palette held as literals — a widget can't read the
 * app's theme context, and light parchment reads well on most wallpapers.
 */
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetPayload } from '../lib/widget/payload';

const C = {
  bg: '#F5F3FA',
  ink: '#454153',
  soft: '#6F6B82',
  faint: '#A6A1B8',
  accent: '#8F86C6',
} as const;

export function renderSelahWidget(payload: WidgetPayload | null): React.JSX.Element {
  const p = payload;
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        flexDirection: 'column',
        justifyContent: 'space-between',
        backgroundColor: C.bg,
        borderRadius: 24,
        padding: 18,
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', width: 'match_parent', justifyContent: 'space-between' }}>
        <TextWidget
          text={(p?.eyebrow ?? 'Selah').toUpperCase()}
          style={{ fontSize: 11, color: C.accent, letterSpacing: 1 }}
        />
        <TextWidget text={'‖'} style={{ fontSize: 15, color: C.accent }} />
      </FlexWidget>

      <TextWidget
        text={p?.body ?? 'Open Selah to choose what to show here.'}
        maxLines={4}
        style={{ fontSize: p?.kind === 'streak' ? 22 : 16, color: C.ink }}
      />

      <TextWidget
        text={p?.footer ?? 'Pause and reflect'}
        maxLines={1}
        style={{ fontSize: 12, color: C.faint }}
      />
    </FlexWidget>
  );
}
