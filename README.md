# Obsidian Theme for Jekyll

A Jekyll theme that replicates the look, feel, and workflow of the [Obsidian](https://obsidian.md) note-taking app. Optimized for personal knowledge management, note linking, and markdown-based publishing.

![Dark Mode](https://img.shields.io/badge/theme-dark-blue) ![Jekyll](https://img.shields.io/badge/jekyll-4.3+-red) ![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Dark-first UI** with light mode toggle (stored in localStorage)
- **3-column layout** — left sidebar (file tree), center (content), right sidebar (TOC + backlinks)
- **Wikilinks** — `[[note-name]]` syntax, converted at build time via Ruby plugin
- **Backlinks** — automatically generated from wikilink references
- **Graph view** — interactive network visualization using Vis.js
- **Command palette** — `Ctrl/Cmd + K` search with Fuse.js fuzzy matching
- **Obsidian callouts** — `> [!note]`, `> [!warning]`, etc.
- **Tags** — `#hashtag` support with auto-generated tag pages
- **Auto TOC** — table of contents from headings in right sidebar
- **Code blocks** — syntax highlighting with copy button
- **Responsive** — sidebars collapse to drawers on mobile
- **Keyboard shortcuts** — `Ctrl+K` search, `Ctrl+B` toggle sidebar, `Esc` close modals
- **Vault sync** — `ruby sync.rb` copies your local Obsidian vault into `_notes/`

## Quick Start

### Prerequisites

- Ruby >= 2.7
- Bundler
- Jekyll >= 4.3

### Setup

```bash
# Clone or copy the obsidian-theme directory
cd obsidian-theme

# Install dependencies
bundle install

# Serve locally
bundle exec jekyll serve

# Build for production
bundle exec jekyll build
```

Visit `http://localhost:4000` to see your vault.

## Syncing Your Obsidian Vault

The `sync.rb` script copies your local Obsidian vault into the Jekyll project. No Obsidian plugin required.

### Quick Setup

1. Set your vault path in `_config.yml`:

```yaml
obsidian:
  sync:
    vault_path: "~/Documents/MyVault"
```

2. Run the sync:

```bash
ruby sync.rb
```

### Commands

```bash
ruby sync.rb                        # Sync (reads vault path from _config.yml)
ruby sync.rb /path/to/vault         # Sync with explicit vault path
ruby sync.rb sync                   # Same as default
ruby sync.rb watch                  # Continuous sync (polls every 2s)
ruby sync.rb watch --interval 5     # Custom polling interval
ruby sync.rb status                 # Show new/modified/deleted files
ruby sync.rb status /path/to/vault  # Status with explicit path
```

### Full Workflow

```bash
# First time: configure vault path in _config.yml, then:
ruby sync.rb && bundle exec jekyll serve --livereload

# Development with auto-sync:
ruby sync.rb watch &                # Background watch
bundle exec jekyll serve --livereload
```

### What Gets Synced

| Type | Source | Destination |
|------|--------|-------------|
| Notes | `vault/**/*.md` | `_notes/` |
| Attachments | `vault/**/*.png,jpg,gif,pdf,...` | `assets/attachments/` |
| Front matter | Auto-generated if missing | Adds `title`, `date`, `tags` |

### Configuration Options

```yaml
obsidian:
  sync:
    vault_path: "~/Documents/MyVault"    # Required: path to your vault
    attachments_dir: "assets/attachments" # Where to copy images/PDFs
    ignore:                               # Extra dirs to skip
      - ".git"
      - "templates"
    auto_frontmatter: true                # Add title/date if missing
    incremental: true                     # Only sync changed files
    orphan_cleanup: true                  # Remove notes no longer in vault
```

### How It Works

- **Incremental sync** — MD5 hash comparison, only copies changed files
- **Front matter normalization** — Missing `title` derived from filename, `date` from file mtime
- **Orphan cleanup** — Removes notes from `_notes/` that no longer exist in the vault
- **Obsidian exclusions** — Automatically skips `.obsidian/`, `.trash/`, `.git/`
- **Watch mode** — Poll-based (no external gems needed), syncs on file changes

## Directory Structure

```
obsidian-theme/
├── _config.yml              # Site configuration
├── Gemfile                   # Ruby dependencies
├── sync.rb                   # Obsidian vault sync script
├── _layouts/                 # Page layouts
│   ├── default.html          # App shell (3-column)
│   ├── note.html             # Single note with backlinks
│   ├── daily.html            # Daily note template
│   ├── tag.html              # Tag page
│   └── minimal.html          # No sidebars
├── _includes/                # Partial templates
│   ├── head.html             # <head> with CSS/JS
│   ├── sidebar-left.html     # File tree navigation
│   ├── sidebar-right.html    # TOC + backlinks
│   ├── header.html           # Top bar
│   ├── search-modal.html     # Ctrl+K command palette
│   ├── breadcrumbs.html      # Folder breadcrumbs
│   ├── graph-view.html       # Vis.js graph
│   ├── toc.html              # Auto-generated TOC
│   ├── backlinks.html        # Backlinks list
│   └── icons.html            # SVG icon sprite
├── _sass/                    # SCSS source
│   ├── base/                 # Variables, reset, typography
│   ├── components/           # UI components
│   ├── layout/               # Grid layout
│   ├── themes/               # Dark/light themes
│   └── main.scss             # Entry point
├── _plugins/                 # Ruby plugins
│   └── wikilinks.rb          # Wikilinks + backlinks + search index + graph data
├── _notes/                   # Your notes (collections)
│   ├── daily/
│   ├── projects/
│   ├── concepts/
│   └── guides/
├── _data/                    # Data files
│   └── navigation.yml        # Optional manual nav
├── assets/
│   ├── css/main.scss         # CSS entry
│   └── js/
│       ├── obsidian.js       # Core interactions
│       └── vendor/           # Fuse.js, Vis.js
└── index.md                  # Home page
```

## Creating Notes

Notes live in the `_notes/` directory. Each note needs YAML front matter:

```markdown
---
title: "My Note"
tags: [tag1, tag2]
date: 2026-03-23
---

Content here with [[wikilinks]] and #tags.
```

### Folder Structure

Organize notes in subdirectories:

```
_notes/
├── daily/
│   └── 2026-03-23.md
├── projects/
│   ├── index.md
│   └── project-alpha.md
├── concepts/
│   ├── index.md
│   └── zettelkasten.md
└── guides/
    └── getting-started.md
```

### Wikilinks

Link between notes using double brackets:

```markdown
[[note-name]]              → Links to note with slug "note-name"
[[note-name|Display Text]] → Links with custom display text
[[folder/note-name]]       → Links to note in specific folder
```

Broken wikilinks are styled with a red dashed underline.

### Tags

Add inline tags with `#hashtag`:

```markdown
This note is about #knowledge-management and #zettelkasten.
```

Tags are automatically collected and linked to `/tags/tag-name/`.

### Callouts

Obsidian-style callouts:

```markdown
> [!note]
> This is a note callout.

> [!tip]
> This is a tip.

> [!warning]
> This is a warning.

> [!danger]
> This is a danger alert.

> [!example]
> This is an example.

> [!quote]
> This is a quote.
```

## Configuration

Edit `_config.yml` to customize:

```yaml
# Site settings
title: "My Vault"
description: "A personal knowledge base"

# Obsidian theme settings
obsidian:
  color_scheme: dark          # "dark" or "light"
  sidebar_left:
    enabled: true
    width: 260
  sidebar_right:
    enabled: true
    width: 280
  search:
    enabled: true
  graph:
    enabled: true
```

## Theming

### CSS Custom Properties

All colors are defined as CSS custom properties in `_sass/base/_variables.scss`:

```scss
:root {
  --bg-primary: #202225;
  --bg-secondary: #2b2d31;
  --text-normal: #dcddde;
  --accent: #7c3aed;
  --link: #60a5fa;
  // ... and more
}
```

### Light Mode

Light mode overrides are in `_sass/themes/_light.scss`. The theme toggle in the sidebar switches between them via `data-theme` attribute.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search (command palette) |
| `Ctrl/Cmd + B` | Toggle left sidebar |
| `Esc` | Close modals / sidebars |
| `↑` / `↓` | Navigate search results |
| `Enter` | Open selected search result |

## Deployment

### GitHub Pages

Note: GitHub Pages doesn't support custom Jekyll plugins by default. You'll need to:

1. Build locally and push the `_site/` directory, OR
2. Use GitHub Actions to build:

```yaml
# .github/workflows/deploy.yml
name: Deploy Jekyll
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
      - run: bundle install
        working-directory: obsidian-theme
      - run: bundle exec jekyll build
        working-directory: obsidian-theme
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: obsidian-theme/_site
```

### Netlify

```toml
# netlify.toml
[build]
  base = "obsidian-theme"
  command = "bundle exec jekyll build"
  publish = "_site"
```

## Dependencies

### Ruby
- `jekyll` >= 4.3
- `jekyll-seo-tag`
- `jekyll-sitemap`

### JavaScript (included)
- [Fuse.js](https://fusejs.io/) — Fuzzy search
- [Vis.js](https://visjs.github.io/vis-network/) — Graph visualization

## License

MIT
