import React from 'react';
import { Text, View } from 'react-native';
import { parseMarkdown, type Inline } from '../lib/markdown';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';

function Inlines({ inlines, base }: { inlines: Inline[]; base: object }) {
  return (
    <>
      {inlines.map((inl, i) => {
        if (inl.kind === 'bold')
          return (
            <Text key={i} style={[base, { fontFamily: fonts.displayMedium }]}>
              {inl.text}
            </Text>
          );
        if (inl.kind === 'italic')
          return (
            <Text key={i} style={[base, { fontFamily: fonts.serifItalic }]}>
              {inl.text}
            </Text>
          );
        return (
          <Text key={i} style={base}>
            {inl.text}
          </Text>
        );
      })}
    </>
  );
}

/** Renders an entry body (markdown subset) as typeset reading text. */
export function MarkdownView({ body }: { body: string }) {
  const t = useTheme();
  const blocks = parseMarkdown(body);
  const base = { fontFamily: fonts.serif, fontSize: 17, lineHeight: 28, color: t.ink };

  return (
    <View style={{ gap: 2 }}>
      {blocks.map((blk, i) => {
        switch (blk.kind) {
          case 'blank':
            return <View key={i} style={{ height: 12 }} />;
          case 'heading':
            return (
              <Text
                key={i}
                style={{
                  fontFamily: fonts.display,
                  fontSize: blk.level === 1 ? 22 : 18,
                  lineHeight: blk.level === 1 ? 30 : 26,
                  color: t.ink,
                  marginTop: i === 0 ? 0 : 6,
                }}
              >
                <Inlines inlines={blk.inlines} base={{}} />
              </Text>
            );
          case 'list-item':
            return (
              <View key={i} style={{ flexDirection: 'row', gap: 10, paddingLeft: 4 }}>
                <Text style={[base, { color: t.gold }]}>·</Text>
                <Text style={[base, { flex: 1 }]}>
                  <Inlines inlines={blk.inlines} base={base} />
                </Text>
              </View>
            );
          case 'quote':
            return (
              <View
                key={i}
                style={{ borderLeftWidth: 2, borderLeftColor: t.verseRule, paddingLeft: 12, marginVertical: 2 }}
              >
                <Text style={[base, { fontFamily: fonts.serifItalic, color: t.inkSoft }]}>
                  <Inlines inlines={blk.inlines} base={{}} />
                </Text>
              </View>
            );
          default:
            return (
              <Text key={i} style={base}>
                <Inlines inlines={blk.inlines} base={base} />
              </Text>
            );
        }
      })}
    </View>
  );
}
