---
timestamp: 2026-08-02T08-47-04Z
slug: prototypes-taskspace-momentum-prototype-html
---
# Momentum Board critique

Target: `prototypes/taskspace-momentum-prototype.html`

The product-specific concept is strong: a cobalt primary work field and visible horizon make the intended next action memorable. The main interaction problem is that the large focal task looks actionable, but completing it requires selecting it and finding a secondary control in the horizon panel.

## Priority improvements

1. Make the primary task's action explicit: a labelled Complete button or an explicit Open task action directly on the hero card.
2. Add Undo after delete and after completion; immediate deletion currently has no recovery path.
3. On mobile, replace the clipped horizontal navigation with a compact view switcher and make complete/defer reachable without passing the horizon list.
4. Clarify the hierarchy between horizon placement, due date, and priority; rename "focus" task metadata to "priority".
5. Use the lower desktop cobalt field for an immediate complete/defer control and a restrained next-task preview.

## Evidence

The detector returned one warning: `overused-font` at line 8 for Inter. This is factual but secondary; a well-chosen UI font can be retained for an operating tool if the design later establishes a distinctive display voice. Browser testing confirmed desktop and mobile rendering, selection of a horizon task, completion with live status, and promotion of the next task. The mobile navigation is horizontally scrollable with the Completed label visibly truncated.

## Verdict

Prioritize action clarity and recovery before further visual polish. The design's visual authority is already sufficient; the next pass should make its central promise effortless to act on.
