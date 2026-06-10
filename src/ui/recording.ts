import { isRecording, recordedData, setIsRecording, setRecordedData } from '../state';
import { copyToClipboard } from '../core/utils';

export function initRecordingUI(): void {
  $(document).on('click', '#record-btn', function (this: HTMLElement) {
    setIsRecording(!isRecording);
    $(this).toggleClass('recording');
    $(this).text(isRecording ? '⏹' : '⏺');
    if (!isRecording && recordedData.length) {
      let output = '';
      for (const d of recordedData) {
        if (d.request) {
          output += (d.request.method || 'GET') + ' ' + (d.request.url || '') + '\n';
          if (d.response) output += '\u2192 ' + (d.response.status || '') + '\n';
          output += '\n';
        }
      }
      copyToClipboard(output);
      setRecordedData([]);
    }
  });
  $(document).on('keydown', function (e) {
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      $('#record-btn').click();
    }
  });
}

export function captureForRecording(data: any): void {
  if (isRecording && data) recordedData.push(data);
}
