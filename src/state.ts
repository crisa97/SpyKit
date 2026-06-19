import type { CapturedEntry, Envs, HistoryEntry, MockRule, BodySearchMatch, RowSpec } from './types/index';

export const rows: RowSpec = {
  clear: '×',
  pin: '☆',
  method: ['Method'],
  time: ['&nbsp; &nbsp; Time'],
  size: ['&nbsp; &nbsp; Size'],
  type: ['&nbsp; Type'],
  status: ['Status'],
  url: ['URL'],
};

export const values: {
  requests: { [id: number]: CapturedEntry };
  filters: string[];
  filters_str: string;
  searchQuery: string;
  searchRegex: boolean;
  restHistory: HistoryEntry[];
  envs: Envs;
  envName: string;
  showPinned: boolean;
  page: number;
  pageSize: number;
} = {
  requests: {},
  filters: [],
  filters_str: '',
  searchQuery: '',
  searchRegex: false,
  restHistory: [],
  envs: { default: {} },
  envName: 'default',
  showPinned: false,
  page: 0,
  pageSize: 200,
};

export const FORBIDEN_HEADERS_STARTS_WITH = ['proxy-', 'sec-', ':'];
export const FORBIDEN_HEADERS = [
  'accept-charset', 'accept-encoding', 'access-control-request-headers',
  'access-control-request-method', 'cache-control', 'connection',
  'content-length', 'cookie', 'cookie2', 'date', 'dnt', 'expect',
  'host', 'keep-alive', 'origin', 'pragma', 'referer', 'te',
  'trailer', 'transfer-encoding', 'upgrade', 'user-agent', 'via',
];

export const ROW_HEIGHT = 24;

export let dialogOpened = false;
export function setDialogOpened(v: boolean) { dialogOpened = v; }

export let selected: JQuery | undefined;
export function setSelected(s: JQuery | undefined) { selected = s; }

export let scrollEnabled = false;
export let scrollCount = 0;
export function setScrollEnabled(v: boolean) { scrollEnabled = v; }
export function setScrollCount(v: number) { scrollCount = v; }

export let rootId = 1;
export function setRootId(v: number) { rootId = v; }

export let bodySearchTerm = '';
export let bodySearchMatches: BodySearchMatch[] = [];
export let bodySearchCurrent = -1;
export function setBodySearchTerm(v: string) { bodySearchTerm = v; }
export function setBodySearchMatches(v: BodySearchMatch[]) { bodySearchMatches = v; }
export function setBodySearchCurrent(v: number) { bodySearchCurrent = v; }

export let largeContent: string | undefined;
export let largeContentEncoding: string | undefined;
export function setLargeContent(v: string | undefined) { largeContent = v; }
export function setLargeContentEncoding(v: string | undefined) { largeContentEncoding = v; }

export let contentScriptLoaded = false;
export function setContentScriptLoaded(v: boolean) { contentScriptLoaded = v; }

export let formDirty = false;
export function setFormDirty(v: boolean) { formDirty = v; }

export let isRecording = false;
export let recordedData: CapturedEntry[] = [];
export function setIsRecording(v: boolean) { isRecording = v; }
export function setRecordedData(v: CapturedEntry[]) { recordedData = v; }

export let rateLimitDelay = 0;
export let rateLastSend = 0;
export function setRateLimitDelay(v: number) { rateLimitDelay = v; }
export function setRateLastSend(v: number) { rateLastSend = v; }

export let mocks: MockRule[] = [];

export let splitter: SplitInstance | undefined;
export let splitDir: string | undefined;
export let splitRatio = -1;
export function setSplitter(s: SplitInstance | undefined) { splitter = s; }
export function setSplitDir(d: string | undefined) { splitDir = d; }
export function setSplitRatio(r: number) { splitRatio = r; }

export const SECURITY_HEADERS: { [key: string]: { label: string; check: (v: string) => boolean; desc: string } } = {
  'strict-transport-security': { label: 'HSTS', check: (v: string) => !!v && v.indexOf('max-age') >= 0, desc: 'HTTP Strict Transport Security — forces HTTPS connections' },
  'x-content-type-options': { label: 'XCTO', check: (v: string) => v === 'nosniff', desc: 'Prevents MIME-type sniffing' },
  'x-frame-options': { label: 'XFO', check: (v: string) => v === 'DENY' || v === 'SAMEORIGIN', desc: 'Prevents clickjacking via iframes' },
  'content-security-policy': { label: 'CSP', check: () => true, desc: 'Content Security Policy — controls allowed resources' },
  'x-xss-protection': { label: 'XSS', check: (v: string) => !!v && v.indexOf('1') >= 0, desc: 'Cross-site scripting filter' },
  'referrer-policy': { label: 'RefP', check: () => true, desc: 'Controls referrer header sent with requests' },
  'permissions-policy': { label: 'PermP', check: () => true, desc: 'Controls browser features (camera, mic, etc.)' },
};

