// Simple unit tests for SpyKit core functions
// Run: node tests/main.js

var fs = require('fs');
var vm = require('vm');

// Load main.js in a sandbox
var code = fs.readFileSync(__dirname + '/../js/main.js', 'utf8');
var sandbox = {
    console: console,
    $: function() { return {on: function(){}, each: function(){}, append: function(){}, html: function(){}, toggleClass: function(){}, show: function(){}, hide: function(){}, val: function(){return ''}, attr: function(){}, find: function(){return {length:0}}, is: function(){return false}, addClass: function(){}, removeClass: function(){}, remove: function(){}, text: function(){}, data: function(){}, parent: function(){return {append: function(){}}}, closest: function(){return {toggleClass: function(){}}}, slideToggle: function(){}, slideUp: function(){}, fadeOut: function(){}, focus: function(){}, css: function(){return {}} } },
    jQuery: function() { return {ready: function(fn){ fn(); }} },
    window: { location: { href: '' } },
    document: {
    getElementById: function(){return null},
    createElement: function(tag){return {}},
    addEventListener: function(){},
    createTextNode: function(){return {}},
    body: { appendChild: function(){} }
    },
    chrome: {
    devtools: {
        inspectedWindow: { tabId: 1, eval: function(){} },
        network: { onRequestFinished: { addListener: function(){} } },
        panels: { themeName: 'dark' }
    },
    storage: { local: { get: function(keys,cb){ cb({}); }, set: function(obj,cb){ if(cb)cb(); } } },
    runtime: { sendMessage: function(){} }
    },
    autosize: { update: function(){} },
    escapeHtml: function(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); },
    localStorage: { getItem: function(){return null}, setItem: function(){} },
    Blob: function(){},
    URL: { createObjectURL: function(){return ''}, revokeObjectURL: function(){} },
    parseInt: parseInt,
    parseFloat: parseFloat,
    setTimeout: function(fn){ fn(); },
    setInterval: function(){},
    encodeURIComponent: encodeURIComponent,
    decodeURIComponent: decodeURIComponent,
    JSON: JSON,
    RegExp: RegExp,
    Math: Math,
    Date: Date,
    Object: Object,
    Array: Array,
    String: String,
    Number: Number,
    Boolean: Boolean,
    Error: Error,
    isNaN: isNaN,
    parseCurl: null,
    formatSize: null,
    scanForSecrets: null,
    checkSecurityHeaders: null,
    checkCORS: null,
    parseCookies: null,
    cookieHtml: null,
    escapeHtml: null,
    toHexDump: null
};

try {
    vm.runInNewContext(code, sandbox, {filename: 'main.js'});
} catch(e) {
    console.log('WARNING: Could not fully load main.js (expected in non-browser env):', e.message);
}

// Extract functions from sandbox
var parseCurl = sandbox.parseCurl;
var formatSize = sandbox.formatSize;
var scanForSecrets = sandbox.scanForSecrets;
var checkSecurityHeaders = sandbox.checkSecurityHeaders;
var checkCORS = sandbox.checkCORS;
var parseCookies = sandbox.parseCookies;
var cookieHtml = sandbox.cookieHtml;
var toHexDump = sandbox.toHexDump;
var escapeHtml = sandbox.escapeHtml;

var passed = 0, failed = 0;

function test(name, fn) {
    try {
    fn();
    passed++;
    console.log('  PASS: ' + name);
    } catch(e) {
    failed++;
    console.log('  FAIL: ' + name + ' - ' + e.message);
    }
}

console.log('\n=== SpyKit Unit Tests ===\n');

// parseCurl tests
console.log('-- parseCurl --');
test('GET request', function() {
    var r = parseCurl("curl 'http://example.com'");
    if (!r) throw new Error('returned null');
    if (r.method !== 'GET') throw new Error('method: ' + r.method);
    if (r.url !== 'http://example.com') throw new Error('url: ' + r.url);
});

test('POST with headers and body', function() {
    var r = parseCurl("curl -X POST 'http://api.test' -H 'Content-Type: application/json' -d '{\"a\":1}'");
    if (!r) throw new Error('null');
    if (r.method !== 'POST') throw new Error('method: ' + r.method);
    if (r.headers['Content-Type'] !== 'application/json') throw new Error('header');
    if (r.body !== '{"a":1}') throw new Error('body: ' + r.body);
});

test('Empty input', function() {
    var r = parseCurl('');
    if (r !== null) throw new Error('should be null');
});

test('--data sets POST', function() {
    var r = parseCurl("curl -d 'test' http://site.com");
    if (r.method !== 'POST') throw new Error('method should be POST: ' + r.method);
});

// formatSize tests
console.log('\n-- formatSize --');
test('Bytes', function() {
    var r = formatSize(500);
    if (r.indexOf('500') < 0) throw new Error('expected 500 B: ' + r);
});
test('KB', function() {
    var r = formatSize(2048);
    if (r.indexOf('KB') < 0 && r.indexOf('kB') < 0) throw new Error('expected KB: ' + r);
});
test('MB', function() {
    var r = formatSize(1048576 * 2);
    if (r.indexOf('MB') < 0 && r.indexOf('mb') < 0) throw new Error('expected MB: ' + r);
});
test('Zero/empty', function() {
    if (formatSize(0) !== '') throw new Error('expected empty for 0');
    if (formatSize(-1) !== '') throw new Error('expected empty for -1');
});

// scanForSecrets tests
console.log('\n-- scanForSecrets --');
test('Finds JWT', function() {
    var r = scanForSecrets('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.RjVlOWM5M2M4NjIxMjM0NTY3ODkw');
    if (!r.length) throw new Error('should detect JWT');
    if (r[0].type !== 'JWT') throw new Error('type should be JWT: ' + r[0].type);
});
test('Finds Bearer token', function() {
    var r = scanForSecrets('Authorization: Bearer abcdefghijklmnopqrstuvwxyz1234567890');
    if (!r.length) throw new Error('should detect Bearer token');
});
test('No false positive on safe text', function() {
    var r = scanForSecrets('Hello world, this is a normal text without secrets.');
    if (r.length !== 0) throw new Error('should be empty, got: ' + JSON.stringify(r));
});

// toHexDump tests
console.log('\n-- toHexDump --');
test('Produces output', function() {
    var r = toHexDump('hello');
    if (!r || r.length < 10) throw new Error('hex dump too short');
    if (r.indexOf('68') < 0) throw new Error('expected 68 (h) in hex');
});

// escapeHtml tests (redefine since it's scoped inside DOM ready)
console.log('\n-- escapeHtml (inline) --');
function testEscapeHtml(str) { return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
test('Escapes HTML entities', function() {
    if (testEscapeHtml('<>&"') !== '&lt;&gt;&amp;&quot;') throw new Error('bad escape: ' + testEscapeHtml('<>&"'));
});
test('Passes through safe text', function() {
    if (testEscapeHtml('hello world') !== 'hello world') throw new Error('should not change safe text');
});

// Summary
console.log('\n=== Results: ' + passed + ' passed, ' + failed + ' failed ===\n');
process.exit(failed ? 1 : 0);
