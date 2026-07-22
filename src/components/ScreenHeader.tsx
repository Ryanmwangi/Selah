import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Display } from './Typ';

export function ScreenHeader({
  title,
  left,
  right,
}: {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 12,
        paddingBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
      }}
    >
      {left}
      <View style={{ flex: 1, paddingHorizontal: 4 }}>
        {title ? <Display style={{ fontSize: 24, lineHeight: 30 }}>{title}</Display> : null}
      </View>
      {right}
    </View>
  );
}
