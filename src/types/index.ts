export interface Header {
  name: string;
  value: string;
}

export interface PostData {
  text?: string;
  mimeType?: string;
  params?: Array<{ name: string; value: string }>;
}

export interface RequestData {
  method: string;
  url: string;
  httpVersion?: string;
  headers: Header[];
  queryString?: Array<{ name: string; value: string }>;
  cookies?: Array<{ name: string; value: string }>;
  postData?: PostData | string;
  headersSize?: number;
  bodySize?: number;
}

export interface ResponseContent {
  size?: number;
  mimeType?: string;
  text?: string;
}

export interface ResponseData {
  status: number;
  statusText?: string;
  httpVersion?: string;
  headers: Header[];
  content?: ResponseContent;
  cookies?: Array<{ name: string; value: string }>;
  headersSize?: number;
  bodySize?: number;
  redirectURL?: string;
}

export interface CapturedEntry {
  startedDateTime?: string;
  time?: number;
  request: RequestData;
  response?: ResponseData;
  cache?: unknown;
  timings?: unknown;
  getContent?: (callback: (content: string, encoding: string) => void) => void;
}

export interface EnvVars {
  [key: string]: string;
}

export interface Envs {
  [name: string]: EnvVars;
}

export interface Snippet {
  name: string;
  method: string;
  url: string;
  headers: string;
  body: string;
}

export interface Workspace {
  name: string;
  requests: { [id: string]: CapturedEntry };
}

export interface MockRule {
  url: string;
  status: number;
  headers: string;
  body: string;
}

export interface HistoryEntry {
  method: string;
  url: string;
  headers: string;
  body: string;
  ts: number;
}

export interface BodySearchMatch {
  textarea: HTMLTextAreaElement;
  pos: number;
  label: string;
}

export interface RowSpec {
  clear?: string;
  pin?: string;
  method?: string | string[];
  time?: string | string[];
  size?: string | string[];
  type?: string | string[];
  status?: string | string[];
  url?: string | string[];
  [key: string]: string | string[] | undefined;
}

export interface CORSResult {
  status: string;
  html: string;
  issues?: string[];
}
