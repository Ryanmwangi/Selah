import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Serif, SelahMark, Ui } from './Typ';

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 64, paddingHorizontal: 32, gap: 10 }}>
      <SelahMark size={30} color={t.hairline} />
      <Serif style={{ textAlign: 'center', color: t.inkSoft, fontSize: 16 }}>{title}</Serif>
      {hint ? <Ui style={{ textAlign: 'center', color: t.inkFaint }}>{hint}</Ui> : null}
    </View>
  );
}
