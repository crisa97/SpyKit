export function addFilterItem(filter: string, id: string, str: string): void {
  const f = $('.filter-' + filter + ':last');
  const ul = $('ul', f);
  const itemId = filter + '-' + id;

  if (!$('#' + itemId, f).is(':input')) {
    if ($('li', ul).length === 1) {
      ul.append($('<li/>').addClass('divider'));
    }
    ul.append(
      $('<li/>').addClass('checkbox').append(
        $('<label/>').append(
          $('<input/>').attr({
            type: 'checkbox', name: 'filter',
            value: itemId, id: itemId, checked: true
          })
        ).append(str).append(
          $('<span/>').attr('id', 'badge-' + itemId).addClass('badge badge-right').html('0')
        )
      )
    );
  } else {
    const badge = $('#badge-' + itemId, ul);
    const i = parseInt(badge.html() || '0');
    badge.html(String(i + 1));
  }
}
