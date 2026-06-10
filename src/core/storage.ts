import type { CapturedEntry, HistoryEntry, Envs, MockRule } from '../types/index';
import { values } from '../state';

export function loadPersistedData(): void {
  if (chrome.storage && chrome.storage.local) {
    chrome.storage.local.get(['persistedRequests', 'restHistory', 'envs', 'envName'], (result) => {
      if (result.persistedRequests) {
        let maxId = 0;
        for (const idStr in result.persistedRequests) {
          const origId = parseInt(idStr);
          if (!values.requests[origId]) {
            void origId;
          }
          if (origId > maxId) maxId = origId;
        }
      }
      if (result.restHistory) values.restHistory = result.restHistory;
      if (result.envs) values.envs = result.envs;
      if (result.envName) values.envName = result.envName;
    });
  }
}

export function startAutoSave(): void {
  if (chrome.storage && chrome.storage.local) {
    setInterval(() => {
      const toSave: { [id: number]: CapturedEntry } = {};
      let count = 0;
      for (const id in values.requests) {
        if (count++ > 200) break;
        toSave[parseInt(id)] = values.requests[parseInt(id)];
      }
      chrome.storage.local.set({
        persistedRequests: toSave,
        restHistory: values.restHistory || [],
      });
    }, 30000);
  }
}

export function getBookmarks(): number[] {
  return JSON.parse(localStorage.getItem('spykit-bookmarks') || '[]');
}

export function saveBookmark(id: number, pinned: boolean): void {
  const bookmarks = getBookmarks();
  const idx = bookmarks.indexOf(id);
  if (pinned) {
    if (idx < 0) bookmarks.push(id);
  } else {
    if (idx >= 0) bookmarks.splice(idx, 1);
  }
  localStorage.setItem('spykit-bookmarks', JSON.stringify(bookmarks));
}

export function getBlockedDomains(): string[] {
  return JSON.parse(localStorage.getItem('spykit-blocked') || '[]');
}

export function addBlockedDomain(domain: string): void {
  const blocks = getBlockedDomains();
  if (blocks.indexOf(domain) < 0) blocks.push(domain);
  localStorage.setItem('spykit-blocked', JSON.stringify(blocks));
}

export function getMocks(): MockRule[] {
  return JSON.parse(localStorage.getItem('spykit-mocks') || '[]');
}

export function saveMocks(mocks: MockRule[]): void {
  localStorage.setItem('spykit-mocks', JSON.stringify(mocks));
}

export function getTheme(): string | null {
  return localStorage.getItem('spykit-theme');
}

export function setTheme(theme: string): void {
  localStorage.setItem('spykit-theme', theme);
}

export function getSnippets(): Array<{ name: string; method: string; url: string; headers: string; body: string }> {
  return JSON.parse(localStorage.getItem('spykit-snippets') || '[]');
}

export function saveSnippets(snippets: Array<{ name: string; method: string; url: string; headers: string; body: string }>): void {
  localStorage.setItem('spykit-snippets', JSON.stringify(snippets));
}

export function getWorkspaces(): Array<{ name: string; requests: { [id: string]: CapturedEntry } }> {
  return JSON.parse(localStorage.getItem('spykit-workspaces') || '[]');
}

export function saveWorkspaces(workspaces: Array<{ name: string; requests: { [id: string]: CapturedEntry } }>): void {
  localStorage.setItem('spykit-workspaces', JSON.stringify(workspaces));
}
