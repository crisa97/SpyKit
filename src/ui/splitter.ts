import { splitter as stateSplitter, splitDir as stateSplitDir, splitRatio as stateSplitRatio, dialogOpened, setSplitter, setSplitDir, setSplitRatio } from '../state';

export function detailsSizeCheck(): void {
  const $details = $('.details');
  const $scrollUpClass = $('.scroll-up');
  const $formMethodClear = $('.form-method-clear');
  const $formStatusClear = $('.form-status-clear');
  const $formTimeClear = $('.form-time-clear');

  const w = $details.width() || 0;
  $details.css({ paddingRight: (w < 20) ? 0 : '' });
  if (w < 220) {
    $formMethodClear.show();
    $formStatusClear.hide();
    $formTimeClear.hide();
  } else if (w < 320) {
    $formMethodClear.hide();
    $formStatusClear.show();
    $formTimeClear.hide();
  } else if (w < 420) {
    $formMethodClear.hide();
    $formStatusClear.hide();
    $formTimeClear.show();
  } else {
    $formMethodClear.hide();
    $formStatusClear.hide();
    $formTimeClear.hide();
  }
  $scrollUpClass.css({ right: (stateSplitDir === 'vertical' || !dialogOpened) ? '20px' : (w + 40) + 'px' });
}

export function splitCheck(): void {
  const $splitArea = $('.split-area');
  if (!$splitArea.height()) return;
  const ratio = Math.round(10 * ($splitArea.width() || 0) / ($splitArea.height() || 1));
  let dir: string;
  if (ratio > 10) dir = 'horizontal';
  else dir = 'vertical';

  if (dir === stateSplitDir || ratio === stateSplitRatio) return;

  $splitArea.removeClass('split-' + stateSplitDir);
  if (stateSplitter) {
    stateSplitter.destroy();
    setSplitter(undefined);
  }

  setSplitRatio(ratio);
  setSplitDir(dir);
  $splitArea.addClass('split-' + dir);
  if ($splitArea.is(':visible')) {
    $splitArea.css({ display: (dir === 'vertical') ? 'block' : 'flex' });
  }

  const s = Split(['.transparent', '.details'], {
    direction: dir as 'horizontal' | 'vertical',
    sizes: [50, 50],
    gutterSize: 20,
    snapOffset: 50,
    minSize: 0,
    onDragStart: () => $splitArea.addClass('splitting'),
    onDrag: () => detailsSizeCheck(),
    onDragEnd: () => $splitArea.removeClass('splitting'),
  });
  setSplitter(s);
}
