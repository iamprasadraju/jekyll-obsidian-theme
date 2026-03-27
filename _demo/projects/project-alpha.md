---
title: "Project Alpha"
tags: [project, theme, jekyll]
date: 2026-03-23
---

# Project Alpha: Obsidian Jekyll Theme

## Goal

Create a Jekyll theme that replicates the look and feel of the Obsidian note-taking app.

## Status

🚧 In Progress

## Features

### Implemented

- [x] Dark-first UI with light mode toggle
- [x] 3-column layout (left sidebar, content, right sidebar)
- [x] Wikilink support with `[[note-name]]` syntax
- [x] Backlinks system
- [x] Command palette search (`Ctrl/Cmd + K`)
- [x] Auto-generated table of contents
- [x] Obsidian-style callouts
- [x] Tag system with `#hashtag` support
- [x] Graph view with Vis.js

### Planned

- [ ] Mermaid.js diagram support
- [ ] MathJax equation rendering
- [ ] Daily notes template
- [ ] Quick capture feature
- [ ] Plugin system

## Technical Decisions

> [!note]
> This theme builds on patterns from just-the-docs but is a standalone implementation.

### Why Jekyll?

- Static site generation for fast, reliable hosting
- Liquid templating for dynamic content
- Ruby plugins for build-time processing
- GitHub Pages compatible (with limitations)

### Why Vis.js for Graph View?

- Lightweight and performant
- Built-in physics simulation
- Interactive zoom/pan/click
- Simple API

### Why Fuse.js for Search?

- Client-side fuzzy matching
- No server required
- Fast and lightweight
- Good UX with instant results

## Related Notes

- [[concepts/zettelkasten|Zettelkasten]] — Knowledge management method powering this vault
- [[concepts/evergreen-notes|Evergreen Notes]] — Note-taking philosophy
- [[guides/getting-started|Getting Started]] — User guide
- [[guides/markdown-features|Markdown Features]] — Formatting reference

## Timeline

| Date | Milestone |
|------|-----------|
| 2026-03-23 | Project started |
| 2026-03-23 | Core layout complete |
| 2026-03-23 | Wikilinks + backlinks working |
| TBD | First release |
