import { useState } from 'react';

export type PageToken = number | 'ellipsis-start' | 'ellipsis-end';

/** Pages shown around the current one before collapsing the rest into "…". */
const SIBLING_PAGES = 1;

export function getPageCount(totalItems: number, pageSize: number) {
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

/**
 * Page buttons to show: always the first and last page, the current one with
 * its neighbours, and an ellipsis for each hidden range. Example for page 5 of
 * 10: 1 … 4 5 6 … 10.
 */
export function getPageTokens(currentPage: number, pageCount: number): PageToken[] {
  // First, last, current, its siblings and two ellipses: the row never changes width.
  const slots = SIBLING_PAGES * 2 + 5;
  if (pageCount <= slots) return range(1, pageCount);

  const leftSibling = Math.max(currentPage - SIBLING_PAGES, 1);
  const rightSibling = Math.min(currentPage + SIBLING_PAGES, pageCount);
  const showStartEllipsis = leftSibling > 2;
  const showEndEllipsis = rightSibling < pageCount - 1;
  const edgeCount = slots - 2;

  if (!showStartEllipsis) {
    return [...range(1, edgeCount), 'ellipsis-end', pageCount];
  }
  if (!showEndEllipsis) {
    return [1, 'ellipsis-start', ...range(pageCount - edgeCount + 1, pageCount)];
  }
  return [1, 'ellipsis-start', ...range(leftSibling, rightSibling), 'ellipsis-end', pageCount];
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/**
 * Client-side pagination of an already filtered list. Changing `resetKey`
 * (for example the search text or the selected filters) goes back to page 1.
 */
export function usePagination<T>(items: readonly T[], pageSize: number, resetKey = '') {
  const [state, setState] = useState({ page: 1, resetKey });
  const pageCount = getPageCount(items.length, pageSize);
  const requestedPage = state.resetKey === resetKey ? state.page : 1;
  // A refresh can shrink the list; never stay on a page that no longer exists.
  const page = Math.min(requestedPage, pageCount);
  const firstIndex = (page - 1) * pageSize;
  const pageItems = items.slice(firstIndex, firstIndex + pageSize);

  return {
    page,
    pageCount,
    pageItems,
    totalItems: items.length,
    rangeStart: items.length === 0 ? 0 : firstIndex + 1,
    rangeEnd: firstIndex + pageItems.length,
    setPage(nextPage: number) {
      setState({ page: Math.min(Math.max(1, nextPage), pageCount), resetKey });
    },
  };
}
