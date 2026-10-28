# brand task runner. `just` on its own lists everything.
#
# The toolchain (node, bun, just and the audit tools) is pinned in mise.toml — run `mise install` once.
# The gate's recipes are in sadr.just, which `sadr init` rewrites. The project's own recipes go
# here, and one named like a recipe there replaces it.

set allow-duplicate-recipes

import 'sadr.just'

# List available recipes
default:
    @just --list --unsorted

# One-time setup: commit guard
setup:
    git config core.hooksPath .githooks

# Write the stylesheets to dist/, then list what npm would publish
build:
    bun scripts/build.ts
    npm pack --dry-run

# Redraw the logo SVGs from the fonts in node_modules
logos:
    uv run --quiet scripts/logos.py
