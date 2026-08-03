import { describe, expect, it } from "vitest";

import {
  PERMISSIONS,
  ROLE_LEVEL,
  ROLES,
  permissionsForRole,
  roleCan,
  type MembershipRole,
  type Permission,
} from "./permissions";

/**
 * Unit tests for Task 0204 — the role/permission matrix (PRD §7).
 * One cell test per (action, role) combination from the matrix table.
 * `roleCan` is the pure decision function; `assertPermission`/`can` in
 * `lib/data-access/access.ts` are thin DB-backed wrappers around it.
 */

/** Shorthand: does the matrix allow `role` to perform `permission`? */
const allow = (role: Permission | MembershipRole, permission: Permission) =>
  roleCan(role as MembershipRole, permission);

describe("ROLES / ROLE_LEVEL", () => {
  it("defines exactly owner, editor and viewer", () => {
    expect(ROLES).toEqual(["owner", "editor", "viewer"]);
  });

  it("orders viewer < editor < owner for diagnostics only", () => {
    expect(ROLE_LEVEL.owner).toBeGreaterThan(ROLE_LEVEL.editor);
    expect(ROLE_LEVEL.editor).toBeGreaterThan(ROLE_LEVEL.viewer);
  });

  it("never allows an unknown role", () => {
    // @ts-expect-error unknown permission on purpose
    expect(allow("admin", "project:view")).toBe(false);
  });
});

describe("Viewing (project:view) — Owner/Editor/Viewer", () => {
  it("lets owner, editor and viewer view the project/tasks/comments/activity", () => {
    expect(allow("owner", "project:view")).toBe(true);
    expect(allow("editor", "project:view")).toBe(true);
    expect(allow("viewer", "project:view")).toBe(true);
  });
});

describe("Create/edit/complete/reopen tasks (task:write) — Owner/Editor", () => {
  it("lets owner and editor write tasks", () => {
    expect(allow("owner", "task:write")).toBe(true);
    expect(allow("editor", "task:write")).toBe(true);
  });

  it("denies viewer", () => {
    expect(allow("viewer", "task:write")).toBe(false);
  });
});

describe("Sections, labels, order (section:write / label:write) — Owner/Editor", () => {
  it.each(["section:write", "label:write"] as const)(
    "allows owner for %s",
    (permission) => {
      expect(allow("owner", permission)).toBe(true);
    },
  );

  it.each(["section:write", "label:write"] as const)(
    "allows editor for %s",
    (permission) => {
      expect(allow("editor", permission)).toBe(true);
    },
  );

  it.each(["section:write", "label:write"] as const)(
    "denies viewer for %s",
    (permission) => {
      expect(allow("viewer", permission)).toBe(false);
    },
  );
});

describe("Add comments (comment:add) — Owner/Editor", () => {
  it("allows owner and editor", () => {
    expect(allow("owner", "comment:add")).toBe(true);
    expect(allow("editor", "comment:add")).toBe(true);
  });

  it("denies viewer", () => {
    expect(allow("viewer", "comment:add")).toBe(false);
  });
});

describe("Assign task (task:assign) — Owner/Editor", () => {
  it("allows owner and editor", () => {
    expect(allow("owner", "task:assign")).toBe(true);
    expect(allow("editor", "task:assign")).toBe(true);
  });

  it("denies viewer", () => {
    expect(allow("viewer", "task:assign")).toBe(false);
  });
});

describe("Invite / change roles (member:invite / member:role) — Owner only", () => {
  it.each(["member:invite", "member:role"] as const)(
    "allows owner for %s",
    (permission) => {
      expect(allow("owner", permission)).toBe(true);
    },
  );

  it.each(["member:invite", "member:role"] as const)(
    "denies editor for %s",
    (permission) => {
      expect(allow("editor", permission)).toBe(false);
    },
  );

  it.each(["member:invite", "member:role"] as const)(
    "denies viewer for %s",
    (permission) => {
      expect(allow("viewer", permission)).toBe(false);
    },
  );
});

describe("Remove members (member:remove) — Owner only", () => {
  it("allows owner", () => {
    expect(allow("owner", "member:remove")).toBe(true);
  });

  it("denies editor and viewer", () => {
    expect(allow("editor", "member:remove")).toBe(false);
    expect(allow("viewer", "member:remove")).toBe(false);
  });
});

describe("Transfer / archive / delete (project:admin) — Owner only", () => {
  it("allows owner", () => {
    expect(allow("owner", "project:admin")).toBe(true);
  });

  it("denies editor and viewer", () => {
    expect(allow("editor", "project:admin")).toBe(false);
    expect(allow("viewer", "project:admin")).toBe(false);
  });
});

describe("Delete tasks / moderate comments — Editor+/Owner", () => {
  it("lets owner and editor delete a task", () => {
    expect(allow("owner", "task:delete")).toBe(true);
    expect(allow("editor", "task:delete")).toBe(true);
  });

  it("denies viewer task deletion", () => {
    expect(allow("viewer", "task:delete")).toBe(false);
  });

  it("only owner may moderate (delete) any comment", () => {
    expect(allow("owner", "comment:moderate")).toBe(true);
    expect(allow("editor", "comment:moderate")).toBe(false);
    expect(allow("viewer", "comment:moderate")).toBe(false);
  });
});

describe("Matrix self-consistency", () => {
  it("every permission maps to a subset of the three roles", () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      for (const role of PERMISSIONS[permission]) {
        expect(ROLES).toContain(role);
      }
      expect(PERMISSIONS[permission].length).toBeGreaterThan(0);
    }
  });

  it("is monotonic: anything a viewer can do, an editor (and owner) can too", () => {
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      if (allow("viewer", permission)) {
        expect(allow("editor", permission)).toBe(true);
        expect(allow("owner", permission)).toBe(true);
      }
      if (allow("editor", permission)) {
        expect(allow("owner", permission)).toBe(true);
      }
    }
  });

  it("assignment never grants membership — it is scoped to the matrix", () => {
    // There is no permission that implies membership; the matrix never
    // contains a "member" role, only the three explicit project roles.
    for (const permission of Object.keys(PERMISSIONS) as Permission[]) {
      expect(PERMISSIONS[permission]).not.toContain("member" as MembershipRole);
    }
  });
});

describe("permissionsForRole (UI affordance derivation)", () => {
  it("returns owner's full permission set", () => {
    const perms = permissionsForRole("owner");
    expect(perms).toEqual(Object.keys(PERMISSIONS));
  });

  it("viewer gets exactly the read-only set", () => {
    expect(permissionsForRole("viewer")).toEqual(["project:view"]);
  });

  it("editor gets everything an owner gets except owner-only actions", () => {
    const ownerOnly: Permission[] = [
      "comment:moderate",
      "member:invite",
      "member:role",
      "member:remove",
      "project:admin",
    ];
    const editorPerms = new Set(permissionsForRole("editor"));
    for (const p of Object.keys(PERMISSIONS) as Permission[]) {
      expect(editorPerms.has(p)).toBe(!ownerOnly.includes(p));
    }
  });
});
