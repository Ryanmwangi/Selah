import { Feather } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React from 'react';
import { Pressable, View } from 'react-native';
import { formatDuration, voiceUri } from '../lib/voice';
import { useTheme } from '../theme/ThemeContext';
import { Ui } from './Typ';

interface Props {
  filename: string;
  durationMs: number | null;
  onRemove?: () => void;
}

/** Compact play/pause row for one voice note. */
export function VoiceNote({ filename, durationMs, onRemove }: Props) {
  const t = useTheme();
  const player = useAudioPlayer({ uri: voiceUri(filename) });
  const status = useAudioPlayerStatus(player);

  const toggle = async () => {
    if (status.playing) {
      player.pause();
      return;
    }
    // the session may still be in record mode (earpiece) or muted by the silent switch
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration)) {
      void player.seekTo(0);
    }
    player.play();
  };

  const shown = status.playing ? status.currentTime * 1000 : durationMs ?? status.duration * 1000;

  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 14, backgroundColor: t.accentSoft,
      }}
    >
      <Pressable
        onPress={() => void toggle()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={status.playing ? 'Pause voice note' : 'Play voice note'}
      >
        <Feather name={status.playing ? 'pause' : 'play'} size={18} color={t.accent} />
      </Pressable>
      <Ui style={{ color: t.inkSoft, flex: 1 }}>Voice note · {formatDuration(shown)}</Ui>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel="Remove voice note">
          <Feather name="x" size={14} color={t.inkFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}
