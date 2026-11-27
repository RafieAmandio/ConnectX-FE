// Google profile photos arrive as `...=s96-c` (96px); shown full-width they are a blurry upscale.
// The same URL serves any size, so ask for one that fits a card hero.
export function toLargePhotoUrl(url: string, size = 800) {
  return /googleusercontent\.com\//.test(url) ? url.replace(/=s\d+(-c)?$/, `=s${size}-c`) : url;
}
