# Task 0201 — Project List + Creation UI

## Requirement

Provide a project list in the sidebar (design pattern from the prototype) and a creation flow that captures a required name and optional description, and lets the owner pick an invite role on creation. The creator becomes owner (FR-2).

## Steps

1. Add a "Projects" section to the sidebar (`app-sidebar.tsx`) listing the actor's active projects, with a count and diamond markers per design.
2. Add a "Create project" affordance (the prototype's `create` button with a lime `plus` mark).
3. Implement a creation dialog/inline composer: required name, optional description, optional invite role default (Editor).
4. On submit call `createProject` server action and navigate to the new project.
5. Show empty, loading and error states for the project list (Story 05 completes polish).
6. Reflect current selection/active project in the sidebar styling.

## Recommendation

Model the sidebar on the prototype (cobalt background, project rows with a diamond dot + avatar stack + count). Keep the create affordance keyboard-accessible. Because the sidebar is shared across the app, keep its data fetched server-side (server component or a shared query) and update optimistically after creation.
