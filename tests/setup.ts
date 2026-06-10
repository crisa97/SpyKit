import { vi } from 'vitest';

// Mock Chrome API
(globalThis as any).chrome = {
  devtools: {
    inspectedWindow: { tabId: 1, eval: vi.fn() },
    network: {
      onRequestFinished: { addListener: vi.fn() },
      getHAR: vi.fn(),
    },
    panels: { themeName: 'dark' },
  },
  storage: {
    local: {
      get: vi.fn((_keys: any, cb: any) => cb({})),
      set: vi.fn(),
    },
  },
  runtime: {
    connect: vi.fn(() => ({
      postMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
    })),
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
  },
};

// Mock localStorage
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: vi.fn((key: string) => store[key] || null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
};

// Mock jQuery
(globalThis as any).$ = vi.fn();
(globalThis as any).jQuery = vi.fn();

// Mock autosize
(globalThis as any).autosize = { update: vi.fn() };

// Mock Split
(globalThis as any).Split = vi.fn(() => ({
  getSizes: vi.fn(() => [50, 50]),
  setSizes: vi.fn(),
  destroy: vi.fn(),
}));

// Mock Blob and URL
(globalThis as any).Blob = class Blob {
  constructor(public parts: any[], public opts: any) {}
};
(globalThis as any).URL = {
  createObjectURL: vi.fn(() => 'blob:test'),
  revokeObjectURL: vi.fn(),
};
