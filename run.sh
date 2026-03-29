#!/bin/bash
# Obsidian Theme - Dev Server
# Syncs vault (if configured) then starts Jekyll with live reload

cd "$(dirname "$0")"

# Check if vault_path is configured
VAULT_PATH=$(ruby -ryaml -e "p = YAML.safe_load(File.read('_config.yml'), permitted_classes: [Date]).dig('obsidian','sync','vault_path') || ''; puts p.empty? ? '' : File.expand_path(p)" 2>/dev/null)

if [ -n "$VAULT_PATH" ] && [ -d "$VAULT_PATH" ]; then
  echo "Syncing vault..."
  ruby sync.rb
  echo ""
else
  # No vault configured or vault path doesn't exist — install demo notes if _notes/ is empty
  if [ -z "$(ls -A _notes/ 2>/dev/null)" ]; then
    echo "No vault configured. Installing demo notes..."
    ruby sync.rb setup
    echo ""
  fi
fi

bundle exec jekyll serve --livereload
