import { bodySearchTerm, bodySearchMatches, bodySearchCurrent, setBodySearchTerm, setBodySearchMatches, setBodySearchCurrent } from '../state';
import { escapeHtml } from '../core/utils';

declare const autosize: any;

export function clearBodyHighlights(): void {
  $('.body-highlight-overlay').remove();
  $('.has-body-highlight').css('color', '').removeClass('has-body-highlight');
}

export function highlightBodyText($ta: JQuery, term: string): void {
  const ta = $ta[0] as HTMLTextAreaElement;
  if (!ta || !ta.value || !term) return;

  const text = ta.value;
  const lowerText = text.toLowerCase();
  const lowerTerm = term.toLowerCase();
  let html = '';
  let lastIdx = 0;
  let idx = 0;

  while ((idx = lowerText.indexOf(lowerTerm, idx)) >= 0) {
    html += escapeHtml(text.substring(lastIdx, idx));
    html += '<mark class="body-highlight">' + escapeHtml(text.substring(idx, idx + term.length)) + '</mark>';
    idx += term.length;
    lastIdx = idx;
  }
  html += escapeHtml(text.substring(lastIdx));

  const $parent = $ta.parent();
  $parent.css('position', 'relative');

  const overlay = $('<div class="body-highlight-overlay"></div>').html(html);

  const taStyles = window.getComputedStyle(ta);
  const pos = $ta.position();

  overlay.css({
    position: 'absolute' as any,
    top: pos.top,
    left: pos.left,
    width: $ta.outerWidth(),
    height: $ta.outerHeight(),
    padding: taStyles.padding,
    fontSize: taStyles.fontSize,
    fontFamily: taStyles.fontFamily,
    lineHeight: taStyles.lineHeight,
    whiteSpace: 'pre-wrap',
    overflow: 'hidden',
    pointerEvents: 'none',
    color: '#ccc',
    background: 'transparent',
    border: 'none',
    wordWrap: 'break-word',
    boxSizing: 'border-box',
  });

  $parent.append(overlay);
  $ta.css('color', 'transparent').addClass('has-body-highlight');

  ta.addEventListener('scroll', function syncScroll() {
    (overlay[0] as HTMLElement).scrollTop = ta.scrollTop;
  });
}

export function runBodySearch(): void {
  const term = $('#search-body').val() as string;
  setBodySearchTerm(term);
  setBodySearchMatches([]);

  clearBodyHighlights();

  if (!term) {
    $('#body-search-count').text('');
    return;
  }

  function searchTextarea($ta: JQuery, label: string) {
    const ta = $ta[0] as HTMLTextAreaElement;
    if (!ta || !ta.value) return;
    const lowerVal = ta.value.toLowerCase();
    const lowerTerm = term.toLowerCase();
    let idx = 0;
    while ((idx = lowerVal.indexOf(lowerTerm, idx)) >= 0) {
      bodySearchMatches.push({ textarea: ta, pos: idx, label });
      idx += term.length;
    }
  }

  searchTextarea($('#form-body'), 'Request body');
  searchTextarea($('#form-body2'), 'Answer body');

  if (bodySearchMatches.length > 0) {
    highlightBodyText($('#form-body'), term);
    highlightBodyText($('#form-body2'), term);
    setBodySearchCurrent(0);
    highlightBodySearch(0);
    scrollToFirstSearchMatch();
  } else {
    setBodySearchCurrent(-1);
    $('#body-search-count').text('No matches');
  }
}

export function scrollToFirstSearchMatch(): void {
  if (bodySearchMatches.length > 0) {
    const m = bodySearchMatches[0];
    const $ta = $(m.textarea);
    const lineHeight = parseFloat($ta.css('line-height') as string) || 15;
    const lines = m.textarea.value.substring(0, m.pos).split('\n').length;
    $ta.prop('scrollTop', (lines - 1) * lineHeight - 20);
    const $panel = $ta.closest('.form-group');
    if ($panel.length) {
      const panelTop = $panel.position().top + $('.details').scrollTop()!;
      $('.details').animate({ scrollTop: panelTop - 60 }, 100);
    }
  }
}

export function highlightBodySearch(index: number): void {
  const match = bodySearchMatches[index];
  if (!match) return;
  const textarea = match.textarea;
  const pos = match.pos;
  $('#body-search-count').text(match.label + ' ' + (index + 1) + '/' + bodySearchMatches.length);
  textarea.focus();
  textarea.selectionStart = pos;
  textarea.selectionEnd = pos + bodySearchTerm.length;
  textarea.scrollTop = textarea.scrollHeight * (pos / textarea.value.length) - 50;
}

export function initBodySearchUI(): void {
  $(document).on('keydown', '#search-body', function (e) {
    if (e.which === 13) {
      e.preventDefault();
      if (bodySearchMatches.length === 0 || $('#search-body').val() !== bodySearchTerm) {
        runBodySearch();
      } else {
        const next = (bodySearchCurrent + 1) % bodySearchMatches.length;
        setBodySearchCurrent(next);
        highlightBodySearch(next);
      }
    }
  });

  $(document).on('click', '#body-search-btn', runBodySearch);
  $(document).on('click', '#form-cancel', clearBodyHighlights);
}
