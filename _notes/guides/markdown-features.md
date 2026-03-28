---
title: "Markdown Features"
tags: [guide, syntax, markdown]
date: 2026-03-23
---

This note demonstrates supported Markdown features.

## Wikilinks

Link to other notes:

```markdown
[[note-name]]              → Links to note
[[note-name|Display Text]] → Links with custom text
[[folder/note-name]]       → Links to note in folder
[[note#heading]]           → Links to heading
![[note-name]]             → Embeds note content
```

## Callouts

> [!note]
> This is a note callout.

> [!tip]
> This is a tip.

> [!warning]
> This is a warning.

> [!danger]
> This is a danger alert.

## Tags

Use `#hashtags` inline: #markdown #syntax #guide

## Code Blocks

```python
def hello():
    print("Hello, World!")
```

## LaTeX Math

Inline: $E = mc^2$

Block:
$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

## Tables

| Expression | Equivalent to |
|---|---|
| `y += x;` | `y = y + x;` |
| `x -= 5;` | `x = x - 5;` |
| `x /= y;` | `x = x / y;` |
| `price *= units + 1;` | `price = price * (units+1);` |

## See Also

- [[guides/getting-started|Getting Started]]
