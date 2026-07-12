export type SupportedMediaType = 'image' | 'video';

export type SelectedMediaFile = {
  id: string;
  file: File;
  mediaType: SupportedMediaType;
  previewUrl: string;
};

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_VIDEO_BYTES = 80 * 1024 * 1024;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/quicktime', 'video/webm']);

export function mediaTypeForFile(file: File): SupportedMediaType | null {
  if (IMAGE_TYPES.has(file.type)) return 'image';
  if (VIDEO_TYPES.has(file.type)) return 'video';
  return null;
}

export function validateMediaFile(file: File): string | null {
  const mediaType = mediaTypeForFile(file);
  if (!mediaType) return `${file.name} is not a supported image or video file.`;
  const maxBytes = mediaType === 'image' ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    return `${file.name} is too large. ${mediaType === 'image' ? 'Images' : 'Videos'} must be ${maxMb}MB or less.`;
  }
  return null;
}

export function filesToMedia(files: FileList | File[]): { media: SelectedMediaFile[]; errors: string[] } {
  const errors: string[] = [];
  const media = Array.from(files).flatMap(file => {
    const error = validateMediaFile(file);
    const mediaType = mediaTypeForFile(file);
    if (error || !mediaType) {
      errors.push(error || `${file.name} is not supported.`);
      return [];
    }

    return [{
      id: crypto.randomUUID(),
      file,
      mediaType,
      previewUrl: URL.createObjectURL(file)
    }];
  });

  return { media, errors };
}

export function revokeMediaPreviews(media: SelectedMediaFile[]) {
  media.forEach(item => URL.revokeObjectURL(item.previewUrl));
}

export function sanitizeFileName(name: string) {
  const cleaned = name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '');
  return cleaned || 'barmap-media';
}
