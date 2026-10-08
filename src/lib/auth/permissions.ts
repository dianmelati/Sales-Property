export const PERMISSIONS = [
  "dashboard:read",
  "property:read", "property:write", "property:delete", "property:publish",
  "agent:read", "agent:write",
  "lead:read", "lead:write",
  "media:read", "media:write", "media:delete",
  "cms:write", "seo:write", "settings:write",
  "user:manage", "audit:read",
] as const;
export type PermissionKey = (typeof PERMISSIONS)[number];
export type RoleKey = "SUPER_ADMIN" | "ADMIN" | "EDITOR" | "AGENT";

const all = [...PERMISSIONS];

/** Sumber kebenaran RBAC. Seed menyalin ini ke tabel Permission/RolePermission. */
export const ROLE_PERMISSIONS: Record<RoleKey, readonly PermissionKey[]> = {
  SUPER_ADMIN: all,
  ADMIN: all.filter((p) => p !== "user:manage"),
  EDITOR: ["dashboard:read", "property:read", "property:write", "property:publish", "media:read", "media:write", "cms:write", "seo:write"],
  AGENT: ["dashboard:read", "property:read", "lead:read", "lead:write", "media:read"],
};

export function can(role: RoleKey, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
