# Text diff

Open `index.html` in a browser. No build step, dependencies, or server required.

The page reuses `styles.css` from `C:\projects\unixtime`, with comparison-specific styles in `diff.css`.

Features: live line comparison, inline edit highlights, side-by-side and unified views, case and whitespace options, swap, example text, local file loading and drag-and-drop, clipboard copy, and text download. Text is never sent to a server or saved to browser storage.

Plain text files are limited to 2 MB. The viewer renders up to 3,000 rows; exports include all rows. For large changed sections requiring more than four million line-pair comparisons, the tool uses a simplified replacement and displays a notice. Export uses line prefixes (`+`, `-`, or a space); it is a readable comparison, not a patch with file headers and hunks.

To run the browser checks, serve this directory locally and open `tests/browser.html` (or open it with file access enabled in a test browser).
