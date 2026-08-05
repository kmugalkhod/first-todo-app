"""One-off codemod: fold ad-hoc font sizes/weights onto the shared type tokens.

Sizes used across the app had drifted into 19 different arbitrary rem values
(0.55/0.59/0.6/0.61/0.62/0.64/0.65/0.66/0.69/0.7/0.72/0.74/0.75/0.78/0.8/…).
DESIGN.md defines five roles, so each drifted value is snapped to the nearest
documented step, expressed as a token.
"""

import glob
import sys

SIZE_TO_TOKEN = {
    # label / kicker step
    "text-[0.55rem]": "text-[var(--taskspace-font-size-chip)]",
    "text-[0.59rem]": "text-[var(--taskspace-font-size-chip)]",
    "text-[0.6rem]": "text-[var(--taskspace-font-size-chip)]",
    "text-[0.61rem]": "text-[var(--taskspace-font-size-micro)]",
    "text-[0.62rem]": "text-[var(--taskspace-font-size-micro)]",
    # metadata step
    "text-[0.64rem]": "text-[var(--taskspace-font-size-meta)]",
    "text-[0.65rem]": "text-[var(--taskspace-font-size-meta)]",
    "text-[0.66rem]": "text-[var(--taskspace-font-size-meta)]",
    "text-[0.69rem]": "text-[var(--taskspace-font-size-meta)]",
    "text-[0.7rem]": "text-[var(--taskspace-font-size-meta)]",
    # body step
    "text-[0.72rem]": "text-[var(--taskspace-font-size-body)]",
    "text-[0.74rem]": "text-[var(--taskspace-font-size-body)]",
    "text-[0.75rem]": "text-[var(--taskspace-font-size-body)]",
    # subsection step
    "text-[0.78rem]": "text-[var(--taskspace-font-size-subsection)]",
    "text-[0.8rem]": "text-[var(--taskspace-font-size-subsection)]",
    # section + title steps
    "text-[0.95rem]": "text-[var(--taskspace-font-size-section)]",
    "text-[1.45rem]": "text-[var(--taskspace-font-size-title)]",
    "text-[1.5rem]": "text-[var(--taskspace-font-size-title)]",
    "text-[1.9rem]": "text-[var(--taskspace-font-size-heading)]",
}

WEIGHT_TO_TOKEN = {
    "font-[650]": "font-[var(--taskspace-weight-nav)]",
    "font-[700]": "font-[var(--taskspace-weight-section)]",
    "font-[720]": "font-[var(--taskspace-weight-section)]",
    "font-[750]": "font-[var(--taskspace-weight-label)]",
    "font-[760]": "font-[var(--taskspace-weight-label)]",
    "font-[800]": "font-[var(--taskspace-weight-display)]",
}

# The display face's tracking values had also drifted per-file.
TRACKING_TO_TOKEN = {
    "tracking-[-0.05em]": "tracking-[var(--taskspace-tracking-title)]",
    "tracking-[-0.048em]": "tracking-[var(--taskspace-tracking-title)]",
    "tracking-[0.08em]": "tracking-[var(--taskspace-tracking-label)]",
}


def targets():
    paths = []
    for pattern in ("components/**/*.tsx", "app/**/*.tsx", "feature/**/*.tsx"):
        for path in glob.glob(pattern, recursive=True):
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
        for table in (SIZE_TO_TOKEN, WEIGHT_TO_TOKEN, TRACKING_TO_TOKEN):
            for raw, token in table.items():
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
