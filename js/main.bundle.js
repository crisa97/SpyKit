(function() {
  "use strict";
  const rows = {
    clear: "×",
    pin: "☆",
    method: ["Method"],
    time: ["&nbsp; &nbsp; Time"],
    size: ["&nbsp; &nbsp; Size"],
    type: ["&nbsp; Type"],
    status: ["Status"],
    url: ["URL"]
  };
  const values = {
    requests: {},
    filters: [],
    filters_str: "",
    searchQuery: "",
    searchRegex: false,
    restHistory: [],
    envs: { default: {} },
    envName: "default",
    showPinned: false,
    page: 0,
    pageSize: 200
  };
  const FORBIDEN_HEADERS_STARTS_WITH = ["proxy-", "sec-", ":"];
  const FORBIDEN_HEADERS = [
    "accept-charset",
    "accept-encoding",
    "access-control-request-headers",
    "access-control-request-method",
    "cache-control",
    "connection",
    "content-length",
    "cookie",
    "cookie2",
    "date",
    "dnt",
    "expect",
    "host",
    "keep-alive",
    "origin",
    "pragma",
    "referer",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "user-agent",
    "via"
  ];
  const ROW_HEIGHT = 24;
  let dialogOpened = false;
  function setDialogOpened(v) {
    dialogOpened = v;
  }
  let selected;
  function setSelected(s) {
    selected = s;
  }
  let rootId = 1;
  function setRootId(v) {
    rootId = v;
  }
  let bodySearchTerm = "";
  let bodySearchMatches = [];
  let bodySearchCurrent = -1;
  function setBodySearchTerm(v) {
    bodySearchTerm = v;
  }
  function setBodySearchMatches(v) {
    bodySearchMatches = v;
  }
  function setBodySearchCurrent(v) {
    bodySearchCurrent = v;
  }
  let contentScriptLoaded = false;
  function setContentScriptLoaded(v) {
    contentScriptLoaded = v;
  }
  let formDirty = false;
  function setFormDirty(v) {
    formDirty = v;
  }
  let isRecording = false;
  let recordedData = [];
  function setIsRecording(v) {
    isRecording = v;
  }
  function setRecordedData(v) {
    recordedData = v;
  }
  let rateLimitDelay = 0;
  function setRateLimitDelay(v) {
    rateLimitDelay = v;
  }
  let mocks = [];
  let splitter;
  let splitDir;
  let splitRatio = -1;
  function setSplitter(s) {
    splitter = s;
  }
  function setSplitDir(d) {
    splitDir = d;
  }
  function setSplitRatio(r) {
    splitRatio = r;
  }
  const SECURITY_HEADERS = {
    "strict-transport-security": { label: "HSTS", check: (v) => !!v && v.indexOf("max-age") >= 0, desc: "HTTP Strict Transport Security — forces HTTPS connections" },
    "x-content-type-options": { label: "XCTO", check: (v) => v === "nosniff", desc: "Prevents MIME-type sniffing" },
    "x-frame-options": { label: "XFO", check: (v) => v === "DENY" || v === "SAMEORIGIN", desc: "Prevents clickjacking via iframes" },
    "content-security-policy": { label: "CSP", check: () => true, desc: "Content Security Policy — controls allowed resources" },
    "x-xss-protection": { label: "XSS", check: (v) => !!v && v.indexOf("1") >= 0, desc: "Cross-site scripting filter" },
    "referrer-policy": { label: "RefP", check: () => true, desc: "Controls referrer header sent with requests" },
    "permissions-policy": { label: "PermP", check: () => true, desc: "Controls browser features (camera, mic, etc.)" }
  };
  const INFO_DISCLOSURE_HEADERS = {
    "server": { label: "Srv", desc: "Reveals server software and version" },
    "x-powered-by": { label: "XPB", desc: "Reveals technology stack (ASP.NET, PHP, etc.)" },
    "x-aspnet-version": { label: "ASPN", desc: "Reveals ASP.NET version" },
    "x-aspnetmvc-version": { label: "MVC", desc: "Reveals ASP.NET MVC version" },
    "via": { label: "Via", desc: "Reveals proxy/gateway information" },
    "x-cache": { label: "Cache", desc: "Reveals caching infrastructure (HIT/MISS)" },
    "x-backend": { label: "Back", desc: "Reveals backend server details" },
    "x-forwarded-for": { label: "XFF", desc: "May reveal internal IP addresses" },
    "x-forwarded-host": { label: "XFH", desc: "May reveal internal hostnames" },
    "x-forwarded-proto": { label: "XFP", desc: "May reveal protocol information" },
    "x-request-id": { label: "ReqID", desc: "May reveal request tracing infrastructure" },
    "x-trace-id": { label: "Trace", desc: "May reveal tracing infrastructure (e.g., AWS X-Ray)" },
    "x-amzn-requestid": { label: "AWS", desc: "Reveals AWS request tracking" },
    "x-amz-cf-id": { label: "CF", desc: "Reveals CloudFront distribution" },
    "x-generator": { label: "Gen", desc: "Reveals CMS/generator information" },
    "x-drupal-cache": { label: "Drupal", desc: "Reveals Drupal caching" },
    "x-drupal-dynamic-cache": { label: "DDC", desc: "Reveals Drupal dynamic cache" },
    "x-varnish": { label: "Varnish", desc: "Reveals Varnish cache details" },
    "x-served-by": { label: "ServedBy", desc: "Reveals server hostname" }
  };
  const SECRET_PATTERNS = [
    { name: "API Key", regex: /(['"])?(sk[-_]?live|sk[-_]?test|api[-_]?key|apikey)[=:]\s*['"]?([^&"'\s]{8,})/gi },
    { name: "JWT", regex: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
    { name: "Bearer Token", regex: /bearer\s+[a-zA-Z0-9._~+/-]{20,}/gi },
    { name: "AWS Key", regex: /AKIA[0-9A-Z]{16}/g },
    { name: "GitHub Token", regex: /gh[pousr]_[a-zA-Z0-9]{36,}/g },
    { name: "Password", regex: /(password|passwd|pwd)[=:]\s*['"]?([^&"'\s]{4,})/gi },
    { name: "Token", regex: /(['"])?(\w+_)?(token|secret|auth)['"]?\s*[:=]\s*['"]?([^&"';\s]{8,})/gi },
    { name: "OAuth Token", regex: /"(access_token|refresh_token|id_token)"\s*:\s*"[^"]{8,}"/gi }
  ];
  function escapeHtml$2(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function formatSize(bytes) {
    if (!bytes || bytes <= 0) return "";
    if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + "<small> MB</small>";
    if (bytes >= 1024) return Math.round(bytes / 1024) + "<small> KB</small>";
    return bytes + "<small> B</small>";
  }
  function hash(str) {
    return str.toString().toLowerCase().replace(/[^0-9a-z]/g, "");
  }
  function getRedColor(value, foreground) {
    const MIN = 0.3;
    if (value < MIN) return {};
    let v = value;
    if (v > 1) v = 1;
    else v = (v - MIN) / (1 - MIN);
    const h = Math.round(v * 100).toString(16);
    const color = "#ff0000" + (h.length < 2 ? "0" : "") + h;
    return { background: color };
  }
  function hostname(domain) {
    if (!domain || domain.length < 1) return domain;
    const i = domain.indexOf(":");
    if (i >= 0) domain = domain.substring(0, i);
    const s = domain.split(".");
    if (s.length < 2) return domain;
    return s[s.length - 2] + "." + s[s.length - 1];
  }
  function parseUrl(url2) {
    const res = { hostname: "(empty)", pathname: "", search: "", protocol: void 0 };
    if (!url2) return res;
    const j = url2.indexOf("//");
    if (j < 0) {
      res.pathname = url2;
      return res;
    }
    res.protocol = url2.substring(0, j - 1);
    const i = url2.indexOf("/", j + 2);
    if (i < 0) {
      res.hostname = hostname(url2.substring(j + 2)) || "(empty)";
      res.pathname = "/";
      return res;
    }
    res.hostname = hostname(url2.substring(j + 2, i)) || "(empty)";
    const k = url2.indexOf("?", i + 1) >= 0 ? url2.indexOf("?", i + 1) : url2.indexOf("#", i + 1);
    if (k < 0) {
      res.pathname = url2.substring(i);
    } else {
      res.pathname = url2.substring(i, k);
      res.search = url2.substring(k);
    }
    return res;
  }
  function stripTrailingSlash(str) {
    if (str.substr(-1) === "/") return str.substr(0, str.length - 1);
    return str;
  }
  function getStatusHint(status) {
    const statuses = {
      100: "Continue",
      101: "Switching Protocols",
      102: "Processing",
      103: "Early Hints",
      200: "OK",
      201: "Created",
      202: "Accepted",
      203: "Non-Authoritative Information",
      204: "No Content",
      205: "Reset Content",
      206: "Partial Content",
      207: "Multi-Status",
      208: "Already Reported",
      226: "IM Used",
      300: "Multiple Choices",
      301: "Moved Permanently",
      302: "Found",
      303: "See Other",
      304: "Not Modified",
      305: "Use Proxy",
      306: "(Unused)",
      307: "Temporary Redirect",
      308: "Permanent Redirect",
      400: "Bad Request",
      401: "Unauthorized",
      402: "Payment Required",
      403: "Forbidden",
      404: "Not Found",
      405: "Method Not Allowed",
      406: "Not Acceptable",
      407: "Proxy Authentication Required",
      408: "Request Timeout",
      409: "Conflict",
      410: "Gone",
      411: "Length Required",
      412: "Precondition Failed",
      413: "Payload Too Large",
      414: "URI Too Long",
      415: "Unsupported Media Type",
      416: "Range Not Satisfiable",
      417: "Expectation Failed",
      421: "Misdirected Request",
      422: "Unprocessable Entity",
      423: "Locked",
      424: "Failed Dependency",
      426: "Upgrade Required",
      428: "Precondition Required",
      429: "Too Many Requests",
      431: "Request Header Fields Too Large",
      451: "Unavailable For Legal Reasons",
      500: "Internal Server Error",
      501: "Not Implemented",
      502: "Bad Gateway",
      503: "Service Unavailable",
      504: "Gateway Timeout",
      505: "HTTP Version Not Supported",
      506: "Variant Also Negotiates",
      507: "Insufficient Storage",
      508: "Loop Detected",
      510: "Not Extended",
      511: "Network Authentication Required"
    };
    return statuses[status] || "unknown status code";
  }
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
  }
  function downloadJSON(content, filename) {
    const blob = new Blob([content], { type: "text/plain" });
    const url2 = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url2;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url2);
  }
  function headersToStr(h) {
    let res = "";
    for (const item of h) {
      if (item.name && item.value) {
        res += item.name + ": " + item.value + "\r\n";
      }
    }
    return res;
  }
  function strToHeaders(headers2) {
    if (!headers2) return [];
    const res = [];
    const h = headers2.split("\n");
    for (const line of h) {
      if (!line) continue;
      const x = line.split(":");
      if (x.length !== 2 || !x[0] || !x[1]) continue;
      res.push({ name: x[0].trim(), value: x[1].trim() });
    }
    return res;
  }
  function toCurl(data) {
    if (!data || !data.request) return "";
    const r = data.request;
    const parts = ["curl"];
    if (r.method && r.method !== "GET") parts.push("  -X " + r.method);
    if (r.headers) {
      for (const h of r.headers) {
        if (!h.name || !h.value) continue;
        const n = h.name.toLowerCase();
        if (n[0] === ":" || n === "accept-encoding" || n === "content-length" || n === "connection") continue;
        parts.push('  -H "' + h.name + ": " + h.value.replace(/["\\]/g, "\\$&") + '"');
      }
    }
    if (r.postData) {
      const body2 = typeof r.postData.text === "string" ? r.postData.text : JSON.stringify(r.postData);
      parts.push("  --data-binary '" + body2.replace(/'/g, "'\\''") + "'");
      parts.push("  --compressed");
    } else {
      parts.push("  --compressed");
    }
    parts.push('  "' + (r.url || "").replace(/["\\]/g, "\\$&") + '"');
    return parts.join(" \\\n");
  }
  function format(s, mime) {
    if (!s) return s;
    let text;
    if (typeof s === "string") {
      text = s;
      if (mime) {
        const pd = window.pd;
        try {
          if (mime.indexOf("css") >= 0 && pd) text = pd.css(text);
          else if (mime.indexOf("xml") >= 0 && pd) text = pd.xml(text);
          else if (mime.indexOf("json") >= 0 && pd) text = pd.json(text);
          else if (pd) {
            try {
              text = pd.json(text);
            } catch {
              try {
                text = pd.xml(text);
              } catch {
              }
            }
          }
        } catch {
        }
      } else {
        const pd = window.pd;
        if (pd) {
          try {
            text = pd.json(text);
          } catch {
          }
        }
      }
    } else {
      text = JSON.stringify(s, null, 4);
    }
    return text.replace(/\\n/g, "\n").replace(/\\'/g, "'").replace(/\\\//g, "/").replace(/\\"/g, '"').replace(/\\&/g, "&").replace(/\\r/g, "\r").replace(/\\t/g, "	").replace(/\\b/g, "\b").replace(/\\f/g, "\f");
  }
  function addFilterItem(filter, id2, str) {
    const f = $(".filter-" + filter + ":last");
    const ul = $("ul", f);
    const itemId = filter + "-" + id2;
    if (!$("#" + itemId, f).is(":input")) {
      if ($("li", ul).length === 1) {
        ul.append($("<li/>").addClass("divider"));
      }
      ul.append(
        $("<li/>").addClass("checkbox").append(
          $("<label/>").append(
            $("<input/>").attr({
              type: "checkbox",
              name: "filter",
              value: itemId,
              id: itemId,
              checked: true
            })
          ).append(str).append(
            $("<span/>").attr("id", "badge-" + itemId).addClass("badge badge-right").html("0")
          )
        )
      );
    } else {
      const badge = $("#badge-" + itemId, ul);
      const i = parseInt(badge.html() || "0");
      badge.html(String(i + 1));
    }
  }
  let _onDataCallback = null;
  function setOnDataCallback(cb) {
    _onDataCallback = cb;
  }
  function getRequestText(data) {
    let text = "";
    if (!data) return text;
    text += data.request && data.request.method || "";
    text += data.request && data.request.url || "";
    text += data.response && data.response.status || "";
    if (data.request && data.request.headers) {
      for (const h of data.request.headers) {
        text += (h.name || "") + (h.value || "");
      }
    }
    if (data.request && data.request.postData) {
      const pd = data.request.postData;
      text += (typeof pd === "string" ? pd : pd.text || "") + "";
    }
    if (data.response && data.response.headers) {
      for (const h of data.response.headers) {
        text += (h.name || "") + (h.value || "");
      }
    }
    if (data.response && data.response.content) {
      const ct = data.response.content;
      text += ct.text || JSON.stringify(ct) || "";
    }
    return text.toLowerCase();
  }
  function applyFilters() {
    const q = values.searchQuery;
    $(".req").each(function() {
      const $row = $(this);
      let match = true;
      if (q) {
        const id2 = parseInt($row.attr("id") || "");
        const data = values.requests[id2];
        if (data) {
          const text = getRequestText(data);
          if (values.searchRegex) {
            try {
              match = new RegExp(q, "i").test(text);
            } catch {
              match = false;
            }
          } else {
            match = text.indexOf(q) >= 0;
          }
        } else {
          const text = $row.find("td.url, td.method, td.status, td.type").text().toLowerCase();
          if (values.searchRegex) {
            try {
              match = new RegExp(q, "i").test(text);
            } catch {
              match = false;
            }
          } else {
            match = text.indexOf(q) >= 0;
          }
        }
      }
      $row.toggleClass("search-hidden", !match);
    });
    $(".req").removeClass("pinned-hidden");
    if (values.showPinned) {
      $(".req:not(.pinned)").addClass("pinned-hidden");
    }
    if (values.filters.length > 0) {
      values.filters_str = values.filters.join(", ");
      $(".req:not(.search-hidden):not(.pinned-hidden)").show().filter(values.filters_str).hide();
      $(".search-hidden").hide();
    } else {
      values.filters_str = "";
      $(".req:not(.pinned-hidden)").show();
      $(".search-hidden").hide();
    }
    applyPagination();
  }
  function applyPagination() {
    const visible = $(".req:visible").not(".pagination-hidden").toArray();
    const total = visible.length;
    const start = values.page * values.pageSize;
    const end = start + values.pageSize;
    $(".req.pagination-hidden").removeClass("pagination-hidden");
    for (let i = 0; i < visible.length; i++) {
      if (i < start || i >= end) {
        $(visible[i]).addClass("pagination-hidden").hide();
      }
    }
    const totalPages = Math.ceil(total / values.pageSize) || 1;
    if (totalPages > 1) {
      $("#page-controls").show();
      $("#page-info").text("Page " + (values.page + 1) + " of " + totalPages + " (" + total + " requests)");
      $("#page-prev").prop("disabled", values.page === 0);
      $("#page-next").prop("disabled", values.page >= totalPages - 1);
    } else {
      $("#page-controls").hide();
    }
  }
  function doSearch() {
    values.searchQuery = $("#search-requests").val();
    values.searchRegex = $("#search-regex").is(":checked");
    if (!values.searchRegex) values.searchQuery = values.searchQuery.toLowerCase();
    values.page = 0;
    applyFilters();
  }
  function onData(data, id2) {
    if (!id2) {
      setRootId(rootId + 1);
      id2 = rootId;
    }
    const url2 = parseUrl(data.request.url);
    let _url = url2.pathname;
    if (_url && _url.substring(0, 1) === "/" && _url.length > 1) {
      _url = _url.substring(1);
    }
    if ((!_url || _url.length < 2) && url2.search) {
      _url = url2.search;
    }
    values.requests[id2] = data;
    const removeId = id2 - 1e3;
    if (removeId >= 0) {
      delete values.requests[removeId];
      $("#" + removeId).remove();
    }
    let tr = $("#" + id2);
    if (tr.length) tr.remove();
    tr = $("<tr/>").addClass("req req" + id2).attr("id", id2).css({ display: "none" });
    for (const a in rows) {
      tr.append($("<td/>").addClass(a));
    }
    $(".clear", tr).html("&nbsp;");
    $(".pin", tr).html('<span class="pin-star">☆</span>');
    $(".url", tr).html(_url);
    const _domain = hash(url2.hostname);
    addFilterItem("url", _domain, url2.hostname);
    tr.addClass("url-" + _domain);
    let type = "other";
    if (data.response && data.response.headers && data.response.headers.length) {
      const headers2 = data.response.headers;
      for (const h of headers2) {
        if (!h.name) continue;
        if (h.name.toLowerCase() === "content-type") {
          type = h.value;
          if (type) {
            if (type.indexOf("image/") >= 0) type = "image";
            else if (type.indexOf("javascript") >= 0) type = "js";
            else if (type.indexOf("font") >= 0) type = "font";
            else if (type.indexOf("json") >= 0) type = "json";
            else if (type.indexOf("xml") >= 0) type = "xml";
            else if (type.indexOf("css") >= 0) type = "css";
            else if (type.indexOf("html") >= 0) type = "html";
            else if (type.indexOf("text") >= 0) type = "text";
            else type = "other";
          }
        }
      }
    }
    const size = data.response ? data.response.bodySize ?? 0 : 0;
    const sizeInt = Math.round(size);
    $(".type", tr).html(type).addClass(type);
    const _type = hash(type);
    addFilterItem("type", _type, type);
    tr.addClass("type-" + _type);
    $(".size", tr).html(formatSize(size)).css(getRedColor(sizeInt / (1024 * 1024)));
    if (sizeInt >= 1024 * 1024) {
      addFilterItem("size", "1m", "");
      tr.addClass("size-1000");
    } else if (sizeInt >= 100 * 1024) {
      addFilterItem("size", "100", "");
      tr.addClass("size-100");
    } else {
      addFilterItem("size", "0", "");
      tr.addClass("size-0");
    }
    const status = Math.round(data.response ? data.response.status : 0);
    if (status < 0) {
      $(".status", tr).html("pending");
    } else {
      $(".status", tr).html(status ? String(status) : "error").css(getRedColor(status >= 200 && status < 300 ? 0 : 1));
      addFilterItem("status", String(status), status ? String(status) : "error");
      tr.addClass("status-" + status);
    }
    if (status < 0) {
      $(".time", tr).html("pending");
    } else {
      const time = Math.round(data.time || 0);
      $(".time", tr).html(time + "<small> ms</small>").css(getRedColor(time / 2e3));
      if (time >= 1e3) {
        addFilterItem("time", "1000", "");
        tr.addClass("time-1000");
      } else if (time >= 500) {
        addFilterItem("time", "500", "");
        tr.addClass("time-500");
      } else {
        addFilterItem("time", "0", "");
        tr.addClass("time-0");
      }
    }
    const _method = hash(data.request.method);
    addFilterItem("method", _method, data.request.method);
    tr.addClass("method-" + _method);
    $(".method", tr).html(data.request.method).addClass(data.request.method);
    if ($(".req" + id2).is("div")) {
      $(".req" + id2 + ":first").before(tr);
    } else {
      $(".requests").prepend(tr);
    }
    const searchMatch = (() => {
      if (!values.searchQuery) return true;
      const text = getRequestText(data);
      if (values.searchRegex) {
        try {
          return new RegExp(values.searchQuery, "i").test(text);
        } catch {
          return false;
        }
      }
      return text.indexOf(values.searchQuery) >= 0;
    })();
    const filterMatch = values.filters_str && tr.is(values.filters_str);
    if (filterMatch || !searchMatch) {
      tr.hide();
    } else {
      tr.show();
    }
    const editUrl = $("#form-url").val() || "";
    const stripped = stripTrailingSlash(editUrl);
    if (window.selected && $("#form-status").val() === "pending" && $("#form-method").val() === data.request.method && (stripped === stripTrailingSlash(data.request.url) || stripped.indexOf("//") < 0 && stripped === stripTrailingSlash(_url))) {
      setTimeout(() => {
        if (window.editRequest) {
          window.editRequest(tr);
        }
      }, 10);
    }
    if (_onDataCallback) {
      _onDataCallback(data, id2);
    }
    return id2;
  }
  function loadPersistedData() {
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(["persistedRequests", "restHistory", "envs", "envName"], (result) => {
        if (result.persistedRequests) {
          for (const idStr in result.persistedRequests) {
            const origId = parseInt(idStr);
            if (!values.requests[origId]) ;
          }
        }
        if (result.restHistory) values.restHistory = result.restHistory;
        if (result.envs) values.envs = result.envs;
        if (result.envName) values.envName = result.envName;
      });
    }
  }
  function startAutoSave() {
    if (chrome.storage && chrome.storage.local) {
      setInterval(() => {
        const toSave = {};
        let count = 0;
        for (const id2 in values.requests) {
          if (count++ > 200) break;
          toSave[parseInt(id2)] = values.requests[parseInt(id2)];
        }
        chrome.storage.local.set({
          persistedRequests: toSave,
          restHistory: values.restHistory || []
        });
      }, 3e4);
    }
  }
  function getBookmarks() {
    return JSON.parse(localStorage.getItem("spykit-bookmarks") || "[]");
  }
  function saveBookmark(id2, pinned) {
    const bookmarks = getBookmarks();
    const idx = bookmarks.indexOf(id2);
    if (pinned) {
      if (idx < 0) bookmarks.push(id2);
    } else {
      if (idx >= 0) bookmarks.splice(idx, 1);
    }
    localStorage.setItem("spykit-bookmarks", JSON.stringify(bookmarks));
  }
  function getBlockedDomains() {
    return JSON.parse(localStorage.getItem("spykit-blocked") || "[]");
  }
  function addBlockedDomain(domain) {
    const blocks = getBlockedDomains();
    if (blocks.indexOf(domain) < 0) blocks.push(domain);
    localStorage.setItem("spykit-blocked", JSON.stringify(blocks));
  }
  function getMocks() {
    return JSON.parse(localStorage.getItem("spykit-mocks") || "[]");
  }
  function saveMocks(mocks2) {
    localStorage.setItem("spykit-mocks", JSON.stringify(mocks2));
  }
  function getTheme() {
    return localStorage.getItem("spykit-theme");
  }
  function setTheme(theme) {
    localStorage.setItem("spykit-theme", theme);
  }
  function getSnippets() {
    return JSON.parse(localStorage.getItem("spykit-snippets") || "[]");
  }
  function saveSnippets(snippets) {
    localStorage.setItem("spykit-snippets", JSON.stringify(snippets));
  }
  function getWorkspaces() {
    return JSON.parse(localStorage.getItem("spykit-workspaces") || "[]");
  }
  function saveWorkspaces(workspaces) {
    localStorage.setItem("spykit-workspaces", JSON.stringify(workspaces));
  }
  function initTheme() {
    const isLight = getTheme() === "light";
    if (isLight) $("body").addClass("light");
    $("#theme-toggle").text(isLight ? "☾" : "☀");
    $("#theme-toggle").on("click", () => {
      $("body").toggleClass("light");
      const nowLight = $("body").hasClass("light");
      $("#theme-toggle").text(nowLight ? "☾" : "☀");
      setTheme(nowLight ? "light" : "dark");
    });
  }
  function detailsSizeCheck() {
    const $details = $(".details");
    const $scrollUpClass = $(".scroll-up");
    const $formMethodClear = $(".form-method-clear");
    const $formStatusClear = $(".form-status-clear");
    const $formTimeClear = $(".form-time-clear");
    const w = $details.width() || 0;
    $details.css({ paddingRight: w < 20 ? 0 : "" });
    if (w < 220) {
      $formMethodClear.show();
      $formStatusClear.hide();
      $formTimeClear.hide();
    } else if (w < 320) {
      $formMethodClear.hide();
      $formStatusClear.show();
      $formTimeClear.hide();
    } else if (w < 420) {
      $formMethodClear.hide();
      $formStatusClear.hide();
      $formTimeClear.show();
    } else {
      $formMethodClear.hide();
      $formStatusClear.hide();
      $formTimeClear.hide();
    }
    $scrollUpClass.css({ right: splitDir === "vertical" || !dialogOpened ? "20px" : w + 40 + "px" });
  }
  function splitCheck() {
    const $splitArea = $(".split-area");
    if (!$splitArea.height()) return;
    const ratio = Math.round(10 * ($splitArea.width() || 0) / ($splitArea.height() || 1));
    let dir;
    if (ratio > 10) dir = "horizontal";
    else dir = "vertical";
    if (dir === splitDir || ratio === splitRatio) return;
    $splitArea.removeClass("split-" + splitDir);
    if (splitter) {
      splitter.destroy();
      setSplitter(void 0);
    }
    setSplitRatio(ratio);
    setSplitDir(dir);
    $splitArea.addClass("split-" + dir);
    if ($splitArea.is(":visible")) {
      $splitArea.css({ display: dir === "vertical" ? "block" : "flex" });
    }
    const s = Split([".transparent", ".details"], {
      direction: dir,
      sizes: [50, 50],
      gutterSize: 20,
      snapOffset: 50,
      minSize: 0,
      onDragStart: () => $splitArea.addClass("splitting"),
      onDrag: () => detailsSizeCheck(),
      onDragEnd: () => $splitArea.removeClass("splitting")
    });
    setSplitter(s);
  }
  function resolveEnvVars(str) {
    if (!str) return str;
    const env = values.envs[values.envName] || {};
    return str.replace(/\{\{(\w+)\}\}/g, (_m, key) => {
      return env[key] !== void 0 ? env[key] : _m;
    });
  }
  function renderEnvTable() {
    const env = values.envs[values.envName] || {};
    let html = "";
    for (const key in env) {
      html += '<tr><td><input class="env-key" value="' + escapeHtml$2(key) + '"></td><td><input class="env-val" value="' + escapeHtml$2(env[key]) + '"></td><td><button class="env-del">&times;</button></td></tr>';
    }
    $("#env-rows").html(html);
  }
  function saveEnvs() {
    const env = {};
    $("#env-rows tr").each(function() {
      const key = ($(this).find(".env-key").val() || "").trim();
      const val = $(this).find(".env-val").val() || "";
      if (key) env[key] = val;
    });
    values.envs[values.envName] = env;
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ environments: values.envs, activeEnv: values.envName });
    }
  }
  function initEnvUI() {
    $(document).on("click", "#env-close", () => $("#env-panel").hide());
    $(document).on("change", "#env-rows input", saveEnvs);
    $(document).on("click", "#env-add-row", () => {
      $("#env-rows").append('<tr><td><input class="env-key" placeholder="key"></td><td><input class="env-val" placeholder="value"></td><td><button class="env-del">&times;</button></td></tr>');
    });
    $(document).on("click", ".env-del", function() {
      $(this).closest("tr").remove();
      saveEnvs();
    });
    $(document).on("change", "#env-select", function() {
      const val = $(this).val();
      if (val === "__new__") {
        const name = prompt("Environment name:");
        if (name && !values.envs[name]) {
          values.envs[name] = {};
          const opt = $("<option>").val(name).text(name);
          $(this).append(opt).val(name);
        } else if (name && values.envs[name]) {
          $(this).val(name);
        }
      }
      values.envName = $(this).val();
      renderEnvTable();
    });
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "E") {
        e.preventDefault();
        $("#env-panel").toggle();
        const sel = $("#env-select");
        sel.find('option:not([value="__new__"])').remove();
        for (const name in values.envs) {
          sel.append($("<option>").val(name).text(name));
        }
        sel.val(values.envName || "default");
        renderEnvTable();
      }
    });
  }
  function saveToHistory(method2, url2, headers2, body2) {
    values.restHistory = values.restHistory || [];
    values.restHistory.unshift({ method: method2, url: url2, headers: headers2, body: body2, ts: Date.now() });
    if (values.restHistory.length > 20) values.restHistory.pop();
  }
  function renderHistoryList() {
    const hist = values.restHistory || [];
    let html = "";
    for (let i = 0; i < hist.length; i++) {
      html += '<div class="history-item" data-idx="' + i + '"><b>' + hist[i].method + "</b> " + escapeHtml$2(hist[i].url.substring(0, 100)) + ' <span style="color:#888">' + new Date(hist[i].ts).toLocaleTimeString() + "</span></div>";
    }
    $("#history-list").html(html || '<div style="color:#888;padding:8px">No history</div>');
  }
  function initHistoryUI() {
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "H") {
        e.preventDefault();
        const $panel = $("#history-panel");
        $panel.toggle();
        if ($panel.is(":visible")) renderHistoryList();
      }
    });
    $(document).on("click", "#history-close", () => $("#history-panel").hide());
    $(document).on("keyup", "#history-search", function() {
      const q = ($(this).val() || "").toLowerCase();
      $("#history-list .history-item").each(function() {
        $(this).toggle($(this).text().toLowerCase().indexOf(q) >= 0);
      });
    });
    $(document).on("click", ".history-item", function() {
      const idx = parseInt($(this).data("idx"));
      const item = (values.restHistory || [])[idx];
      if (item) {
        $("#form-method").val(item.method);
        $("#form-url").val(item.url);
        autosize.update($("#form-url"));
        $("#form-headers").val(item.headers);
        autosize.update($("#form-headers"));
        $("#form-body").val(item.body);
        autosize.update($("#form-body"));
      }
      $("#history-panel").hide();
    });
  }
  function initRESTClient() {
    $(document).on("click", "#form-send", function() {
      try {
        const method = $("#form-method").val();
        const url = resolveEnvVars($("#form-url").val());
        if (!url || url.trim().length < 1) {
          $("#form-url").focus();
          return;
        }
        const headers = strToHeaders(resolveEnvVars($("#form-headers").val()));
        const validHeaders = {};
        for (const h of headers) {
          if (!h.name) continue;
          const lower = h.name.toLowerCase();
          if (lower === "cookie" || lower === "cookie2") continue;
          let forbidden = false;
          for (const fb of FORBIDEN_HEADERS) {
            if (lower === fb) {
              forbidden = true;
              break;
            }
          }
          if (forbidden) continue;
          for (const fb of FORBIDEN_HEADERS_STARTS_WITH) {
            if (lower.substring(0, fb.length) === fb) {
              forbidden = true;
              break;
            }
          }
          if (forbidden) continue;
          validHeaders[h.name] = h.value;
        }
        const body = $("#form-body").val();
        const id = Math.round(1e6 * Math.random());
        saveToHistory(method, $("#form-url").val(), $("#form-headers").val(), body);
        $("#form-id").val(id);
        $("#form-headers2").val("");
        autosize.update($("#form-headers2"));
        $("#form-body2").val("").show();
        autosize.update($("#form-body2"));
        $("#form-body2-image").html("");
        $("#form-label-body2").attr("for", "form-body2").text("Answer body:");
        const code = [
          "(async function(){",
          "try{",
          "var r=await fetch(" + JSON.stringify(url) + ",{",
          "method:" + JSON.stringify(method) + ",",
          "headers:" + JSON.stringify(validHeaders) + ",",
          "body:" + (body ? JSON.stringify(body) : "undefined"),
          "});",
          "var t=await r.text();",
          "var h=[];",
          "r.headers.forEach(function(v,k){h.push({name:k,value:v});});",
          "chrome.runtime.sendMessage({spyId:" + JSON.stringify(id) + ',url:r.url,res:"ok",status:r.status,headers:h,body:t});',
          "}catch(e){",
          "chrome.runtime.sendMessage({spyId:" + JSON.stringify(id) + ',url:"",res:"fail"});',
          "}",
          "})()"
        ].join("");
        const onResult = function(res, e) {
          if (e && e.isError) {
            $("#form-status").val("error").removeClass("blink").removeClass("ok").addClass("error");
          }
        };
        $("#form-cancel").html("Abort").removeClass("btn-default").addClass("btn-danger");
        $("#form-send").prop("disabled", true).addClass("spin");
        $("#form-status").val("pending").addClass("blink").removeClass("ok").removeClass("error");
        if (chrome.devtools) {
          chrome.devtools.inspectedWindow.eval(code, { useContentScriptContext: contentScriptLoaded }, onResult);
        } else {
          eval(code);
          onResult(null, null);
        }
      } catch (e) {
        console.log(e.message);
      }
    });
    $(document).on("click", "#form-send", function() {
      const state = window.SpyKitState || { rateLimitDelay: 0, rateLastSend: 0 };
      if (state.rateLimitDelay > 0) {
        const now = Date.now();
        const elapsed = now - state.rateLastSend;
        if (elapsed < state.rateLimitDelay) {
          alert("Rate limit: wait " + (state.rateLimitDelay - elapsed) + "ms");
          return false;
        }
        state.rateLastSend = now;
      }
      return true;
    });
  }
  function handleRESTResponse(message) {
    setContentScriptLoaded(true);
    if ($("#form-id").val() === message.spyId) {
      $("#form-cancel").html("Cancel").addClass("btn-default").removeClass("btn-danger");
      $("#form-send").prop("disabled", false).removeClass("spin");
      if (message.res === "fail") {
        $("#form-status").val("error").removeClass("blink").removeClass("ok").addClass("error");
      }
      if (message.url) {
        $("#form-url").val(message.url);
      }
      if (message.status) {
        $("#form-status").val(message.status).removeClass("blink").addClass(message.status >= 200 && message.status < 300 ? "ok" : "error");
        $(".hint").css({ display: message.status !== 200 ? "block" : "none" });
        $("#hint").html(getStatusHint(message.status));
      }
      if (message.headers) {
        $("#form-headers2").val(headersToStr(message.headers));
        autosize.update($("#form-headers2"));
      }
      if (message.body) {
        $("#form-body2").val(format(message.body));
        autosize.update($("#form-body2"));
      }
    }
  }
  function clearBodyHighlights() {
    $(".body-highlight-overlay").remove();
    $(".has-body-highlight").css("color", "").removeClass("has-body-highlight");
  }
  function highlightBodyText($ta, term) {
    const ta = $ta[0];
    if (!ta || !ta.value || !term) return;
    const text = ta.value;
    const lowerText = text.toLowerCase();
    const lowerTerm = term.toLowerCase();
    let html = "";
    let lastIdx = 0;
    let idx = 0;
    while ((idx = lowerText.indexOf(lowerTerm, idx)) >= 0) {
      html += escapeHtml$2(text.substring(lastIdx, idx));
      html += '<mark class="body-highlight">' + escapeHtml$2(text.substring(idx, idx + term.length)) + "</mark>";
      idx += term.length;
      lastIdx = idx;
    }
    html += escapeHtml$2(text.substring(lastIdx));
    const $parent = $ta.parent();
    $parent.css("position", "relative");
    const overlay = $('<div class="body-highlight-overlay"></div>').html(html);
    const taStyles = window.getComputedStyle(ta);
    const pos = $ta.position();
    overlay.css({
      position: "absolute",
      top: pos.top,
      left: pos.left,
      width: $ta.outerWidth(),
      height: $ta.outerHeight(),
      padding: taStyles.padding,
      fontSize: taStyles.fontSize,
      fontFamily: taStyles.fontFamily,
      lineHeight: taStyles.lineHeight,
      whiteSpace: "pre-wrap",
      overflow: "hidden",
      pointerEvents: "none",
      color: "#ccc",
      background: "transparent",
      border: "none",
      wordWrap: "break-word",
      boxSizing: "border-box"
    });
    $parent.append(overlay);
    $ta.css("color", "transparent").addClass("has-body-highlight");
    ta.addEventListener("scroll", function syncScroll() {
      overlay[0].scrollTop = ta.scrollTop;
    });
  }
  function runBodySearch() {
    const term = $("#search-body").val();
    setBodySearchTerm(term);
    setBodySearchMatches([]);
    clearBodyHighlights();
    if (!term) {
      $("#body-search-count").text("");
      return;
    }
    function searchTextarea($ta, label) {
      const ta = $ta[0];
      if (!ta || !ta.value) return;
      const lowerVal = ta.value.toLowerCase();
      const lowerTerm = term.toLowerCase();
      let idx = 0;
      while ((idx = lowerVal.indexOf(lowerTerm, idx)) >= 0) {
        bodySearchMatches.push({ textarea: ta, pos: idx, label });
        idx += term.length;
      }
    }
    searchTextarea($("#form-body"), "Request body");
    searchTextarea($("#form-body2"), "Answer body");
    if (bodySearchMatches.length > 0) {
      highlightBodyText($("#form-body"), term);
      highlightBodyText($("#form-body2"), term);
      setBodySearchCurrent(0);
      highlightBodySearch(0);
      scrollToFirstSearchMatch();
    } else {
      setBodySearchCurrent(-1);
      $("#body-search-count").text("No matches");
    }
  }
  function scrollToFirstSearchMatch() {
    if (bodySearchMatches.length > 0) {
      const m = bodySearchMatches[0];
      const $ta = $(m.textarea);
      const lineHeight = parseFloat($ta.css("line-height")) || 15;
      const lines = m.textarea.value.substring(0, m.pos).split("\n").length;
      $ta.prop("scrollTop", (lines - 1) * lineHeight - 20);
      const $panel = $ta.closest(".form-group");
      if ($panel.length) {
        const panelTop = $panel.position().top + $(".details").scrollTop();
        $(".details").animate({ scrollTop: panelTop - 60 }, 100);
      }
    }
  }
  function highlightBodySearch(index) {
    const match = bodySearchMatches[index];
    if (!match) return;
    const textarea = match.textarea;
    const pos = match.pos;
    $("#body-search-count").text(match.label + " " + (index + 1) + "/" + bodySearchMatches.length);
    textarea.focus();
    textarea.selectionStart = pos;
    textarea.selectionEnd = pos + bodySearchTerm.length;
    textarea.scrollTop = textarea.scrollHeight * (pos / textarea.value.length) - 50;
  }
  function initBodySearchUI() {
    $(document).on("keydown", "#search-body", function(e) {
      if (e.which === 13) {
        e.preventDefault();
        if (bodySearchMatches.length === 0 || $("#search-body").val() !== bodySearchTerm) {
          runBodySearch();
        } else {
          const next = (bodySearchCurrent + 1) % bodySearchMatches.length;
          setBodySearchCurrent(next);
          highlightBodySearch(next);
        }
      }
    });
    $(document).on("click", "#body-search-btn", runBodySearch);
    $(document).on("click", "#form-cancel", clearBodyHighlights);
  }
  let scrollEnabled = false;
  let scrollCount = 0;
  function checkScroll(scrollTop) {
    const count = Math.round(scrollTop / ROW_HEIGHT);
    if (count > 0 && count !== scrollCount) {
      scrollCount = count;
      $(".scroll-up>span").html(String(scrollCount));
    }
    if (scrollEnabled === count > 0) return;
    scrollEnabled = count > 0;
    if (scrollEnabled) {
      $("#scroll-up").show();
    } else {
      $("#scroll-up").hide();
    }
  }
  function detectGraphQL(body2) {
    if (!body2) return false;
    const s = typeof body2 === "string" ? body2 : JSON.stringify(body2);
    return /(query|mutation)\s+\w/.test(s) || s.indexOf('"query"') >= 0 && s.indexOf('"variables"') >= 0;
  }
  function decodeJWT(token) {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    try {
      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));
      const signature = parts[2];
      const issues = [];
      const alg = header.alg || "unknown";
      if (alg === "none") issues.push('CRITICAL: Algorithm is "none" — token can be forged');
      if (alg === "HS256" || alg === "HS384" || alg === "HS512") issues.push("Symmetric algorithm (" + alg + ") — verify secret strength");
      if (!alg || alg === "") issues.push("Missing algorithm");
      const now = Math.floor(Date.now() / 1e3);
      if (payload.exp && payload.exp < now) issues.push("Token EXPIRED (exp: " + new Date(payload.exp * 1e3).toISOString() + ")");
      if (payload.nbf && payload.nbf > now) issues.push("Token not yet valid (nbf: " + new Date(payload.nbf * 1e3).toISOString() + ")");
      return { raw: token, header, payload, signature, alg, valid: issues.length === 0, issues };
    } catch {
      return null;
    }
  }
  function findJWTInText(text) {
    if (!text) return [];
    const pattern = /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g;
    const tokens = [];
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const decoded = decodeJWT(match[0]);
      if (decoded) tokens.push(decoded);
    }
    return tokens;
  }
  function jwtToHtml(tokens) {
    if (!tokens.length) return "";
    let html = '<div class="jwt-inspector" style="margin-top:8px;padding:6px;background:#1a1a2e;border:1px solid #333;border-radius:4px">';
    html += '<div style="font-weight:bold;color:#ffd700;margin-bottom:4px">🔒 JWT Tokens Found</div>';
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      const algColor = t.alg === "none" ? "#ff4444" : t.alg.startsWith("HS") ? "#ffaa00" : "#44cc44";
      const algIcon = t.alg === "none" ? "✗" : t.alg.startsWith("HS") ? "⚠" : "✓";
      html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px">';
      html += '<div style="display:flex;justify-content:space-between;align-items:center">';
      html += '<span style="color:#eee;font-family:monospace;font-size:11px;word-break:break-all;max-width:60%">' + t.raw.substring(0, 60) + "...</span>";
      html += '<span style="color:' + algColor + ';font-weight:bold;font-size:12px">' + algIcon + " " + t.alg + "</span>";
      html += "</div>";
      html += '<details style="margin-top:4px;font-size:11px"><summary style="cursor:pointer;color:#888">Header</summary>';
      html += '<pre style="margin:2px 0;padding:4px;background:#0f0f23;border-radius:3px;color:#7ab7ef;font-size:10px;overflow-x:auto">' + syntaxHighlightJSON(JSON.stringify(t.header, null, 2)) + "</pre></details>";
      html += '<details style="margin-top:4px;font-size:11px"><summary style="cursor:pointer;color:#888">Payload</summary>';
      html += '<pre style="margin:2px 0;padding:4px;background:#0f0f23;border-radius:3px;color:#7ab7ef;font-size:10px;overflow-x:auto">' + syntaxHighlightJSON(JSON.stringify(t.payload, null, 2)) + "</pre></details>";
      if (t.issues.length) {
        html += '<div style="margin-top:4px">';
        for (const issue of t.issues) {
          const color = issue.startsWith("CRITICAL") ? "#ff4444" : "#ffaa00";
          html += '<div style="color:' + color + ';font-size:11px">⚠ ' + issue + "</div>";
        }
        html += "</div>";
      }
      html += "</div>";
    }
    html += "</div>";
    return html;
  }
  function syntaxHighlightJSON(str) {
    if (!str) return "";
    str = str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return str.replace(/"((?:[^"\\]|\\.)*)"\s*:/g, '<span style="color:#ffd700">$1</span>:').replace(/"((?:[^"\\]|\\.)*)"/g, '<span style="color:#44cc44">"$1"</span>').replace(/\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, '<span style="color:#7ab7ef">$1</span>').replace(/\b(true|false|null)\b/gi, '<span style="color:#cc44cc">$1</span>');
  }
  function analyzeAuth(requestHeaders, responseHeaders, url2) {
    const findings = [];
    if (requestHeaders) {
      for (const h of requestHeaders) {
        const lower = h.name.toLowerCase();
        if (lower === "authorization") {
          if (h.value.startsWith("Bearer ")) {
            const token = h.value.substring(7);
            findings.push({
              type: "bearer",
              location: "Authorization header",
              detail: "Bearer token present (" + token.substring(0, 20) + "...)",
              severity: token.length > 100 ? "high" : "medium",
              recommendation: "Ensure Bearer tokens are short-lived and transmitted over HTTPS only"
            });
          } else if (h.value.startsWith("Basic ")) {
            findings.push({
              type: "basic",
              location: "Authorization header",
              detail: "Basic auth credentials present",
              severity: "high",
              recommendation: "Use token-based auth (OAuth2/Bearer) instead of Basic auth. Basic auth sends credentials in plaintext (Base64)."
            });
          }
        }
      }
    }
    if (responseHeaders) {
      for (const h of responseHeaders) {
        if (h.name.toLowerCase() === "set-cookie") {
          const lower = h.value.toLowerCase();
          const name = h.value.split("=")[0];
          if (!lower.includes("secure")) {
            findings.push({
              type: "cookie",
              location: "Set-Cookie: " + name,
              detail: 'Cookie "' + name + '" missing Secure flag',
              severity: "high",
              recommendation: "Add the Secure flag to prevent cookie transmission over HTTP"
            });
          }
          if (!lower.includes("httponly")) {
            findings.push({
              type: "cookie",
              location: "Set-Cookie: " + name,
              detail: 'Cookie "' + name + '" missing HttpOnly flag',
              severity: "medium",
              recommendation: "Add the HttpOnly flag to prevent XSS-based cookie theft"
            });
          }
          const samesiteMatch = lower.match(/samesite=(lax|strict|none)/);
          if (!samesiteMatch) {
            findings.push({
              type: "cookie",
              location: "Set-Cookie: " + name,
              detail: 'Cookie "' + name + '" missing SameSite attribute',
              severity: "low",
              recommendation: "Add SameSite=Lax or SameSite=Strict for CSRF protection"
            });
          } else if (samesiteMatch[1] === "none") {
            findings.push({
              type: "cookie",
              location: "Set-Cookie: " + name,
              detail: 'Cookie "' + name + '" has SameSite=None (no CSRF protection)',
              severity: "medium",
              recommendation: "Use SameSite=Lax or SameSite=Strict unless cross-site usage is required"
            });
          }
        }
      }
    }
    if (url2) {
      const apikeyMatch = url2.match(/[?&](api[_-]?key|token|secret)=([^&]+)/i);
      if (apikeyMatch) {
        findings.push({
          type: "apikey",
          location: "URL query parameter",
          detail: "API key/token exposed in URL: " + apikeyMatch[1] + "=" + apikeyMatch[2].substring(0, 8) + "...",
          severity: "critical",
          recommendation: "API keys should be sent in headers (Authorization), never in URL query strings"
        });
      }
    }
    return findings;
  }
  function authFindingsToHtml(findings) {
    if (!findings.length) return "";
    let html = '<div class="auth-analysis" style="margin-top:6px;padding:6px;background:#1a1a2e;border:1px solid #ff8800;border-radius:4px">';
    html += '<div style="font-weight:bold;color:#ff8800;margin-bottom:4px">🔑 Auth Analysis (' + findings.length + " issues)</div>";
    for (const f of findings) {
      const color = f.severity === "critical" ? "#ff4444" : f.severity === "high" ? "#ff8800" : f.severity === "medium" ? "#ffaa00" : "#888";
      html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px;font-size:11px">';
      html += '<span style="color:' + color + ';font-weight:bold">[' + f.severity.toUpperCase() + "] " + f.type.toUpperCase() + "</span>";
      html += '<div style="color:#eee;margin-top:2px">' + f.detail + "</div>";
      html += '<div style="color:#aaa;margin-top:2px;font-size:10px">ℹ️ ' + f.recommendation + "</div>";
      html += "</div>";
    }
    html += "</div>";
    return html;
  }
  const SQLI_PAYLOADS = [
    "' OR '1'='1",
    "' UNION SELECT NULL--",
    "'; DROP TABLE users--",
    '" OR "1"="1',
    "' OR 1=1--",
    "1' AND '1'='1"
  ];
  const XSS_PAYLOADS = [
    "<script>alert(1)<\/script>",
    "<img src=x onerror=alert(1)>",
    '"><script>alert(1)<\/script>',
    "javascript:alert(1)",
    "<svg onload=alert(1)>"
  ];
  const PATH_TRAVERSAL_PAYLOADS$1 = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd",
    "....//....//....//etc/passwd"
  ];
  function scanForReflections(url2, body2, responseBody) {
    const results = [];
    if (!responseBody) return results;
    const params = extractParams(url2, body2);
    for (const param of params) {
      for (const payload of SQLI_PAYLOADS) {
        const responseLower = responseBody.toLowerCase();
        const payloadLower = payload.toLowerCase();
        if (responseLower.includes(payloadLower) || responseLower.includes(encodeURIComponent(payload).toLowerCase())) {
          results.push({
            type: "sqli",
            parameter: param.name,
            payload,
            reflected: true,
            evidence: responseBody.substring(
              Math.max(0, responseBody.toLowerCase().indexOf(payloadLower)),
              Math.min(responseBody.length, responseBody.toLowerCase().indexOf(payloadLower) + 80)
            )
          });
        }
      }
      for (const payload of XSS_PAYLOADS) {
        if (responseBody.includes(payload) || responseBody.includes(encodeURIComponent(payload))) {
          results.push({
            type: "xss",
            parameter: param.name,
            payload,
            reflected: true,
            evidence: responseBody.substring(
              Math.max(0, responseBody.indexOf(payload)),
              Math.min(responseBody.length, responseBody.indexOf(payload) + 80)
            )
          });
        }
      }
      for (const payload of PATH_TRAVERSAL_PAYLOADS$1) {
        if (responseBody.includes(payload)) {
          results.push({
            type: "path-traversal",
            parameter: param.name,
            payload,
            reflected: true,
            evidence: responseBody.substring(
              Math.max(0, responseBody.indexOf(payload)),
              Math.min(responseBody.length, responseBody.indexOf(payload) + 80)
            )
          });
        }
      }
    }
    return results;
  }
  function extractParams(url2, body2) {
    const params = [];
    const qIdx = url2.indexOf("?");
    if (qIdx >= 0) {
      const qs = url2.substring(qIdx + 1);
      for (const part of qs.split("&")) {
        const eq = part.indexOf("=");
        if (eq >= 0) {
          params.push({ name: decodeURIComponent(part.substring(0, eq)), value: decodeURIComponent(part.substring(eq + 1)) });
        } else {
          params.push({ name: decodeURIComponent(part), value: "" });
        }
      }
    }
    if (body2) {
      try {
        const parsed = JSON.parse(body2);
        for (const key of Object.keys(parsed)) {
          if (typeof parsed[key] === "string") {
            params.push({ name: key, value: parsed[key] });
          }
        }
      } catch {
        for (const part of body2.split("&")) {
          const eq = part.indexOf("=");
          if (eq >= 0) {
            params.push({ name: decodeURIComponent(part.substring(0, eq)), value: decodeURIComponent(part.substring(eq + 1)) });
          }
        }
      }
    }
    return params;
  }
  function scanResultsToHtml(results) {
    if (!results.length) return "";
    let html = '<div class="scan-results" style="margin-top:6px;padding:6px;background:#1a1a2e;border:1px solid #ff4444;border-radius:4px">';
    html += '<div style="font-weight:bold;color:#ff4444;margin-bottom:4px">⚠ Reflection Scanner Results (' + results.length + ")</div>";
    for (const r of results) {
      const typeColor = r.type === "sqli" ? "#ff4444" : r.type === "xss" ? "#ff8800" : "#ffaa00";
      html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px;font-size:11px">';
      html += '<span style="color:' + typeColor + ';font-weight:bold">[' + r.type.toUpperCase() + "]</span> ";
      html += '<span style="color:#eee">Param: <b>' + r.parameter + "</b></span>";
      html += '<div style="color:#888;margin-top:2px;word-break:break-all">Payload: ' + r.payload + "</div>";
      if (r.evidence) {
        html += '<div style="color:#aaa;margin-top:2px;font-family:monospace;font-size:10px;word-break:break-all">Evidence: ' + r.evidence.substring(0, 100) + "</div>";
      }
      html += "</div>";
    }
    html += "</div>";
    return html;
  }
  function checkSecurityHeaders(headers2) {
    const found = {};
    const foundDisclosure = {};
    if (headers2) {
      for (const h of headers2) {
        const name = h.name ? h.name.toLowerCase() : "";
        if (SECURITY_HEADERS[name]) {
          found[name] = h.value;
        }
        if (INFO_DISCLOSURE_HEADERS[name]) {
          foundDisclosure[name] = h.value;
        }
      }
    }
    let html = "";
    for (const key in SECURITY_HEADERS) {
      const h = SECURITY_HEADERS[key];
      if (found[key] !== void 0) {
        const ok = h.check(found[key]);
        html += '<span class="sec-item ' + (ok ? "sec-ok" : "sec-warn") + '" title="' + h.desc + "\n" + key + ": " + escapeHtml$2(found[key]) + '">' + (ok ? "✓" : "?") + h.label + "</span>";
      } else {
        html += '<span class="sec-item sec-missing" title="' + h.desc + "\n" + key + ' is missing">✗' + h.label + "</span>";
      }
    }
    for (const key in INFO_DISCLOSURE_HEADERS) {
      if (foundDisclosure[key] !== void 0) {
        const h = INFO_DISCLOSURE_HEADERS[key];
        html += '<span class="sec-item sec-warn" title="' + h.desc + "\n" + key + ": " + escapeHtml$2(foundDisclosure[key]) + '">⚠ ' + h.label + "</span>";
      }
    }
    return html;
  }
  function checkCORS(reqHeaders, resHeaders) {
    let origin = "", acao = "", acac = "";
    if (reqHeaders) {
      for (const h of reqHeaders) {
        if (h.name && h.name.toLowerCase() === "origin") origin = h.value;
      }
    }
    if (resHeaders) {
      for (const h of resHeaders) {
        if (!h.name) continue;
        const n = h.name.toLowerCase();
        if (n === "access-control-allow-origin") acao = h.value;
        else if (n === "access-control-allow-credentials") acac = h.value;
        else if (n === "access-control-allow-methods") h.value;
        else if (n === "access-control-allow-headers") h.value;
      }
    }
    if (!origin) return { status: "", html: "" };
    const issues = [];
    if (acao === "*") issues.push("ACAO: wildcard");
    if (acao === "*" && acac === "true") issues.push("CRITICAL: wildcard + credentials");
    if (!acao) issues.push("Missing ACAO");
    const cls = issues.length === 0 ? "cors-ok" : issues.length <= 1 ? "cors-warn" : "cors-bad";
    const icon = issues.length === 0 ? "✓" : "⚠";
    const title = issues.length ? issues.join("; ") : "CORS OK";
    return { status: cls, html: '<span class="' + cls + '" title="' + escapeHtml$2(title) + '">' + icon + " CORS</span>", issues };
  }
  function parseCookies(headers2) {
    const cookies = [];
    if (!headers2) return cookies;
    for (const h of headers2) {
      const n = h.name ? h.name.toLowerCase() : "";
      if (n === "set-cookie") {
        const parts = h.value.split(";");
        const c = { name: "", value: "", domain: "", path: "", expires: "", httponly: false, secure: false, samesite: "" };
        for (let j = 0; j < parts.length; j++) {
          const p = parts[j].trim();
          const kv = p.split("=");
          const key = kv[0].trim().toLowerCase();
          const val = kv.slice(1).join("=");
          if (j === 0) {
            c.name = kv[0].trim();
            c.value = val;
          } else if (key === "domain") c.domain = val;
          else if (key === "path") c.path = val;
          else if (key === "expires") c.expires = val;
          else if (key === "max-age") c.expires = "max-age=" + val;
          else if (key === "httponly") c.httponly = true;
          else if (key === "secure") c.secure = true;
          else if (key === "samesite") c.samesite = val.toLowerCase();
        }
        cookies.push(c);
      }
    }
    return cookies;
  }
  function cookieHtml(cookies) {
    if (!cookies.length) return "";
    let html = '<table><tr><th>Name</th><th>Value</th><th>Domain</th><th title="HttpOnly — inaccessible to JavaScript">HttpOnly</th><th title="Secure — only sent over HTTPS">Secure</th><th title="SameSite — controls cross-site behavior">SameSite</th></tr>';
    for (const c of cookies) {
      const h = c.httponly ? '<span class="flag-ok">&#x2713;</span>' : '<span class="flag-missing">&#x2717;</span>';
      const s = c.secure ? '<span class="flag-ok">&#x2713;</span>' : '<span class="flag-missing">&#x2717;</span>';
      const ss = c.samesite ? c.samesite === "lax" || c.samesite === "strict" ? '<span class="flag-ok">' + c.samesite + "</span>" : '<span class="flag-info">' + c.samesite + "</span>" : '<span class="flag-missing">&#x2717;</span>';
      html += "<tr><td>" + escapeHtml$2(c.name) + "</td><td>" + escapeHtml$2(c.value.substring(0, 30)) + "</td><td>" + escapeHtml$2(c.domain) + "</td><td>" + h + "</td><td>" + s + "</td><td>" + ss + "</td></tr>";
    }
    return html + "</table>";
  }
  function scanForSecrets(text) {
    if (!text) return [];
    const found = [];
    for (const p of SECRET_PATTERNS) {
      p.regex.lastIndex = 0;
      let m;
      while ((m = p.regex.exec(text)) !== null) {
        found.push({ type: p.name, match: m[0].substring(0, 40) });
      }
    }
    return found;
  }
  function requestToPostmanItem(data) {
    if (!data || !data.request) return null;
    const r = data.request;
    const url2 = parseUrl(r.url || "");
    const item = {
      name: (r.method || "GET") + " " + (url2.pathname || "/"),
      request: {
        method: r.method || "GET",
        header: [],
        url: { raw: r.url || "" }
      },
      response: []
    };
    if (r.headers) {
      for (const h of r.headers) {
        if (h.name && h.value) {
          item.request.header.push({ key: h.name, value: h.value });
        }
      }
    }
    if (url2.protocol) item.request.url.protocol = url2.protocol.replace(":", "");
    try {
      var fullHost = new URL(r.url).hostname;
      if (fullHost) item.request.url.host = fullHost.split(".");
    } catch (e) {
      if (url2.hostname) item.request.url.host = url2.hostname.split(".");
    }
    if (url2.pathname) item.request.url.path = url2.pathname.replace(/^\//, "").split("/");
    if (url2.search) {
      const qs = url2.search.replace(/^\?/, "").split("&");
      item.request.url.query = [];
      for (const q of qs) {
        const parts = q.split("=");
        if (parts[0]) item.request.url.query.push({ key: parts[0], value: parts.slice(1).join("=") || "" });
      }
    }
    if (r.postData) {
      const bodyText = typeof r.postData === "string" ? r.postData : r.postData.text || JSON.stringify(r.postData);
      item.request.body = { mode: "raw", raw: bodyText };
      const mimeType = typeof r.postData === "object" ? r.postData.mimeType : "";
      if (mimeType && mimeType.indexOf("json") >= 0) {
        item.request.body.options = { raw: { language: "json" } };
      }
    }
    if (data.response) {
      const resp = { name: "Response " + (data.response.status || ""), status: "", code: 0, header: [], body: "" };
      resp.status = getStatusHint(data.response.status);
      resp.code = data.response.status || 0;
      if (data.response.headers) {
        for (const h of data.response.headers) {
          if (h.name && h.value) resp.header.push({ key: h.name, value: h.value });
        }
      }
      resp.body = data.response.content && data.response.content.text || "";
      item.response.push(resp);
    }
    return item;
  }
  function genSnippetsText(data, lang) {
    if (!data || !data.request) return "";
    const r = data.request;
    if (lang === "curl") return toCurl(data);
    if (lang === "python") {
      let s = "import requests\n\n";
      s += "url = " + JSON.stringify(r.url) + "\n";
      const h = {};
      if (r.headers) for (const item of r.headers) {
        if (item.name) h[item.name] = item.value;
      }
      s += "headers = " + JSON.stringify(h, null, 2) + "\n";
      if (r.postData) {
        const body2 = typeof r.postData === "string" ? r.postData : r.postData.text || "";
        s += "data = " + JSON.stringify(body2) + "\n";
        s += "r = requests." + (r.method || "GET").toLowerCase() + "(url, headers=headers, data=data)\n";
      } else {
        s += "r = requests." + (r.method || "GET").toLowerCase() + "(url, headers=headers)\n";
      }
      s += "print(r.text)";
      return s;
    }
    if (lang === "fetch") {
      const opts = { method: r.method || "GET" };
      if (r.headers) {
        opts.headers = {};
        for (const item of r.headers) {
          if (item.name) opts.headers[item.name] = item.value;
        }
      }
      if (r.postData) {
        opts.body = typeof r.postData === "string" ? r.postData : r.postData.text || "";
      }
      return "fetch(" + JSON.stringify(r.url) + ", " + JSON.stringify(opts, null, 2) + ")\n  .then(r => r.text())\n  .then(console.log)\n  .catch(console.error);";
    }
    if (lang === "go") {
      let s = 'package main\n\nimport (\n	"fmt"\n	"io/ioutil"\n	"net/http"\n	"strings"\n)\n\nfunc main() {\n';
      s += "	url := " + JSON.stringify(r.url) + "\n";
      s += '	method := "' + (r.method || "GET") + '"\n';
      if (r.postData) {
        const body2 = typeof r.postData === "string" ? r.postData : r.postData.text || "";
        s += "	payload := strings.NewReader(" + JSON.stringify(body2) + ")\n";
        s += "	client := &http.Client{}\n	req, err := http.NewRequest(method, url, payload)\n";
      } else {
        s += "	client := &http.Client{}\n	req, err := http.NewRequest(method, url, nil)\n";
      }
      s += "	if err != nil { fmt.Println(err); return }\n";
      if (r.headers) for (const item of r.headers) {
        if (item.name && item.value) s += "	req.Header.Set(" + JSON.stringify(item.name) + ", " + JSON.stringify(item.value) + ")\n";
      }
      s += "	res, err := client.Do(req)\n	if err != nil { fmt.Println(err); return }\n	defer res.Body.Close()\n	body, _ := ioutil.ReadAll(res.Body)\n	fmt.Println(string(body))\n}";
      return s;
    }
    if (lang === "rust") {
      let s = "use reqwest;\n\n#[tokio::main]\nasync fn main() -> Result<(), reqwest::Error> {\n";
      s += "	let client = reqwest::Client::new();\n";
      if (r.postData) {
        const body2 = typeof r.postData === "string" ? r.postData : r.postData.text || "";
        s += "	let body = " + JSON.stringify(body2) + ";\n";
      }
      s += "	let res = client\n";
      s += "		." + (r.method || "GET").toLowerCase() + "(" + JSON.stringify(r.url) + ")\n";
      if (r.headers) for (const item of r.headers) {
        if (item.name && item.value) s += "		.header(" + JSON.stringify(item.name) + ", " + JSON.stringify(item.value) + ")\n";
      }
      if (r.postData) s += "		.body(body)\n";
      s += '		.send().await?;\n	let text = res.text().await?;\n	println!("{}", text);\n	Ok(())\n}';
      return s;
    }
    if (lang === "php") {
      let s = "<?php\n\n$url = " + JSON.stringify(r.url) + ";\n";
      if (r.postData) {
        const body2 = typeof r.postData === "string" ? r.postData : r.postData.text || "";
        s += "$data = " + JSON.stringify(body2) + ";\n";
      }
      s += "$ch = curl_init($url);\n";
      s += "curl_setopt($ch, CURLOPT_CUSTOMREQUEST, " + JSON.stringify(r.method || "GET") + ");\n";
      if (r.headers) {
        const hArr = [];
        for (const item of r.headers) {
          if (item.name && item.value) hArr.push(item.name + ": " + item.value);
        }
        if (hArr.length) s += "curl_setopt($ch, CURLOPT_HTTPHEADER, " + JSON.stringify(hArr) + ");\n";
      }
      if (r.postData) s += "curl_setopt($ch, CURLOPT_POSTFIELDS, $data);\n";
      s += "curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);\n$response = curl_exec($ch);\ncurl_close($ch);\necho $response;\n";
      return s;
    }
    return "";
  }
  function exportAsCSV(items) {
    let csv = "Method,URL,Status,Type,Size,Time\n";
    for (const d of items) {
      if (!d.request) continue;
      const method2 = d.request.method || "GET";
      const url2 = (d.request.url || "").replace(/"/g, '""');
      const status = d.response ? d.response.status : "";
      const type = d.response && d.response.content && d.response.content.mimeType || "";
      const size = d.response && d.response.content ? d.response.content.size : "";
      const time = d.time ? Math.round(d.time) : "";
      csv += '"' + method2 + '","' + url2 + '",' + status + ',"' + type + '",' + size + "," + time + "\n";
    }
    downloadJSON(csv, "spykit.csv");
  }
  function exportAsHAR(items) {
    const log = { log: { version: "1.2", creator: { name: "SpyKit", version: "2.0" }, entries: [] } };
    for (const d of items) {
      if (!d.request) continue;
      log.log.entries.push({
        startedDateTime: d.startedDateTime || (/* @__PURE__ */ new Date()).toISOString(),
        time: d.time || 0,
        request: {
          method: d.request.method || "GET",
          url: d.request.url || "",
          httpVersion: d.request.httpVersion || "http/2.0",
          headers: d.request.headers || [],
          queryString: d.request.queryString || [],
          cookies: d.request.cookies || [],
          headersSize: d.request.headersSize || -1,
          bodySize: d.request.bodySize || -1
        },
        response: {
          status: d.response ? d.response.status : 0,
          statusText: d.response ? d.response.statusText || "" : "",
          httpVersion: d.response ? d.response.httpVersion || "http/2.0" : "http/2.0",
          headers: d.response ? d.response.headers || [] : [],
          content: d.response && d.response.content ? {
            size: d.response.content.size || 0,
            mimeType: d.response.content.mimeType || "",
            text: d.response.content.text || ""
          } : { size: 0, mimeType: "", text: "" },
          cookies: d.response ? d.response.cookies || [] : [],
          headersSize: d.response ? d.response.headersSize || -1 : -1,
          bodySize: d.response ? d.response.bodySize || -1 : -1,
          redirectURL: d.response ? d.response.redirectURL || "" : ""
        },
        cache: {},
        timings: d.timings || {}
      });
    }
    const output = JSON.stringify(log, null, 2);
    downloadJSON(output, "spykit.har");
  }
  function exportAsHTTP(items) {
    let output = "";
    for (const d of items) {
      if (!d.request) continue;
      const r = d.request;
      output += (r.method || "GET") + " " + r.url + " HTTP/1.1\n";
      if (r.headers) for (const h of r.headers) {
        if (h.name && h.value) output += h.name + ": " + h.value + "\n";
      }
      if (r.postData) {
        output += "\n" + (typeof r.postData === "string" ? r.postData : r.postData.text || "");
      }
      output += "\n###\n\n";
    }
    return output;
  }
  function exportAsFormat(format2) {
    const items = [];
    $(".req:visible").each(function() {
      const id2 = parseInt($(this).attr("id") || "");
      if (values.requests[id2]) items.push(values.requests[id2]);
    });
    if (!items.length) {
      $("#export-dropdown").hide();
      return;
    }
    let output = "";
    let filename = "spykit.txt";
    if (format2 === "har") {
      exportAsHAR(items);
      return;
    } else if (format2 === "csv") {
      exportAsCSV(items);
      return;
    } else if (format2 === "postman") {
      const collection = {
        info: { name: "SpyKit Export", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item: []
      };
      for (const item of items) {
        const pi = requestToPostmanItem(item);
        if (pi) collection.item.push(pi);
      }
      output = JSON.stringify(collection, null, 2);
      filename = "spykit-collection.json";
    } else if (format2 === "python") {
      for (const d of items) {
        output += genSnippetsText(d, "python") + "\n\n";
      }
      filename = "spykit.py";
    } else if (format2 === "fetch") {
      for (const d of items) {
        output += genSnippetsText(d, "fetch") + "\n\n";
      }
      filename = "spykit.js";
    } else if (format2 === "http") {
      output = exportAsHTTP(items);
      filename = "spykit.http";
    }
    if (output) downloadJSON(output, filename);
    $("#export-dropdown").hide();
  }
  const SQLI_FUZZ_PAYLOADS = [
    "'",
    "''",
    "1'",
    "' OR '1'='1",
    "' OR 1=1--",
    '" OR "1"="1',
    "' UNION SELECT NULL--",
    "'; DROP TABLE users--",
    "1 AND 1=1",
    "1 AND 1=2",
    "' AND '1'='1",
    "' AND '1'='2",
    "admin'--",
    "admin' #"
  ];
  const XSS_FUZZ_PAYLOADS = [
    "<script>alert(1)<\/script>",
    "<img src=x onerror=alert(1)>",
    '"><script>alert(1)<\/script>',
    "<svg onload=alert(1)>",
    "javascript:alert(1)",
    "<body onload=alert(1)>",
    '"><img src=x onerror=alert(1)>',
    "';alert(1);//"
  ];
  const PATH_TRAVERSAL_PAYLOADS = [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\win.ini",
    "%2e%2e%2f%2e%2e%2fetc/passwd",
    "....//....//....//etc/passwd",
    "..%252f..%252f..%252fetc/passwd"
  ];
  const DIRSEARCH_PAYLOADS = [
    "admin",
    "login",
    "signin",
    "signup",
    "register",
    "user",
    "users",
    "wp-admin",
    "wp-content",
    "wp-includes",
    "wp-login",
    "wp-json",
    "wordpress",
    "joomla",
    "drupal",
    "magento",
    "laravel",
    "symfony",
    "api",
    "api/v1",
    "api/v2",
    "v1",
    "v2",
    "rest",
    "graphql",
    "assets",
    "static",
    "dist",
    "build",
    "public",
    "uploads",
    "files",
    "css",
    "js",
    "javascript",
    "scripts",
    "images",
    "img",
    "icons",
    "fonts",
    "backup",
    "backups",
    "old",
    "temp",
    "tmp",
    "test",
    "tests",
    "dev",
    "config",
    "configuration",
    "settings",
    "env",
    ".env",
    "env.php",
    ".git",
    ".git/config",
    ".gitignore",
    ".svn",
    ".htaccess",
    ".htpasswd",
    "sitemap.xml",
    "robots.txt",
    "favicon.ico",
    "crossdomain.xml",
    "index.php",
    "index.html",
    "index",
    "default",
    "home",
    "main",
    "about",
    "contact",
    "help",
    "support",
    "faq",
    "terms",
    "privacy",
    "search",
    "query",
    "results",
    "category",
    "categories",
    "tag",
    "tags",
    "product",
    "products",
    "item",
    "items",
    "shop",
    "store",
    "cart",
    "checkout",
    "payment",
    "orders",
    "order",
    "invoice",
    "account",
    "profile",
    "dashboard",
    "panel",
    "control",
    "manage",
    "management",
    "download",
    "downloads",
    "upload",
    "import",
    "export",
    "report",
    "reports",
    "ajax",
    "includes",
    "inc",
    "lib",
    "libs",
    "library",
    "vendor",
    "src",
    "source",
    "node_modules",
    "bower_components",
    "composer.json",
    "package.json",
    "Dockerfile",
    "docker-compose.yml",
    "Makefile",
    "README",
    "README.md",
    "CHANGELOG",
    "LICENSE",
    "COPYING",
    "error",
    "errors",
    "error_log",
    "debug",
    "log",
    "logs",
    "access.log",
    "server-status",
    "server-info",
    "phpinfo",
    "info",
    "info.php",
    "ws",
    "wss",
    "websocket",
    "socket",
    "sockjs",
    "sockjs-node",
    "proxy",
    "proxy.pac",
    "cgi-bin",
    "cgi",
    "cgi-bin/php",
    "pma",
    "phpmyadmin",
    "adminer",
    "mysql",
    "sql",
    "phpPgAdmin",
    "swagger",
    "swagger-ui",
    "api-docs",
    "docs",
    "documentation",
    "health",
    "healthz",
    "readyz",
    "metrics",
    "status",
    "ping",
    "pong"
  ];
  const SUBDOMAIN_PAYLOADS = [
    "www",
    "mail",
    "webmail",
    "admin",
    "adm",
    "cpanel",
    "whm",
    "cpcalendars",
    "cpcontacts",
    "webdisk",
    "autodiscover",
    "autoconfig",
    "api",
    "api-dev",
    "api-staging",
    "dev-api",
    "dev",
    "development",
    "staging",
    "stage",
    "test",
    "testing",
    "qa",
    "uat",
    "app",
    "app-dev",
    "app-staging",
    "app-test",
    "portal",
    "dashboard",
    "blog",
    "wiki",
    "docs",
    "documentation",
    "help",
    "support",
    "status",
    "cdn",
    "static",
    "assets",
    "media",
    "images",
    "img",
    "css",
    "js",
    "fonts",
    "upload",
    "uploads",
    "files",
    "download",
    "downloads",
    "shop",
    "store",
    "cart",
    "checkout",
    "payment",
    "orders",
    "order",
    "billing",
    "invoice",
    "account",
    "accounts",
    "profile",
    "profiles",
    "login",
    "signin",
    "signup",
    "register",
    "auth",
    "sso",
    "oauth",
    "oauth2",
    "idp",
    "identity",
    "user",
    "users",
    "member",
    "members",
    "customer",
    "customers",
    "admin-console",
    "console",
    "manager",
    "management",
    "manage",
    "monitor",
    "monitoring",
    "metrics",
    "grafana",
    "prometheus",
    "kibana",
    "jenkins",
    "gitlab",
    "git",
    "github",
    "bitbucket",
    "jira",
    "confluence",
    "sonar",
    "sonarqube",
    "nexus",
    "artifactory",
    "docker",
    "registry",
    "maven",
    "npm",
    "pypi",
    "composer",
    "packagist",
    "vpn",
    "vpn-admin",
    "remote",
    "remote-desktop",
    "rdp",
    "ssh",
    "proxy",
    "proxy-admin",
    "squid",
    "nginx",
    "apache",
    "tomcat",
    "mysql",
    "mariadb",
    "postgres",
    "postgresql",
    "redis",
    "memcached",
    "mongodb",
    "couchdb",
    "cassandra",
    "elastic",
    "elasticsearch",
    "rabbitmq",
    "kafka",
    "zookeeper",
    "ns1",
    "ns2",
    "ns3",
    "dns",
    "mail2",
    "mail3",
    "smtp",
    "pop3",
    "imap",
    "smtp-relay",
    "web",
    "web1",
    "web2",
    "web3",
    "app1",
    "app2",
    "node1",
    "node2",
    "server",
    "server1",
    "server2",
    "db",
    "db1",
    "db2",
    "database",
    "backup",
    "backup1",
    "backup2",
    "storage",
    "nas",
    "san",
    "news",
    "newsletter",
    "forum",
    "community",
    "chat",
    "irc",
    "calendar",
    "cal",
    "meet",
    "meeting",
    "zoom",
    "teams",
    "slack",
    "phone",
    "voip",
    "sip",
    "pbx",
    "asterisk",
    "3cx",
    "tracking",
    "analytics",
    "stats",
    "statistics",
    "piwik",
    "matomo",
    "recruitment",
    "jobs",
    "career",
    "careers",
    "hr",
    "employee",
    "intranet",
    "internal",
    "corp",
    "corporate",
    "office",
    "office365",
    "sharepoint",
    "exchange",
    "lync",
    "skype",
    "teams",
    "lms",
    "moodle",
    "blackboard",
    "canvas",
    "sakai",
    "wordpress",
    "wp",
    "wp-admin",
    "wp-content",
    "wp-json",
    "drupal",
    "joomla",
    "magento",
    "shopify",
    "woocommerce",
    "prestashop",
    "opencart",
    "oscommerce",
    "zencart",
    "hub",
    "connect",
    "partner",
    "partners",
    "vendor",
    "vendors",
    "reseller",
    "affiliate",
    "affiliates",
    "referral",
    "ticket",
    "tickets",
    "support-ticket",
    "helpdesk",
    "suggest",
    "feedback",
    "survey",
    "poll",
    "vote",
    "webmail2",
    "roundcube",
    "squirrelmail",
    "rainloop",
    "phpmyadmin",
    "pma",
    "adminer",
    "phpPgAdmin",
    "phppgadmin",
    "mailcow",
    "iredmail",
    "zimbra",
    "zimbra-admin",
    "host",
    "hosting",
    "hostmaster",
    "postmaster",
    "abuse",
    "noc",
    "network",
    "syslog",
    "log",
    "logs",
    "splunk",
    "ns1",
    "ns2",
    "ns3",
    "ns4",
    "dns1",
    "dns2",
    "owa",
    "ecp",
    "autodiscover",
    "crm",
    "erp",
    "sap",
    "oracle",
    "peoplesoft",
    "jde",
    "ldap",
    "adfs",
    "ad",
    "dc",
    "domaincontroller"
  ];
  function getFuzzPayloads(type) {
    switch (type) {
      case "sqli":
        return SQLI_FUZZ_PAYLOADS;
      case "xss":
        return XSS_FUZZ_PAYLOADS;
      case "path":
        return PATH_TRAVERSAL_PAYLOADS;
      case "dirsearch":
        return DIRSEARCH_PAYLOADS;
      case "subdomain":
        return SUBDOMAIN_PAYLOADS;
      default:
        return [];
    }
  }
  let _fuzzResults = [];
  function getFuzzResults() {
    return _fuzzResults;
  }
  function setFuzzResults(r) {
    _fuzzResults = r;
  }
  function clearFuzzResults() {
    _fuzzResults = [];
  }
  function replaceJsonKey$1(body2, key, newValue, append) {
    try {
      const obj = JSON.parse(body2);
      const keys = key.split(".");
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === void 0) return body2;
        current = current[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      if (current[lastKey] === void 0) return body2;
      current[lastKey] = append ? String(current[lastKey]) + newValue : newValue;
      return JSON.stringify(obj, null, 2);
    } catch {
      return body2;
    }
  }
  function renderFuzzerDialog() {
    return `
<div id="fuzzer-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:550px;max-height:85vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-weight:bold;color:#ffd700">🔍 Fuzzer</span>
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
  function fuzzResultsToCsv(results) {
    let csv = "Index,Method,URL,Parameter,Payload,Status,Size,Time,Diff\n";
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      csv += i + 1 + "," + r.method + ',"' + r.url + '",' + r.parameter + ',"' + r.payload.replace(/"/g, '""') + '",' + r.status + "," + r.bodySize + "," + r.responseTime + "," + r.diff + "\n";
    }
    return csv;
  }
  function escapeHtml$1(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fuzzResultsToHtml(results) {
    if (!results.length) return '<div style="color:#888;padding:8px;text-align:center">No results yet</div>';
    const hasNon404 = results.some((r) => r.status !== 404 && r.status !== 0);
    let html = '<table style="width:100%;border-collapse:collapse;font-size:10px">';
    html += '<tr style="background:#2a2a2a"><th style="padding:4px;text-align:left">#</th><th style="padding:4px;text-align:left">Payload</th><th style="padding:4px;text-align:right">Status</th><th style="padding:4px;text-align:right">Size</th><th style="padding:4px;text-align:right">Time</th>' + (hasNon404 ? '<th style="padding:4px;text-align:right">URL</th>' : "") + "</tr>";
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const isInteresting = r.status > 0 && r.status !== 404 && r.status !== 410;
      const bg = isInteresting ? "#1a2a1a" : r.status === 0 ? "#1a1a1a" : "#1a1a1a";
      html += '<tr class="fuzz-result-row" data-url="' + escapeHtml$1(r.url) + '" data-method="' + escapeHtml$1(r.method) + '" data-payload="' + escapeHtml$1(r.payload) + '" style="background:' + bg + ';cursor:pointer">';
      html += '<td style="padding:2px 4px;color:#888">' + (i + 1) + "</td>";
      html += '<td style="padding:2px 4px;color:#eee;font-family:monospace;word-break:break-all;max-width:200px">' + escapeHtml$1(r.payload.substring(0, 50)) + "</td>";
      let statusText;
      let statusColor;
      if (r.status === 0) {
        statusText = "ERR";
        statusColor = "#666";
      } else if (r.status >= 400) {
        statusText = String(r.status);
        statusColor = "#ff4444";
      } else if (r.status >= 300) {
        statusText = String(r.status);
        statusColor = "#ffaa00";
      } else {
        statusText = String(r.status);
        statusColor = "#44cc44";
      }
      html += '<td style="padding:2px 4px;text-align:right;font-weight:' + (isInteresting ? "bold" : "normal") + ";color:" + statusColor + '">' + statusText + "</td>";
      html += '<td style="padding:2px 4px;text-align:right;color:#888">' + r.bodySize + "</td>";
      html += '<td style="padding:2px 4px;text-align:right;color:#888">' + r.responseTime + "ms</td>";
      if (hasNon404) {
        const displayUrl = r.url.length > 60 ? r.url.substring(0, 57) + "..." : r.url;
        html += '<td style="padding:2px 4px;text-align:right;color:#888;font-size:9px;max-width:180px;overflow:hidden">' + escapeHtml$1(displayUrl) + "</td>";
      }
      html += "</tr>";
    }
    html += "</table>";
    return html;
  }
  let _repeaterResults = [];
  function getRepeaterResults() {
    return _repeaterResults;
  }
  function setRepeaterResults(r) {
    _repeaterResults = r;
  }
  function clearRepeaterResults() {
    _repeaterResults = [];
  }
  function renderRepeaterDialog() {
    return `
<div id="repeater-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;max-height:80vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-weight:bold;color:#7ab7ef">🔄 Repeater</span>
    <button id="repeater-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
  </div>
  <div style="margin-bottom:6px">
    <label style="color:#aaa;font-size:11px">Number of repetitions:</label>
    <input id="repeater-count" type="number" class="form-control" value="5" min="1" max="50" style="font-size:12px;width:80px;padding:2px 6px">
  </div>
  <div style="margin-bottom:8px">
    <button id="repeater-start" class="btn btn-sm btn-primary" style="width:100%">🔄 Start Repeating</button>
  </div>
  <div id="repeater-results" style="max-height:300px;overflow-y:auto;font-size:11px"></div>
  <div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end">
    <button id="repeater-export-csv" class="btn btn-xs btn-default">Export CSV</button>
    <button id="repeater-clear" class="btn btn-xs btn-default">Clear</button>
  </div>
</div>`;
  }
  function repeaterResultsToCsv(results) {
    let csv = "Index,Status,Size,Time,Preview,Method,URL\n";
    for (const r of results) {
      csv += r.index + 1 + "," + r.status + "," + r.bodySize + "," + r.time + ',"' + (r.bodyPreview || "").replace(/"/g, '""') + '",' + (r.method || "GET") + ',"' + (r.url || "") + '"\n';
    }
    return csv;
  }
  function repeaterResultsToHtml(results) {
    if (!results.length) return '<div style="color:#888;padding:8px;text-align:center">No results yet</div>';
    let html = '<table style="width:100%;border-collapse:collapse;font-size:10px">';
    html += '<tr style="background:#2a2a2a"><th>#</th><th>Status</th><th>Size</th><th>Time</th><th>Preview</th></tr>';
    for (const r of results) {
      const bg = r.status >= 400 ? "#2a1a1a" : r.status >= 300 ? "#2a2a1a" : "#1a1a1a";
      html += '<tr class="repeater-result-row" data-url="' + (r.url || "").replace(/"/g, "&quot;") + '" data-method="' + (r.method || "GET") + '" style="background:' + bg + ';cursor:pointer">';
      html += '<td style="padding:2px 4px;color:#888">' + (r.index + 1) + "</td>";
      html += '<td style="padding:2px 4px;color:' + (r.status >= 400 ? "#ff4444" : "#44cc44") + '">' + r.status + "</td>";
      html += '<td style="padding:2px 4px;color:#888">' + r.bodySize + "</td>";
      html += '<td style="padding:2px 4px;color:#888">' + r.time + "ms</td>";
      html += '<td style="padding:2px 4px;color:#aaa;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + r.bodyPreview.substring(0, 60) + "</td>";
      html += "</tr>";
    }
    html += "</table>";
    return html;
  }
  function detectAndDecode(text) {
    const results = [];
    if (!text) return results;
    try {
      const jwts = findJWTInText(text);
      for (const t of jwts) {
        const prettyHeader = JSON.stringify(t.header, null, 2);
        const prettyPayload = JSON.stringify(t.payload, null, 2);
        const output = "[Header]\n" + prettyHeader + "\n\n[Payload]\n" + prettyPayload + "\n\n[Signature]\n" + t.signature;
        results.push({ label: "JWT (" + t.alg + ")", input: t.raw, output, raw: t.raw });
      }
    } catch {
    }
    try {
      const trimmed = text.trim();
      if (/^[A-Za-z0-9+/]*={0,2}$/.test(trimmed) && trimmed.length % 4 === 0) {
        const decoded = atob(trimmed);
        if (decoded.length > 0 && /^[\x20-\x7E\s]*$/.test(decoded)) {
          results.push({ label: "Base64", input: text, output: decoded });
        }
      }
    } catch {
    }
    try {
      if (/%[0-9A-Fa-f]{2}/.test(text)) {
        const decoded = decodeURIComponent(text);
        if (decoded !== text) {
          results.push({ label: "URL", input: text, output: decoded });
        }
      }
    } catch {
    }
    try {
      const div = document.createElement("div");
      div.innerHTML = text;
      const decoded = div.textContent || div.innerText || "";
      if (decoded !== text && /&[#a-zA-Z0-9]+;/.test(text)) {
        results.push({ label: "HTML", input: text, output: decoded });
      }
    } catch {
    }
    try {
      const trimmed = text.trim().replace(/\s/g, "");
      if (/^[0-9A-Fa-f]{2,}$/.test(trimmed) && trimmed.length % 2 === 0) {
        const decoded = trimmed.match(/.{2}/g)?.map((b) => String.fromCharCode(parseInt(b, 16))).join("") || "";
        if (decoded.length > 0 && /^[\x20-\x7E\s]*$/.test(decoded)) {
          results.push({ label: "Hex", input: text, output: decoded });
        }
      }
    } catch {
    }
    return results;
  }
  function decodersToHtml(results) {
    if (!results.length) return "";
    let html = '<div class="decoders-panel" style="margin-top:6px;padding:6px;background:#1a1a2e;border:1px solid #7ab7ef;border-radius:4px">';
    html += '<div style="font-weight:bold;color:#7ab7ef;margin-bottom:4px">🔍 Detected Encodings</div>';
    for (const r of results) {
      html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px;font-size:11px">';
      html += '<span style="color:#7ab7ef;font-weight:bold">[' + r.label + "]</span>";
      if (r.error) {
        html += '<div style="color:#ff4444;margin-top:2px">Error: ' + r.error + "</div>";
      } else if (r.output.length > 500) {
        html += '<textarea readonly class="form-control" style="margin-top:4px;width:100%;height:150px;font-family:monospace;font-size:11px;resize:vertical;background:#0f0f23;color:#eee;border:1px solid #444;padding:4px">' + r.output.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</textarea>";
      } else {
        html += '<div style="color:#eee;margin-top:2px;word-break:break-all;font-family:monospace;font-size:10px">' + r.output.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") + "</div>";
      }
      html += "</div>";
    }
    html += "</div>";
    return html;
  }
  function renderDecoderDialog() {
    return `
<div id="decoder-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;max-height:80vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-weight:bold;color:#7ab7ef">🔍 Inline Decoder</span>
    <button id="decoder-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
  </div>
  <textarea id="decoder-input" class="form-control" rows="3" placeholder="Paste text to decode (Base64, URL, HTML, Hex, JWT)..." style="font-family:monospace;font-size:11px"></textarea>
  <div style="margin-top:6px;display:flex;gap:4px;flex-wrap:wrap">
    <button id="decoder-detect" class="btn btn-sm btn-primary">🔍 Auto-Detect</button>
    <button id="decoder-jwt" class="btn btn-xs btn-default">JWT</button>
    <button id="decoder-base64" class="btn btn-xs btn-default">Base64</button>
    <button id="decoder-url" class="btn btn-xs btn-default">URL</button>
    <button id="decoder-hex" class="btn btn-xs btn-default">Hex</button>
  </div>
  <div id="decoder-output" style="margin-top:6px;font-size:11px;max-height:none"></div>
</div>`;
  }
  const CUSTOM_PAYLOADS_KEY = "spykit-intruder-payloads";
  function saveCustomPayloads(name, payloads) {
    const stored = JSON.parse(localStorage.getItem(CUSTOM_PAYLOADS_KEY) || "{}");
    stored[name] = payloads;
    localStorage.setItem(CUSTOM_PAYLOADS_KEY, JSON.stringify(stored));
  }
  function loadCustomPayloads() {
    return JSON.parse(localStorage.getItem(CUSTOM_PAYLOADS_KEY) || "{}");
  }
  const INTRUDER_PAYLOADS = {
    "SQL Injection": ["'", "' OR '1'='1", "' OR 1=1--", '" OR "1"="1', "' UNION SELECT NULL--", "'; DROP TABLE users--", "1 AND 1=1", "1 AND 1=2", "' AND '1'='1", "' AND '1'='2", "admin'--", "admin' #"],
    "XSS": ["<script>alert(1)<\/script>", "<img src=x onerror=alert(1)>", '"><script>alert(1)<\/script>', "<svg onload=alert(1)>", "javascript:alert(1)", "<body onload=alert(1)>", "';alert(1);//"],
    "Path Traversal": ["../../../etc/passwd", "..\\\\..\\\\..\\\\windows\\\\win.ini", "%2e%2e%2f%2e%2e%2fetc/passwd", "....//....//....//etc/passwd"],
    "Numbers 0-100": Array.from({ length: 101 }, (_, i) => String(i)),
    "Common Usernames": ["admin", "root", "user", "test", "guest", "administrator", "sa", "oracle", "postgres", "jenkins", "tomcat", "manager", "demo"],
    "Common Passwords": ["password", "123456", "admin", "admin123", "root", "test", "passw0rd", "qwerty", "letmein", "welcome", "P@ssw0rd"],
    "Blank/Null": ["", "null", "undefined", "0", "-1", "true", "false", "NaN"]
  };
  function getIntruderPayloads(type) {
    return INTRUDER_PAYLOADS[type] || [];
  }
  function replaceJsonKey(body2, key, newValue, append) {
    try {
      const obj = JSON.parse(body2);
      const keys = key.split(".");
      let current = obj;
      for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === void 0) return body2;
        current = current[keys[i]];
      }
      const lastKey = keys[keys.length - 1];
      if (current[lastKey] === void 0) return body2;
      current[lastKey] = append ? String(current[lastKey]) + newValue : newValue;
      return JSON.stringify(obj, null, 2);
    } catch {
      return body2;
    }
  }
  function renderIntruderDialog() {
    return `
<div id="intruder-dialog" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;max-height:85vh;background:#1e1e1e;border:1px solid #444;border-radius:6px;z-index:9999;padding:12px;overflow-y:auto;box-shadow:0 4px 20px rgba(0,0,0,0.5)">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-weight:bold;color:#ff6b35">🎯 Intruder</span>
    <button id="intruder-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:6px">
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Target position:</label>
      <select id="intruder-position" class="form-control" style="font-size:12px;padding:2px 6px">
        <option value="url-param">URL Parameter</option>
        <option value="url-path">URL Path</option>
        <option value="body">Request Body (literal replace)</option>
        <option value="json-body-key">JSON Body Key</option>
        <option value="header">Header Value</option>
      </select>
    </div>
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Field name (for param/header):</label>
      <input id="intruder-field" class="form-control" placeholder="parameter_name" style="font-size:12px;padding:2px 6px">
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:6px">
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Payload type:</label>
      <select id="intruder-payload-type" class="form-control" style="font-size:12px;padding:2px 6px">
        ${Object.keys(INTRUDER_PAYLOADS).map((t) => `<option value="${t}">${t}</option>`).join("")}
        <option value="__custom__">Custom...</option>
      </select>
    </div>
    <div style="flex:1">
      <label style="color:#aaa;font-size:11px">Payloads to send:</label>
      <input id="intruder-count" class="form-control" readonly style="font-size:12px;padding:2px 6px;background:#2a2a2a">
    </div>
  </div>
  <div style="margin-bottom:6px">
    <label><input type="checkbox" id="intruder-append" style="margin-right:4px"> Same value (payload appended to existing value instead of replacing it)</label>
  </div>
  <div id="intruder-custom-area" style="display:none;margin-bottom:6px">
    <label style="color:#aaa;font-size:11px">Custom payloads (one per line):</label>
    <textarea id="intruder-custom-payloads" class="form-control" rows="3" placeholder="payload1&#10;payload2&#10;payload3" style="font-family:monospace;font-size:11px"></textarea>
    <div style="margin-top:4px;display:flex;gap:4px">
      <button id="intruder-save-custom" class="btn btn-xs btn-default">Save as...</button>
      <select id="intruder-load-custom" style="background:#1e1e1e;color:#eee;border:1px solid #555;padding:2px;font-size:10px">
        <option value="">Load saved...</option>
      </select>
    </div>
  </div>
  <div style="margin-bottom:8px;display:flex;gap:4px">
    <button id="intruder-start" class="btn btn-sm btn-danger" style="flex:1">⚡ Start Attack</button>
    <button id="intruder-stop" class="btn btn-sm btn-default" style="display:none;flex:0.4">⏹ Stop</button>
    <label style="color:#aaa;font-size:11px;align-self:center">
      Concurrent: <input id="intruder-concurrent" type="number" value="5" min="1" max="20" style="width:50px;background:#1e1e1e;color:#eee;border:1px solid #555;padding:2px;font-size:11px">
    </label>
  </div>
  <div id="intruder-progress" style="display:none;margin-bottom:6px">
    <div style="display:flex;justify-content:space-between;font-size:11px;color:#888">
      <span id="intruder-progress-text">0 / 0</span>
      <span id="intruder-progress-pct">0%</span>
    </div>
    <div style="height:4px;background:#333;border-radius:2px;margin-top:2px">
      <div id="intruder-progress-bar" style="height:100%;width:0%;background:#ff6b35;border-radius:2px;transition:width 0.3s"></div>
    </div>
  </div>
  <div id="intruder-results" style="max-height:300px;overflow-y:auto;font-size:11px"></div>
  <div style="margin-top:4px;display:flex;gap:4px;justify-content:flex-end;align-items:center">
    <label style="color:#888;font-size:10px;margin-right:auto"><input type="checkbox" id="intruder-hide-noise" style="margin-right:3px">Hide 0/404</label>
    <button id="intruder-export" class="btn btn-xs btn-default">Export CSV</button>
    <button id="intruder-clear" class="btn btn-xs btn-default">Clear</button>
  </div>
</div>`;
  }
  let _intruderResults = [];
  function getIntruderResults() {
    return _intruderResults;
  }
  function setIntruderResults(r) {
    _intruderResults = r;
  }
  function clearIntruderResults() {
    _intruderResults = [];
  }
  function intruderResultsToHtml(results) {
    return fuzzResultsToHtml(results);
  }
  let _tabId = -1;
  let _attached = false;
  let _enabled = false;
  let _queue = [];
  let _onQueueChange = null;
  let _onRequestProcessed = null;
  let _listenerRegistered = false;
  function setOnQueueChange(cb) {
    _onQueueChange = cb;
  }
  function setOnRequestProcessed(cb) {
    _onRequestProcessed = cb;
  }
  function getInterceptedQueue() {
    return _queue;
  }
  function isInterceptEnabled() {
    return _enabled;
  }
  function isInterceptorAttached() {
    return _attached;
  }
  function msg(action, extra = {}) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({
          spyInterceptor: true,
          tabId: _tabId,
          action,
          ...extra
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("[SpyKit] interceptor msg error:", chrome.runtime.lastError.message);
            resolve({ success: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(response || { success: false, error: "No response from service worker" });
        });
      } catch (e) {
        console.error("[SpyKit] interceptor sendMessage threw:", e.message);
        resolve({ success: false, error: e.message });
      }
    });
  }
  function registerListener() {
    if (_listenerRegistered) return;
    _listenerRegistered = true;
    chrome.runtime.onMessage.addListener((message) => {
      if (!message.spyInterceptorEvent) return;
      switch (message.event) {
        case "queueChanged":
          _queue = message.data && message.data.queue || [];
          if (_onQueueChange) _onQueueChange(_queue);
          break;
        case "requestProcessed":
          if (_onRequestProcessed) {
            _onRequestProcessed(message.data.request, message.data.action);
          }
          break;
        case "debuggerDetached":
          _attached = false;
          _enabled = false;
          _queue = [];
          if (_onQueueChange) _onQueueChange(_queue);
          break;
      }
    });
  }
  function attachInterceptor(tab, callback) {
    registerListener();
    _tabId = tab;
    msg("attach").then((res) => {
      if (res.success) {
        _attached = true;
      } else {
        console.error("[SpyKit] attachInterceptor failed:", res.error);
      }
      if (callback) callback(!!res.success);
    }).catch((e) => {
      console.error("[SpyKit] attachInterceptor threw:", e.message);
      if (callback) callback(false);
    });
  }
  function detachInterceptor() {
    if (!_attached) return;
    _attached = false;
    _enabled = false;
    _queue = [];
    msg("detach").catch((e) => console.error("[SpyKit] detach threw:", e.message));
  }
  function toggleIntercept(enable) {
    if (!_attached || enable === _enabled) return;
    _enabled = enable;
    if (enable) {
      msg("enableIntercept").then((res) => {
        if (!res.success) _enabled = false;
      }).catch(() => {
        _enabled = false;
      });
    } else {
      msg("disableIntercept").then((res) => {
        if (!res.success) _enabled = true;
      }).catch(() => {
        _enabled = true;
      });
    }
  }
  function forwardRequest(id2, modifications) {
    const req = _queue.find((r) => r.id === id2);
    if (!req) return;
    const extra = { requestId: req.requestId };
    {
      msg("forward", extra).catch((e) => console.error("[SpyKit] forward threw:", e.message));
    }
  }
  function forwardAllRequests() {
    msg("forwardAll").catch((e) => console.error("[SpyKit] forwardAll threw:", e.message));
  }
  function dropRequest(id2) {
    const req = _queue.find((r) => r.id === id2);
    if (!req) return;
    msg("drop", { requestId: req.requestId }).catch((e) => console.error("[SpyKit] drop threw:", e.message));
  }
  function dropAllRequests() {
    msg("dropAll").catch((e) => console.error("[SpyKit] dropAll threw:", e.message));
  }
  function editAndForwardRequest(id2, url2, method2, headers2, body2) {
    const req = _queue.find((r) => r.id === id2);
    if (!req) return;
    const parsedHeaders = [];
    for (const line of headers2.split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        parsedHeaders.push({ name: line.substring(0, idx).trim(), value: line.substring(idx + 1).trim() });
      }
    }
    msg("editAndForward", {
      requestId: req.requestId,
      url: url2,
      method: method2,
      headers: parsedHeaders,
      postData: body2 || void 0
    });
  }
  let _reqCounter = 0;
  const _pending = /* @__PURE__ */ new Map();
  let _listenerInit = false;
  function initListener() {
    if (_listenerInit) return;
    _listenerInit = true;
    chrome.runtime.onMessage.addListener((message) => {
      if (message && message._fetchId) {
        const handler = _pending.get(message._fetchId);
        if (handler) {
          _pending.delete(message._fetchId);
          if (message._res === "ok") {
            handler.resolve(message);
          } else {
            handler.reject(new Error(message._err || "Request failed"));
          }
        }
      }
    });
  }
  function pageFetch(url2, method2, headers2, body2, timeout = 3e4) {
    initListener();
    const id2 = "pf_" + ++_reqCounter + "_" + Date.now();
    return new Promise((resolve, reject) => {
      _pending.set(id2, { resolve, reject });
      const code2 = [
        "(async function(){",
        "try{",
        "var r=await fetch(" + JSON.stringify(url2) + ",{",
        "method:" + JSON.stringify(method2) + ",",
        "headers:" + JSON.stringify(headers2 || {}) + ",",
        "body:" + (body2 ? JSON.stringify(body2) : "undefined"),
        "});",
        "var t=await r.text();",
        "var h=[];",
        "r.headers.forEach(function(v,k){h.push({name:k,value:v});});",
        "chrome.runtime.sendMessage({_fetchId:" + JSON.stringify(id2) + ',_res:"ok",status:r.status,headers:h,body:t,url:r.url});',
        "}catch(e){",
        "chrome.runtime.sendMessage({_fetchId:" + JSON.stringify(id2) + ',_res:"fail",_err:String(e.message),url:""});',
        "}",
        "})()"
      ].join("");
      chrome.devtools.inspectedWindow.eval(
        code2,
        { useContentScriptContext: contentScriptLoaded },
        (result, error) => {
          if (error && error.isError) {
            _pending.delete(id2);
            reject(new Error(error.message));
          }
        }
      );
      setTimeout(() => {
        if (_pending.has(id2)) {
          _pending.delete(id2);
          reject(new Error("Request timed out"));
        }
      }, timeout);
    });
  }
  let filterHtmlAdded = false;
  function buildFilterRow() {
    if (filterHtmlAdded) return;
    filterHtmlAdded = true;
    const filter = $(".filter");
    let first = true;
    for (const a in rows) {
      filter.append($("<div/>").addClass("filter-" + a));
      if (typeof rows[a] === "object") {
        const $container = $("<div/>").addClass("btn-group clickable");
        const $span = $("<span/>").html(rows[a][0]).attr({ "data-toggle": "dropdown" }).append("<small>▼</small>");
        const $ul = $("<ul/>").addClass("dropdown-menu dropdown-menu-form").attr("role", "menu").attr("id", a);
        $ul.append(
          $("<li/>").addClass("checkbox").append(
            $("<label/>").append(
              $("<input/>").attr({ type: "checkbox", name: "all", val: "all", checked: true })
            ).append("All")
          )
        );
        $container.append($span).append($ul);
        $(".filter-" + a).append($container);
      } else {
        const $container = $("<div/>").addClass("btn-group" + (first ? " clickable" : ""));
        $container.append($("<span/>").append(rows[a]));
        $(".filter-" + a).append($container);
      }
      first = false;
    }
    filter.append($("<div/>").addClass("filter-empty"));
    const filterFixed = filter.clone();
    filter.after(filterFixed);
    filterFixed.addClass("fixed");
    addFilterItem("time", "0", "fast");
    addFilterItem("time", "500", "> 500 ms");
    addFilterItem("time", "1000", "> 1000 ms");
    addFilterItem("size", "0", "small");
    addFilterItem("size", "100", "> 100 k");
    addFilterItem("size", "1m", "> 1 m");
  }
  function editRequest(tr) {
    setDialogOpened(true);
    if (selected) {
      selected.find(".clear").addClass("visited").html("✓");
    }
    setSelected(tr);
    if (selected) {
      selected.find(".clear").removeClass("visited").html("►");
    }
    $("#new-request").hide();
    if (splitter) {
      const sizes = splitter.getSizes();
      if (sizes.length !== 2 || sizes[1] < 10) {
        splitter.setSizes([50, 50]);
      }
    }
    window.selected = selected;
    $(".split-area").css({ opacity: 0, display: splitDir === "vertical" ? "block" : "flex" }).animate({ opacity: 1 }, 100, "swing");
    const id2 = selected ? parseInt(selected.attr("id") || "-1") : -1;
    const data = id2 > 0 ? values.requests[id2] : {};
    if (!data.request) data.request = { method: "GET", url: "", headers: [] };
    if (!data.response) data.response = { status: 0, headers: [], content: {} };
    $("#form-cancel").html("Cancel").addClass("btn-default").removeClass("btn-danger");
    $("#form-send").prop("disabled", false).removeClass("spin");
    $("#form-id").val(id2);
    $("#form-method").val(data.request.method);
    let displayValue = data.response.status;
    if (displayValue === void 0) displayValue = "";
    else if (displayValue === 0) displayValue = "error";
    else if (displayValue === 200) displayValue = "200 - OK";
    $("#form-status").val(displayValue).removeClass("blink ok error").addClass(data.response.status >= 200 && data.response.status < 300 ? "ok" : "error");
    $(".hint").css({ display: data.response.status && data.response.status !== 200 ? "block" : "none" });
    $("#hint").html(getStatusHint(data.response.status));
    if (data.time) {
      const time = Math.round(data.time);
      $("#form-time").val(time + " ms");
    } else {
      $("#form-time").val("");
    }
    let focusSet = false;
    $("#form-url").val(data.request.url);
    autosize.update($("#form-url"));
    if (!focusSet && $("#form-url").is(":visible")) {
      $("#form-url").focus();
      focusSet = true;
    }
    $("#form-headers").val(headersToStr(data.request.headers));
    autosize.update($("#form-headers"));
    if (!focusSet && $("#form-headers").is(":visible")) {
      $("#form-headers").focus();
      focusSet = true;
    }
    if (data.request.postData) {
      const postText = typeof data.request.postData === "string" ? data.request.postData : data.request.postData.text || "";
      $("#form-body").val(format(postText));
    } else {
      $("#form-body").val("");
    }
    autosize.update($("#form-body"));
    if (!focusSet && $("#form-body").is(":visible")) {
      $("#form-body").focus();
      focusSet = true;
    }
    $("#form-headers2").val(headersToStr(data.response.headers));
    autosize.update($("#form-headers2"));
    if (!focusSet && $("#form-headers2").is(":visible")) {
      $("#form-headers2").focus();
      focusSet = true;
    }
    const mime2 = data.response.content && data.response.content.mimeType ? data.response.content.mimeType.toLowerCase() : "";
    const bodyText = data.response.content && data.response.content.text || "";
    $("#form-body2").val(format(bodyText, mime2)).show();
    $("#form-body2-image").html("");
    const sizeCompressed = data.response.bodySize || 0;
    let sizeFull = data.response.content ? data.response.content.size || 0 : 0;
    if (!sizeFull) sizeFull = sizeCompressed;
    let sizeInfo = "";
    if (sizeFull) {
      sizeInfo = Math.round(sizeFull / 1024) + " k " + (sizeCompressed === sizeFull ? " not gzipped" : " / " + Math.round(sizeCompressed / 1024) + " k gzipped");
    }
    $("#form-label-body2").attr("for", "form-body2").text("Answer body: " + sizeInfo);
    autosize.update($("#form-body2"));
    if (data.getContent) {
      data.getContent(function(content, encoding) {
        if (mime2.indexOf("image") >= 0) {
          const mimeType = data.response?.content?.mimeType || "image/png";
          const img = '<a target="_blank" href="' + data.request.url + '"><img height="100px" src="data:' + mimeType.toLowerCase() + ";" + encoding + "," + content + '"/></a>';
          $("#form-body2").val("").hide();
          $("#form-body2-image").empty().append($(img));
          $("#form-label-body2").attr("for", "form-body2-image");
        } else {
          if (!content) {
            $("#form-body2").val("");
          } else if (content.length < 100 * 1024) {
            $("#form-body2").val(format(content, mime2));
            autosize.update($("#form-body2"));
          } else {
            $("#form-body2").val(format(content, mime2)).css({ height: 500, overflow: "scroll" });
          }
        }
      });
    }
    if (!focusSet && $("#form-body2").is(":visible")) {
      $("#form-body2").focus();
    }
    detailsSizeCheck();
    $(".details").scrollTop(0);
  }
  function initPanel() {
    buildFilterRow();
    const $body = $("body");
    window.editRequest = editRequest;
    $(document).on("click", ".dropdown-menu.dropdown-menu-form", function(e) {
      e.stopPropagation();
    });
    $(document).on("click", ".details .other-controls label", function(e) {
      e.stopPropagation();
      e.preventDefault();
      const label = $(this);
      const id2 = label.attr("for");
      if (!id2) return;
      const edit = $("#" + id2);
      const isVisible = edit.is(":visible");
      edit.slideToggle();
      $("#" + id2 + "-preview").slideToggle();
      label.find(".collapse-icon").text(isVisible ? "+" : "−");
    });
    $(document).on("click", 'input[name="filter"]', function() {
      const block = $(this).parents(".dropdown-menu");
      const button = block.prev();
      const sel = "." + $(this).val();
      $('input[name="all"]', block).prop(
        "checked",
        $('input[name="filter"]', block).length === $('input[name="filter"]:checked', block).length
      );
      const checked = $(this).prop("checked");
      if ($('input[name="all"]', block).prop("checked")) {
        $('input[name="filter"]', block).each(function() {
          const a = values.filters.indexOf(sel);
          if (a >= 0) values.filters.splice(a, 1);
        });
        button.removeClass("active");
      } else {
        button.addClass("active");
        if (checked) {
          const a = values.filters.indexOf(sel);
          if (a >= 0) values.filters.splice(a, 1);
        } else {
          values.filters.push(sel);
        }
      }
      values.filters = $.grep(values.filters, function() {
        return true;
      });
      values.page = 0;
      applyFilters();
    });
    $(document).on("click", 'input[name="all"]', function() {
      const block = $(this).parents(".dropdown-menu");
      if ($(this).prop("checked")) {
        $('input[name="filter"]:not(:checked)', block).trigger("click");
      } else {
        $('input[name="filter"]:checked', block).trigger("click");
      }
    });
    $(document).on("input", "#search-requests", doSearch);
    $(document).on("change", "#search-regex", doSearch);
    $(document).on("click", ".filter-pin", function() {
      values.showPinned = !values.showPinned;
      values.page = 0;
      $(this).toggleClass("active");
      applyFilters();
    });
    $(".filter-clear").on("click", function() {
      values.requests = {};
      values.searchQuery = "";
      values.showPinned = false;
      values.page = 0;
      $(".filter-pin").removeClass("active");
      $("#search-requests").val("");
      $(".req").remove();
      $(".badge-right").html("");
      $body.scrollTop(0);
    });
    $body.on("scroll", function() {
      checkScroll(this.scrollTop);
    });
    $(window).on("load", function() {
      splitCheck();
      checkScroll(0);
      detailsSizeCheck();
    });
    $(window).on("resize", function() {
      splitCheck();
      detailsSizeCheck();
    });
    $(document).on("click", "#scroll-up", function() {
      $body.scrollTop(0);
    });
    $(document).on("click", "#form-cancel", function() {
      if ($("#form-status").val() === "pending") {
        $("#form-cancel").html("Cancel").addClass("btn-default").removeClass("btn-danger");
        $("#form-send").prop("disabled", false).removeClass("spin");
        $("#form-status").val("canceled").removeClass("blink").removeClass("ok").addClass("error");
        return;
      }
      clearBodyHighlights();
      setDialogOpened(false);
      $(".split-area").animate({ opacity: 0 }, 100, "swing", function() {
        $(".split-area").hide();
      });
      if (selected) {
        selected.find(".clear").addClass("visited").html("✓");
      }
      setSelected(void 0);
      $("#new-request").stop().show();
      detailsSizeCheck();
    });
    $(document).on("click", "#new-request", function() {
      editRequest($('<tr id="-1"/>'));
    });
    $(document).on("click", "#copy-curl-btn", function() {
      const fmt = $("#copy-format").val();
      const id2 = parseInt($("#form-id").val());
      const data = id2 > 0 ? values.requests[id2] : null;
      let entry;
      if (data) {
        entry = data;
      } else {
        entry = {
          request: {
            method: $("#form-method").val(),
            url: $("#form-url").val(),
            headers: [],
            postData: $("#form-body").val() ? { text: $("#form-body").val() } : null
          }
        };
      }
      const code2 = fmt === "curl" ? toCurl(entry) : genSnippetsText(entry, fmt);
      if (code2) {
        try {
          navigator.clipboard.writeText(code2).then(() => {
            $("#copy-curl-btn").text("Copied!");
            setTimeout(() => $("#copy-curl-btn").text("Copy"), 2e3);
          });
        } catch {
          const ta = document.createElement("textarea");
          ta.value = code2;
          ta.style.position = "fixed";
          ta.style.left = "-9999px";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          $("#copy-curl-btn").text("Copied!");
          setTimeout(() => $("#copy-curl-btn").text("Copy"), 2e3);
        }
      }
    });
    $(document).on("click", ".req", function() {
      clearBodyHighlights();
      (window.editRequest || editRequest)($(this));
    });
    autosize($("textarea"));
    splitCheck();
    $(document).on("click", "a", function(e) {
      e.stopPropagation();
    });
    for (let i = 0; i < ($("table").outerHeight() || 0) / ROW_HEIGHT; i++) {
      $(".requests").prepend($("<tr/>").attr("colspan", 10).prepend($("<td>&nbsp;</td>")));
    }
    $("#form-url, #form-headers, #form-body, #form-method").on("change input", function() {
      if (!formDirty) {
        setFormDirty(true);
        $("#form-method").parent().append('<span class="unsaved-dot" id="unsaved-dot"></span>');
      }
    });
    $(document).on("click", "#form-send, #form-cancel", function() {
      setFormDirty(false);
      $("#unsaved-dot").remove();
    });
    try {
      const backgroundPageConnection = chrome.runtime.connect({ name: "spy" });
      backgroundPageConnection.postMessage({
        name: "init",
        tabId: chrome.devtools.inspectedWindow.tabId
      });
      chrome.runtime.onMessage.addListener(function(message) {
        if (!message.spyId && !message.res) return;
        setContentScriptLoaded(true);
        handleRESTResponse(message);
      });
    } catch {
    }
    try {
      if (chrome.devtools) {
        chrome.devtools.network.getHAR(function(log) {
          for (const entry of log.entries) {
            onData(entry);
          }
        });
        chrome.devtools.network.onRequestFinished.addListener(function(entry) {
          onData(entry);
        });
      }
    } catch {
    }
    function runRequestAnalysis(data) {
      if (!data) return;
      const body2 = $("#form-body2").val() || data.response?.content?.text || "";
      const allText = getRequestText(data) + " " + body2;
      const resHeaders = data.response?.headers || [];
      const reqHeaders = data.request?.headers || null;
      $("#security-summary").html(checkSecurityHeaders(resHeaders));
      const corsResult = checkCORS(reqHeaders, resHeaders);
      if (corsResult.status) {
        $("#cors-summary").html(corsResult.html).addClass(corsResult.status);
      }
      const cookies = parseCookies(resHeaders);
      if (cookies.length) {
        $("#cookie-inspector").html(cookieHtml(cookies)).show();
      } else {
        $("#cookie-inspector").hide();
      }
      if (detectGraphQL(body2)) {
        const $label = $("#form-label-body2");
        if (!$label.find(".gql-badge").length) {
          $label.append(' <span class="gql-badge" title="GraphQL query detected">GQL</span>');
        }
      } else {
        $("#form-label-body2 .gql-badge").remove();
      }
      const jwts = findJWTInText(allText);
      const $container = $("#jwt-inspector-container");
      if (jwts.length) {
        if (!$container.length) {
          $("#security-summary").after('<div id="jwt-inspector-container"></div>');
        }
        $("#jwt-inspector-container").html(jwtToHtml(jwts));
      } else {
        $container.remove();
      }
      const authFindings = analyzeAuth(
        data.request?.headers || null,
        data.response?.headers || null,
        data.request?.url || ""
      );
      const $authContainer = $("#auth-analysis-container");
      if (authFindings.length) {
        if (!$authContainer.length) {
          $("#jwt-inspector-container").after('<div id="auth-analysis-container"></div>');
        }
        $("#auth-analysis-container").html(authFindingsToHtml(authFindings));
      } else {
        $authContainer.remove();
      }
      const scanResults = scanForReflections(
        data.request?.url || "",
        data.request?.postData ? typeof data.request.postData === "string" ? data.request.postData : data.request.postData.text || "" : "",
        body2
      );
      const $scanContainer = $("#scan-results-container");
      if (scanResults.length) {
        if (!$scanContainer.length) {
          $("#auth-analysis-container").after('<div id="scan-results-container"></div>');
        }
        $("#scan-results-container").html(scanResultsToHtml(scanResults));
      } else {
        $scanContainer.remove();
      }
      const secrets = scanForSecrets(allText);
      if (secrets.length) {
        const counts = {};
        for (const s of secrets) {
          counts[s.type] = (counts[s.type] || 0) + 1;
        }
        let warnHtml = "";
        for (const type in counts) {
          warnHtml += '<span class="sec-found">⚠ ' + type + ": " + counts[type] + "</span> ";
        }
        $("#secrets-warning").html(warnHtml);
      } else {
        $("#secrets-warning").html("");
      }
      const mimeCheck = (data.response?.content?.mimeType || "").toLowerCase();
      const isText = mimeCheck.indexOf("text") >= 0 || mimeCheck.indexOf("json") >= 0 || mimeCheck.indexOf("xml") >= 0 || mimeCheck.indexOf("html") >= 0 || mimeCheck.indexOf("javascript") >= 0;
      if (mimeCheck && !isText) {
        $("#body-hex-btn").show();
      } else {
        $("#body-hex-btn").hide();
      }
    }
    const origEditReq = editRequest;
    const patchedEditReq = function(tr) {
      const id2 = tr ? parseInt(tr.attr("id") || "-1") : -1;
      const data = id2 > 0 ? values.requests[id2] : null;
      if (data && data.getContent) {
        const origGetContent = data.getContent;
        data.getContent = function(callback) {
          origGetContent(function(content, encoding) {
            callback(content, encoding);
            runRequestAnalysis(data);
          });
        };
      }
      origEditReq(tr);
      setTimeout(() => {
        runRequestAnalysis(data);
      }, 50);
    };
    window.editRequest = patchedEditReq;
    loadPersistedData();
    startAutoSave();
    $(document).on("click", "#export-all-btn", function() {
      $("#export-dropdown").toggle();
    });
    $(document).on("click", function(e) {
      if (!$(e.target).closest("#export-all-btn, #export-dropdown").length) {
        $("#export-dropdown").hide();
      }
    });
    $(document).on("click", ".export-dropdown > div", function() {
      exportAsFormat($(this).data("format"));
    });
    $(document).on("click", "#export-postman-btn", function() {
      const id2 = parseInt($("#form-id").val());
      const data = id2 > 0 ? values.requests[id2] : null;
      let entry;
      if (data) {
        entry = data;
      } else {
        entry = {
          request: {
            method: $("#form-method").val(),
            url: $("#form-url").val(),
            headers: [],
            postData: $("#form-body").val() ? { text: $("#form-body").val() } : null
          }
        };
      }
      const item = requestToPostmanItem(entry);
      if (!item) return;
      const collection = {
        info: { name: "SpyKit Export", schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" },
        item: [item]
      };
      downloadJSON(JSON.stringify(collection, null, 2), "spykit-collection.json");
    });
    $(document).on("contextmenu", ".req", function(e) {
      e.preventDefault();
      $(".context-menu").remove();
      const id2 = parseInt($(this).attr("id") || "");
      const data = values.requests[id2];
      const menu = $('<div class="context-menu" data-target-id="' + id2 + '"></div>');
      menu.append('<div data-action="replay">Reenviar</div>');
      menu.append('<div data-action="copy-curl">Copy as CURL</div>');
      menu.append('<div data-action="copy-url">Copy URL</div>');
      menu.append('<div data-action="open-browser">Open in browser</div>');
      if (data && data.request && data.request.url) {
        const domain = data.request.url.replace(/https?:\/\//, "").split("/")[0];
        menu.append('<div data-action="block">Block: ' + domain + "</div>");
      }
      menu.append('<div data-action="export-postman-single">Export to Postman</div>');
      menu.css({ left: e.clientX + "px", top: e.clientY + "px" });
      $("body").append(menu);
      $(document).one("click", function() {
        menu.remove();
      });
    });
    $(document).on("click", ".context-menu div", function() {
      const action = $(this).data("action");
      const targetId = parseInt($(".context-menu").data("target-id"));
      const data = values.requests[targetId];
      if (action === "replay" && data && data.request) {
        $(".context-menu").remove();
        editRequest($("#" + targetId));
        setTimeout(() => {
          $("#form-send").click();
        }, 100);
      } else if (action === "copy-curl" && data) {
        copyToClipboard(toCurl(data));
      } else if (action === "copy-url" && data && data.request) {
        copyToClipboard(data.request.url);
      } else if (action === "open-browser" && data && data.request) {
        chrome.devtools.inspectedWindow.eval("window.open(" + JSON.stringify(data.request.url) + ',"_blank")');
      } else if (action === "block" && data && data.request) {
        const domain = data.request.url.replace(/https?:\/\//, "").split("/")[0];
        addBlockedDomain(domain);
        $(".req").each(function() {
          const rid = parseInt($(this).attr("id") || "");
          const rd = values.requests[rid];
          if (rd && rd.request && rd.request.url && rd.request.url.indexOf(domain) >= 0) {
            $(this).addClass("search-hidden").hide();
          }
        });
        alert("Blocked: " + domain);
      } else if (action === "export-postman-single" && data) {
        const item = requestToPostmanItem(data);
        if (item) {
          const col = { info: { name: "SpyKit - " + (data.request.method || "GET"), schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json" }, item: [item] };
          downloadJSON(JSON.stringify(col, null, 2), "spykit-request.json");
        }
      }
      $(".context-menu").remove();
    });
    $(document).on("click", "#open-browser-btn", function() {
      const url2 = ($("#form-url").val() || "").trim();
      if (url2) chrome.devtools.inspectedWindow.eval("window.open(" + JSON.stringify(url2) + ',"_blank")');
    });
    $(document).on("dblclick", ".req .clear", function() {
      const $row = $(this).closest(".req");
      $row.toggleClass("pinned");
      $row.find(".pin-star").toggleClass("pinned");
      const id2 = parseInt($row.attr("id") || "");
      if (id2) saveBookmark(id2, $row.hasClass("pinned"));
    });
    $(document).on("click", ".pin-star", function() {
      const $row = $(this).closest(".req");
      $row.toggleClass("pinned");
      $(this).toggleClass("pinned");
      const id2 = parseInt($row.attr("id") || "");
      if (id2) saveBookmark(id2, $row.hasClass("pinned"));
    });
    $(document).on("click", ".req .clear", function() {
      const $row = $(this).closest(".req");
      $row.toggleClass("selected-for-collection");
      $(this).toggleClass("visited");
    });
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        const items = [];
        $(".req.selected-for-collection").each(function() {
          const id2 = parseInt($(this).attr("id") || "");
          if (values.requests[id2]) items.push(values.requests[id2]);
        });
        if (!items.length) {
          for (const id2 in values.requests) items.push(values.requests[id2]);
        }
        if (chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ savedCollection: items }, function() {
            $("#copy-curl-btn").text("Saved!").fadeOut(1500, function() {
              $(this).text("Copy").show();
            });
          });
        }
      }
    });
    $(document).on("dblclick", "#form-body2", function() {
      const val = $(this).val();
      if (!val) return;
      const formatted = format(val, "json");
      if (formatted !== val) {
        $(this).val(formatted);
        autosize.update($(this));
      }
    });
    $('<button id="form-rate-btn" class="btn btn-xs btn-default" type="button" title="Rate limit" style="float:right;margin-right:4px">∞</button>').insertBefore("#form-send");
    $(document).on("click", "#form-rate-btn", function() {
      const delays = [0, 500, 1e3, 2e3];
      const idx = delays.indexOf(rateLimitDelay);
      const newDelay = delays[(idx + 1) % delays.length];
      setRateLimitDelay(newDelay);
      $(this).text(newDelay ? newDelay + "ms" : "∞");
      $(this).toggleClass("active", newDelay > 0);
    });
    const $viewportBar = $('<div id="viewport-bar"><button data-width="375">Mobile</button><button data-width="768">Tablet</button><button data-width="1024">Desktop</button><button data-width="0">Reset</button><span id="rate-badge" class="rate-badge" style="display:none">∞</span></div>');
    $(".search-bar-top").after($viewportBar);
    $viewportBar.hide();
    $(".url-actions").append('<button id="intruder-btn" class="btn btn-xs btn-default" type="button" title="Intruder">🎯 Intruder</button>');
    $(".url-actions").append('<button id="fuzzer-btn" class="btn btn-xs btn-default" type="button" title="Fuzz parameters">⚡ Fuzz</button>');
    $(".url-actions").append('<button id="repeater-btn" class="btn btn-xs btn-default" type="button" title="Repeater">🔄 Repeat</button>');
    $(".url-actions").append('<button id="decoder-btn" class="btn btn-xs btn-default" type="button" title="Inline decoders">🔍 Decode</button>');
    $(document).on("click", "#intruder-btn", function() {
      const existing = $("#intruder-dialog");
      if (existing.length) {
        existing.remove();
        return;
      }
      $("body").append(renderIntruderDialog());
      updateIntruderCount();
      const body2 = ($("#form-body").val() || "").trim();
      let isJson = false;
      try {
        isJson = !!(body2 && JSON.parse(body2));
      } catch {
        isJson = false;
      }
      if (isJson) {
        $("#intruder-position").val("json-body-key");
        try {
          const obj = JSON.parse(body2);
          const keys = Object.keys(obj);
          if (keys.length) $("#intruder-field").val(keys[0]);
        } catch {
        }
      } else {
        $("#intruder-position").val("url-param");
        const url2 = $("#form-url").val();
        const qIdx = url2.indexOf("?");
        if (qIdx >= 0) {
          const qs = url2.substring(qIdx + 1);
          const firstParam = qs.split("&")[0]?.split("=")[0] || "";
          $("#intruder-field").val(decodeURIComponent(firstParam));
        }
      }
      const custom = loadCustomPayloads();
      const $load = $("#intruder-load-custom");
      $load.find("option:not(:first)").remove();
      for (const name of Object.keys(custom)) {
        $load.append('<option value="' + name + '">' + name + "</option>");
      }
      $("#intruder-close").on("click", function() {
        $("#intruder-dialog").remove();
      });
    });
    $(document).on("change", "#intruder-position, #intruder-payload-type", function() {
      const ptype = $("#intruder-payload-type").val();
      $("#intruder-custom-area").toggle(ptype === "__custom__");
      updateIntruderCount();
    });
    $(document).on("input", "#intruder-custom-payloads", updateIntruderCount);
    function updateIntruderCount() {
      const ptype = $("#intruder-payload-type").val();
      const count = ptype === "__custom__" ? ($("#intruder-custom-payloads").val() || "").split("\n").filter((l) => l.trim()).length : getIntruderPayloads(ptype).length;
      $("#intruder-count").val(count + " payloads");
    }
    $(document).on("click", "#intruder-save-custom", function() {
      const name = prompt("Name for this payload list:");
      if (!name) return;
      const payloads = ($("#intruder-custom-payloads").val() || "").split("\n").map((l) => l.trim()).filter(Boolean);
      saveCustomPayloads(name, payloads);
      $("#intruder-load-custom").append('<option value="' + name + '">' + name + "</option>");
      alert('Saved "' + name + '" (' + payloads.length + " payloads)");
    });
    $(document).on("change", "#intruder-load-custom", function() {
      const name = $("#intruder-load-custom").val();
      if (!name) return;
      const custom = loadCustomPayloads();
      const payloads = custom[name];
      if (payloads) {
        $("#intruder-custom-payloads").val(payloads.join("\n"));
        $("#intruder-payload-type").val("__custom__").trigger("change");
      }
    });
    let intruderCancel = false;
    let fuzzerCancel = false;
    $(document).on("click", "#intruder-stop", function() {
      intruderCancel = true;
      $("#intruder-stop").prop("disabled", true).text("⏹ Stopping...");
    });
    $(document).on("click", "#intruder-start", async function() {
      const position = $("#intruder-position").val();
      const field = $("#intruder-field").val();
      const ptype = $("#intruder-payload-type").val();
      const concurrent = parseInt($("#intruder-concurrent").val()) || 5;
      let payloads;
      if (ptype === "__custom__") {
        payloads = ($("#intruder-custom-payloads").val() || "").split("\n").map((l) => l.trim()).filter(Boolean);
      } else {
        payloads = getIntruderPayloads(ptype);
      }
      if (!payloads.length) {
        alert("No payloads");
        return;
      }
      if (!field && (position === "url-param" || position === "header")) {
        alert("Enter a field name");
        return;
      }
      const method2 = $("#form-method").val();
      let baseUrl = $("#form-url").val();
      const headers2 = $("#form-headers").val();
      const body2 = $("#form-body").val();
      $("#intruder-start").prop("disabled", true);
      $("#intruder-stop").show().prop("disabled", false).text("⏹ Stop");
      intruderCancel = false;
      $("#intruder-progress").show();
      clearIntruderResults();
      const results = [];
      const total = payloads.length;
      let completed = 0;
      async function sendPayload(payload, idx) {
        let targetUrl = baseUrl;
        let targetBody = body2;
        if (position === "url-param") {
          const paramEnc = encodeURIComponent(field);
          const payloadEnc = encodeURIComponent(payload);
          if (targetUrl.indexOf("?" + paramEnc + "=") >= 0 || targetUrl.indexOf("&" + paramEnc + "=") >= 0) {
            targetUrl = targetUrl.replace(new RegExp("([?&])" + paramEnc + "=[^&]*"), "$1" + paramEnc + "=" + payloadEnc);
          } else if (targetUrl.indexOf("?") >= 0) {
            targetUrl += "&" + paramEnc + "=" + payloadEnc;
          } else {
            targetUrl += "?" + paramEnc + "=" + payloadEnc;
          }
        } else if (position === "url-path") {
          targetUrl = baseUrl.replace(/\/[^/]*$/, "/" + encodeURIComponent(payload));
        } else if (position === "body") {
          targetBody = body2.replace(new RegExp(field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), payload);
        } else if (position === "json-body-key") {
          const append = $("#intruder-append").is(":checked");
          targetBody = replaceJsonKey(body2, field, payload, append);
        } else if (position === "header") {
          const hdrRegex = new RegExp("(" + field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")\\s*:\\s*[^\\r\\n]+", "i");
          const hdrReplace = "$1: " + payload;
          headers2.replace(hdrRegex, hdrReplace);
        }
        const startTime = performance.now();
        try {
          const result = await pageFetch(targetUrl, method2, headers2 ? { "Content-Type": "application/json" } : void 0, method2 !== "GET" ? targetBody : void 0);
          const elapsed = Math.round(performance.now() - startTime);
          results.push({
            method: method2,
            url: targetUrl,
            parameter: field,
            payload,
            status: result.status,
            bodySize: result.body.length,
            responseTime: elapsed,
            diff: result.body.length
          });
        } catch {
          results.push({
            method: method2,
            url: targetUrl,
            parameter: field,
            payload,
            status: 0,
            bodySize: 0,
            responseTime: 0,
            diff: 0
          });
        }
        completed++;
        const pct = Math.round(completed / total * 100);
        $("#intruder-progress-text").text(completed + " / " + total);
        $("#intruder-progress-pct").text(pct + "%");
        $("#intruder-progress-bar").css("width", pct + "%");
        const hideNoise = $("#intruder-hide-noise").is(":checked");
        const displayResults = hideNoise ? results.filter((r) => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
        $("#intruder-results").html(intruderResultsToHtml(displayResults));
      }
      for (let i = 0; i < payloads.length && !intruderCancel; i += concurrent) {
        const batch = payloads.slice(i, i + concurrent);
        await Promise.all(batch.map((p, j) => sendPayload(p)));
      }
      setIntruderResults(results);
      $("#intruder-start").prop("disabled", false).text("⚡ Start Attack");
      $("#intruder-stop").hide();
      if (intruderCancel) {
        $("#intruder-progress-text").text("Stopped: " + completed + " / " + total);
      } else {
        $("#intruder-progress-text").text("Done: " + total + " / " + total);
        $("#intruder-progress-bar").css("width", "100%");
      }
    });
    $(document).on("click", "#intruder-export", function() {
      const results = getIntruderResults();
      if (!results.length) {
        alert("No results to export");
        return;
      }
      let csv = "Index,Method,URL,Parameter,Payload,Status,Size,Time,Diff\n";
      for (let i = 0; i < results.length; i++) {
        const r = results[i];
        csv += i + 1 + "," + r.method + ',"' + r.url + '",' + r.parameter + ',"' + r.payload + '",' + r.status + "," + r.bodySize + "," + r.responseTime + "," + r.diff + "\n";
      }
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "intruder-results.csv";
      a.click();
    });
    $(document).on("click", "#intruder-clear", function() {
      clearIntruderResults();
      $("#intruder-results").empty();
      $("#intruder-progress").hide();
    });
    $(document).on("change", "#intruder-hide-noise", function() {
      const results = getIntruderResults();
      if (!results.length) return;
      const hideNoise = $("#intruder-hide-noise").is(":checked");
      const displayResults = hideNoise ? results.filter((r) => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
      $("#intruder-results").html(intruderResultsToHtml(displayResults));
    });
    $(document).on("click", "#fuzzer-btn", function() {
      const existingDialog = $("#fuzzer-dialog");
      if (existingDialog.length) {
        existingDialog.remove();
        return;
      }
      $("body").append(renderFuzzerDialog());
      clearFuzzResults();
      const body2 = ($("#form-body").val() || "").trim();
      let isJson = false;
      try {
        isJson = !!(body2 && JSON.parse(body2));
      } catch {
        isJson = false;
      }
      if (isJson) {
        $("#fuzzer-position").val("json-body-key");
        try {
          const obj = JSON.parse(body2);
          const keys = Object.keys(obj);
          if (keys.length) $("#fuzzer-param").val(keys[0]);
        } catch {
        }
      } else {
        $("#fuzzer-position").val("url-param");
        const url2 = $("#form-url").val();
        const qIdx = url2.indexOf("?");
        if (qIdx >= 0) {
          const qs = url2.substring(qIdx + 1);
          const firstParam = qs.split("&")[0]?.split("=")[0] || "";
          $("#fuzzer-param").val(decodeURIComponent(firstParam));
        }
      }
      $("#fuzzer-close").on("click", function() {
        $("#fuzzer-dialog").remove();
      });
    });
    $(document).on("click", "#fuzzer-stop", function() {
      fuzzerCancel = true;
      $("#fuzzer-stop").prop("disabled", true).text("⏹ Stopping...");
    });
    $(document).on("click", "#fuzzer-start", async function() {
      const param = $("#fuzzer-param").val();
      const type = $("#fuzzer-type").val();
      const position = $("#fuzzer-position").val();
      const append = $("#fuzzer-append").is(":checked");
      if (!param && position !== "url-path" && type !== "subdomain") {
        alert("Enter a field name");
        return;
      }
      const payloads = getFuzzPayloads(type);
      if (!payloads.length) {
        alert("No payloads available for selected type");
        return;
      }
      const method2 = $("#form-method").val();
      let baseUrl = $("#form-url").val();
      const headers2 = $("#form-headers").val();
      const body2 = $("#form-body").val();
      if (position === "url-path" && !baseUrl.endsWith("/")) {
        baseUrl += "/";
      }
      $("#fuzzer-start").prop("disabled", true);
      $("#fuzzer-stop").show().prop("disabled", false).text("⏹ Stop");
      fuzzerCancel = false;
      $("#fuzzer-progress").show();
      clearFuzzResults();
      const results = [];
      const total = payloads.length;
      for (let i = 0; i < payloads.length && !fuzzerCancel; i++) {
        const payload = payloads[i];
        let targetUrl = baseUrl;
        let targetBody = body2;
        if (type === "subdomain") {
          try {
            const urlObj = new URL(baseUrl);
            const parts = urlObj.hostname.split(".");
            if (parts.length >= 2) {
              parts[0] = payload;
            } else {
              parts.unshift(payload);
            }
            urlObj.hostname = parts.join(".");
            targetUrl = urlObj.toString();
          } catch {
            targetUrl = baseUrl;
          }
        } else if (position === "url-param") {
          const paramEncoded = encodeURIComponent(param);
          if (targetUrl.indexOf("?" + paramEncoded + "=") >= 0 || targetUrl.indexOf("&" + paramEncoded + "=") >= 0) {
            targetUrl = targetUrl.replace(new RegExp("([?&])" + paramEncoded + "=[^&]*"), "$1" + paramEncoded + "=" + encodeURIComponent(payload));
          } else if (targetUrl.indexOf("?") >= 0) {
            targetUrl += "&" + paramEncoded + "=" + encodeURIComponent(payload);
          } else {
            targetUrl += "?" + paramEncoded + "=" + encodeURIComponent(payload);
          }
        } else if (position === "json-body-key") {
          targetBody = replaceJsonKey$1(body2, param, payload, append);
        } else if (position === "url-path") {
          targetUrl = baseUrl + payload;
        }
        const startTime = performance.now();
        try {
          const result = await pageFetch(targetUrl, method2, headers2 ? { "Content-Type": "application/json" } : void 0, method2 !== "GET" ? targetBody : void 0);
          const elapsed = Math.round(performance.now() - startTime);
          results.push({
            method: method2,
            url: targetUrl,
            parameter: param,
            payload,
            status: result.status,
            bodySize: result.body.length,
            responseTime: elapsed,
            diff: result.body.length
          });
        } catch {
          results.push({
            method: method2,
            url: targetUrl,
            parameter: param,
            payload,
            status: 0,
            bodySize: 0,
            responseTime: 0,
            diff: 0
          });
        }
        const pct = Math.round((i + 1) / total * 100);
        $("#fuzzer-progress-text").text(i + 1 + " / " + total);
        $("#fuzzer-progress-pct").text(pct + "%");
        $("#fuzzer-progress-bar").css("width", pct + "%");
        if (i % 5 === 0 || i === total - 1) {
          const hideNoise2 = $("#fuzzer-hide-noise").is(":checked");
          const displayResults2 = hideNoise2 ? results.filter((r) => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
          $("#fuzzer-results").html(fuzzResultsToHtml(displayResults2));
        }
      }
      setFuzzResults(results);
      $("#fuzzer-start").prop("disabled", false).text("⚡ Start Fuzzing");
      $("#fuzzer-stop").hide();
      if (fuzzerCancel) {
        $("#fuzzer-progress-text").text("Stopped: " + results.length + " / " + total);
      } else {
        $("#fuzzer-progress-text").text("Done: " + total + " / " + total);
        $("#fuzzer-progress-bar").css("width", "100%");
      }
      const hideNoise = $("#fuzzer-hide-noise").is(":checked");
      const displayResults = hideNoise ? results.filter((r) => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
      $("#fuzzer-results").html(fuzzResultsToHtml(displayResults));
    });
    $(document).on("click", "#fuzzer-export-csv", function() {
      const results = getFuzzResults();
      if (!results.length) {
        alert("No results to export");
        return;
      }
      const csv = fuzzResultsToCsv(results);
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "fuzzer-results.csv";
      a.click();
    });
    $(document).on("click", "#fuzzer-clear", function() {
      clearFuzzResults();
      $("#fuzzer-results").empty();
      $("#fuzzer-progress").hide();
    });
    $(document).on("change", "#fuzzer-hide-noise", function() {
      const results = getFuzzResults();
      if (!results.length) return;
      const hideNoise = $("#fuzzer-hide-noise").is(":checked");
      const displayResults = hideNoise ? results.filter((r) => r.status !== 0 && r.status !== 404 && r.status !== 410) : results;
      $("#fuzzer-results").html(fuzzResultsToHtml(displayResults));
    });
    $(document).on("click", "#repeater-btn", function() {
      const existingDialog = $("#repeater-dialog");
      if (existingDialog.length) {
        existingDialog.remove();
        return;
      }
      $("body").append(renderRepeaterDialog());
      clearRepeaterResults();
      $("#repeater-close").on("click", function() {
        $("#repeater-dialog").remove();
      });
    });
    $(document).on("click", "#repeater-start", async function() {
      const count = parseInt($("#repeater-count").val()) || 5;
      const method2 = $("#form-method").val();
      const url2 = $("#form-url").val();
      const headers2 = $("#form-headers").val();
      const body2 = $("#form-body").val();
      $("#repeater-start").prop("disabled", true).text("Repeating...");
      clearRepeaterResults();
      const results = [];
      const total = count;
      for (let i = 0; i < count; i++) {
        const startTime = performance.now();
        try {
          const result = await pageFetch(url2, method2, headers2 ? { "Content-Type": "application/json" } : void 0, method2 !== "GET" ? body2 : void 0);
          const elapsed = Math.round(performance.now() - startTime);
          results.push({ index: i, status: result.status, bodySize: result.body.length, time: elapsed, bodyPreview: result.body.substring(0, 100), url: url2, method: method2 });
        } catch {
          results.push({ index: i, status: 0, bodySize: 0, time: 0, bodyPreview: "Error", url: url2, method: method2 });
        }
        setRepeaterResults(results);
        $("#repeater-results").html(repeaterResultsToHtml(results));
        $("#repeater-start").text("Repeating... (" + (i + 1) + "/" + total + ")");
      }
      $("#repeater-start").prop("disabled", false).text("🔄 Start Repeating");
    });
    $(document).on("click", "#repeater-export-csv", function() {
      const results = getRepeaterResults();
      if (!results.length) {
        alert("No results to export");
        return;
      }
      const csv = repeaterResultsToCsv(results);
      const blob = new Blob([csv], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "repeater-results.csv";
      a.click();
    });
    $(document).on("click", "#repeater-clear", function() {
      clearRepeaterResults();
      $("#repeater-results").empty();
    });
    $(document).on("click", "#decoder-btn", function() {
      const existingDialog = $("#decoder-dialog");
      if (existingDialog.length) {
        existingDialog.remove();
        return;
      }
      $("body").append(renderDecoderDialog());
      const bodyText = $("#form-body2").val();
      if (bodyText) $("#decoder-input").val(bodyText.substring(0, 1e3));
      $("#decoder-close").on("click", function() {
        $("#decoder-dialog").remove();
      });
      $("#decoder-detect").on("click", function() {
        const input = $("#decoder-input").val();
        const results = detectAndDecode(input);
        $("#decoder-output").html(decodersToHtml(results) || '<div style="color:#888;padding:8px">No encodings detected</div>');
      });
      $("#decoder-jwt").on("click", function() {
        const input = ($("#decoder-input").val() || "").trim();
        const tokens = findJWTInText(input);
        if (tokens.length) {
          let html = "";
          for (const t of tokens) {
            const prettyHeader = syntaxHighlightJSON(JSON.stringify(t.header, null, 2));
            const prettyPayload = syntaxHighlightJSON(JSON.stringify(t.payload, null, 2));
            html += '<div style="margin:4px 0;padding:4px;background:#16213e;border-radius:3px">';
            html += '<div style="color:#ffd700;font-weight:bold;margin-bottom:4px">🔒 JWT (' + t.alg + ")</div>";
            html += '<div style="font-size:10px;color:#888;word-break:break-all;margin-bottom:4px">' + t.raw.substring(0, 80) + "...</div>";
            html += '<details style="font-size:11px;margin-top:2px"><summary style="cursor:pointer;color:#888">Header</summary><pre style="margin:2px 0;padding:4px;background:#0f0f23;border-radius:3px;font-size:10px;overflow-x:auto">' + prettyHeader + "</pre></details>";
            html += '<details style="font-size:11px;margin-top:2px"><summary style="cursor:pointer;color:#888">Payload</summary><pre style="margin:2px 0;padding:4px;background:#0f0f23;border-radius:3px;font-size:10px;overflow-x:auto">' + prettyPayload + "</pre></details>";
            if (t.issues.length) {
              for (const issue of t.issues) {
                html += '<div style="color:#ffaa00;font-size:10px;margin-top:2px">⚠ ' + issue + "</div>";
              }
            }
            html += "</div>";
          }
          $("#decoder-output").html(html);
        } else {
          $("#decoder-output").html('<div style="color:#888;padding:8px">No JWT tokens found</div>');
        }
      });
      $("#decoder-base64").on("click", function() {
        try {
          const decoded = atob(($("#decoder-input").val() || "").trim());
          $("#decoder-output").html('<div style="color:#7ab7ef;font-weight:bold">Base64 Decoded:</div><pre style="background:#0f0f23;padding:4px;color:#eee;font-size:11px;word-break:break-all">' + decoded.substring(0, 500) + "</pre>");
        } catch {
          $("#decoder-output").html('<div style="color:#ff4444">Invalid Base64 input</div>');
        }
      });
      $("#decoder-url").on("click", function() {
        try {
          const decoded = decodeURIComponent($("#decoder-input").val() || "");
          $("#decoder-output").html('<div style="color:#7ab7ef;font-weight:bold">URL Decoded:</div><pre style="background:#0f0f23;padding:4px;color:#eee;font-size:11px;word-break:break-all">' + decoded.substring(0, 500) + "</pre>");
        } catch {
          $("#decoder-output").html('<div style="color:#ff4444">Invalid URL encoding</div>');
        }
      });
      $("#decoder-hex").on("click", function() {
        try {
          const hex = ($("#decoder-input").val() || "").replace(/\s/g, "");
          if (/^[0-9A-Fa-f]+$/.test(hex) && hex.length % 2 === 0) {
            const decoded = hex.match(/.{2}/g)?.map((b) => String.fromCharCode(parseInt(b, 16))).join("") || "";
            $("#decoder-output").html('<div style="color:#7ab7ef;font-weight:bold">Hex Decoded:</div><pre style="background:#0f0f23;padding:4px;color:#eee;font-size:11px;word-break:break-all">' + decoded.substring(0, 500) + "</pre>");
          } else {
            $("#decoder-output").html('<div style="color:#ff4444">Invalid hex input</div>');
          }
        } catch {
          $("#decoder-output").html('<div style="color:#ff4444">Invalid hex input</div>');
        }
      });
    });
    $(document).on("click", "#shortcuts-btn", function() {
      $("#shortcuts-modal").toggle();
    });
    $(document).on("click", "#shortcuts-close", function() {
      $("#shortcuts-modal").hide();
    });
    $(document).on("dblclick", ".fuzz-result-row", function() {
      const url2 = $(this).data("url");
      const method2 = $(this).data("method");
      if (url2) {
        $("#form-method").val(method2 || "GET");
        $("#form-url").val(url2);
        autosize.update($("#form-url"));
        $("#form-status").val("");
        $("#form-headers2").val("");
        $("#form-body2").val("");
      }
    });
    $(document).on("dblclick", ".repeater-result-row", function() {
      const url2 = $(this).data("url");
      const method2 = $(this).data("method");
      if (url2) {
        $("#form-method").val(method2 || "GET");
        $("#form-url").val(url2);
        autosize.update($("#form-url"));
      }
    });
    setOnQueueChange(renderInterceptQueue);
    renderInterceptQueue();
    setOnRequestProcessed((req, action) => {
      const entry = {
        request: {
          method: req.method,
          url: req.url,
          headers: Array.isArray(req.headers) ? req.headers : [],
          postData: req.postData ? { text: req.postData } : void 0
        },
        response: {
          status: action === "forwarded" ? -1 : 0,
          statusText: action === "forwarded" ? "Forwarded" : "Dropped",
          headers: [],
          bodySize: 0
        },
        time: 0
      };
      onData(entry);
    });
    $(document).on("click", "#intercept-btn", function() {
      try {
        const $btn = $(this);
        if (!isInterceptorAttached()) {
          let tabId;
          try {
            tabId = chrome.devtools.inspectedWindow.tabId;
          } catch (e) {
            console.error("[SpyKit] Cannot access inspectedWindow:", e.message);
            alert("[SpyKit] Extension context was invalidated.\n\nPlease close and reopen DevTools to continue using the Interceptor.");
            return;
          }
          $btn.text("⏳ Attaching...").prop("disabled", true);
          attachInterceptor(tabId, (success) => {
            if (success) {
              toggleIntercept(true);
              $btn.toggleClass("active", true).text("⏸ Intercept").prop("disabled", false);
              $("#intercept-panel").show();
              updateFilterFixedTop();
            } else {
              $btn.text("⏸ Intercept").prop("disabled", false);
              if (chrome.runtime.lastError?.message?.includes("Extension context invalidated")) {
                alert("[SpyKit] Extension was reloaded.\n\nPlease close and reopen DevTools, then try again.");
              } else {
                alert(
                  '[SpyKit] Could not attach debugger.\n\nTo use Intercept:\n1. Close DevTools\n2. Go to chrome://extensions\n3. Enable "Developer mode"\n4. Click "Service Worker" for SpyKit\n5. Check the console for errors\n6. Reload the extension\n7. Reopen DevTools and try again\n\nIf the issue persists, try restarting the browser.'
                );
              }
            }
          });
          return;
        }
        const enable = !isInterceptEnabled();
        toggleIntercept(enable);
        $btn.toggleClass("active", enable);
        if (enable && getInterceptedQueue().length === 0) {
          $("#intercept-panel").show();
        }
        if (!enable && getInterceptedQueue().length === 0) {
          $("#intercept-panel").hide();
        }
        updateFilterFixedTop();
      } catch (e) {
        if (e.message && e.message.includes("Extension context invalidated")) {
          alert("[SpyKit] Extension was reloaded. Please close and reopen DevTools to continue.");
        } else {
          console.error("[SpyKit] intercept-btn error:", e);
        }
      }
    });
    $(document).on("click", "#intercept-forward-all", forwardAllRequests);
    $(document).on("click", "#intercept-drop-all", dropAllRequests);
    $(document).on("click", ".intercept-forward", function(e) {
      e.stopPropagation();
      const id2 = parseInt($(this).attr("data-id"));
      forwardRequest(id2);
    });
    $(document).on("click", ".intercept-drop", function(e) {
      e.stopPropagation();
      const id2 = parseInt($(this).attr("data-id"));
      dropRequest(id2);
    });
    $(document).on("click", ".intercept-item", function() {
      const id2 = parseInt($(this).attr("data-id"));
      if (isNaN(id2)) return;
      const queue = getInterceptedQueue();
      const req = queue.find((r) => r.id === id2);
      if (!req) return;
      console.log("[SpyKit] .intercept-item clicked, req:", req);
      $("#intercept-edit-id").val(String(id2));
      $("#intercept-edit-url").val(req.url);
      $("#intercept-edit-method").val(req.method);
      const headers2 = req.headers || [];
      const hdrStr = Array.isArray(headers2) ? headers2.map((h) => h.name + ": " + h.value).join("\n") : "";
      $("#intercept-edit-headers").val(hdrStr);
      $("#intercept-edit-body").val(req.postData || "");
      $("#intercept-edit-overlay").show();
    });
    $(document).on("click", "#intercept-edit-close, #intercept-edit-cancel", function() {
      $("#intercept-edit-overlay").hide();
    });
    $(document).on("click", "#intercept-edit-forward", function() {
      const id2 = parseInt($("#intercept-edit-id").val());
      const url2 = $("#intercept-edit-url").val();
      const method2 = $("#intercept-edit-method").val();
      const headers2 = $("#intercept-edit-headers").val();
      const body2 = $("#intercept-edit-body").val();
      console.log("[SpyKit] #intercept-edit-forward clicked:", { id: id2, url: url2, method: method2, headers: headers2, body: body2 });
      editAndForwardRequest(id2, url2, method2, headers2, body2);
      $("#intercept-edit-overlay").hide();
    });
    $(document).on("click", "#intercept-edit-drop", function() {
      const id2 = parseInt($("#intercept-edit-id").val());
      dropRequest(id2);
      $("#intercept-edit-overlay").hide();
    });
  }
  function updateFilterFixedTop() {
    const panelHeight = $("#intercept-panel").is(":visible") ? $("#intercept-panel").outerHeight() || 0 : 0;
    $(".filter.fixed").css("top", 32 + panelHeight);
  }
  function renderInterceptQueue() {
    const queue = getInterceptedQueue();
    const $container = $("#intercept-queue");
    const $panel = $("#intercept-panel");
    if (queue.length === 0) {
      if (!isInterceptEnabled()) {
        $panel.hide();
      }
      $container.empty();
      $("#intercept-count").text("0");
      updateFilterFixedTop();
      return;
    }
    $panel.show();
    $("#intercept-count").text(queue.length);
    const now = Date.now();
    let html = "";
    for (const req of queue) {
      const ago = Math.round((now - req.timestamp) / 1e3);
      const timeStr = ago < 60 ? ago + "s" : Math.round(ago / 60) + "m";
      html += '<div class="intercept-item" data-id="' + req.id + '">';
      html += '<span class="method ' + req.method + '">' + req.method + "</span>";
      html += '<span class="url" title="' + escapeHtml(req.url) + '">' + escapeHtml(truncateUrl(req.url)) + "</span>";
      html += '<span class="time">' + timeStr + "</span>";
      html += '<span class="actions">';
      html += '<button class="btn btn-xs btn-success intercept-forward" data-id="' + req.id + '">Fwd</button>';
      html += '<button class="btn btn-xs btn-danger intercept-drop" data-id="' + req.id + '">Drop</button>';
      html += "</span>";
      html += "</div>";
    }
    $container.html(html);
    updateFilterFixedTop();
  }
  $(document).on("keydown", "#intercept-edit-overlay", function(e) {
    if (e.key === "Escape") {
      $("#intercept-edit-overlay").hide();
    }
  });
  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function truncateUrl(url2) {
    try {
      const u = new URL(url2);
      const path = u.pathname.length + (u.search ? u.search.length : 0);
      if (path > 80) return u.origin + u.pathname.substring(0, 40) + "..." + u.pathname.slice(-20) + u.search;
      return url2;
    } catch {
      return url2.length > 100 ? url2.substring(0, 97) + "..." : url2;
    }
  }
  function simpleDiff(a, b) {
    if (a === b) return '<span class="diff-context">' + escapeHtml$2(a) + "</span>";
    const linesA = (a || "").split("\n");
    const linesB = (b || "").split("\n");
    let html = "";
    const maxLen = Math.max(linesA.length, linesB.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= linesA.length) {
        html += '<div class="diff-added">+ ' + escapeHtml$2(linesB[i]) + "</div>";
      } else if (i >= linesB.length) {
        html += '<div class="diff-removed">- ' + escapeHtml$2(linesA[i]) + "</div>";
      } else if (linesA[i] !== linesB[i]) {
        html += '<div class="diff-removed">- ' + escapeHtml$2(linesA[i]) + "</div>";
        html += '<div class="diff-added">+ ' + escapeHtml$2(linesB[i]) + "</div>";
      } else {
        html += '<div class="diff-context">  ' + escapeHtml$2(linesA[i]) + "</div>";
      }
    }
    return html;
  }
  function initDiffUI() {
    $("body").append('<div class="diff-container" id="diff-container"><button class="diff-close" id="diff-close">&times;</button><div class="diff-header"><span id="diff-a-label">Response A</span><span id="diff-b-label">Response B</span></div><pre id="diff-output"></pre></div>');
    $(document).on("click", "#diff-close", () => $("#diff-container").hide());
    $(document).on("click", ".req", function(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const id2 = parseInt($(this).attr("id") || "");
        const data = window.values.requests[id2];
        if (!data || !data.response) return;
        const body2 = data.response.content && data.response.content.text || "";
        if (!window._diffA) {
          window._diffA = { id: id2, body: body2, label: (data.request.method || "GET") + " " + (data.request.url || "") };
          $(this).addClass("selected-for-diff");
        } else if (window._diffA.id !== id2) {
          window._diffB = { id: id2, body: body2, label: (data.request.method || "GET") + " " + (data.request.url || "") };
          $(this).addClass("selected-for-diff");
          $("#diff-a-label").text("A: " + window._diffA.label);
          $("#diff-b-label").text("B: " + window._diffB.label);
          $("#diff-output").html(simpleDiff(window._diffA.body, window._diffB.body));
          $("#diff-container").show();
          $(".selected-for-diff").removeClass("selected-for-diff");
          window._diffA = null;
          window._diffB = null;
        }
      }
    });
  }
  function toHexDump(str) {
    if (!str) return "";
    const lines = [];
    for (let i = 0; i < str.length; i += 16) {
      const hex = [];
      const ascii = [];
      const addr = ("00000000" + i.toString(16)).slice(-8);
      for (let j = 0; j < 16; j++) {
        if (i + j < str.length) {
          const code2 = str.charCodeAt(i + j);
          hex.push(("0" + code2.toString(16)).slice(-2));
          ascii.push(code2 >= 32 && code2 <= 126 ? str[i + j] : ".");
        } else {
          hex.push("  ");
          ascii.push(" ");
        }
      }
      lines.push('<span class="hex-offset">' + addr + '</span> <span class="hex-bytes">' + hex.join(" ") + '</span>  <span class="hex-ascii">' + ascii.join("") + "</span>");
    }
    return '<div class="hex-dump">' + lines.join("\n") + "</div>";
  }
  function initHexView() {
    $(document).on("click", "#body-hex-btn", function() {
      const $preview = $("#form-body2-preview");
      const $textarea = $("#form-body2");
      const $btn = $(this);
      if ($preview.is(":visible") && $preview.find(".hex-dump").length) {
        $preview.hide();
        $textarea.show();
        $btn.text("Hex");
      } else {
        const content = $textarea.val();
        $preview.html(toHexDump(content));
        $textarea.hide();
        $preview.show();
        $btn.text("Raw");
      }
    });
  }
  function renderMockList() {
    let html = "";
    for (let i = 0; i < mocks.length; i++) {
      html += '<div class="mock-item">[' + mocks[i].status + "] " + escapeHtml$2(mocks[i].url) + ' <button class="mock-del" data-idx="' + i + '" style="float:right">&times;</button></div>';
    }
    $("#mock-list").html(html || '<div style="color:#888;padding:8px">No mocks</div>');
  }
  function initMocksUI() {
    mocks.splice(0, mocks.length, ...getMocks());
    $(document).on("click", "#mock-add", function() {
      const url2 = ($("#mock-url").val() || "").trim();
      const status = parseInt($("#mock-status").val());
      if (!url2) return;
      const body2 = $("#form-body2").val();
      const headers2 = $("#form-headers2").val();
      mocks.push({ url: url2, status, headers: headers2, body: body2 });
      saveMocks(mocks);
      $("#mock-url").val("");
      renderMockList();
    });
    $(document).on("click", "#mock-close", () => $("#mock-panel").hide());
    $(document).on("click", ".mock-item .mock-del", function() {
      const idx = parseInt($(this).data("idx"));
      mocks.splice(idx, 1);
      saveMocks(mocks);
      renderMockList();
    });
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        $("#mock-panel").toggle();
        if ($("#mock-panel").is(":visible")) renderMockList();
      }
    });
  }
  function renderWorkspaceList() {
    const workspaces = getWorkspaces();
    let html = "";
    for (let i = workspaces.length - 1; i >= 0; i--) {
      const count = workspaces[i].requests ? Object.keys(workspaces[i].requests).length : 0;
      html += '<div class="workspace-item" data-idx="' + i + '"><b>' + escapeHtml$2(workspaces[i].name) + "</b> (" + count + " requests)</div>";
    }
    $("#workspace-list").html(html || '<div style="color:#888;padding:8px">No workspaces</div>');
  }
  function initWorkspacesUI() {
    $(document).on("click", "#workspace-save", function() {
      const name = ($("#workspace-name").val() || "").trim();
      if (!name) return;
      const ws = { name, requests: {} };
      for (const id2 in values.requests) {
        ws.requests[id2] = values.requests[id2];
      }
      const workspaces = getWorkspaces();
      workspaces.push(ws);
      saveWorkspaces(workspaces);
      $("#workspace-name").val("");
      renderWorkspaceList();
    });
    $(document).on("click", "#workspaces-close", () => $("#workspaces-panel").hide());
    $(document).on("click", ".workspace-item", function() {
      const workspaces = getWorkspaces();
      const idx = parseInt($(this).data("idx"));
      const ws = workspaces[idx];
      if (ws && ws.requests) {
        if (confirm('Load workspace "' + ws.name + '"? Current requests will be cleared.')) {
          $(".req").remove();
          values.requests = {};
          for (const id2 in ws.requests) {
            onData(ws.requests[id2], parseInt(id2));
          }
        }
      }
      $("#workspaces-panel").hide();
    });
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "W") {
        e.preventDefault();
        $("#workspaces-panel").toggle();
        if ($("#workspaces-panel").is(":visible")) renderWorkspaceList();
      }
    });
  }
  function initRecordingUI() {
    $(document).on("click", "#record-btn", function() {
      setIsRecording(!isRecording);
      $(this).toggleClass("recording");
      $(this).text(isRecording ? "⏹" : "⏺");
      if (!isRecording && recordedData.length) {
        let output = "";
        for (const d of recordedData) {
          if (d.request) {
            output += (d.request.method || "GET") + " " + (d.request.url || "") + "\n";
            if (d.response) output += "→ " + (d.response.status || "") + "\n";
            output += "\n";
          }
        }
        copyToClipboard(output);
        setRecordedData([]);
      }
    });
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        e.preventDefault();
        $("#record-btn").click();
      }
    });
  }
  function captureForRecording(data) {
    if (isRecording && data) recordedData.push(data);
  }
  function initViewportUI() {
    $(document).on("click", "#viewport-bar button", function() {
      $("#viewport-bar button").removeClass("active");
      $(this).addClass("active");
      const w = parseInt($(this).data("width")) || 0;
      if (w) {
        chrome.devtools.inspectedWindow.eval("window.resizeTo(" + w + ", window.outerHeight)");
      }
    });
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "V") {
        e.preventDefault();
        $("#viewport-bar").toggle();
      }
    });
  }
  function renderSnippetList() {
    const snippets = getSnippets();
    let html = "";
    for (let i = snippets.length - 1; i >= 0; i--) {
      html += '<div class="snippet-item" data-idx="' + i + '"><b>' + snippets[i].method + "</b> " + escapeHtml$2(snippets[i].name) + "</div>";
    }
    $("#snippet-list").html(html || '<div style="color:#888;padding:8px">No snippets</div>');
  }
  function initSnippetsUI() {
    $(document).on("click", "#snippet-save", function() {
      const name = ($("#snippet-name").val() || "").trim();
      if (!name) return;
      const snippet = {
        name,
        method: $("#form-method").val(),
        url: $("#form-url").val(),
        headers: $("#form-headers").val(),
        body: $("#form-body").val()
      };
      const snippets = getSnippets();
      snippets.push(snippet);
      saveSnippets(snippets);
      $("#snippet-name").val("");
      renderSnippetList();
    });
    $(document).on("click", "#snippets-close", () => $("#snippets-panel").hide());
    $(document).on("click", ".snippet-item", function() {
      const snippets = getSnippets();
      const idx = parseInt($(this).data("idx"));
      const s = snippets[idx];
      if (s) {
        $("#form-method").val(s.method);
        $("#form-url").val(s.url);
        autosize.update($("#form-url"));
        $("#form-headers").val(s.headers);
        autosize.update($("#form-headers"));
        $("#form-body").val(s.body);
        autosize.update($("#form-body"));
      }
      $("#snippets-panel").hide();
    });
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        $("#snippets-panel").toggle();
        if ($("#snippets-panel").is(":visible")) renderSnippetList();
      }
    });
  }
  const connections = /* @__PURE__ */ new Map();
  function handleWSMessage(msg2) {
    const wsId = msg2.wsId;
    if (!connections.has(wsId)) {
      if (msg2.wsType === "open") {
        connections.set(wsId, {
          wsId,
          url: msg2.url || "unknown",
          messages: [],
          opened: msg2.timestamp || Date.now(),
          active: true
        });
      }
      return;
    }
    const conn = connections.get(wsId);
    let direction = "event";
    if (msg2.wsType === "send") direction = "sent";
    else if (msg2.wsType === "message") direction = "received";
    conn.messages.push({
      wsId,
      url: conn.url,
      type: msg2.wsType,
      data: msg2.data,
      dataLength: msg2.dataLength,
      code: msg2.code,
      reason: msg2.reason,
      timestamp: msg2.timestamp || Date.now(),
      direction
    });
    if (msg2.wsType === "close") {
      conn.active = false;
      conn.closed = msg2.timestamp || Date.now();
    }
  }
  function getWSConnections() {
    return Array.from(connections.values());
  }
  function clearWSConnections() {
    connections.clear();
  }
  function WSConnectionsToHtml() {
    const conns = getWSConnections();
    if (!conns.length) return '<div style="color:#888;padding:8px;text-align:center">No WebSocket connections captured</div>';
    let html = "";
    for (const conn of conns) {
      const color = conn.active ? "#44cc44" : "#888";
      const duration = conn.closed ? conn.closed - conn.opened + "ms" : "active";
      const sent = conn.messages.filter((m) => m.direction === "sent").length;
      const recv = conn.messages.filter((m) => m.direction === "received").length;
      html += `<div style="margin:4px 0;padding:6px;background:#1a1a2e;border:1px solid #333;border-radius:4px">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center">`;
      html += `<span style="color:${color};font-weight:bold">🌐 ${new URL(conn.url).hostname}</span>`;
      html += `<span style="color:#888;font-size:10px">${sent} ↑ / ${recv} ↓ | ${duration}</span>`;
      html += `</div>`;
      html += `<div style="color:#888;font-size:10px;word-break:break-all">${conn.url}</div>`;
      if (conn.messages.length) {
        html += `<div style="max-height:200px;overflow-y:auto;margin-top:4px">`;
        for (const msg2 of conn.messages.slice(-20)) {
          const ts = new Date(msg2.timestamp).toLocaleTimeString();
          const dirIcon = msg2.direction === "sent" ? "↑" : msg2.direction === "received" ? "↓" : "○";
          const dirColor = msg2.direction === "sent" ? "#7ab7ef" : msg2.direction === "received" ? "#44cc44" : "#888";
          const dataPreview = msg2.data ? msg2.data.length > 80 ? msg2.data.substring(0, 80) + "..." : msg2.data : "";
          html += `<div style="font-size:10px;padding:2px 0;border-bottom:1px solid #222">`;
          html += `<span style="color:${dirColor}">${dirIcon}</span> `;
          html += `<span style="color:#888">${ts}</span> `;
          html += `<span style="color:#eee;font-family:monospace">${dataPreview}</span>`;
          if (msg2.type === "close") html += ` <span style="color:#ffaa00">[closed code=${msg2.code}]</span>`;
          html += `</div>`;
        }
        html += `</div>`;
      }
      html += `</div>`;
    }
    return html;
  }
  function initWSPanel() {
    $(".search-bar-top").append('<button id="ws-btn" class="btn btn-xs btn-default" type="button" title="WebSocket Inspector" style="margin-left:4px">🌐 WS</button>');
    $(document).on("click", "#ws-btn", function() {
      toggleWSPanel();
    });
    chrome.runtime.onMessage.addListener(function(message) {
      if (message.wsType) {
        handleWSMessage(message);
        if ($("#ws-panel").is(":visible")) {
          renderWSContent();
        }
      }
    });
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "9") {
        e.preventDefault();
        toggleWSPanel();
      }
    });
  }
  function toggleWSPanel() {
    let $panel = $("#ws-panel");
    if ($panel.length) {
      $panel.toggle();
      if ($panel.is(":visible")) renderWSContent();
      return;
    }
    $panel = $(`
<div id="ws-panel" class="ws-panel" style="display:none;position:fixed;top:40px;right:0;width:400px;max-height:calc(100vh - 80px);background:#1e1e1e;border:1px solid #444;border-radius:4px;z-index:9998;overflow-y:auto;box-shadow:-2px 0 10px rgba(0,0,0,0.3)">
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #444;background:#2a2a2a;position:sticky;top:0;z-index:1">
    <span style="font-weight:bold;color:#7ab7ef">🌐 WebSocket Inspector</span>
    <div>
      <button id="ws-clear" class="btn btn-xs btn-default" style="padding:0 6px;margin-right:4px">Clear</button>
      <button id="ws-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
    </div>
  </div>
  <div id="ws-content" style="padding:6px;font-size:11px"></div>
</div>`);
    $("body").append($panel);
    $panel.show();
    renderWSContent();
    $(document).on("click", "#ws-close", () => $panel.hide());
    $(document).on("click", "#ws-clear", () => {
      clearWSConnections();
      renderWSContent();
    });
  }
  function renderWSContent() {
    $("#ws-content").html(WSConnectionsToHtml());
  }
  let sessions = [];
  let nextSessionId = 1;
  function initSessionCompare() {
    $(".search-bar-top").append('<button id="session-btn" class="btn btn-xs btn-default" type="button" title="Session Compare" style="margin-left:4px">≠ Sessions</button>');
    $(document).on("click", "#session-btn", function() {
      toggleSessionPanel();
    });
    $(document).on("keydown", function(e) {
      if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        toggleSessionPanel();
      }
    });
  }
  function toggleSessionPanel() {
    let $panel = $("#session-panel");
    if ($panel.length) {
      $panel.toggle();
      if ($panel.is(":visible")) renderSessionPanel();
      return;
    }
    $panel = $(`
<div id="session-panel" style="display:none;position:fixed;top:40px;right:0;width:450px;max-height:calc(100vh - 80px);background:#1e1e1e;border:1px solid #444;border-radius:4px;z-index:9998;overflow-y:auto;box-shadow:-2px 0 10px rgba(0,0,0,0.3)">
  <div style="display:flex;justify-content:space-between;align-items:center;padding:8px;border-bottom:1px solid #444;background:#2a2a2a;position:sticky;top:0;z-index:1">
    <span style="font-weight:bold;color:#f0c040">≠ Session Compare</span>
    <div>
      <button id="session-snapshot" class="btn btn-xs btn-default" style="padding:0 6px;margin-right:4px">+ Snapshot</button>
      <button id="session-clear" class="btn btn-xs btn-default" style="padding:0 6px;margin-right:4px">Clear</button>
      <button id="session-close" class="btn btn-xs btn-default" style="padding:0 6px">&times;</button>
    </div>
  </div>
  <div id="session-content" style="padding:6px;font-size:11px"></div>
</div>`);
    $("body").append($panel);
    $panel.show();
    renderSessionPanel();
    $(document).on("click", "#session-close", () => $panel.hide());
    $(document).on("click", "#session-clear", () => {
      sessions = [];
      renderSessionPanel();
    });
    $(document).on("click", "#session-snapshot", () => {
      snapshotCurrent();
      renderSessionPanel();
    });
    $(document).on("click", ".session-compare-btn", function() {
      const ids = ($(this).attr("data-ids") || "").split(",").map(Number);
      if (ids.length === 2) {
        compareSessions(ids[0], ids[1]);
      }
    });
  }
  function snapshotCurrent() {
    const snapshot = {};
    const requestIds = [];
    for (const id2 in values.requests) {
      const nid = Number(id2);
      if (!isNaN(nid) && values.requests[nid]) {
        snapshot[nid] = values.requests[nid];
        requestIds.push(nid);
      }
    }
    sessions.push({
      id: nextSessionId++,
      name: `Session ${sessions.length + 1} (${requestIds.length} req)`,
      timestamp: Date.now(),
      requests: snapshot,
      requestIds
    });
  }
  function renderSessionPanel() {
    const $content = $("#session-content");
    if (!sessions.length) {
      $content.html('<div style="color:#888;padding:8px;text-align:center">No sessions. Click "+ Snapshot" to capture current requests.</div>');
      return;
    }
    let html = "";
    for (const s of sessions) {
      const ts = new Date(s.timestamp).toLocaleTimeString();
      html += `<div style="margin:4px 0;padding:6px;background:#1a1a2e;border:1px solid #333;border-radius:4px">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:center">`;
      html += `<span style="color:#f0c040;font-weight:bold">#${s.id}: ${s.name}</span>`;
      html += `<span style="color:#888;font-size:10px">${ts}</span>`;
      html += `</div></div>`;
    }
    if (sessions.length >= 2) {
      html += `<div style="margin:8px 0;padding:6px;background:#2a2a2a;border:1px solid #444;border-radius:4px">`;
      html += `<div style="color:#888;margin-bottom:4px">Compare:</div>`;
      html += `<select id="session-a" style="background:#1e1e1e;color:#eee;border:1px solid #555;padding:2px;margin-right:4px">`;
      for (const s of sessions) html += `<option value="${s.id}">#${s.id} ${s.name}</option>`;
      html += `</select>`;
      html += `<span style="color:#888">vs</span>`;
      html += `<select id="session-b" style="background:#1e1e1e;color:#eee;border:1px solid #555;padding:2px;margin:0 4px">`;
      for (const s of sessions) html += `<option value="${s.id}">#${s.id} ${s.name}</option>`;
      html += `</select>`;
      html += `<button id="session-do-compare" class="btn btn-xs btn-default" style="padding:0 6px">Compare</button>`;
      html += `</div>`;
    }
    if ($("#session-do-compare").length) {
      $(document).off("click", "#session-do-compare").on("click", "#session-do-compare", function() {
        const aId = parseInt($("#session-a").val());
        const bId = parseInt($("#session-b").val());
        if (aId && bId) compareSessions(aId, bId);
      });
    }
    $content.html(html);
  }
  function compareSessions(aId, bId) {
    const a = sessions.find((s) => s.id === aId);
    const b = sessions.find((s) => s.id === bId);
    if (!a || !b) return;
    const aIds = new Set(a.requestIds);
    const bIds = new Set(b.requestIds);
    const onlyInA = [];
    const onlyInB = [];
    const inBoth = [];
    for (const id2 of aIds) {
      if (bIds.has(id2)) inBoth.push(id2);
      else onlyInA.push(id2);
    }
    for (const id2 of bIds) {
      if (!aIds.has(id2)) onlyInB.push(id2);
    }
    const reqUrl = (data) => data?.request?.url || "unknown";
    const reqMethod = (data) => data?.request?.method || "GET";
    const respCode = (data) => data?.response?.status || "-";
    const respBody = (data) => data?.response?.content?.text || "";
    let html = `<div style="margin:8px 0">`;
    html += `<div style="color:#0c0;font-weight:bold">Added (${onlyInB.length}):</div>`;
    for (const id2 of onlyInB.slice(0, 20)) {
      const data = b.requests[id2];
      html += `<div style="color:#0c0;padding:2px 4px;font-size:10px">+ ${reqMethod(data)} ${reqUrl(data)} <span style="color:#888">[${respCode(data)}]</span></div>`;
    }
    if (onlyInB.length > 20) html += `<div style="color:#888">...and ${onlyInB.length - 20} more</div>`;
    html += `<div style="color:#c00;margin-top:6px">Removed (${onlyInA.length}):</div>`;
    for (const id2 of onlyInA.slice(0, 20)) {
      const data = a.requests[id2];
      html += `<div style="color:#c00;padding:2px 4px;font-size:10px">- ${reqMethod(data)} ${reqUrl(data)} <span style="color:#888">[${respCode(data)}]</span></div>`;
    }
    if (onlyInA.length > 20) html += `<div style="color:#888">...and ${onlyInA.length - 20} more</div>`;
    let changed = 0;
    let changesHtml = "";
    for (const id2 of inBoth) {
      const aBody = respBody(a.requests[id2]);
      const bBody = respBody(b.requests[id2]);
      if (aBody && bBody && aBody !== bBody) {
        changed++;
        const data = b.requests[id2];
        changesHtml += `<div style="margin:4px 0;padding:4px;background:#1a1a2e;border:1px solid #444;border-radius:2px">`;
        changesHtml += `<div style="color:#ffa500;font-size:10px">${reqMethod(data)} ${reqUrl(data)}</div>`;
        changesHtml += `<div style="max-height:120px;overflow-y:auto;font-size:9px">${simpleDiff(aBody.substring(0, 500), bBody.substring(0, 500))}</div>`;
        changesHtml += `</div>`;
      }
    }
    if (changed) {
      html += `<div style="color:#ffa500;margin-top:6px">Changed responses (${changed}):</div>`;
      html += changesHtml;
    }
    html += `</div>`;
    const $content = $("#session-content");
    $content.html(html);
  }
  function restorePinState($row) {
    const id2 = parseInt($row.attr("id") || "");
    if (!id2) return;
    const bookmarks = getBookmarks();
    if (bookmarks.indexOf(id2) >= 0) {
      $row.addClass("pinned");
      $row.find(".pin-star").addClass("pinned");
    }
  }
  window.values = values;
  window.editRequest = editRequest;
  const onDataMocks = function(data, id2) {
    if (data && data.request && data.request.url) {
      for (const mock of mocks) {
        if (data.request.url.indexOf(mock.url) >= 0) {
          if (!data.response) data.response = { status: 0, headers: [], content: {} };
          if (data.response) {
            data.response.status = mock.status;
            data.response.content = { text: mock.body || "", mimeType: "application/json" };
          }
          break;
        }
      }
    }
    return id2;
  };
  const onDataRecording = function(data, id2) {
    captureForRecording(data);
    return id2;
  };
  const onDataPins = function(data, id2) {
    const rowId = id2 || rootId;
    const tr = $("#" + rowId);
    if (tr.length) restorePinState(tr);
    return id2;
  };
  setOnDataCallback(function(data, id2) {
    onDataMocks(data, id2);
    onDataRecording(data, id2);
    onDataPins(data, id2);
    return id2;
  });
  $(document).on("keydown", function(e) {
    if (e.key === "Escape" && window.dialogOpened) {
      $("#form-cancel").click();
      e.preventDefault();
    }
    if (e.ctrlKey && e.key === "Enter") {
      $("#form-send").click();
      e.preventDefault();
    }
    if (e.ctrlKey && e.key === "f" && !e.shiftKey) {
      $("#search-requests").focus();
      e.preventDefault();
    }
    if (e.ctrlKey && e.shiftKey && e.key === "F") {
      $("#search-body").focus();
      e.preventDefault();
    }
    if (e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !$(e.target).is("input, textarea, [contenteditable]")) {
      $("#shortcuts-modal").toggle();
      e.preventDefault();
    }
    if (e.key === "Escape" && $("#shortcuts-modal").is(":visible")) {
      $("#shortcuts-modal").hide();
      e.preventDefault();
    }
  });
  $(function() {
    try {
      console.log("SpyKit main script loaded for tab ", chrome.devtools.inspectedWindow.tabId);
    } catch (e) {
      console.error("[SpyKit] Extension context invalidated on init. Please close and reopen DevTools.", e.message);
      $("body").html(
        '<div style="padding:20px;color:#e0e0e0;font-family:sans-serif;text-align:center;margin-top:40px"><h2 style="color:#ff6b6b">SpyKit</h2><p>Extension context was invalidated.</p><p>Please <strong>close DevTools</strong>, reload the extension from <code>chrome://extensions</code>, and reopen DevTools.</p></div>'
      );
      return;
    }
    const storedMocks = JSON.parse(localStorage.getItem("spykit-mocks") || "[]");
    mocks.splice(0, mocks.length, ...storedMocks);
    JSON.parse(localStorage.getItem("spykit-bookmarks") || "[]");
    initTheme();
    initPanel();
    initDiffUI();
    initHexView();
    initMocksUI();
    initWorkspacesUI();
    initRecordingUI();
    initViewportUI();
    initBodySearchUI();
    initRESTClient();
    initEnvUI();
    initHistoryUI();
    initSnippetsUI();
    initWSPanel();
    initSessionCompare();
    window.addEventListener("beforeunload", () => {
      detachInterceptor();
    });
    window.spykitLoaded = true;
  });
})();
//# sourceMappingURL=main.bundle.js.map
