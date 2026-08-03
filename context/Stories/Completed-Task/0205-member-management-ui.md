# Task 0205 — Member Management UI

## Requirement

Provide an Owner-facing member management surface: list active/pending members, invite, change Editor/Viewer roles, remove members, and (per design) show a people/avatar stack. Enforce that the final Owner cannot be removed (PRD §7).

## Steps

1. Add a people/avatar stack in the project header/sidebar per the design (overlapping circular avatars).
2. Build a "Members" dialog/sheet: table of members (name, email, role, status) plus pending invitations.
3. Implement invite UI (email + role) calling `inviteMember`.
4. Implement role-change and remove actions, Owner-only, with the final-owner guard.
5. Implement a "transfer ownership" flow (reassign Owner role).
6. Reflect member state consistently across clients after changes.

## Recommendation

Reuse the `Avatar` shadcn component and restyle to Taskspace tokens (circular people up to ~22px, citron selected/owner, `PersonIcon`-style). Keep the server as the source of truth and re-render from server data after each mutation rather than trusting optimistic state alone. Show pending vs active clearly, since FR-2 requires them distinguishable.
