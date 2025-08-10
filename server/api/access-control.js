// server/api/access-control.js
export default defineEventHandler(() => {
  // Contoh data akses dinamis dari server
  return [
    { pathPrefix: "/settings", allowedRoles: ["admin"] },
    { pathPrefix: "/admin", allowedRoles: ["admin", "superuser"] },
    { pathPrefix: "/user", allowedRoles: ["user", "admin", "superuser"] },
  ];
});
