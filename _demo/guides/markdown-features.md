---
title: "Markdown Features"
tags: [guide, markdown, syntax]
date: 2026-03-23
---

This note demonstrates all supported markdown features in the Obsidian theme.

## Text Formatting

- **Bold text** with `**double asterisks**`
- *Italic text* with `*single asterisks*`
- ~~Strikethrough~~ with `~~double tildes~~`
- `Inline code` with backticks
- ==Highlighted text== (if supported)

## Links

### External Links
- [GitHub](https://github.com)
- [Obsidian](https://obsidian.md)

### Wikilinks (Internal Links)
- `[[note-name]]` — Basic wikilink
- `[[note-name|Display Text]]` — Wikilink with alias

Examples:
- [[concepts/zettelkasten|Zettelkasten Method]]
- [[guides/getting-started|Getting Started]]

## Lists

### Unordered List
- First item
- Second item
  - Nested item
  - Another nested item
- Third item

### Ordered List
1. First step
2. Second step
3. Third step

### Task List
- [x] Create vault structure
- [x] Add wikilink support
- [x] Implement search
- [ ] Add graph view
- [ ] Mobile optimization

## Blockquotes

> This is a regular blockquote.
> It can span multiple lines.

### Obsidian Callouts

> [!note]
> Notes are for general information and documentation.

> [!tip]
> Tips provide helpful suggestions and best practices.

> [!info]
> Info callouts are great for supplementary information.

> [!warning]
> Warnings alert users to potential issues or important considerations.

> [!danger]
> Danger callouts highlight critical information that requires attention.

> [!example]
> Examples demonstrate concepts in practice.

> [!quote]
> "The best way to predict the future is to create it." — Peter Drucker

## Code

### Inline Code
Use `git status` to check the state of your repository.

### Code Blocks

```ruby
class ObsidianTheme
  def initialize(name)
    @name = name
    @features = []
  end

  def add_feature(feature)
    @features << feature
    puts "Added #{feature} to #{@name}"
  end
end
```

```css
.obsidian-theme {
  --bg-primary: #202225;
  --text-normal: #dcddde;
  --accent: #7c3aed;

  display: grid;
  grid-template-columns: 260px 1fr 280px;
  height: 100vh;
}
```

## Tables

| Feature | Status | Notes |
|---------|--------|-------|
| Wikilinks | Done | [[note-name]] syntax |
| Backlinks | Done | Auto-generated |
| Search | Done | Ctrl+K command palette |
| Graph view | Done | Vis.js network |
| Tags | Done | Inline tag support |
| Callouts | Done | Obsidian-style |

## Images

Images work with standard markdown syntax:

```markdown
![Alt text](/path/to/image.png)
```

## Horizontal Rules

---

## Tags

This note is tagged with: #guide #markdown #syntax

Check the tag pages to see all notes with these tags.
