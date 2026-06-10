import type { CapturedEntry, Header } from '../types/index';
import { escapeHtml, downloadJSON, toCurl } from '../core/utils';
import { values } from '../state';
import { requestToPostmanItem as rtpItem } from './postman';

function genSnippetsText(data: CapturedEntry, lang: string): string {
  if (!data || !data.request) return '';
  const r = data.request;
  if (lang === 'curl') return toCurl(data);
  if (lang === 'python') {
    let s = 'import requests\n\n';
    s += 'url = ' + JSON.stringify(r.url) + '\n';
    const h: { [key: string]: string } = {};
    if (r.headers) for (const item of r.headers) { if (item.name) h[item.name] = item.value; }
    s += 'headers = ' + JSON.stringify(h, null, 2) + '\n';
    if (r.postData) {
      const body = typeof r.postData === 'string' ? r.postData : (r.postData.text || '');
      s += 'data = ' + JSON.stringify(body) + '\n';
      s += "r = requests." + (r.method || 'GET').toLowerCase() + "(url, headers=headers, data=data)\n";
    } else {
      s += "r = requests." + (r.method || 'GET').toLowerCase() + "(url, headers=headers)\n";
    }
    s += 'print(r.text)';
    return s;
  }
  if (lang === 'fetch') {
    const opts: { method: string; headers?: { [key: string]: string }; body?: string } = { method: r.method || 'GET' };
    if (r.headers) {
      opts.headers = {};
      for (const item of r.headers) { if (item.name) opts.headers[item.name] = item.value; }
    }
    if (r.postData) {
      opts.body = typeof r.postData === 'string' ? r.postData : (r.postData.text || '');
    }
    return 'fetch(' + JSON.stringify(r.url) + ', ' + JSON.stringify(opts, null, 2) + ')\n  .then(r => r.text())\n  .then(console.log)\n  .catch(console.error);';
  }
  if (lang === 'go') {
    let s = 'package main\n\nimport (\n\t"fmt"\n\t"io/ioutil"\n\t"net/http"\n\t"strings"\n)\n\nfunc main() {\n';
    s += '\turl := ' + JSON.stringify(r.url) + '\n';
    s += '\tmethod := "' + (r.method || 'GET') + '"\n';
    if (r.postData) {
      const body = typeof r.postData === 'string' ? r.postData : (r.postData.text || '');
      s += '\tpayload := strings.NewReader(' + JSON.stringify(body) + ')\n';
      s += '\tclient := &http.Client{}\n\treq, err := http.NewRequest(method, url, payload)\n';
    } else {
      s += '\tclient := &http.Client{}\n\treq, err := http.NewRequest(method, url, nil)\n';
    }
    s += '\tif err != nil { fmt.Println(err); return }\n';
    if (r.headers) for (const item of r.headers) {
      if (item.name && item.value) s += '\treq.Header.Set(' + JSON.stringify(item.name) + ', ' + JSON.stringify(item.value) + ')\n';
    }
    s += '\tres, err := client.Do(req)\n\tif err != nil { fmt.Println(err); return }\n\tdefer res.Body.Close()\n\tbody, _ := ioutil.ReadAll(res.Body)\n\tfmt.Println(string(body))\n}';
    return s;
  }
  if (lang === 'rust') {
    let s = 'use reqwest;\n\n#[tokio::main]\nasync fn main() -> Result<(), reqwest::Error> {\n';
    s += '\tlet client = reqwest::Client::new();\n';
    if (r.postData) {
      const body = typeof r.postData === 'string' ? r.postData : (r.postData.text || '');
      s += '\tlet body = ' + JSON.stringify(body) + ';\n';
    }
    s += '\tlet res = client\n';
    s += '\t\t.' + (r.method || 'GET').toLowerCase() + '(' + JSON.stringify(r.url) + ')\n';
    if (r.headers) for (const item of r.headers) {
      if (item.name && item.value) s += '\t\t.header(' + JSON.stringify(item.name) + ', ' + JSON.stringify(item.value) + ')\n';
    }
    if (r.postData) s += '\t\t.body(body)\n';
    s += '\t\t.send().await?;\n\tlet text = res.text().await?;\n\tprintln!("{}", text);\n\tOk(())\n}';
    return s;
  }
  if (lang === 'php') {
    let s = '<?php\n\n$url = ' + JSON.stringify(r.url) + ';\n';
    if (r.postData) {
      const body = typeof r.postData === 'string' ? r.postData : (r.postData.text || '');
      s += '$data = ' + JSON.stringify(body) + ';\n';
    }
    s += '$ch = curl_init($url);\n';
    s += 'curl_setopt($ch, CURLOPT_CUSTOMREQUEST, ' + JSON.stringify(r.method || 'GET') + ');\n';
    if (r.headers) {
      const hArr: string[] = [];
      for (const item of r.headers) { if (item.name && item.value) hArr.push(item.name + ': ' + item.value); }
      if (hArr.length) s += 'curl_setopt($ch, CURLOPT_HTTPHEADER, ' + JSON.stringify(hArr) + ');\n';
    }
    if (r.postData) s += 'curl_setopt($ch, CURLOPT_POSTFIELDS, $data);\n';
    s += 'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$response = curl_exec($ch);\ncurl_close($ch);\necho $response;\n';
    return s;
  }
  return '';
}

