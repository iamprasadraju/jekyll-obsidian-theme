---
layout: note
title: "My Vault"
permalink: /
---

# Welcome to My Vault

This is your personal knowledge base, powered by Jekyll and styled like [Obsidian](https://obsidian.md).

## Quick Links

- [[guides/getting-started|Getting Started]]
- [[guides/markdown-features|Markdown Features]]
- [[concepts/zettelkasten|Zettelkasten]]
- [[projects/index|Projects]]

## Recent Notes

{% assign sorted_notes = site.notes | sort: "date" | reverse %}
{% for note in sorted_notes limit: 5 %}
- [{{ note.title }}]({{ note.url }}) {% if note.date %}<span class="text-muted">{{ note.date | date: "%b %d, %Y" }}</span>{% endif %}
{% endfor %}

## About

This vault demonstrates the Obsidian Jekyll theme — a static site generator theme that replicates the look and workflow of the Obsidian note-taking app.

### Features

- **Dark-first UI** with light mode toggle
- **Wikilinks** — `[[note-name]]` syntax for internal linking
- **Backlinks** — see which notes reference the current one
- **Graph view** — visualize your knowledge network
- **Callouts** — `> [!note]`, `> [!warning]`, etc.
- **Tags** — `#tag` support with auto-generated tag pages
- **Command palette** — `Ctrl/Cmd+K` for quick search
