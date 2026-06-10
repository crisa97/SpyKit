import { values } from '../state';
import { escapeHtml } from '../core/utils';

export function resolveEnvVars(str: string): string {
  if (!str) return str;
  const env = values.envs[values.envName] || {};
  return str.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    return env[key] !== undefined ? env[key] : _m;
  });
}

export function renderEnvTable(): void {
  const env = values.envs[values.envName] || {};
  let html = '';
  for (const key in env) {
    html += '<tr><td><input class="env-key" value="' + escapeHtml(key) + '"></td><td><input class="env-val" value="' + escapeHtml(env[key]) + '"></td><td><button class="env-del">&times;</button></td></tr>';
  }
  $('#env-rows').html(html);
}

export function saveEnvs(): void {
  const env: { [key: string]: string } = {};
  $('#env-rows tr').each(function (this: HTMLElement) {
    const key = ($(this).find('.env-key').val() as string || '').trim();
    const val = $(this).find('.env-val').val() as string || '';
    if (key) env[key] = val;
  });
  values.envs[values.envName] = env;
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.set({ environments: values.envs, activeEnv: values.envName });
  }
}

export function initEnvUI(): void {
  $(document).on('click', '#env-close', () => $('#env-panel').hide());
  $(document).on('change', '#env-rows input', saveEnvs);
  $(document).on('click', '#env-add-row', () => {
    $('#env-rows').append('<tr><td><input class="env-key" placeholder="key"></td><td><input class="env-val" placeholder="value"></td><td><button class="env-del">&times;</button></td></tr>');
  });
  $(document).on('click', '.env-del', function (this: HTMLElement) { $(this).closest('tr').remove(); saveEnvs(); });
  $(document).on('change', '#env-select', function (this: HTMLElement) {
    const val = $(this).val() as string;
    if (val === '__new__') {
      const name = prompt('Environment name:');
      if (name && !values.envs[name]) {
        values.envs[name] = {};
        const opt = $('<option>').val(name).text(name);
        $(this).append(opt).val(name);
      } else if (name && values.envs[name]) {
        $(this).val(name);
      }
    }
    values.envName = $(this).val() as string;
    renderEnvTable();
  });
  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      $('#env-panel').toggle();
      const sel = $('#env-select') as JQuery<HTMLSelectElement>;
      sel.find('option:not([value="__new__"])').remove();
      for (const name in values.envs) {
        sel.append($('<option>').val(name).text(name));
      }
      sel.val(values.envName || 'default');
      renderEnvTable();
    }
  });
}
