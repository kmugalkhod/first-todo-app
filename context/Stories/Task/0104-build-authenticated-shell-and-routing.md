# Task 0104 — Build Authenticated Shell + Routing

## Requirement

Deliver the signed-in application shell with the Taskspace design (cobalt sidebar, paper workspace) and routing that guards protected pages. Unauthenticated visitors are redirected to sign in and never receive protected data (FR-1).

## Steps

1. Introduce route groups: a public group for landing/sign-in and a protected group for the app.
2. Add a layout/middleware guard: unauthenticated requests to the protected group redirect to sign in; signed-in users away from sign-in.
3. Build the Taskspace application shell from `DESIGN.md`: cobalt navbar with brand mark, "Create" button, nav (Inbox/Upcoming/project list area), people avatars and current user card.
4. Apply the Taskspace palette and typography tokens (Archivo Display for headings, Aptos/system for body) — hook up `archivo-display.ttf` already in `public/`.
5. Render the user's profile (avatar/initials, display name) and a sign-out action in the shell (`app-sidebar.tsx`).
6. Keep the shell available across all protected pages without forcing navigation away on selection (detail panel pattern per FR-3/design).

## Recommendation

Reuse the existing `components/ui/sidebar` and `app-sidebar.tsx` but restyle them to the Taskspace tokens in `DESIGN.md`. Keep the shell server-rendered where possible, marking only interactive subtrees as client components. Base the nav structure on the prototype's layout (brand → create → workspace nav → projects → people → profile) so later Story 02/04 navigation slots in without rework.
