---
title: "Getting Started"
tags: [guide, setup]
date: 2026-03-23
---

Welcome to your Obsidian-powered Jekyll vault! This guide will walk you through the key features.

## Quick Start

1. **Create notes** in the `_notes/` directory
2. **Link notes** using `[[wikilink]]` syntax
3. **Add tags** with `#hashtag` in your content
4. **Build** with `bundle exec jekyll build`
5. **Serve** with `bundle exec jekyll serve`

## Features

### Wikilinks

Link to other notes using double brackets:

- `[[note-title]]` creates a link to a note
- `[[note-title|Custom Display]]` creates a link with custom text

For example, check out [[concepts/zettelkasten|Zettelkasten]] or [[concepts/evergreen-notes|Evergreen Notes]].

### Tags

Add inline tags with `#hashtag` syntax. Tags are automatically collected and linked.

### Callouts

Obsidian-style callouts work with blockquote syntax:

> [!note]
> This is a note callout. Use it for general information.

> [!tip]
> This is a tip callout. Use it for helpful suggestions.

> [!warning]
> This is a warning callout. Use it for important notices.

> [!danger]
> This is a danger callout. Use it for critical information.

### Code Blocks

```python
def hello_world():
    """A simple Python function."""
    print("Hello, Obsidian!")
    return True
```

```javascript
const greeting = (name) => {
  return `Hello, ${name}!`;
};
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `Ctrl/Cmd + B` | Toggle left sidebar |
| `Esc` | Close modals |

## Next Steps

- Explore the [[concepts/index|Concepts]] folder
- Check out [[projects/index|Projects]]
- Read about [[guides/markdown-features|Markdown Features]]
