interface SplitInstance {
  getSizes(): number[];
  setSizes(sizes: number[]): void;
  destroy(): void;
}

interface SplitOptions {
  direction?: 'horizontal' | 'vertical';
  sizes?: number[];
  gutterSize?: number;
  snapOffset?: number;
  minSize?: number;
  onDragStart?: () => void;
  onDrag?: () => void;
  onDragEnd?: () => void;
}

declare function Split(elements: string[], options?: SplitOptions): SplitInstance;

declare namespace Split {
  type Instance = SplitInstance;
}

interface AutosizeInstance {
  update(el: JQuery | HTMLElement): void;
}

declare const autosize: {
  (el: JQuery): void;
  update(el: JQuery | HTMLElement): void;
};

interface Window {
  pd?: {
    css(s: string): string;
    xml(s: string): string;
    json(s: string): string;
  };
  rootId?: number;
  selected?: JQuery;
  editRequest?: (tr: JQuery) => void;
  _diffA?: { id: number; body: string; label: string };
  _diffB?: { id: number; body: string; label: string };
  dialogOpened?: boolean;
  values?: any;
  spykitLoaded?: boolean;
}
