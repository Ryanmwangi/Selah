/**
 * Selah's design language: a quiet, pastel sanctuary.
 *
 * Two moods, "Dawn" (soft lavender daylight on warm paper) and "Dusk"
 * (a calm muted-indigo night). The palette leans on **lavender + sage**,
 * the classic calming pairing, kept low-saturation so nothing shouts.
 *
 * Lora carries the journal's voice (display, scripture, entry text), a
 * soft, unhurried serif. Nunito handles UI chrome, rounded and gentle.
 * The brand mark is the caesura ‖, the pause selah names.
 */

export const dawn = {
  name: 'dawn' as const,
  bg: '#F5F3FA',          // whisper lavender-white
  surface: '#FCFBFE',
  surfaceAlt: '#ECE8F5',
  ink: '#454153',         // soft plum-grey (never pure black)
  inkSoft: '#6F6B82',
  inkFaint: '#A6A1B8',
  hairline: '#E6E1F1',
  accent: '#8F86C6',      // soft lavender, verse chips, actions
  accentSoft: '#E8E3F5',
  gold: '#8FA07E',        // sage, pins, verse numbers (calming secondary)
  verseBg: '#EFEBF8',
  verseRule: '#D6CEE9',
  danger: '#C58A93',      // dusty rose
  overlay: 'rgba(69, 65, 83, 0.35)',
};

export const vigil: Theme = {
  name: 'vigil',
  bg: '#1D1B26',          // calm muted indigo, not harsh black
  surface: '#262330',
  surfaceAlt: '#2F2B3C',
  ink: '#E9E6F2',
  inkSoft: '#ADA8BE',
  inkFaint: '#746F83',
  hairline: '#322E40',
  accent: '#ADA4DE',      // luminous soft lavender
  accentSoft: '#302A40',
  gold: '#A6B594',        // soft sage light
  verseBg: '#242130',
  verseRule: '#403A53',
  danger: '#D19AA2',
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export type Theme = Omit<typeof dawn, 'name'> & { name: 'dawn' | 'vigil' };

export const fonts = {
  display: 'Lora_600SemiBold',
  displayMedium: 'Lora_500Medium',
  serif: 'Lora_400Regular',
  serifItalic: 'Lora_400Regular_Italic',
  ui: 'Nunito_400Regular',
  uiMedium: 'Nunito_500Medium',
  uiSemi: 'Nunito_600SemiBold',
};

/** The brand mark, a caesura. */
export const SELAH_MARK = '‖';

/** Mood accents, soft pastels, each distinct but hushed. */
export const MOOD_META: Record<string, { label: string; dot: string }> = {
  still: { label: 'Still', dot: '#9DB0C4' },          // soft blue-grey
  grateful: { label: 'Grateful', dot: '#CDB488' },    // soft honey
  hopeful: { label: 'Hopeful', dot: '#A7BE97' },      // soft sage
  rejoicing: { label: 'Rejoicing', dot: '#E0A59A' },  // soft blush coral
  peaceful: { label: 'Peaceful', dot: '#9CC6BE' },    // soft seafoam
  content: { label: 'Content', dot: '#C2B79E' },      // soft oat
  anxious: { label: 'Anxious', dot: '#C9A7CF' },      // soft orchid
  afraid: { label: 'Afraid', dot: '#A9A0C8' },        // soft periwinkle
  weary: { label: 'Weary', dot: '#A6A6B4' },          // soft ash
  lonely: { label: 'Lonely', dot: '#9AA6C2' },        // soft dusk blue
  heavy: { label: 'Heavy', dot: '#97A0B0' },          // soft slate
  discouraged: { label: 'Discouraged', dot: '#B0A0AC' }, // soft mauve-grey
  wrestling: { label: 'Wrestling', dot: '#B79BC9' },  // soft mauve
  angry: { label: 'Angry', dot: '#D69A94' },          // soft clay
  tempted: { label: 'Tempted', dot: '#C7A98E' },      // soft sand
};
