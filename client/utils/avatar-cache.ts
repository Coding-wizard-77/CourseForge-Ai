const loadedAvatars = new Set<string>();
const failedAvatars = new Set<string>();

export function normalizeAvatarUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function isAvatarLoaded(src: string) {
  return loadedAvatars.has(src);
}

export function isAvatarFailed(src: string) {
  return failedAvatars.has(src);
}

export function markAvatarLoaded(src: string) {
  failedAvatars.delete(src);
  loadedAvatars.add(src);
}

export function markAvatarFailed(src: string) {
  loadedAvatars.delete(src);
  failedAvatars.add(src);
}

export function preloadAvatar(value?: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  const src = normalizeAvatarUrl(value);
  if (!src || loadedAvatars.has(src) || failedAvatars.has(src)) {
    return;
  }

  const image = new window.Image();
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  image.onload = () => markAvatarLoaded(src);
  image.onerror = () => markAvatarFailed(src);
  image.src = src;
}