export const INFO_DISCLOSURE_HEADERS: { [key: string]: { label: string; desc: string } } = {
  'server': { label: 'Srv', desc: 'Reveals server software and version' },
  'x-powered-by': { label: 'XPB', desc: 'Reveals technology stack (ASP.NET, PHP, etc.)' },
  'x-aspnet-version': { label: 'ASPN', desc: 'Reveals ASP.NET version' },
  'x-aspnetmvc-version': { label: 'MVC', desc: 'Reveals ASP.NET MVC version' },
  'via': { label: 'Via', desc: 'Reveals proxy/gateway information' },
  'x-cache': { label: 'Cache', desc: 'Reveals caching infrastructure (HIT/MISS)' },
  'x-backend': { label: 'Back', desc: 'Reveals backend server details' },
  'x-forwarded-for': { label: 'XFF', desc: 'May reveal internal IP addresses' },
  'x-forwarded-host': { label: 'XFH', desc: 'May reveal internal hostnames' },
  'x-forwarded-proto': { label: 'XFP', desc: 'May reveal protocol information' },
  'x-request-id': { label: 'ReqID', desc: 'May reveal request tracing infrastructure' },
  'x-trace-id': { label: 'Trace', desc: 'May reveal tracing infrastructure (e.g., AWS X-Ray)' },
  'x-amzn-requestid': { label: 'AWS', desc: 'Reveals AWS request tracking' },
  'x-amz-cf-id': { label: 'CF', desc: 'Reveals CloudFront distribution' },
  'x-generator': { label: 'Gen', desc: 'Reveals CMS/generator information' },
  'x-drupal-cache': { label: 'Drupal', desc: 'Reveals Drupal caching' },
  'x-drupal-dynamic-cache': { label: 'DDC', desc: 'Reveals Drupal dynamic cache' },
  'x-varnish': { label: 'Varnish', desc: 'Reveals Varnish cache details' },
  'x-served-by': { label: 'ServedBy', desc: 'Reveals server hostname' },
};

export const SECRET_PATTERNS = [
  { name: 'API Key', regex: /(['"])?(sk[-_]?live|sk[-_]?test|api[-_]?key|apikey)[=:]\s*['"]?([^&"'\s]{8,})/gi },
  { name: 'JWT', regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
  { name: 'Bearer Token', regex: /bearer\s+[a-zA-Z0-9._~+/-]{20,}/gi },
  { name: 'AWS Key', regex: /AKIA[0-9A-Z]{16}/g },
  { name: 'GitHub Token', regex: /gh[pousr]_[a-zA-Z0-9]{36,}/g },
  { name: 'Password', regex: /(password|passwd|pwd)[=:]\s*['"]?([^&"'\s]{4,})/gi },
  { name: 'Token', regex: /(['"])?(token|secret|auth)[=:]\s*['"]?([^&"'\s]{8,})/gi },
];

export const STATUS_MAP: { [code: number]: string } = {
  100: 'Continue', 101: 'Switching Protocols', 102: 'Processing', 103: 'Early Hints',
  200: 'OK', 201: 'Created', 202: 'Accepted', 203: 'Non-Authoritative Information',
  204: 'No Content', 205: 'Reset Content', 206: 'Partial Content', 207: 'Multi-Status',
  208: 'Already Reported', 226: 'IM Used', 300: 'Multiple Choices', 301: 'Moved Permanently',
  302: 'Found', 303: 'See Other', 304: 'Not Modified', 305: 'Use Proxy', 306: '(Unused)',
  307: 'Temporary Redirect', 308: 'Permanent Redirect', 400: 'Bad Request',
  401: 'Unauthorized', 402: 'Payment Required', 403: 'Forbidden', 404: 'Not Found',
  405: 'Method Not Allowed', 406: 'Not Acceptable', 407: 'Proxy Authentication Required',
  408: 'Request Timeout', 409: 'Conflict', 410: 'Gone', 411: 'Length Required',
  412: 'Precondition Failed', 413: 'Payload Too Large', 414: 'URI Too Long',
  415: 'Unsupported Media Type', 416: 'Range Not Satisfiable', 417: 'Expectation Failed',
  421: 'Misdirected Request', 422: 'Unprocessable Entity', 423: 'Locked',
  424: 'Failed Dependency', 426: 'Upgrade Required', 428: 'Precondition Required',
  429: 'Too Many Requests', 431: 'Request Header Fields Too Large',
  451: 'Unavailable For Legal Reasons', 500: 'Internal Server Error',
  501: 'Not Implemented', 502: 'Bad Gateway', 503: 'Service Unavailable',
  504: 'Gateway Timeout', 505: 'HTTP Version Not Supported', 506: 'Variant Also Negotiates',
  507: 'Insufficient Storage', 508: 'Loop Detected', 510: 'Not Extended',
  511: 'Network Authentication Required',
};
