#!/bin/bash
# Update this theme to the latest upstream version
# Your notes in _notes/ are safe — they're excluded from git
#
# Usage:
#   ./update-theme.sh              # Fetch and merge latest upstream
#   ./update-theme.sh --dry-run    # Preview changes before merging

set -e

UPSTREAM_URL="https://github.com/iamprasadraju/jekyll-obsidian-theme.git"
UPSTREAM_NAME="upstream"

# Check for clean working tree
if [ -n "$(git status --porcelain)" ]; then
  echo "⚠ Working tree is not clean. Commit or stash your changes first."
  exit 1
fi

# Add upstream remote if it doesn't exist
if ! git remote get-url "$UPSTREAM_NAME" &>/dev/null; then
  git remote add "$UPSTREAM_NAME" "$UPSTREAM_URL"
fi

# Fetch latest from upstream
git fetch "$UPSTREAM_NAME"

# Dry run mode
if [ "$1" = "--dry-run" ]; then
  echo "Upstream changes that would be merged:"
  git log HEAD.."$UPSTREAM_NAME/main" --oneline 2>/dev/null || echo "  (no new changes)"
  exit 0
fi

# Merge upstream
if git merge "$UPSTREAM_NAME/main" --no-edit 2>&1; then
  echo "✓ Theme updated! Run 'bundle install' if Gemfile changed."
else
  echo "✗ Merge conflicts detected."
  echo ""
  echo "Conflicted files:"
  git diff --name-only --diff-filter=U | sed 's/^/  - /'
  echo ""
  echo "To resolve:"
  echo "  1. Edit the conflicted files"
  echo "  2. git add ."
  echo "  3. git commit -m 'Resolve upstream merge'"
  echo ""
  echo "To abort:"
  echo "  git merge --abort"
  exit 1
fi
