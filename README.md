<div align="center">
  <img src="https://obsidian.md/images/obsidian-logo-gradient.svg" alt="Obsidian" width="80" height="80">

  <h1>Jekyll Obsidian Theme</h1>

  <p>A Jekyll theme that replicates the look, feel, and workflow of <a href="https://obsidian.md">Obsidian</a>.<br>
  Publish your notes as a static site with wikilinks, graph view, backlinks, and more.</p>

  [![Jekyll](https://img.shields.io/badge/Jekyll-4.3+-red?logo=jekyll&logoColor=white)](https://jekyllrb.com/)
  [![Ruby](https://img.shields.io/badge/Ruby-3.0+-red?logo=ruby)](https://www.ruby-lang.org/)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-222222?logo=githubpages)](https://pages.github.com/)

  <br>

  [Features](#features) &bull;
  [Getting Started](#getting-started) &bull;
  [Stay Updated](#stay-updated-with-upstream) &bull;
  [Sync Your Vault](#sync-your-obsidian-vault) &bull;
  [Configuration](#configuration) &bull;
  [Customization](#customization) &bull;
  [Deployment](#deployment)

</div>

---

## Features

<table>
  <tr>
    <td width="50%">
      <strong>3-Column Layout</strong><br>
      Left sidebar (file tree), center (content), right sidebar (TOC + backlinks)
    </td>
    <td width="50%">
      <strong>Wikilinks</strong><br>
      <code>[[note-name]]</code> syntax with <code>[[note|Display Text]]</code>, <code>[[folder/note]]</code>, <code>[[note#heading]]</code>
    </td>
  </tr>
  <tr>
    <td><strong>Graph View</strong><br>Interactive force-directed network graph of your notes</td>
    <td><strong>Backlinks</strong><br>Automatically generated linked mentions with context previews</td>
  </tr>
  <tr>
    <td><strong>Command Palette</strong><br><code>Ctrl/Cmd + K</code> fuzzy search powered by Fuse.js</td>
    <td><strong>Obsidian Callouts</strong><br><code>&gt; [!note]</code>, <code>&gt; [!tip]</code>, <code>&gt; [!warning]</code>, <code>&gt; [!danger]</code>, <code>&gt; [!quote]</code></td>
  </tr>
  <tr>
    <td><strong>Tags</strong><br><code>#hashtag</code> support with auto-generated tag index pages</td>
    <td><strong>LaTeX / MathJax</strong><br>Inline <code>$...$</code> and block <code>$$...$$</code> math rendering</td>
  </tr>
  <tr>
    <td><strong>Slide Panes</strong><br>Andy Matuschak-style sliding panes for deep note exploration</td>
    <td><strong>Vault Sync</strong><br>Sync your local Obsidian vault with one command</td>
  </tr>
  <tr>
    <td><strong>Dark &amp; Light Mode</strong><br>Toggle with persistent preference (localStorage)</td>
    <td><strong>Responsive</strong><br>Sidebars collapse to drawers on mobile</td>
  </tr>
  <tr>
    <td><strong>Code Blocks</strong><br>Syntax highlighting with copy-to-clipboard button</td>
    <td><strong>Auto TOC</strong><br>Table of contents generated from headings in right sidebar</td>
  </tr>
</table>

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette |
| `Ctrl/Cmd + B` | Toggle left sidebar |
| `Esc` | Close modals / sidebars / panes |
| `↑` / `↓` | Navigate search results |
| `Enter` | Open selected search result |

---

## Getting Started

### 1. Create Your Repository

Go to the [jekyll-obsidian-theme](https://github.com/iamprasadraju/jekyll-obsidian-theme) repo and click **"Use this template"** → **"Create a new repository"**.

This creates your own copy. All your notes stay in your repo — they're never pushed to the upstream theme.

### 2. Clone and Install

```bash
# Clone your new repository
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO

# Install dependencies
bundle install
```

### 3. Configure Your Site

Edit `_config.yml`:

```yaml
title: "My Vault"                          # Your site title
baseurl: ""                                # Root path (e.g. "/blog" for subfolder)
url: "https://yourusername.github.io"      # Your site URL
```

### 4. Add Your Notes

**Option A — Sync from your Obsidian vault:**

```yaml
# In _config.yml
obsidian:
  sync:
    vault_path: "~/Documents/MyVault"
```

```bash
ruby sync.rb
```

**Option B — Install demo notes to explore the theme:**

```bash
ruby sync.rb setup
```

### 5. Run Locally

```bash
bundle exec jekyll serve --livereload
```

Open [http://localhost:4000](http://localhost:4000) to see your site.

### 6. Deploy

Push to GitHub. The included `.github/workflows/pages.yml` builds and deploys automatically on push to `main`. Go to your repo's **Settings → Pages** and set the source to **GitHub Actions**.

---

## Stay Updated with Upstream

Your notes are safe. `_notes/` and `assets/attachments/` are in `.gitignore`, so upstream updates never touch your content.

### Add the Upstream Remote (one time)

```bash
git remote add upstream https://github.com/iamprasadraju/jekyll-obsidian-theme.git
```

### Pull Updates

```bash
git fetch upstream
git merge upstream/main
```

### What Gets Updated

| Updated (theme files) | Untouched (your content) |
|-----------------------|--------------------------|
| `_layouts/` | `_notes/` |
| `_includes/` | `assets/attachments/` |
| `_sass/` | `_site/` |
| `_plugins/` | `.jekyll-cache/` |
| `assets/js/` | |
| `Gemfile` | |

### Merge Conflicts

If you edited `_config.yml` or `index.md`, you may get merge conflicts. Resolve them manually:

```bash
# After merge, check for conflicts
git status

# Edit conflicted files, then
git add . && git commit -m "Resolve upstream merge"
```

To avoid conflicts with `_config.yml`, keep your site-specific settings (title, url, baseurl) at the top and don't modify the `obsidian:` block unless you know what changed upstream.

---

## Sync Your Obsidian Vault

The `sync.rb` script copies your local Obsidian vault into `_notes/`. No Obsidian plugin required — it works directly with your vault on disk.

### First Time Setup

**Option A — Set vault path in `_config.yml`:**

```yaml
obsidian:
  sync:
    vault_path: "~/Documents/MyVault"
```

Then run:

```bash
ruby sync.rb
```

**Option B — Pass vault path directly:**

```bash
ruby sync.rb ~/Documents/MyVault
```

### Commands

```bash
ruby sync.rb setup                         # Install demo notes (first time)
ruby sync.rb                               # Sync vault from _config.yml
ruby sync.rb /path/to/vault                # Sync with explicit path
ruby sync.rb watch                         # Continuous sync (polls every 2s)
ruby sync.rb watch --interval 5            # Custom polling interval
ruby sync.rb status                        # Show new/modified/deleted files
```

### How Sync Works

| Step | What happens |
|------|-------------|
| 1. Clean | Removes all notes from `_notes/` that are not in your vault |
| 2. Sync | Copies `.md` files from your vault into `_notes/` |
| 3. Attachments | Copies images, PDFs, and other media to `assets/attachments/` |
| 4. Front matter | Auto-generates `title`, `date`, `tags` if missing |
| 5. Incremental | Only re-syncs files that changed (MD5 hash comparison) |

Your vault is the single source of truth. Notes deleted from your vault are removed from the site on the next sync.

### Sync Configuration

```yaml
obsidian:
  sync:
    vault_path: "~/Documents/MyVault"       # Path to your Obsidian vault
    attachments_dir: "assets/attachments"    # Where images/PDFs are copied
    ignore:                                  # Extra directories to skip
      - ".git"
      - "templates"
    auto_frontmatter: true                   # Add title/date if missing
    incremental: true                        # Only sync changed files
    orphan_cleanup: true                     # Remove notes deleted from vault
```

### Development Workflow

```bash
# One-liner: sync and serve
ruby sync.rb && bundle exec jekyll serve --livereload

# Or use the run script (auto-syncs if vault is configured)
./run.sh

# Continuous sync during development
ruby sync.rb watch &
bundle exec jekyll serve --livereload
```

---

## Configuration

Edit `_config.yml` to customize the theme:

```yaml
# Site
title: "My Vault"
description: "A personal knowledge base"
baseurl: "/jekyll-obsidian-theme"
url: "https://yourusername.github.io"

# Theme settings
obsidian:
  color_scheme: dark             # "dark" or "light"

  sidebar_left:
    enabled: true
    width: 260

  sidebar_right:
    enabled: true
    width: 280

  search:
    enabled: true
    shortcut: "k"

  graph:
    enabled: true
    lazy_load: true
    mini_graph: true

  slides:
    enabled: true
    pane_width: 625
    resizable: true

  tags:
    enabled: true

  code:
    copy_button: true
    syntax_highlight: true

  features:
    focus_mode: true
    colorful_headings: true
    image_grid: true
    cards: true

  mathjax: true                  # LaTeX math rendering
  mermaid: false                 # Mermaid diagrams
```

---

## Customization

### CSS Variables

All colors are defined as CSS custom properties in [`_sass/base/_variables.scss`](_sass/base/_variables.scss):

```scss
:root {
  --bg-primary: #202225;
  --bg-secondary: #2b2d31;
  --bg-tertiary: #1e1f22;
  --text-normal: #dcddde;
  --text-muted: #72767d;
  --accent: #7c3aed;
  --accent-hover: #6d28d9;
  --link: #60a5fa;
  --border: #3f4147;
}
```

### Light Mode

Light mode overrides are in [`_sass/themes/_light.scss`](_sass/themes/_light.scss). The sidebar toggle switches between themes via the `data-theme` attribute.

### Callouts

Customize callout colors in `_config.yml`:

```yaml
obsidian:
  callouts:
    note:
      color: "#6c99bb"
      icon: "info-circle"
    warning:
      color: "#e5b567"
      icon: "exclamation-triangle"
```

---

## Markdown Features

### Wikilinks

```markdown
[[note-name]]                  # Link to note
[[note-name|Display Text]]     # Link with custom text
[[folder/note-name]]           # Link to note in subfolder
[[note-name#heading]]          # Link to heading
![[note-name]]                 # Embed note content
![[note-name#heading]]         # Embed section
```

### Callouts

```markdown
> [!note]
> Informational callout.

> [!tip]
> Helpful suggestion.

> [!warning]
> Important warning.

> [!danger]
> Critical alert.

> [!example]
> Illustrative example.

> [!quote]
> Block quotation.
```

### Tags

```markdown
This note covers #knowledge-management and #zettelkasten.
```

Tags are auto-linked to `/tags/tag-name/`.

### Math (LaTeX)

```markdown
Inline: $E = mc^2$

Block:
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$
```

---

## Directory Structure

```
jekyll-obsidian-theme/
├── _config.yml                 # Site & theme configuration
├── _config.test.yml            # Test configuration
├── Gemfile                     # Ruby dependencies
├── sync.rb                     # Obsidian vault sync script
├── run.sh                      # Dev server launcher
├── _layouts/
│   ├── default.html            # App shell (3-column layout)
│   ├── note.html               # Single note with backlinks
│   ├── daily.html              # Daily note template
│   ├── tag.html                # Tag page
│   └── minimal.html            # No sidebars
├── _includes/
│   ├── head.html               # <head> with CSS/JS
│   ├── header.html             # Top bar
│   ├── sidebar-left.html       # File tree navigation
│   ├── sidebar-right.html      # TOC + backlinks
│   ├── search-modal.html       # Command palette
│   ├── graph-view.html         # Force graph visualization
│   ├── toc.html                # Auto-generated TOC
│   ├── backlinks.html          # Linked mentions
│   ├── breadcrumbs.html        # Folder breadcrumbs
│   └── icons.html              # SVG icon sprite
├── _sass/
│   ├── base/                   # Variables, reset, typography
│   ├── components/             # UI components
│   ├── layout/                 # Grid layout
│   ├── features/               # Helper classes
│   └── themes/                 # Dark/light themes
├── _plugins/
│   └── wikilinks.rb            # Wikilinks, backlinks, tags, graph data
├── _demo/                      # Demo notes (copied to _notes/ on setup)
├── _notes/                     # Your notes (synced from vault)
├── _data/
│   └── navigation.yml
├── assets/
│   ├── css/main.scss           # CSS entry point
│   └── js/
│       ├── obsidian.js         # Core interactions
│       └── vendor/             # Fuse.js, ForceGraph
└── index.md                    # Home page
```

---

## Deployment

### GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/pages.yml`) that builds and deploys automatically on push to `main`.

> **Note:** Synced notes (`_notes/`) and attachments (`assets/attachments/`) are excluded from the repo via `.gitignore`. To deploy your vault notes, build locally and push `_site/`, or modify the workflow to sync during CI.

### Netlify

```toml
# netlify.toml
[build]
  command = "bundle exec jekyll build"
  publish = "_site"
```

### Local Build

```bash
bundle exec jekyll build
# Output in _site/
```

---

## Dependencies

| Type | Package | Purpose |
|------|---------|---------|
| Ruby | `jekyll` >= 4.3 | Static site generator |
| Ruby | `jekyll-seo-tag` | SEO meta tags |
| Ruby | `jekyll-sitemap` | Sitemap generation |
| JS | [Fuse.js](https://fusejs.io/) | Fuzzy search |
| JS | [Force Graph](https://github.com/vasturiano/force-graph) | Graph visualization |
| JS | [MathJax](https://www.mathjax.org/) | LaTeX rendering |

All JavaScript libraries are bundled — no CDN required (except MathJax and Mermaid if enabled).

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Built with Jekyll. Inspired by <a href="https://obsidian.md">Obsidian</a>.</sub>
</div>
