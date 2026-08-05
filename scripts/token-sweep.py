"""One-off codemod: replace inline raw hex with canonical Taskspace tokens.

Every colour below already exists as a token in app/globals.css (derived from
DESIGN.md / .impeccable/design.json). This only rewrites Tailwind arbitrary
values like `text-[#6f7792]` -> `text-[var(--taskspace-muted)]`; it never
invents a new colour.
"""

import glob
import sys

HEX_TO_TOKEN = {
    "#3543d6": "var(--taskspace-cobalt)",
    "#252d95": "var(--taskspace-cobalt-deep)",
    "#202550": "var(--taskspace-ink)",
    "#edff81": "var(--taskspace-citron)",
    "#ff765d": "var(--taskspace-coral)",
    "#dfe2ef": "var(--taskspace-line)",
    "#eef0ff": "var(--taskspace-periwinkle-pale)",
    "#fbfbff": "var(--taskspace-paper)",
    "#e1e4ff": "var(--taskspace-canvas)",
    "#3b8b69": "var(--taskspace-completion-green)",
    "#c9cdfd": "var(--taskspace-on-cobalt-muted)",
    "#e1e3ff": "var(--taskspace-on-cobalt)",
    "#a9b0ee": "var(--taskspace-avatar-surface)",
    "#a2aaef": "var(--taskspace-avatar-surface)",
    "#f7f8ff": "var(--taskspace-selected-surface)",
    "#5963ae": "var(--taskspace-priority-p3-ink)",
    "#6e76a3": "var(--taskspace-ink-subtle)",
    "#6f7792": "var(--taskspace-muted)",
    "#69718d": "var(--taskspace-muted)",
    "#66708c": "var(--taskspace-muted)",
    "#56607e": "var(--taskspace-ink-soft)",
    "#515989": "var(--taskspace-ink-soft)",
    "#9299bb": "var(--taskspace-ink-faint)",
    "#a1a7c4": "var(--taskspace-ink-faint)",
    "#d8ddec": "var(--taskspace-line)",
    "#d9ddea": "var(--taskspace-line)",
    "#c3c7da": "var(--taskspace-line)",
    "#f3f4fb": "var(--taskspace-priority-p4-surface)",
    "#eff2f4": "var(--taskspace-priority-p4-surface)",
    "#8c2f22": "var(--taskspace-priority-p1-ink)",
    "#b74c3a": "var(--taskspace-priority-p1-ink)",
    "#fff0ed": "var(--taskspace-priority-p1-surface)",
    "#fff6d8": "var(--taskspace-priority-p2-surface)",
    "#90701c": "var(--taskspace-priority-p2-ink)",
}

# Off-scale radii -> the nearest documented radius token.
RADIUS_TO_TOKEN = {
    "rounded-[7px]": "rounded-[var(--taskspace-radius-control)]",
    "rounded-[9px]": "rounded-[var(--taskspace-radius-control)]",
    "rounded-[10px]": "rounded-[var(--taskspace-radius-panel)]",
    "rounded-[14px]": "rounded-[var(--taskspace-radius-dialog)]",
    "rounded-[15px]": "rounded-[var(--taskspace-radius-dialog)]",
    "rounded-[5px]": "rounded-[var(--taskspace-radius-chip)]",
}


def targets():
    paths = []
    for pattern in ("components/**/*.tsx", "app/**/*.tsx", "feature/**/*.tsx"):
        for path in glob.glob(pattern, recursive=True):
            # shadcn/base-ui primitives keep their own generic token surface.
            if "/ui/" in path.replace("\\", "/") and "page-shell" not in path:
                continue
            paths.append(path)
    return sorted(set(paths))


def main():
    changed = []
    for path in targets():
        with open(path, encoding="utf-8") as handle:
            original = handle.read()
        text = original
        for hex_value, token in HEX_TO_TOKEN.items():
            # Only rewrite inside Tailwind arbitrary values, so data strings
            # (e.g. persisted label colours) are left untouched.
            text = text.replace(f"[{hex_value}]", f"[{token}]")
        for raw, token in RADIUS_TO_TOKEN.items():
            text = text.replace(raw, token)
        if text != original:
            with open(path, "w", encoding="utf-8") as handle:
                handle.write(text)
            changed.append(path)
    print(f"rewrote {len(changed)} files")
    for path in changed:
        print("  ", path)
    return 0


if __name__ == "__main__":
    sys.exit(main())
