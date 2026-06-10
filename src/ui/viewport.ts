export function initViewportUI(): void {
  $(document).on('click', '#viewport-bar button', function (this: HTMLElement) {
    $('#viewport-bar button').removeClass('active');
    $(this).addClass('active');
    const w = parseInt($(this).data('width') as string) || 0;
    if (w) {
      chrome.devtools.inspectedWindow.eval('window.resizeTo(' + w + ', window.outerHeight)');
    }
  });

  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'V') {
      e.preventDefault();
      $('#viewport-bar').toggle();
    }
  });
}
