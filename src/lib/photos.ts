/**
 * Photo attachments, picked from the library, copied into the app's
 * private sandbox (documents/photos/). We never keep references into the
 * user's photo library; the journal owns its own copy, offline, private.
 */
import * as ImagePicker from 'expo-image-picker';
import { Directory, File, Paths } from 'expo-file-system';
import { newId } from './ids';

export interface PickedPhoto {
  id: string;
  filename: string;
  width: number | null;
  height: number | null;
}

function photosDir(): Directory {
  const dir = new Directory(Paths.document, 'photos');
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Absolute file URI for a stored photo filename. */
export function photoUri(filename: string): string {
  return new File(photosDir(), filename).uri;
}

/** Open the system picker (multi-select) and copy selections into the sandbox. */
export async function pickPhotos(max = 6): Promise<PickedPhoto[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: max,
    quality: 0.85,
  });
  if (res.canceled) return [];
  const dir = photosDir();
  const out: PickedPhoto[] = [];
  for (const asset of res.assets) {
    const id = newId();
    const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
    const filename = `${id}.${ext.length <= 5 ? ext : 'jpg'}`;
    new File(asset.uri).copy(new File(dir, filename));
    out.push({ id, filename, width: asset.width ?? null, height: asset.height ?? null });
  }
  return out;
}

/** Delete the stored file for an attachment (call alongside removeAttachment). */
export function deletePhotoFile(filename: string): void {
  const f = new File(photosDir(), filename);
  if (f.exists) f.delete();
}