export { genSnippetsText as genSnippets };

export function exportAsCSV(items: CapturedEntry[]): void {
  let csv = 'Method,URL,Status,Type,Size,Time\n';
  for (const d of items) {
    if (!d.request) continue;
    const method = d.request.method || 'GET';
    const url = (d.request.url || '').replace(/"/g, '""');
    const status = d.response ? d.response.status : '';
    const type = (d.response && d.response.content && d.response.content.mimeType) || '';
    const size = d.response && d.response.content ? d.response.content.size : '';
    const time = d.time ? Math.round(d.time) : '';
    csv += '"' + method + '","' + url + '",' + status + ',"' + type + '",' + size + ',' + time + '\n';
  }
  downloadJSON(csv, 'spykit.csv');
}

export function exportAsHAR(items: CapturedEntry[]): void {
  const log: any = { log: { version: '1.2', creator: { name: 'SpyKit', version: '2.0' }, entries: [] as any[] } };
  for (const d of items) {
    if (!d.request) continue;
    log.log.entries.push({
      startedDateTime: d.startedDateTime || new Date().toISOString(),
      time: d.time || 0,
      request: {
        method: d.request.method || 'GET',
        url: d.request.url || '',
        httpVersion: d.request.httpVersion || 'http/2.0',
        headers: d.request.headers || [],
        queryString: d.request.queryString || [],
        cookies: d.request.cookies || [],
        headersSize: d.request.headersSize || -1,
        bodySize: d.request.bodySize || -1,
      },
      response: {
        status: d.response ? d.response.status : 0,
        statusText: d.response ? d.response.statusText || '' : '',
        httpVersion: d.response ? d.response.httpVersion || 'http/2.0' : 'http/2.0',
        headers: d.response ? d.response.headers || [] : [],
        content: d.response && d.response.content ? {
          size: d.response.content.size || 0,
          mimeType: d.response.content.mimeType || '',
          text: d.response.content.text || '',
        } : { size: 0, mimeType: '', text: '' },
        cookies: d.response ? d.response.cookies || [] : [],
        headersSize: d.response ? d.response.headersSize || -1 : -1,
        bodySize: d.response ? d.response.bodySize || -1 : -1,
        redirectURL: d.response ? d.response.redirectURL || '' : '',
      },
      cache: {},
      timings: d.timings || {},
    });
  }
  const output = JSON.stringify(log, null, 2);
  downloadJSON(output, 'spykit.har');
}

export function exportAsHTTP(items: CapturedEntry[]): string {
  let output = '';
  for (const d of items) {
    if (!d.request) continue;
    const r = d.request;
    output += (r.method || 'GET') + ' ' + r.url + ' HTTP/1.1\n';
    if (r.headers) for (const h of r.headers) {
      if (h.name && h.value) output += h.name + ': ' + h.value + '\n';
    }
    if (r.postData) {
      output += '\n' + (typeof r.postData === 'string' ? r.postData : (r.postData.text || ''));
    }
    output += '\n###\n\n';
  }
  return output;
}

export function exportAsFormat(format: string): void {
  const items: CapturedEntry[] = [];
  $('.req:visible').each(function (this: HTMLElement) {
    const id = parseInt($(this).attr('id') || '');
    if (values.requests[id]) items.push(values.requests[id]);
  });
  if (!items.length) {
    $('#export-dropdown').hide();
    return;
  }

  let output = '';
  let filename = 'spykit.txt';

  if (format === 'har') {
    exportAsHAR(items);
    return;
  } else if (format === 'csv') {
    exportAsCSV(items);
    return;
  } else if (format === 'postman') {
    const collection: any = {
      info: { name: 'SpyKit Export', schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json' },
      item: [],
    };
    for (const item of items) {
      const pi = rtpItem(item);
      if (pi) collection.item.push(pi);
    }
    output = JSON.stringify(collection, null, 2);
    filename = 'spykit-collection.json';
  } else if (format === 'python') {
    for (const d of items) {
      output += genSnippetsText(d, 'python') + '\n\n';
    }
    filename = 'spykit.py';
  } else if (format === 'fetch') {
    for (const d of items) {
      output += genSnippetsText(d, 'fetch') + '\n\n';
    }
    filename = 'spykit.js';
  } else if (format === 'http') {
    output = exportAsHTTP(items);
    filename = 'spykit.http';
  }

  if (output) downloadJSON(output, filename);
  $('#export-dropdown').hide();
}
