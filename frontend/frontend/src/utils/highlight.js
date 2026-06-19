/**
 * Highlight utility for PDF.js text layer.
 *
 * PDF.js renders a text layer made of <span> elements, each holding a
 * fragment of the page text. A single search term may span multiple spans
 * so we concatenate all span texts, find every match position, then map
 * each character position back to its originating span and inject a
 * <mark> wrapper around the matched characters.
 */

const HIGHLIGHT_CLASS = 'pdf-search-highlight';
const HIGHLIGHT_FIRST_CLASS = 'pdf-search-highlight-first';

/** Remove all previously injected highlights inside a container. */
export function clearHighlights(container) {
  const marks = container.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  marks.forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    // Replace <mark> with its plain text content
    parent.replaceChild(document.createTextNode(mark.textContent), mark);
    parent.normalize(); // merge adjacent text nodes
  });
}

/**
 * Highlight all occurrences of `query` in the PDF.js text layer.
 *
 * @param {HTMLElement} textLayerDiv  – the `.react-pdf__Page__textContent` div
 * @param {string}      query         – the search string (can be multi-word)
 * @returns {number} number of matches found
 */
export function highlightText(textLayerDiv, query) {
  if (!textLayerDiv || !query || !query.trim()) return 0;

  // 1. Collect all leaf text spans produced by PDF.js
  const spans = Array.from(textLayerDiv.querySelectorAll('span')).filter(
    (s) => s.childNodes.length === 1 && s.firstChild.nodeType === Node.TEXT_NODE
  );

  if (spans.length === 0) return 0;

  // 2. Build a concatenated string and a char→span map
  //    Each entry: { span, startInFull, endInFull }
  const segments = [];
  let fullText = '';

  for (const span of spans) {
    const text = span.textContent;
    segments.push({ span, start: fullText.length, end: fullText.length + text.length });
    fullText += text;
  }

  // 3. Find all match positions in the concatenated text (case-insensitive)
  const needle = query.trim().replace(/\s+/g, ' ');
  const regex = new RegExp(escapeRegex(needle), 'gi');
  const matches = [];
  let m;
  while ((m = regex.exec(fullText)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length });
  }

  if (matches.length === 0) return 0;

  // 4. For every match, split affected spans and inject <mark> nodes
  //    We process in reverse order so earlier segment indices stay valid.
  const affectedSegments = new Set();

  for (const match of matches) {
    // Find which segments are touched by this match
    for (const seg of segments) {
      const overlapStart = Math.max(match.start, seg.start);
      const overlapEnd = Math.min(match.end, seg.end);
      if (overlapStart < overlapEnd) {
        affectedSegments.add(seg);
      }
    }
  }

  // Rebuild each affected span by splitting its text into
  // [before-highlight | highlight | between | highlight | after] fragments.
  for (const seg of affectedSegments) {
    const { span, start: segStart } = seg;
    const originalText = span.textContent;

    // Collect all highlight ranges that overlap this segment (in local coords)
    const localRanges = [];
    for (const match of matches) {
      const overlapStart = Math.max(match.start, segStart) - segStart;
      const overlapEnd = Math.min(match.end, segStart + originalText.length) - segStart;
      if (overlapStart < overlapEnd) {
        localRanges.push({ start: overlapStart, end: overlapEnd, matchStart: match.start });
      }
    }

    // Sort by position
    localRanges.sort((a, b) => a.start - b.start);

    // Build replacement nodes
    const fragment = document.createDocumentFragment();
    let cursor = 0;

    for (const range of localRanges) {
      // Text before this highlight
      if (cursor < range.start) {
        fragment.appendChild(document.createTextNode(originalText.slice(cursor, range.start)));
      }
      // The highlight mark
      const mark = document.createElement('mark');
      mark.className = range.matchStart === matches[0].start
        ? `${HIGHLIGHT_CLASS} ${HIGHLIGHT_FIRST_CLASS}`
        : HIGHLIGHT_CLASS;
      mark.textContent = originalText.slice(range.start, range.end);
      fragment.appendChild(mark);
      cursor = range.end;
    }

    // Remaining text after last highlight
    if (cursor < originalText.length) {
      fragment.appendChild(document.createTextNode(originalText.slice(cursor)));
    }

    // Replace span's single text node with the fragment
    span.replaceChildren(fragment);
  }

  // 5. Scroll first highlight into view
  const firstMark = textLayerDiv.querySelector(`.${HIGHLIGHT_FIRST_CLASS}`);
  if (firstMark) {
    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  return matches.length;
}

/** Escape special regex characters in a literal string */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
