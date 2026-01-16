# Pokrabs Keyboard Shortcuts

Pokrabs supports global application shortcuts and VIM-style motions for lightning-fast navigation and problem management.

## Global Shortcuts
These work from anywhere in the app, including when an input is focused (for modifier-based ones).

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| `/` | **Focus Search** | Highlights the search input and selects all text. |
| `Ctrl + S` | **Save View** | Saves the current view configuration (filters, sorting, column visibility). |
| `Ctrl + Shift + S` | **Save View As** | Opens the "Save As" dialog for the current view. |
| `Esc` | **Clear / Blur / Close** | Clears the search query, removes focus from any active input, or closes modals. |
| `?` | **Keyboard Cheatsheet** | Toggles a modal overlay showing all available keyboard shortcuts. |

## VIM Motions (Navigation)
These are active when **no input field is focused**. Use them to move through the problems list.
V
| Key | Action |
| :--- | :--- |
| `j` | **Next Problem** - Move selection down. |
| `k` | **Previous Problem** - Move selection up. |
| `gg` | **Jump to Top** - Select the first problem in the list. |
| `G` | **Jump to Bottom** - Select the last problem in the list. |
| `Enter` | **Deep Link** - Update the URL to point directly to the selected problem (good for sharing). |

## Problem Actions
These operate on the **currently selected problem** (highlighted with a border).

| Key | Action | Description |
| :--- | :--- | :--- |
| `x` | **Toggle Collapse** | Expand or collapse the children of the selected problem. |
| `v` | **Upvote** | Add a vote to the selected problem. |
| `V` (Shift+V) | **Downvote** | Remove one of your votes from the selected problem. |
| `p` | **Edit Problem** | Opens the summary/detail editor for the problem text. |
| `o` | **Edit Objective** | Opens the summary/detail editor for the objective. |
| `dd` | **Delete** | Deletes the selected problem (prompts for confirmation). |
| `yy` | **Copy URL** | Copies the deep link to the selected problem to your clipboard. |
| `i` | **Insert Sibling Above** | Adds a new problem above the selected one. |
| `a` | **Append Sibling Below** | Adds a new problem below the selected one. |
| `c` | **Add Subproblem** | Adds a new child problem to the selected one. |
| `I` | **Insert Root Top** | Adds a new root-level problem at the top of the list. |
| `A` | **Append Root Bottom** | Adds a new root-level problem at the bottom of the list. |

---

### Tips
- The **Keyboard Selection** is visible as a highlighted border around the row.
- If you find yourself in an input field and want to use VIM motions, press `Esc` first.
- Search with `/` then use `Esc` to return to list navigation mode.
- Use `?` anytime to see a quick reference of all available commands.
