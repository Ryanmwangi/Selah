import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useDb } from '../db/DbProvider';
import { formatRef, type VerseRef } from '../lib/scripture/refs';
import { getPassage } from '../repo/scripture';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { Overline } from './Typ';

const COLLAPSE_AFTER = 4;

/**
 * Typeset scripture: left rule, gold verse numbers, serif text.
 * Long passages collapse to the first verses with a gentle "read all".
 */
export function VerseCard({ refv, onPressRef }: { refv: VerseRef; onPressRef?: () => void }) {
  const t = useTheme();
  const { scripture } = useDb();
  const [expanded, setExpanded] = useState(false);
  const { data: verses } = useQuery({
    queryKey: ['passage', refv.book, refv.chapter, refv.verseStart, refv.verseEnd],
    queryFn: () => getPassage(scripture, refv),
  });

  if (!verses) return null;
  const shown = expanded ? verses : verses.slice(0, COLLAPSE_AFTER);
  const truncated = verses.length > shown.length;

  return (
    <View
      style={{
        backgroundColor: t.verseBg,
        borderLeftWidth: 2,
        borderLeftColor: t.verseRule,
        borderRadius: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 6,
      }}
    >
      <Pressable onPress={onPressRef} accessibilityRole={onPressRef ? 'button' : undefined}>
        <Overline style={{ color: t.gold }}>{formatRef(refv)} · WEB</Overline>
      </Pressable>
      <Text style={{ fontFamily: fonts.serif, fontSize: 16, lineHeight: 26, color: t.ink }}>
        {shown.map((v, i) => (
          <Text key={v.verse}>
            {i > 0 ? ' ' : ''}
            <Text style={{ fontFamily: fonts.uiSemi, fontSize: 10, color: t.gold }}>{v.verse} </Text>
            {v.text}
          </Text>
        ))}
        {truncated ? '…' : ''}
      </Text>
      {truncated || expanded ? (
        <Pressable onPress={() => setExpanded((e) => !e)} accessibilityRole="button" hitSlop={8}>
          <Text style={{ fontFamily: fonts.uiMedium, fontSize: 13, color: t.accent }}>
            {expanded ? 'Show less' : `Read all ${verses.length} verses`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
