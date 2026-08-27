import { useEffect, useState, resolveAssetUrl } from '../../imports';

export const initialsOf = (name = '') => name
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((word) => word[0].toUpperCase())
  .join('') || '?';

/**
 * Foto profil bulat dengan fallback inisial nama kalau foto tidak ada
 * atau gagal dimuat.
 */
export default function Avatar({ name, photo, size = 36, className = '' }) {
  const [failed, setFailed] = useState(false);
  const src = resolveAssetUrl(photo);

  useEffect(() => { setFailed(false); }, [src]);

  return (
    <span
      className={`app-avatar ${className}`.trim()}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.36) }}
      aria-hidden="true"
    >
      {src && !failed ? (
        <img src={src} alt="" onError={() => setFailed(true)} />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
