import { ROW_HEIGHT } from '../state';

let scrollEnabled = false;
let scrollCount = 0;

export function checkScroll(scrollTop: number): void {
  const count = Math.round(scrollTop / ROW_HEIGHT);
  if (count > 0 && count !== scrollCount) {
    scrollCount = count;
    $('.scroll-up>span').html(String(scrollCount));
  }
  if (scrollEnabled === (count > 0)) return;
  scrollEnabled = count > 0;
  if (scrollEnabled) {
    $('#scroll-up').show();
  } else {
    $('#scroll-up').hide();
  }
}
