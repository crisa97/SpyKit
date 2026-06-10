import { getTheme, setTheme } from '../core/storage';

export function initTheme(): void {
  const isLight = getTheme() === 'light';
  if (isLight) $('body').addClass('light');
  $('#theme-toggle').text(isLight ? '☾' : '☀');
  $('#theme-toggle').on('click', () => {
    $('body').toggleClass('light');
    const nowLight = $('body').hasClass('light');
    $('#theme-toggle').text(nowLight ? '☾' : '☀');
    setTheme(nowLight ? 'light' : 'dark');
  });
}
