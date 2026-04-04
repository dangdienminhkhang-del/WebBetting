/**
 * Lấy src avatar của user hiện tại từ localStorage.
 * Fallback về ui-avatars nếu chưa có.
 */
export function getAvatarSrc(nickname, size = 40) {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user?.avatarUrl) return user.avatarUrl;
  const name = encodeURIComponent(nickname || user?.nickname || "?");
  return `https://ui-avatars.com/api/?name=${name}&background=ffcc00&color=000&size=${size}`;
}
