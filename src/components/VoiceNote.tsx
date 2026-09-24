import { Feather } from '@expo/vector-icons';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, TextInput, View } from 'react-native';
import { formatDuration } from '../lib/duration';
import { voiceUri } from '../lib/voice';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { Ui } from './Typ';

interface Props {
  filename: string;
  durationMs: number | null;
  label: string | null;
  /** Composer mode: name is editable and the reorder/remove controls show. */
  onRename?: (label: string) => void;
  onRemove?: () => void;
  /** Drag handle callbacks (composer only): finger position in window coordinates. */
  onDragStart?: () => void;
  onDragMove?: (moveY: number, dy: number) => void;
  onDragEnd?: (moveY: number) => void;
  /** While this note is being dragged it follows the finger by this offset. */
  dragY?: Animated.Value;
  dragging?: boolean;
}

/** One voice note: play/pause, a name (editable while composing), and its length. */
export function VoiceNote({
  filename, durationMs, label, onRename, onRemove, onDragStart, onDragMove, onDragEnd, dragY, dragging,
}: Props) {
  const t = useTheme();
  const player = useAudioPlayer({ uri: voiceUri(filename) });
  const status = useAudioPlayerStatus(player);
  const [name, setName] = useState(label ?? '');
  // the pan responder is created once, so it reads the latest callbacks from a ref
  const drag = useRef({ onDragStart, onDragMove, onDragEnd });
  drag.current = { onDragStart, onDragMove, onDragEnd };
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => drag.current.onDragStart?.(),
      onPanResponderMove: (_e, g) => drag.current.onDragMove?.(g.moveY, g.dy),
      onPanResponderRelease: (_e, g) => drag.current.onDragEnd?.(g.moveY),
      onPanResponderTerminate: (_e, g) => drag.current.onDragEnd?.(g.moveY),
    }),
  ).current;
  useEffect(() => setName(label ?? ''), [label]);

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
    <Animated.View
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, paddingHorizontal: 12,
        borderRadius: 14, backgroundColor: t.accentSoft,
        ...(dragging
          ? {
              zIndex: 20, elevation: 8, opacity: 0.95, transform: [{ translateY: dragY ?? 0 }, { scale: 1.02 }],
              shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
            }
          : null),
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
      {onRename ? (
        <TextInput
          value={name}
          onChangeText={setName}
          onEndEditing={() => onRename(name)}
          placeholder="Name this voice note"
          placeholderTextColor={t.inkFaint}
          returnKeyType="done"
          style={{ flex: 1, fontFamily: fonts.ui, fontSize: 14, color: t.ink, paddingVertical: 2 }}
          accessibilityLabel="Voice note name"
        />
      ) : (
        <Ui style={{ color: t.inkSoft, flex: 1 }}>{label?.trim() || 'Voice note'}</Ui>
      )}
      <Ui style={{ color: t.inkFaint }}>{formatDuration(shown)}</Ui>
      {onRemove ? (
        <Pressable onPress={onRemove} hitSlop={6} accessibilityRole="button" accessibilityLabel="Remove voice note">
          <Feather name="x" size={15} color={t.inkFaint} />
        </Pressable>
      ) : null}
      {onDragStart ? (
        <View
          {...pan.panHandlers}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 6 }}
          accessible
          accessibilityLabel="Drag to move voice note"
          style={{ paddingLeft: 2 }}
        >
          <Feather name="menu" size={17} color={t.inkFaint} />
        </View>
      ) : null}
    </Animated.View>
  );
}
