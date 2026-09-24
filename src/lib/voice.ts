/**
 * Voice note attachments. Recorded with the microphone (only when the user
 * taps record), moved into the app's private sandbox alongside photos so the
 * existing cleanup paths (trash, purge) delete them too. Nothing leaves the device.
 */
import { File, Paths } from 'expo-file-system';
import { newId } from './ids';
import { photoUri } from './photos';
export { formatDuration } from './duration';

export interface RecordedVoice {
  id: string;
  filename: string;
  durationMs: number;
}

export const voiceUri = photoUri;

/** Move a finished recording (cache uri) into the sandbox. Returns null if nothing usable. */
export function storeRecording(tempUri: string | null | undefined, durationMs: number): RecordedVoice | null {
  if (!tempUri || durationMs < 500) return null; // ignore accidental taps
  const id = newId();
  const filename = `${id}.m4a`;
  const dest = new File(photoUri(filename));
  const src = new File(tempUri);
  if (!src.exists || src.size === 0) return null; // nothing was captured
  src.copy(dest);
  return { id, filename, durationMs };
}
