import { getBookmarks } from '../core/storage';

export function restorePinState($row: JQuery): void {
  const id = parseInt($row.attr('id') || '');
  if (!id) return;
  const bookmarks = getBookmarks();
  if (bookmarks.indexOf(id) >= 0) {
    $row.addClass('pinned');
    $row.find('.pin-star').addClass('pinned');
  }
}
