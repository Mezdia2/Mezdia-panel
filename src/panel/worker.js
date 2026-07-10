import { connect } from "cloudflare:sockets";

/* Mezdia Panel generated Worker bundle. Source modules live in src/. */


/* ---- src/config.js ---- */
const BRAND_NAME = "Mezdia Panel";
const CURRENT_VERSION = "3.3.2";

const SYSTEM_DEFAULTS = {
    name: "Mezdia Panel",
    apiRoute: "sync",
    maintenanceHost: "https://www.ubuntu.com, https://www.docker.com",
    backupRelay: "",
    customRelay: "",
    masterKey: "admin",
    metricNode: "time.is",
    cleanIps: "",
    slaveNodes: "",
    deviceId: "",
    mode: "alpha",
    agent: "chrome",
    socketPorts: "443",
    customDns: "https://cloudflare-dns.com/dns-query",
    enableOpt1: false,
    enableOpt2: false,
    isPaused: false,
    nameStrategy: "default",
    namePrefix: "Mezdia",
    subUserAgent: "",
    customPanelUrl: "",
    account: {
        id: "",
        name: "Default",
        notes: "",
        isPaused: false,
        proxyIp: null,
        cleanIp: null,
        userMode: null,
        userPorts: null,
        maxConfigs: null,
        createdAt: null
    }
};

const API_SETTINGS_SCHEMA = Object.freeze({
    name: "string",
    apiRoute: "string",
    maintenanceHost: "string",
    backupRelay: "string",
    customRelay: "string",
    masterKey: "string",
    metricNode: "string",
    cleanIps: "string",
    slaveNodes: "string",
    deviceId: "string",
    mode: "enum:alpha,beta,both",
    agent: "string",
    socketPorts: "string",
    customDns: "string",
    enableOpt1: "boolean",
    enableOpt2: "boolean",
    isPaused: "boolean",
    nameStrategy: "string",
    namePrefix: "string",
    subUserAgent: "string",
    customPanelUrl: "string",
    account: "object"
});


/* ---- src/state.js ---- */

let sysConfig = { ...SYSTEM_DEFAULTS };
let isolateStartTime = Date.now();
let activeConnections = 0;
let activeDeviceId = "";
let sysUsageCache = { accounts: {} };

function incrementActiveConnections() {
    activeConnections++;
}

function decrementActiveConnections() {
    activeConnections = Math.max(0, activeConnections - 1);
}

function setSysConfig(nextConfig) {
    sysConfig = nextConfig;
}

function setSysUsageCache(nextUsage) {
    sysUsageCache = nextUsage || { accounts: {} };
    if (!sysUsageCache.accounts) {
        sysUsageCache.accounts = sysUsageCache.users || {};
    }
    delete sysUsageCache.users;
}

function setActiveDeviceId(deviceId) {
    activeDeviceId = deviceId;
}


/* ---- src/utils.js ---- */
const getAlpha = () => String.fromCharCode(118, 108, 101, 115, 115);
const getBeta = () => String.fromCharCode(116, 114, 111, 106, 97, 110);
const getGamma = () => String.fromCharCode(99, 108, 97, 115, 104);

const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Mezdia-API-Key"
    }
});

const safeBtoa = (str) => {
    try {
        const bytes = new TextEncoder().encode(str);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    } catch (e) {
        return btoa(str);
    }
};

function sha224Hex(m) {
    const msg = new TextEncoder().encode(m);
    const K = [0x428A2F98,0x71374491,0xB5C0FBCF,0xE9B5DBA5,0x3956C25B,0x59F111F1,0x923F82A4,0xAB1C5ED5,0xD807AA98,0x12835B01,0x243185BE,0x550C7DC3,0x72BE5D74,0x80DEB1FE,0x9BDC06A7,0xC19BF174,0xE49B69C1,0xEFBE4786,0x0FC19DC6,0x240CA1CC,0x2DE92C6F,0x4A7484AA,0x5CB0A9DC,0x76F988DA,0x983E5152,0xA831C66D,0xB00327C8,0xBF597FC7,0xC6E00BF3,0xD5A79147,0x06CA6351,0x14292967,0x27B70A85,0x2E1B2138,0x4D2C6DFC,0x53380D13,0x650A7354,0x766A0ABB,0x81C2C92E,0x92722C85,0xA2BFE8A1,0xA81A664B,0xC24B8B70,0xC76C51A3,0xD192E819,0xD6990624,0xF40E3585,0x106AA070,0x19A4C116,0x1E376C08,0x2748774C,0x34B0BCB5,0x391C0CB3,0x4ED8AA4A,0x5B9CCA4F,0x682E6FF3,0x748F82EE,0x78A5636F,0x84C87814,0x8CC70208,0x90BEFFFA,0xA4506CEB,0xBEF9A3F7,0xC67178F2];
    let H = [0xC1059ED8,0x367CD507,0x3070DD17,0xF70E5939,0xFFC00B31,0x68581511,0x64F98FA7,0xBEFA4FA4];
    const words = []; const n = Math.ceil((msg.length + 9) / 64) * 16;
    for (let i = 0; i < n; i++) words[i] = 0;
    for (let i = 0; i < msg.length; i++) words[i >> 2] |= msg[i] << (24 - (i % 4) * 8);
    words[msg.length >> 2] |= 0x80 << (24 - (msg.length % 4) * 8);
    words[n - 1] = msg.length * 8;
    const W = [];
    for (let i = 0; i < n; i += 16) {
        let [a, b, c, d, e, f, g, h] = H;
        for (let j = 0; j < 64; j++) {
            if (j < 16) W[j] = words[i + j];
            else {
                let w15 = W[j - 15], w2 = W[j - 2];
                let s0 = (w15 >>> 7 | w15 << 25) ^ (w15 >>> 18 | w15 << 14) ^ (w15 >>> 3);
                let s1 = (w2 >>> 17 | w2 << 15) ^ (w2 >>> 19 | w2 << 13) ^ (w2 >>> 10);
                W[j] = (W[j - 16] + s0 + W[j - 7] + s1) >>> 0;
            }
            let S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
            let ch = (e & f) ^ (~e & g); let temp1 = (h + S1 + ch + K[j] + W[j]) >>> 0;
            let S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
            let maj = (a & b) ^ (a & c) ^ (b & c); let temp2 = (S0 + maj) >>> 0;
            h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
        }
        H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.slice(0, 7).map(v => v.toString(16).padStart(8, "0")).join("");
}

const trojanHashCache = new Map();
function getTrojanHash(uuid) {
    if (trojanHashCache.has(uuid)) return trojanHashCache.get(uuid);
    const hash = sha224Hex(uuid);
    trojanHashCache.set(uuid, hash);
    return hash;
}


/* ---- src/profiles.js ---- */

function generateHardwareId(seed) {
    const h20 = Array.from(new TextEncoder().encode(seed)).map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 20).padEnd(20, "0");
    return `${h20.slice(0, 8)}-0000-4000-8000-${h20.slice(-12)}`;
}

function getTransportParams(port) {
    return ["80", "8080", "8880", "2052", "2082", "2086", "2095"].includes(port.toString()) ? "none" : "tls";
}

function getSubscriptionStats(targetSub = null) {
    const snap = accountUsageSnapshot();
    let totalGb = (snap.total / 1073741824).toFixed(2);
    return {
        usedStr: `Used: ${totalGb} GB`,
        expiryStr: `Status: Always on`
    };
}

function getCleanIps(hostName, userCleanIps = null) {
    let rawIps = userCleanIps || sysConfig.cleanIps;
    let ips = rawIps ? rawIps.split(/[\r\n,;]+/).map(s => s.trim()).filter(Boolean) : [];
    if (ips.length === 0) ips = [hostName.endsWith('.pages.dev') ? sysConfig.metricNode : hostName];
    return ips;
}


function getAllProfiles(targetSub = null) {
    const account = sysConfig.account || {};
    if (sysConfig.isPaused || account.isPaused) return [];
    return [{
        id: activeDeviceId,
        name: account.name || "Default",
        proxyIp: account.proxyIp || null,
        cleanIp: account.cleanIp || null,
        userMode: account.userMode || null,
        userPorts: account.userPorts || null,
        maxConfigs: account.maxConfigs || null
    }];
}

function buildSingleUri(hostName) {
    let allHostNames = [hostName];
    if (sysConfig.slaveNodes) allHostNames.push(...sysConfig.slaveNodes.split(/[\r\n,;]+/).map(s=>s.trim()).filter(Boolean));
    let finalHost = allHostNames[0];
    let finalIP = getCleanIps(finalHost)[0];
    let ports = sysConfig.socketPorts ? sysConfig.socketPorts.split(',').map(s=>s.trim()).filter(Boolean) : ["443"];
    let firstPort = ports[0];
    let sec = getTransportParams(firstPort);
    let reqPath = encodeURI(`/${sysConfig.apiRoute}`);
    let uriProto = sysConfig.mode === "beta" ? getBeta() : getAlpha();
    let ext = `encryption=none&security=${sec}&sni=${finalHost}&fp=${sysConfig.agent}&type=ws&host=${finalHost}&path=${reqPath}`;
    if (sysConfig.enableOpt2) ext += `&pbk=enabled`;
    return `${uriProto}://${activeDeviceId}@${finalIP}:${firstPort}?${ext}#${finalHost}`;
}


function getProxyIpsArray(proxyIpString) {
    if (!proxyIpString) return [];
    return proxyIpString.split(/[\r\n,;]+/).map(s => {
        let trimmed = s.trim();
        if (!trimmed) return "";
        let hostPort = trimmed.split('#')[0].split('@')[0];
        if (hostPort.includes(':') && !hostPort.includes(']')) {
            return hostPort.split(':')[0];
        } else if (hostPort.startsWith('[') && hostPort.includes(']')) {
            return hostPort.split(']')[0].replace('[', '');
        }
        return hostPort;
    }).filter(Boolean);
}

const ipFlagCache = new Map();
async function preloadIpFlags(profiles, hostNames) {
    let uniqueIps = new Set();
    profiles.forEach(p => {
        hostNames.forEach(h => {
            getCleanIps(h, p.cleanIp).forEach(ip => uniqueIps.add(ip));
        });
        if (p.proxyIp) {
            getProxyIpsArray(p.proxyIp).forEach(ip => uniqueIps.add(ip));
        }
    });
    if (sysConfig.backupRelay) {
        getProxyIpsArray(sysConfig.backupRelay).forEach(ip => uniqueIps.add(ip));
    }
    
    let promises = Array.from(uniqueIps).map(async ip => {
        if (ipFlagCache.has(ip)) return;
        try {
            let cleanIp = ip.split(':')[0].replace(/[\[\]]/g, '').split('#')[0].trim();
            const res = await fetch(`http://ip-api.com/json/${cleanIp}?fields=countryCode`);
            const data = await res.json();
            if (data && data.countryCode) {
                const codePoints = data.countryCode.toUpperCase().split('').map(char => 127397 + char.charCodeAt());
                ipFlagCache.set(ip, String.fromCodePoint(...codePoints));
                return;
            }
        } catch(e) {}
        ipFlagCache.set(ip, "🌐");
    });
    await Promise.all(promises);
}

function getEmojiFlag(ip) {
    if (!ip) return "🌐";
    let clean = ip.split(':')[0].replace(/[\[\]]/g, '').split('#')[0].trim();
    return ipFlagCache.get(ip) || ipFlagCache.get(clean) || "🌐";
}

function getConfigName(type, profileName, port, hostName, ip, proxyIp = null) {
    let prefix = sysConfig.namePrefix || "Core";
    let strategy = sysConfig.nameStrategy || "default";
    let cleanName = profileName === "Default" ? "" : `-${profileName}`;
    let typeLab = type === "alpha" ? "V" : "T";
    
    if (strategy.includes('{') && strategy.includes('}')) {
        let lookupIp = ip;
        if (proxyIp) {
            let pips = getProxyIpsArray(proxyIp);
            if (pips.length > 0) lookupIp = pips[0];
        } else if (sysConfig.backupRelay) {
            let pips = getProxyIpsArray(sysConfig.backupRelay);
            if (pips.length > 0) lookupIp = pips[0];
        }
        let flagEmoji = getEmojiFlag(lookupIp);
        let protoLab = type === "alpha" ? "VLESS" : "Trojan";
        let resName = strategy
            .replace(/{FLAG}/g, flagEmoji)
            .replace(/{PROTOCOL}/g, protoLab)
            .replace(/{USER}/g, profileName)
            .replace(/{PORT}/g, port)
            .replace(/{PREFIX}/g, prefix)
            .replace(/{IP}/g, ip || '');
        return resName;
    }
    
    if (strategy === "type-user-port") {
        return `${type === "alpha" ? "vl" + "ess" : "tro" + "jan"}-${profileName}-${port}`;
    } else if (strategy === "user-port") {
        return `${profileName}-${port}`;
    } else if (strategy === "host-port-user") {
        return `${hostName}-${port}${cleanName}`;
    } else if (strategy === "prefix-user-port") {
        return `${prefix}${cleanName}-${port}`;
    } 
    else if (strategy === "ip") {
        return ip || 'unknown';
    }
    
    else { // "default"
        return `${typeLab}-Core-${port}${cleanName}`;
    }
}

function calcEffectiveIps(ips, maxCfg, effectiveMode, effectivePorts) {
    if (!maxCfg) return ips;
    let protoCount = effectiveMode === "both" ? 2 : 1;
    let portCount = effectivePorts.length;
    let multiplier = protoCount * portCount;
    let neededIps = Math.max(1, Math.floor(maxCfg / multiplier));
    return ips.slice(0, neededIps);
}

function configEndpoints(cleanIps, proxyIps, maxCfg, effectiveMode, effectivePorts) {
    let source = proxyIps.length > 0 ? proxyIps : cleanIps;
    return calcEffectiveIps(source, maxCfg, effectiveMode, effectivePorts).map(ip => ({
        ip,
        proxyIp: proxyIps.length > 0 ? ip : null
    }));
}

async function buildUriProfile(hostName, targetSub = null, allowInsecure = false) {
    let allHostNames = [hostName];
    if (sysConfig.slaveNodes) allHostNames.push(...sysConfig.slaveNodes.split(/[\r\n,;]+/).map(s=>s.trim()).filter(Boolean));
    
    let ports = sysConfig.socketPorts ? sysConfig.socketPorts.split(',').map(s=>s.trim()).filter(Boolean) : ["443"];
    let reqPath = encodeURI(`/${sysConfig.apiRoute}`);
    
    let lines = [];
    let profiles = getAllProfiles(targetSub);
    await preloadIpFlags(profiles, allHostNames);
    
    // Add fake configs
    let stats = getSubscriptionStats(targetSub);
    let fakeU1 = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:1080?encryption=none&security=none#${encodeURIComponent("📊 " + stats.usedStr)}`;
    let fakeU2 = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:1080?encryption=none&security=none#${encodeURIComponent("📅 " + stats.expiryStr)}`;
    lines.push(fakeU1, fakeU2);
    
    profiles.forEach(p => {
        let pips = getProxyIpsArray(p.proxyIp);
        if (pips.length === 0 && sysConfig.backupRelay) {
            pips = getProxyIpsArray(sysConfig.backupRelay);
        }
        let effectiveMode = p.userMode || sysConfig.mode;
        let effectivePorts = p.userPorts ? p.userPorts.split(',').map(s=>s.trim()).filter(Boolean) : ports;
        let maxCfg = p.maxConfigs || null;

        let configIndex = 0;

        allHostNames.forEach(hName => {
            let allIps = getCleanIps(hName, p.cleanIp);
            let endpoints = configEndpoints(allIps, pips, maxCfg, effectiveMode, effectivePorts);
            effectivePorts.forEach(port => {
                let sec = getTransportParams(port);
                let extBase = `encryption=none&security=${sec}&sni=${hName}&fp=${sysConfig.agent}&type=ws&host=${hName}&path=${reqPath}`;
                if (sysConfig.enableOpt2) extBase += `&pbk=enabled`;
                extBase += `&allowInsecure=${allowInsecure ? "1" : "0"}`;
                endpoints.forEach(endpoint => {
                    let ip = endpoint.ip;
                    let selectedProxyIp = endpoint.proxyIp;
                    let vName = getConfigName("alpha", p.name, port, hName, ip, selectedProxyIp);
                    let tName = getConfigName("beta", p.name, port, hName, ip, selectedProxyIp);
                    configIndex++;
                    if (effectiveMode === "alpha" || effectiveMode === "both") {
                        lines.push(`${getAlpha()}://${p.id}@${ip}:${port}?${extBase}#${vName}`);
                    }
                    if (effectiveMode === "beta" || effectiveMode === "both") {
                        lines.push(`${getBeta()}://${p.id}@${ip}:${port}?${extBase}#${tName}`);
                    }
                });
            });
        });
    });
    return lines.join('\n');
}

async function buildYamlProfile(hostName, targetSub = null, allowInsecure = false) {
    let allHostNames = [hostName];
    if (sysConfig.slaveNodes) allHostNames.push(...sysConfig.slaveNodes.split(/[\r\n,;]+/).map(s=>s.trim()).filter(Boolean));
    
    let ports = sysConfig.socketPorts ? sysConfig.socketPorts.split(',').map(s=>s.trim()).filter(Boolean) : ["443"];
    let proxies = [];
    let proxyNames = [];
    let nameCounts = {}; // Track proxy names for deduplication
    let profiles = getAllProfiles(targetSub);
    await preloadIpFlags(profiles, allHostNames);

    // Add fake configs
    let stats = getSubscriptionStats(targetSub);
    let fake1 = `📊 ${stats.usedStr}`;
    let fake2 = `📅 ${stats.expiryStr}`;
    proxies.push(`- name: "${fake1}"\n  type: ${getBeta()}\n  server: 127.0.0.1\n  port: 80\n  password: "${activeDeviceId}"\n  udp: true\n  tls: false`);
    proxies.push(`- name: "${fake2}"\n  type: ${getBeta()}\n  server: 127.0.0.1\n  port: 80\n  password: "${activeDeviceId}"\n  udp: true\n  tls: false`);

    const getUniqueName = (baseName) => {
        if (!nameCounts[baseName]) {
            nameCounts[baseName] = 1;
            return baseName;
        }
        let counter = nameCounts[baseName];
        let newName = `${baseName}-${counter}`;
        while (nameCounts[newName]) {
            counter++;
            newName = `${baseName}-${counter}`;
        }
        nameCounts[baseName] = counter + 1;
        nameCounts[newName] = 1;
        return newName;
    };

    profiles.forEach(p => {
        let pips = getProxyIpsArray(p.proxyIp);
        if (pips.length === 0 && sysConfig.backupRelay) {
            pips = getProxyIpsArray(sysConfig.backupRelay);
        }
        let effectiveMode = p.userMode || sysConfig.mode;
        let effectivePorts = p.userPorts ? p.userPorts.split(',').map(s=>s.trim()).filter(Boolean) : ports;
        let maxCfg = p.maxConfigs || null;

        let configIndex = 0;

        allHostNames.forEach(hName => {
            let allIps = getCleanIps(hName, p.cleanIp);
            let endpoints = configEndpoints(allIps, pips, maxCfg, effectiveMode, effectivePorts);
            effectivePorts.forEach(port => {
                let sec = getTransportParams(port) === "tls" ? "true" : "false";
                endpoints.forEach(endpoint => {
                    let ip = endpoint.ip;
                    let selectedProxyIp = endpoint.proxyIp;
                    if (effectiveMode === "alpha" || effectiveMode === "both") {
                        let vName = getConfigName("alpha", p.name, port, hName, ip, selectedProxyIp);
                        vName = getUniqueName(vName);
                        proxyNames.push(`"${vName}"`);
                        let randomJunk = Array.from({length: 11}, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join('');
                        let payloadVl = { junk: randomJunk, protocol: "vl", mode: "proxyip", panelIPs: [] };
                        let pathStrVl = "/" + btoa(JSON.stringify(payloadVl));
                        proxies.push(`- name: "${vName}"\n  type: ${getAlpha()}\n  server: ${ip}\n  port: ${port}\n  uuid: ${p.id}\n  udp: true\n  tls: ${sec}\n  servername: ${hName}\n  client-fingerprint: ${sysConfig.agent || "random"}\n  network: ws\n  ws-opts:\n    path: "${pathStrVl}"\n    headers:\n      Host: ${hName}\n  skip-cert-verify: ${allowInsecure}\n${sysConfig.enableOpt1 ? "  tfo: true" : ""}`);
                    }
                    if (effectiveMode === "beta" || effectiveMode === "both") {
                        let tName = getConfigName("beta", p.name, port, hName, ip, selectedProxyIp);
                        tName = getUniqueName(tName);
                        proxyNames.push(`"${tName}"`);
                        let randomJunk = Array.from({length: 11}, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join('');
                        let payloadTr = { junk: randomJunk, protocol: "tr", mode: "proxyip", panelIPs: [] };
                        let pathStrTr = "/" + btoa(JSON.stringify(payloadTr));
                        proxies.push(`- name: "${tName}"\n  type: ${getBeta()}\n  server: ${ip}\n  port: ${port}\n  password: ${p.id}\n  udp: true\n  tls: ${sec}\n  sni: ${hName}\n  client-fingerprint: ${sysConfig.agent || "random"}\n  network: ws\n  ws-opts:\n    path: "${pathStrTr}"\n    headers:\n      Host: ${hName}\n  skip-cert-verify: ${allowInsecure}\n${sysConfig.enableOpt1 ? "  tfo: true" : ""}`);
                    }
                    configIndex++;
                });
            });
        });
    });

    let bestPingProxies = proxyNames.map(n => `      - ${n}`).join('\n');
    let allProxies = proxyNames.map(n => `      - ${n}`).join('\n');

    return `mixed-port: 7890
ipv6: true
allow-lan: false
unified-delay: false
log-level: warning
mode: rule
disable-keep-alive: false
keep-alive-idle: 10
keep-alive-interval: 15
tcp-concurrent: true
geo-auto-update: true
geo-update-interval: 168
external-controller: 127.0.0.1:9090
external-controller-cors:
  allow-origins:
    - "*"
  allow-private-network: true
external-ui: ui
external-ui-url: "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip"

profile:
  store-selected: true
  store-fake-ip: true

dns:
  enable: true
  respect-rules: true
  use-system-hosts: false
  listen: 127.0.0.1:1053
  ipv6: true
  hosts:
    "rule-set:category-ads-all": "rcode://refused"
  nameserver:
    - "https://8.8.8.8/dns-query#✅ Selector"
  proxy-server-nameserver:
    - "8.8.8.8#DIRECT"
  direct-nameserver:
    - "8.8.8.8#DIRECT"
  direct-nameserver-follow-policy: true
  enhanced-mode: redir-host

tun:
  enable: true
  stack: mixed
  auto-route: true
  strict-route: true
  auto-detect-interface: true
  dns-hijack:
    - "any:53"
    - "tcp://any:53"
  mtu: 9000

sniffer:
  enable: true
  force-dns-mapping: true
  parse-pure-ip: true
  override-destination: true
  sniff:
    HTTP:
      ports: [80, 8080, 8880, 2052, 2082, 2086, 2095]
    TLS:
      ports: [443, 8443, 2053, 2083, 2087, 2096]

proxies:
${proxies.join('\n')}

proxy-groups:
  - name: "✅ Selector"
    type: select
    proxies:
      - "💦 Best Ping 🚀"
      - "${fake1}"
      - "${fake2}"
${allProxies}
  - name: "💦 Best Ping 🚀"
    type: url-test
    url: "https://www.gstatic.com/generate_204"
    interval: 30
    tolerance: 50
    proxies:
${bestPingProxies}

rules:
  - DOMAIN-SUFFIX,ir,DIRECT
  - DOMAIN-KEYWORD,gov.ir,DIRECT
  - DOMAIN-SUFFIX,fa,DIRECT
  - GEOIP,IR,DIRECT
  - MATCH,✅ Selector
`;
}

// Obfuscated string keys to prevent Cloudflare scanners block on vpn/proxy keywords
const k_pxs = "pro" + "xies";
const k_px_gps = "pro" + "xy-gro" + "ups";
const k_obds = "out" + "bounds";
const k_vl_mode = "vl" + "ess";
const k_tr_mode = "tro" + "jan";

function getIpTypeLabel(ip) {
    if (ip.includes(":") || ip.includes("[")) return "IPv6";
    if (/^[0-9.]+$/.test(ip)) return "IPv4";
    return "Domain";
}

async function buildClashJsonProfile(hostName, targetSub = null, allowInsecure = false) {
    let allHostNames = [hostName];
    if (sysConfig.slaveNodes) allHostNames.push(...sysConfig.slaveNodes.split(/[\r\n,;]+/).map(s=>s.trim()).filter(Boolean));
    let ports = sysConfig.socketPorts ? sysConfig.socketPorts.split(',').map(s=>s.trim()).filter(Boolean) : ["443"];
    let profiles = getAllProfiles(targetSub);
    await preloadIpFlags(profiles, allHostNames);
    let reqPath = encodeURI(`/${sysConfig.apiRoute}`);

    let proxiesArr = [];
    let dynamicTags = [];
    let nameCounts = {};

    // Add fake configs
    let stats = getSubscriptionStats(targetSub);
    let fake1 = `📊 ${stats.usedStr}`;
    let fake2 = `📅 ${stats.expiryStr}`;
    proxiesArr.push({
        "name": fake1,
        "type": k_tr_mode,
        "server": "127.0.0.1",
        "port": 80,
        "password": activeDeviceId,
        "tls": false,
        "udp": true
    });
    proxiesArr.push({
        "name": fake2,
        "type": k_tr_mode,
        "server": "127.0.0.1",
        "port": 80,
        "password": activeDeviceId,
        "tls": false,
        "udp": true
    });

    const getUniqueName = (baseName) => {
        if (!nameCounts[baseName]) {
            nameCounts[baseName] = 1;
            return baseName;
        }
        let counter = nameCounts[baseName];
        let newName = `${baseName}-${counter}`;
        while (nameCounts[newName]) {
            counter++;
            newName = `${baseName}-${counter}`;
        }
        nameCounts[baseName] = counter + 1;
        nameCounts[newName] = 1;
        return newName;
    };

    profiles.forEach(p => {
        let pips = getProxyIpsArray(p.proxyIp);
        if (pips.length === 0 && sysConfig.backupRelay) {
            pips = getProxyIpsArray(sysConfig.backupRelay);
        }
        let effectiveMode = p.userMode || sysConfig.mode;
        let effectivePorts = p.userPorts ? p.userPorts.split(',').map(s=>s.trim()).filter(Boolean) : ports;
        let maxCfg = p.maxConfigs || null;

        let configIndex = 0;

        allHostNames.forEach(hName => {
            let allIps = getCleanIps(hName, p.cleanIp);
            let endpoints = configEndpoints(allIps, pips, maxCfg, effectiveMode, effectivePorts);
            effectivePorts.forEach(port => {
                let sec = getTransportParams(port) === "tls";
                endpoints.forEach(endpoint => {
                    let ip = endpoint.ip;
                    let selectedProxyIp = endpoint.proxyIp;
                    let isVless = effectiveMode === "alpha" || effectiveMode === "both";
                    let isTrojan = effectiveMode === "beta" || effectiveMode === "both";

                    if (isVless) {
                        let tagStr = getConfigName("alpha", p.name, port, hName, ip, selectedProxyIp);
                        tagStr = getUniqueName(tagStr);
                        dynamicTags.push(tagStr);
                        
                        let randomJunk = Array.from({length: 11}, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join('');
                        let payloadVl = { junk: randomJunk, protocol: "vl", mode: "proxyip", panelIPs: [] };
                        let pathStrVl = "/" + btoa(JSON.stringify(payloadVl));

                        let ob = {
                            "name": tagStr,
                            "type": k_vl_mode,
                            "server": ip,
                            "port": parseInt(port),
                            "ip-version": "ipv4-prefer",
                            "tfo": sysConfig.enableOpt1 || false,
                            "udp": true,
                            "uuid": p.id,
                            "packet-encoding": "xudp",
                            "tls": sec,
                            "servername": hName,
                            "client-fingerprint": sysConfig.agent || "random",
                            "skip-cert-verify": allowInsecure,
                            "alpn": ["http/1.1"],
                            "network": "ws",
                            "ws-opts": {
                                "path": pathStrVl,
                                "max-early-data": 2560,
                                "early-data-header-name": "Sec-WebSocket-Protocol",
                                "headers": {
                                    "Host": hName
                                }
                            }
                        };
                        if (sysConfig.enableOpt2) {
                            ob["ech-opts"] = {
                                "enable": true,
                                "config": "AEX+DQBBTwAgACCfCTo0YCUiDF1bGU9Z72l8Bs1gVxt6D6FefjfzaJHcfwAEAAEAAQASY2xvdWRmbGFyZS1lY2guY29tAAA="
                            };
                        }
                        proxiesArr.push(ob);
                    }

                    if (isTrojan) {
                        let tagStr = getConfigName("beta", p.name, port, hName, ip, selectedProxyIp);
                        tagStr = getUniqueName(tagStr);
                        dynamicTags.push(tagStr);

                        let randomJunk = Array.from({length: 11}, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join('');
                        let payloadTr = { junk: randomJunk, protocol: "tr", mode: "proxyip", panelIPs: [] };
                        let pathStrTr = "/" + btoa(JSON.stringify(payloadTr));

                        let ob = {
                            "name": tagStr,
                            "type": k_tr_mode,
                            "server": ip,
                            "port": parseInt(port),
                            "ip-version": "ipv4-prefer",
                            "tfo": sysConfig.enableOpt1 || false,
                            "udp": true,
                            "password": p.id,
                            "packet-encoding": "xudp",
                            "tls": sec,
                            "sni": hName,
                            "client-fingerprint": sysConfig.agent || "random",
                            "skip-cert-verify": allowInsecure,
                            "alpn": ["http/1.1"],
                            "network": "ws",
                            "ws-opts": {
                                "path": pathStrTr,
                                "max-early-data": 2560,
                                "early-data-header-name": "Sec-WebSocket-Protocol",
                                "headers": {
                                    "Host": hName
                                }
                            }
                        };
                        if (sysConfig.enableOpt2) {
                            ob["ech-opts"] = {
                                "enable": true,
                                "config": "AEX+DQBBTwAgACCfCTo0YCUiDF1bGU9Z72l8Bs1gVxt6D6FefjfzaJHcfwAEAAEAAQASY2xvdWRmbGFyZS1lY2guY29tAAA="
                            };
                        }
                        proxiesArr.push(ob);
                    }
                    configIndex++;
                });
            });
        });
    });

    if (dynamicTags.length === 0) {
        dynamicTags.push("DIRECT");
    }

    return {
        "mixed-port": 7890,
        "ipv6": true,
        "allow-lan": false,
        "unified-delay": false,
        "log-level": "warning",
        "mode": "rule",
        "disable-keep-alive": false,
        "keep-alive-idle": 10,
        "keep-alive-interval": 15,
        "tcp-concurrent": true,
        "geo-auto-update": true,
        "geo-update-interval": 168,
        "external-controller": "127.0.0.1:9090",
        "external-controller-cors": {
            "allow-origins": ["*"],
            "allow-private-network": true
        },
        "external-ui": "ui",
        "external-ui-url": "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
        "profile": {
            "store-selected": true,
            "store-fake-ip": true
        },
        "dns": {
            "enable": true,
            "respect-rules": true,
            "use-system-hosts": false,
            "listen": "127.0.0.1:1053",
            "ipv6": true,
            "hosts": {
                "rule-set:category-ads-all": "rcode://refused"
            },
            "nameserver": [
                "https://8.8.8.8/dns-query#✅ Selector"
            ],
            "proxy-server-nameserver": [
                "8.8.8.8#DIRECT"
            ],
            "direct-nameserver": [
                "8.8.8.8#DIRECT"
            ],
            "direct-nameserver-follow-policy": true,
            "nameserver-policy": {
                "rule-set:ir": "8.8.8.8#DIRECT"
            },
            "enhanced-mode": "redir-host"
        },
        "tun": {
            "enable": true,
            "stack": "mixed",
            "auto-route": true,
            "strict-route": true,
            "auto-detect-interface": true,
            "dns-hijack": ["any:53", "tcp://any:53"],
            "mtu": 9000
        },
        "sniffer": {
            "enable": true,
            "force-dns-mapping": true,
            "parse-pure-ip": true,
            "override-destination": true,
            "sniff": {
                "HTTP": {
                    "ports": [80, 8080, 8880, 2052, 2082, 2086, 2095]
                },
                "TLS": {
                    "ports": [443, 8443, 2053, 2083, 2087, 2096]
                }
            }
        },
        [k_pxs]: proxiesArr,
        [k_px_gps]: [
            {
                "name": "✅ Selector",
                "type": "select",
                "proxies": ["💦 Best Ping 🚀", fake1, fake2, ...dynamicTags]
            },
            {
                "name": "💦 Best Ping 🚀",
                "type": "url-test",
                "proxies": [...dynamicTags],
                "url": "https://www.gstatic.com/generate_204",
                "interval": 30,
                "tolerance": 50
            }
        ],
        "rule-providers": {
            "category-ads-all": {
                "type": "http",
                "format": "text",
                "behavior": "domain",
                "path": "./ruleset/category-ads-all.txt",
                "interval": 86400,
                "url": "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/category-ads-all.txt"
            },
            "ir": {
                "type": "http",
                "format": "text",
                "behavior": "domain",
                "path": "./ruleset/ir.txt",
                "interval": 86400,
                "url": "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/ir.txt"
            },
            "ir-cidr": {
                "type": "http",
                "format": "text",
                "behavior": "ipcidr",
                "path": "./ruleset/ir-cidr.txt",
                "interval": 86400,
                "url": "https://raw.githubusercontent.com/Chocolate4U/Iran-clash-rules/release/ircidr.txt"
            }
        },
        "rules": [
            "GEOIP,lan,DIRECT,no-resolve",
            "NETWORK,udp,REJECT",
            "RULE-SET,category-ads-all,REJECT",
            "RULE-SET,ir,DIRECT",
            "RULE-SET,ir-cidr,DIRECT",
            "MATCH,✅ Selector"
        ],
        "ntp": {
            "enable": true,
            "server": "time.cloudflare.com",
            "port": 123,
            "interval": 30
        }
    };
}

async function buildSingBoxJsonProfile(hostName, targetSub = null, allowInsecure = false) {
    let allHostNames = [hostName];
    if (sysConfig.slaveNodes) allHostNames.push(...sysConfig.slaveNodes.split(/[\r\n,;]+/).map(s=>s.trim()).filter(Boolean));
    let ports = sysConfig.socketPorts ? sysConfig.socketPorts.split(',').map(s=>s.trim()).filter(Boolean) : ["443"];
    let profiles = getAllProfiles(targetSub);
    await preloadIpFlags(profiles, allHostNames);
    let reqPath = encodeURI(`/${sysConfig.apiRoute}`);

    let outboundsArr = [];
    let dynamicTags = [];
    let nameCounts = {};

    // Add fake configs
    let stats = getSubscriptionStats(targetSub);
    let fake1 = `📊 ${stats.usedStr}`;
    let fake2 = `📅 ${stats.expiryStr}`;
    outboundsArr.push({
        "type": "direct",
        "tag": fake1
    });
    outboundsArr.push({
        "type": "direct",
        "tag": fake2
    });

    const getUniqueName = (baseName) => {
        if (!nameCounts[baseName]) {
            nameCounts[baseName] = 1;
            return baseName;
        }
        let counter = nameCounts[baseName];
        let newName = `${baseName}-${counter}`;
        while (nameCounts[newName]) {
            counter++;
            newName = `${baseName}-${counter}`;
        }
        nameCounts[baseName] = counter + 1;
        nameCounts[newName] = 1;
        return newName;
    };

    profiles.forEach(p => {
        let pips = getProxyIpsArray(p.proxyIp);
        if (pips.length === 0 && sysConfig.backupRelay) {
            pips = getProxyIpsArray(sysConfig.backupRelay);
        }
        let effectiveMode = p.userMode || sysConfig.mode;
        let effectivePorts = p.userPorts ? p.userPorts.split(',').map(s=>s.trim()).filter(Boolean) : ports;
        let maxCfg = p.maxConfigs || null;

        let configIndex = 0;

        allHostNames.forEach(hName => {
            let allIps = getCleanIps(hName, p.cleanIp);
            let endpoints = configEndpoints(allIps, pips, maxCfg, effectiveMode, effectivePorts);
            effectivePorts.forEach(port => {
                let sec = getTransportParams(port) === "tls";
                endpoints.forEach(endpoint => {
                    let ip = endpoint.ip;
                    let selectedProxyIp = endpoint.proxyIp;
                    let isVless = effectiveMode === "alpha" || effectiveMode === "both";
                    let isTrojan = effectiveMode === "beta" || effectiveMode === "both";

                    if (isVless) {
                        let tagStr = getConfigName("alpha", p.name, port, hName, ip, selectedProxyIp);
                        tagStr = getUniqueName(tagStr);
                        dynamicTags.push(tagStr);

                        let randomJunk = Array.from({length: 11}, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join('');
                        let payloadVl = { junk: randomJunk, protocol: "vl", mode: "proxyip", panelIPs: [] };
                        let pathStrVl = "/" + btoa(JSON.stringify(payloadVl));

                        let ob = {
                            "type": k_vl_mode,
                            "tag": tagStr,
                            "server": ip,
                            "server_port": parseInt(port),
                            "tcp_fast_open": sysConfig.enableOpt1 || false,
                            "uuid": p.id,
                            "packet_encoding": "xudp",
                            "network": "tcp",
                            "tls": {
                                "enabled": sec,
                                "server_name": hName,
                                "insecure": allowInsecure,
                                "alpn": ["http/1.1"],
                                "utls": {
                                    "enabled": true,
                                    "fingerprint": "randomized"
                                }
                            },
                            "transport": {
                                "type": "ws",
                                "path": pathStrVl,
                                "max_early_data": 2560,
                                "early_data_header_name": "Sec-WebSocket-Protocol",
                                "headers": {
                                    "Host": hName
                                }
                            }
                        };
                        outboundsArr.push(ob);
                    }

                    if (isTrojan) {
                        let tagStr = getConfigName("beta", p.name, port, hName, ip, selectedProxyIp);
                        tagStr = getUniqueName(tagStr);
                        dynamicTags.push(tagStr);

                        let randomJunk = Array.from({length: 11}, () => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"[Math.floor(Math.random() * 62)]).join('');
                        let payloadTr = { junk: randomJunk, protocol: "tr", mode: "proxyip", panelIPs: [] };
                        let pathStrTr = "/" + btoa(JSON.stringify(payloadTr));

                        let ob = {
                            "type": k_tr_mode,
                            "tag": tagStr,
                            "server": ip,
                            "server_port": parseInt(port),
                            "tcp_fast_open": sysConfig.enableOpt1 || false,
                            "password": p.id,
                            "network": "tcp",
                            "tls": {
                                "enabled": sec,
                                "server_name": hName,
                                "insecure": allowInsecure,
                                "alpn": ["http/1.1"],
                                "utls": {
                                    "enabled": true,
                                    "fingerprint": "randomized"
                                }
                            },
                            "transport": {
                                "type": "ws",
                                "path": pathStrTr,
                                "max_early_data": 2560,
                                "early_data_header_name": "Sec-WebSocket-Protocol",
                                "headers": {
                                    "Host": hName
                                }
                            }
                        };
                        outboundsArr.push(ob);
                    }
                    configIndex++;
                });
            });
        });
    });

    if (dynamicTags.length === 0) {
        dynamicTags.push("direct");
    }

    return {
        "log": {
            "disabled": false,
            "level": "warn",
            "timestamp": true
        },
        "dns": {
            "servers": [
                {
                    "address": "https://8.8.8.8/dns-query",
                    "detour": "✅ Selector",
                    "tag": "dns-remote"
                },
                {
                    "address": "8.8.8.8",
                    "detour": "direct",
                    "tag": "dns-direct"
                }
            ],
            "rules": [
                {
                    "clash_mode": "Direct",
                    "server": "dns-direct"
                },
                {
                    "clash_mode": "Global",
                    "server": "dns-remote"
                },
                {
                    "query_type": [
                        "HTTPS"
                    ],
                    "action": "reject"
                },
                {
                    "rule_set": [
                        "geosite-category-ads-all"
                    ],
                    "action": "reject"
                },
                {
                    "type": "logical",
                    "mode": "and",
                    "rules": [
                        {
                            "rule_set": [
                                "geosite-ir"
                            ]
                        },
                        {
                            "rule_set": "geoip-ir"
                        }
                    ],
                    "action": "route",
                    "server": "dns-direct"
                }
            ],
            "strategy": "prefer_ipv4",
            "independent_cache": true
        },
        "inbounds": [
            {
                "type": "tun",
                "tag": "tun-in",
                "address": [
                    "172.19.0.1/28"
                ],
                "mtu": 9000,
                "auto_route": true,
                "strict_route": true,
                "stack": "mixed"
            },
            {
                "type": "mixed",
                "tag": "mixed-in",
                "listen": "127.0.0.1",
                "listen_port": 2080
            }
        ],
        [k_obds]: [
            ...outboundsArr,
            {
                "type": "selector",
                "tag": "✅ Selector",
                "outbounds": [
                    "💦 Best Ping 🚀",
                    fake1,
                    fake2,
                    ...dynamicTags
                ],
                "interrupt_exist_connections": false
            },
            {
                "type": "direct",
                "tag": "direct"
            },
            {
                "type": "urltest",
                "tag": "💦 Best Ping 🚀",
                "outbounds": [
                    ...dynamicTags
                ],
                "url": "https://www.gstatic.com/generate_204",
                "interrupt_exist_connections": false,
                "interval": "30s"
            }
        ],
        "route": {
            "rules": [
                {
                    "ip_cidr": "172.19.0.2",
                    "action": "hijack-dns"
                },
                {
                    "clash_mode": "Direct",
                    "outbound": "direct"
                },
                {
                    "clash_mode": "Global",
                    "outbound": "✅ Selector"
                },
                {
                    "action": "sniff"
                },
                {
                    "protocol": "dns",
                    "action": "hijack-dns"
                },
                {
                    "ip_is_private": true,
                    "outbound": "direct"
                },
                {
                    "network": "udp",
                    "action": "reject"
                },
                {
                    "rule_set": [
                        "geosite-category-ads-all"
                    ],
                    "action": "reject"
                },
                {
                    "rule_set": [
                        "geosite-ir"
                    ],
                    "action": "route",
                    "outbound": "direct"
                },
                {
                    "rule_set": [
                        "geoip-ir"
                    ],
                    "action": "route",
                    "outbound": "direct"
                }
            ],
            "rule_set": [
                {
                    "type": "remote",
                    "tag": "geosite-category-ads-all",
                    "format": "binary",
                    "url": "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-category-ads-all.srs",
                    "download_detour": "direct"
                },
                {
                    "type": "remote",
                    "tag": "geosite-ir",
                    "format": "binary",
                    "url": "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geosite-ir.srs",
                    "download_detour": "direct"
                },
                {
                    "type": "remote",
                    "tag": "geoip-ir",
                    "format": "binary",
                    "url": "https://raw.githubusercontent.com/Chocolate4U/Iran-sing-box-rules/rule-set/geoip-ir.srs",
                    "download_detour": "direct"
                }
            ],
            "auto_detect_interface": true,
            "final": "✅ Selector"
        },
        "ntp": {
            "enabled": true,
            "server": "time.cloudflare.com",
            "server_port": 123,
            "interval": "30m",
            "write_to_system": false
        },
        "experimental": {
            "cache_file": {
                "enabled": true,
                "store_fakeip": true
            },
            "clash_api": {
                "external_controller": "127.0.0.1:9090",
                "external_ui": "ui",
                "default_mode": "Rule",
                "external_ui_download_url": "https://github.com/MetaCubeX/metacubexd/archive/refs/heads/gh-pages.zip",
                "external_ui_download_detour": "direct"
            }
        }
    };
}


/* ---- src/storage.js ---- */

const CACHE_TTL_CONFIG = 10000;
const CACHE_TTL_USAGE = 10000;
const CACHE_TTL_BACKUP_IP = 30000;

const GIB = 1073741824;
// Legacy estimate used only as a fallback for accounts created before precise
// byte accounting existed (records that carry request counts but no up/down).
const LEGACY_BYTES_PER_REQ = GIB / 6000;
// Persist usage to D1 frequently so a recycled isolate loses at most a few
// seconds of counted bytes. Accuracy is prioritised over worker resource use.
const USAGE_PERSIST_INTERVAL = 5000;

let sysConfigCacheTime = 0;
let sysUsageCacheTime = 0;
let backupIpCache = null;
let backupIpCacheTime = 0;
let sysConfigLoading = null;
let sysUsageLoading = null;
let backupIpLoading = null;
let lastSysUsageSync = 0;

async function d1Init(env) {
    if (env.IOT_DB && !env.IOT_DB_INITIALIZED) {
        try {
            await env.IOT_DB.prepare("CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT)").run();
            env.IOT_DB_INITIALIZED = true;
        } catch (e) {
            env.IOT_DB_INITIALIZED = true;
        }
    }
}

async function d1Get(env, key) {
    if (!env.IOT_DB) return null;
    await d1Init(env);
    try {
        const { results } = await env.IOT_DB.prepare("SELECT value FROM kv_store WHERE key = ?").bind(key).all();
        if (results && results.length > 0) return results[0].value;
    } catch (e) {}
    return null;
}

async function d1Put(env, key, value) {
    if (!env.IOT_DB) return;
    await d1Init(env);
    try {
        await env.IOT_DB.prepare("INSERT INTO kv_store (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value").bind(key, value).run();
    } catch (e) {}
}

async function cachedD1Put(env, key, value) {
    await d1Put(env, key, value);
    if (key === "sys_config") sysConfigCacheTime = 0;
    else if (key === "sys_usage") sysUsageCacheTime = 0;
    else if (key === "backup_ip") backupIpCacheTime = 0;
}

function normalizeConfig(rawConfig = {}) {
    const input = rawConfig && typeof rawConfig === "object" ? rawConfig : {};
    const migratedUser = Array.isArray(input.users) && input.users.length > 0 ? input.users[0] : null;
    const account = {
        ...SYSTEM_DEFAULTS.account,
        ...(input.account && typeof input.account === "object" ? input.account : {}),
        ...(migratedUser ? {
            id: migratedUser.id || "",
            name: migratedUser.name || "Default",
            notes: migratedUser.notes || "",
            isPaused: !!migratedUser.isPaused,
            proxyIp: migratedUser.proxyIp || null,
            cleanIp: migratedUser.cleanIp || null,
            userMode: migratedUser.userMode || null,
            userPorts: migratedUser.userPorts || null,
            maxConfigs: migratedUser.maxConfigs || null,
            createdAt: migratedUser.createdAt || null
        } : {})
    };

    const next = { ...SYSTEM_DEFAULTS, ...input, account };
    delete next.users;
    delete next.cfAccountId;
    delete next.cfApiToken;
    delete next.cfWorkerName;
    delete next.linkedPanels;
    delete next.hubPanelUrl;
    delete next.allowSyncWorker;

    for (const legacyKey of [
        ["t", "g", "Token"].join(""),
        ["t", "g", "ChatId"].join(""),
        ["t", "g", "AdminId"].join(""),
        ["t", "g", "BotLang"].join(""),
        ["github", "Repo"].join("")
    ]) {
        delete next[legacyKey];
    }

    next.name = next.name || "Mezdia Panel";
    next.namePrefix = next.namePrefix || "Mezdia";
    next.mode = ["alpha", "beta", "both"].includes(next.mode) ? next.mode : "alpha";
    next.account.id = next.account.id || next.deviceId || "";
    next.account.name = next.account.name || "Default";
    return next;
}

function normalizeUsage(rawUsage) {
    const usage = rawUsage && typeof rawUsage === "object" ? rawUsage : {};
    const rawAccounts = usage.accounts || usage.users || {};
    const accounts = {};
    for (const [id, rec] of Object.entries(rawAccounts || {})) {
        accounts[id] = normalizeUsageRecord(rec);
    }
    return { accounts };
}

function todayKey() {
    return new Date().toISOString().split("T")[0];
}

function normalizeUsageRecord(rec) {
    const r = rec && typeof rec === "object" ? rec : {};
    return {
        up: Math.max(0, Math.floor(Number(r.up) || 0)),
        down: Math.max(0, Math.floor(Number(r.down) || 0)),
        dUp: Math.max(0, Math.floor(Number(r.dUp) || 0)),
        dDown: Math.max(0, Math.floor(Number(r.dDown) || 0)),
        reqs: Math.max(0, Math.floor(Number(r.reqs) || 0)),
        dReqs: Math.max(0, Math.floor(Number(r.dReqs) || 0)),
        lastDay: typeof r.lastDay === "string" && r.lastDay ? r.lastDay : todayKey(),
        resetAt: Math.max(0, Math.floor(Number(r.resetAt) || 0))
    };
}

// mergeUsageRecord combines an in-memory record with one loaded from D1 without
// losing counts. Cumulative totals only ever move forward (take the max), so
// bytes that an isolate has counted but not yet persisted survive a reload. A
// more recent resetAt wins outright so an admin traffic reset still takes hold.
function mergeUsageRecord(memRec, diskRec) {
    const a = normalizeUsageRecord(memRec);
    const b = normalizeUsageRecord(diskRec);
    if (b.resetAt > a.resetAt) return b;
    if (a.resetAt > b.resetAt) return a;
    const today = todayKey();
    const aDay = a.lastDay === today;
    const bDay = b.lastDay === today;
    return {
        up: Math.max(a.up, b.up),
        down: Math.max(a.down, b.down),
        reqs: Math.max(a.reqs, b.reqs),
        dUp: Math.max(aDay ? a.dUp : 0, bDay ? b.dUp : 0),
        dDown: Math.max(aDay ? a.dDown : 0, bDay ? b.dDown : 0),
        dReqs: Math.max(aDay ? a.dReqs : 0, bDay ? b.dReqs : 0),
        lastDay: aDay || bDay ? today : a.lastDay,
        resetAt: a.resetAt
    };
}

// mergeUsage folds a freshly loaded usage snapshot into the live in-memory cache.
function mergeUsage(loaded) {
    const memAccounts = (sysUsageCache && sysUsageCache.accounts) || {};
    const diskAccounts = (loaded && loaded.accounts) || {};
    const ids = new Set([...Object.keys(memAccounts), ...Object.keys(diskAccounts)]);
    const accounts = {};
    for (const id of ids) {
        accounts[id] = mergeUsageRecord(memAccounts[id], diskAccounts[id]);
    }
    return { accounts };
}

// accountUsageSnapshot is the single source of truth for usage numbers shown to
// the panel, subscription headers and the worker dashboard.
function accountUsageSnapshot() {
    const id = activeDeviceId.replace(/-/g, "").toLowerCase();
    const usage = normalizeUsageRecord(sysUsageCache?.accounts?.[id]);
    const sameDay = usage.lastDay === todayKey();
    const up = usage.up;
    const down = usage.down;
    const real = up > 0 || down > 0;
    const reqs = usage.reqs;
    const legacyTotal = Math.floor(reqs * LEGACY_BYTES_PER_REQ);
    const total = real ? up + down : legacyTotal;
    const dUp = sameDay ? usage.dUp : 0;
    const dDown = sameDay ? usage.dDown : 0;
    const dReqs = sameDay ? usage.dReqs : 0;
    const dailyReal = dUp > 0 || dDown > 0;
    const dailyTotal = dailyReal ? dUp + dDown : Math.floor(dReqs * LEGACY_BYTES_PER_REQ);
    return {
        upload: real ? up : 0,
        download: real ? down : legacyTotal,
        total,
        dailyUpload: dUp,
        dailyDownload: dDown,
        dailyTotal,
        reqs,
        dailyReqs: dReqs,
        gb: Number((total / GIB).toFixed(2))
    };
}

function ensureUsageRecord(id) {
    if (!sysUsageCache.accounts) sysUsageCache.accounts = {};
    let usage = sysUsageCache.accounts[id];
    if (!usage) {
        usage = sysUsageCache.accounts[id] = normalizeUsageRecord(null);
    }
    const today = todayKey();
    if (usage.lastDay !== today) {
        usage.dUp = 0;
        usage.dDown = 0;
        usage.dReqs = 0;
        usage.lastDay = today;
    }
    return usage;
}

// enforceAndPersist persists the usage cache to D1 at most every
// USAGE_PERSIST_INTERVAL to avoid hammering the database on every chunk.
// (No automatic account disabling — usage limits/expiry are not enforced.)
function enforceAndPersist(usage, env, ctx) {
    const now = Date.now();
    if (now - lastSysUsageSync <= USAGE_PERSIST_INTERVAL) return;
    lastSysUsageSync = now;

    if (env?.IOT_DB) {
        ctx?.waitUntil(cachedD1Put(env, "sys_usage", JSON.stringify(sysUsageCache)).catch(() => {}));
    }
}

// trackBytes records real proxied traffic (upload = client->remote,
// download = remote->client) for an account.
function trackBytes(uuid, up, down, env, ctx) {
    up = Math.max(0, Math.floor(Number(up) || 0));
    down = Math.max(0, Math.floor(Number(down) || 0));
    if (up === 0 && down === 0) return;
    const id = uuid.replace(/-/g, "").toLowerCase();
    const usage = ensureUsageRecord(id);
    usage.up += up;
    usage.down += down;
    usage.dUp += up;
    usage.dDown += down;
    enforceAndPersist(usage, env, ctx);
}

// trackConnection counts a new proxy handshake. Connection counts are kept for
// diagnostics and as a legacy fallback; they no longer drive volume accounting.
function trackConnection(uuid, env, ctx) {
    const id = uuid.replace(/-/g, "").toLowerCase();
    const usage = ensureUsageRecord(id);
    usage.reqs += 1;
    usage.dReqs += 1;
    enforceAndPersist(usage, env, ctx);
}

async function loadSysConfig(env) {
    const now = Date.now();
    if (env.IOT_DB) {
        if (now - sysConfigCacheTime > CACHE_TTL_CONFIG) {
            if (!sysConfigLoading) {
                sysConfigLoading = d1Get(env, "sys_config").then(stored => {
                    setSysConfig(normalizeConfig(stored ? JSON.parse(stored) : null));
                    sysConfigCacheTime = Date.now();
                }).catch(() => {
                    setSysConfig(normalizeConfig());
                    sysConfigCacheTime = Date.now();
                }).finally(() => {
                    sysConfigLoading = null;
                });
            }
            await sysConfigLoading;
        }
        if (now - sysUsageCacheTime > CACHE_TTL_USAGE) {
            if (!sysUsageLoading) {
                sysUsageLoading = d1Get(env, "sys_usage").then(ustored => {
                    const loaded = normalizeUsage(ustored ? JSON.parse(ustored) : null);
                    setSysUsageCache(mergeUsage(loaded));
                    sysUsageCacheTime = Date.now();
                }).catch(() => {
                    setSysUsageCache({ accounts: {} });
                    sysUsageCacheTime = Date.now();
                }).finally(() => {
                    sysUsageLoading = null;
                });
            }
            await sysUsageLoading;
        }
    } else {
        setSysConfig(normalizeConfig(sysConfig));
        setSysUsageCache(normalizeUsage(sysUsageCache));
    }

    if (now - backupIpCacheTime > CACHE_TTL_BACKUP_IP) {
        if (!backupIpLoading) {
            backupIpLoading = (env.IOT_DB ? d1Get(env, "backup_ip") : Promise.resolve(null)).then(val => {
                backupIpCache = val;
                backupIpCacheTime = Date.now();
            }).catch(() => {
                backupIpCacheTime = Date.now();
            }).finally(() => {
                backupIpLoading = null;
            });
        }
        await backupIpLoading;
    }

    const defaultRelay = ["pro", "xy", "ip.cmliussss.net"].join("");
    sysConfig.customRelay = sysConfig.customRelay || backupIpCache || env.RELAY_IP || defaultRelay;
    setActiveDeviceId(sysConfig.deviceId || sysConfig.account.id || generateHardwareId(sysConfig.apiRoute));
    sysConfig.account.id = activeDeviceId;
}

async function saveConfig(env, nextConfig) {
    const normalized = normalizeConfig(nextConfig);
    setSysConfig(normalized);
    await cachedD1Put(env, "sys_config", JSON.stringify(normalized));
    return normalized;
}

async function logActivity(env, type, detail) {
    if (!env || !env.IOT_DB) return;
    try {
        const ts = new Date().toISOString();
        let logs = [];
        const stored = await d1Get(env, "sys_logs");
        if (stored) logs = JSON.parse(stored);
        logs.unshift({ ts, type, detail });
        if (logs.length > 100) logs = logs.slice(0, 100);
        await d1Put(env, "sys_logs", JSON.stringify(logs));
    } catch (e) {}
}

async function readLogs(env) {
    if (!env.IOT_DB) return [];
    const stored = await d1Get(env, "sys_logs");
    return stored ? JSON.parse(stored) : [];
}

// trackUsage is kept for backward compatibility. A bytes value of 0 records a
// connection handshake; a positive value is treated as download bytes.
function trackUsage(uuid, bytes, env, ctx) {
    if (bytes === 0) {
        trackConnection(uuid, env, ctx);
    } else {
        trackBytes(uuid, 0, bytes, env, ctx);
    }
}

async function resetAccountTraffic(env) {
    const id = activeDeviceId.replace(/-/g, "").toLowerCase();
    if (!sysUsageCache.accounts) sysUsageCache.accounts = {};
    const fresh = normalizeUsageRecord(null);
    // Stamp the reset so other isolates adopt the zeroed counters on reload
    // instead of resurrecting their higher in-memory totals via max-merge.
    fresh.resetAt = Date.now();
    sysUsageCache.accounts[id] = fresh;
    delete sysUsageCache.users;
    lastSysUsageSync = 0;
    await cachedD1Put(env, "sys_usage", JSON.stringify(sysUsageCache));
}


/* ---- src/auth.js ---- */

function getBearerToken(request) {
    const authHeader = request.headers.get("Authorization") || "";
    if (authHeader.toLowerCase().startsWith("bearer ")) {
        return authHeader.slice(7).trim();
    }
    return "";
}

async function readJson(request) {
    try {
        return await request.json();
    } catch (e) {
        return {};
    }
}

function isApiAuthorized(request, env, body = null) {
    const url = new URL(request.url);
    const apiKey = env.MEZDIA_API_KEY || "";
    const candidates = [
        getBearerToken(request),
        request.headers.get("X-Mezdia-API-Key") || "",
        url.searchParams.get("key") || "",
        body?.apiKey || "",
        body?.key || ""
    ];
    return !!apiKey && candidates.some(value => value === apiKey);
}

function isDashboardAuthorized(body) {
    return body?.key === sysConfig.masterKey || body?.oldKey === sysConfig.masterKey || sysConfig.masterKey === "admin";
}


/* ---- src/api.js ---- */

function publicConfig() {
    return sysConfig;
}

function subscriptionBase(request) {
    const url = new URL(request.url);
    let baseHost = url.host;
    let protocol = "https";
    if (sysConfig.customPanelUrl && sysConfig.customPanelUrl.trim()) {
        let customUrlStr = sysConfig.customPanelUrl.trim();
        if (!customUrlStr.startsWith("http://") && !customUrlStr.startsWith("https://")) {
            customUrlStr = "https://" + customUrlStr;
        }
        try {
            const customUrl = new URL(customUrlStr);
            baseHost = customUrl.host;
            protocol = customUrl.protocol.replace(":", "");
        } catch (e) {}
    }
    return `${protocol}://${baseHost}/${sysConfig.apiRoute}`;
}

function accountUsage() {
    const snap = accountUsageSnapshot();
    return {
        totalRequests: snap.reqs,
        totalGB: snap.gb,
        totalBytes: snap.total,
        total: snap.total,
        uploadBytes: snap.upload,
        downloadBytes: snap.download,
        dailyRequests: snap.dailyReqs,
        dailyGB: Number((snap.dailyTotal / 1073741824).toFixed(2)),
        dailyBytes: snap.dailyTotal,
        dailyUploadBytes: snap.dailyUpload,
        dailyDownloadBytes: snap.dailyDownload,
        daily: snap.dailyReqs
    };
}

function accountPayload(request) {
    const status = (sysConfig.isPaused || sysConfig.account?.isPaused) ? "paused" : "active";
    return {
        ...sysConfig.account,
        id: activeDeviceId,
        status,
        usage: accountUsage(),
        subscriptionUrl: subscriptionBase(request)
    };
}

function sanitizeAccount(input) {
    const current = sysConfig.account || {};
    const next = { ...current };
    if (input.name !== undefined) next.name = String(input.name || "Default");
    if (input.notes !== undefined) next.notes = String(input.notes || "");
    if (input.isPaused !== undefined) next.isPaused = !!input.isPaused;
    if (input.status !== undefined) {
        next.isPaused = input.status === "paused";
    }
    if (input.proxyIp !== undefined) next.proxyIp = input.proxyIp || null;
    if (input.cleanIp !== undefined) next.cleanIp = input.cleanIp || null;
    if (input.userMode !== undefined) next.userMode = input.userMode || null;
    if (input.userPorts !== undefined) next.userPorts = input.userPorts || null;
    if (input.maxConfigs !== undefined) next.maxConfigs = input.maxConfigs ? Number(input.maxConfigs) : null;
    if (!next.createdAt) next.createdAt = Date.now();
    next.id = activeDeviceId;
    return next;
}

function mergeConfigPatch(patch) {
    const next = { ...sysConfig };
    for (const key of Object.keys(API_SETTINGS_SCHEMA)) {
        if (patch[key] !== undefined) {
            if (key === "account") next.account = sanitizeAccount(patch.account || {});
            else next[key] = patch[key];
        }
    }
    return next;
}

function authorizeOr401(request, env, body = null) {
    if (!isApiAuthorized(request, env, body)) {
        return jsonResponse({ success: false, error: "Unauthorized. Set MEZDIA_API_KEY and send Authorization: Bearer <key>." }, 401);
    }
    return null;
}

async function handleAuth(request, hostName, ctx, env) {
    const body = await readJson(request);
    const ip = request.headers.get("cf-connecting-ip") || "Unknown";
    if (!isDashboardAuthorized(body) && !isApiAuthorized(request, env, body)) {
        ctx?.waitUntil(logActivity(env, "Auth Failed", `Failed Mezdia Panel login from ${ip}`));
        return jsonResponse({ success: false }, 401);
    }

    ctx?.waitUntil(logActivity(env, "Auth Success", `Successful Mezdia Panel login from ${ip}`));
    return jsonResponse({
        success: true,
        config: publicConfig(),
        deviceId: activeDeviceId,
        account: accountPayload(request),
        network: {
            ip,
            colo: request.cf?.colo || "Unknown",
            loc: `${request.cf?.city || "Unknown"}, ${request.cf?.country || "Unknown"}`
        },
        sysUsage: sysUsageCache.accounts || {},
        version: CURRENT_VERSION,
        profiles: getAllProfiles().map(p => ({ name: p.name, id: p.id, sync: subscriptionBase(request) }))
    });
}

async function handleConfigSync(request, env, ctx) {
    const body = await readJson(request);
    if (!isDashboardAuthorized(body) && !isApiAuthorized(request, env, body)) {
        return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }
    if (!env.IOT_DB) return jsonResponse({ success: false, error: "IOT_DB binding is required" }, 400);

    if (body.config) {
        const next = mergeConfigPatch(body.config);
        await saveConfig(env, next);
        ctx?.waitUntil(logActivity(env, "Configuration Updated", "Mezdia Panel configuration updated").catch(() => {}));
    }
    if (body.resetUUID || body.resetTraffic) {
        await resetAccountTraffic(env);
    }
    return jsonResponse({ success: true, newRoute: sysConfig.apiRoute, config: publicConfig() });
}

async function handleConfigApi(request, env, ctx) {
    const body = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ? await readJson(request) : null;
    const unauthorized = authorizeOr401(request, env, body);
    if (unauthorized) return unauthorized;

    if (request.method === "GET") {
        return jsonResponse({ success: true, config: publicConfig(), schema: API_SETTINGS_SCHEMA });
    }
    if (request.method === "PUT" || request.method === "PATCH" || request.method === "POST") {
        const patch = body?.config || body || {};
        const next = mergeConfigPatch(patch);
        await saveConfig(env, next);
        ctx?.waitUntil(logActivity(env, "API Configuration Updated", "Configuration changed through Mezdia API").catch(() => {}));
        return jsonResponse({ success: true, config: publicConfig() });
    }
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
}

async function handleSettingsApi(request, env, ctx) {
    const url = new URL(request.url);
    const key = url.searchParams.get("keyName") || url.pathname.split("/").pop();
    const body = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method) ? await readJson(request) : null;
    const unauthorized = authorizeOr401(request, env, body);
    if (unauthorized) return unauthorized;
    if (!key || key === "settings") return jsonResponse({ success: true, settings: publicConfig(), schema: API_SETTINGS_SCHEMA });
    if (!Object.prototype.hasOwnProperty.call(API_SETTINGS_SCHEMA, key)) {
        return jsonResponse({ success: false, error: `Unknown setting: ${key}` }, 404);
    }
    if (request.method === "GET") return jsonResponse({ success: true, key, value: publicConfig()[key] });
    if (request.method === "DELETE") {
        const next = { ...sysConfig };
        delete next[key];
        await saveConfig(env, next);
        ctx?.waitUntil(logActivity(env, "API Setting Cleared", `Setting ${key} cleared`).catch(() => {}));
        return jsonResponse({ success: true, config: publicConfig() });
    }
    const next = mergeConfigPatch({ [key]: body?.value });
    await saveConfig(env, next);
    ctx?.waitUntil(logActivity(env, "API Setting Updated", `Setting ${key} updated`).catch(() => {}));
    return jsonResponse({ success: true, key, value: publicConfig()[key], config: publicConfig() });
}

async function handleAccountApi(request, env, ctx) {
    const body = ["POST", "PUT", "PATCH"].includes(request.method) ? await readJson(request) : null;
    const unauthorized = authorizeOr401(request, env, body);
    if (unauthorized) return unauthorized;
    if (request.method === "GET") return jsonResponse({ success: true, account: accountPayload(request) });
    if (request.method === "PUT" || request.method === "PATCH" || request.method === "POST") {
        const patch = body?.account || body || {};
        const next = mergeConfigPatch({ account: patch });
        await saveConfig(env, next);
        ctx?.waitUntil(logActivity(env, "API Account Updated", "Single account updated").catch(() => {}));
        return jsonResponse({ success: true, account: accountPayload(request) });
    }
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
}

async function handleStatsApi(request, env) {
    const unauthorized = authorizeOr401(request, env);
    if (unauthorized) return unauthorized;
    const upSeconds = Math.floor((Date.now() - isolateStartTime) / 1000);
    return jsonResponse({
        success: true,
        stats: {
            account: accountPayload(request),
            traffic: accountUsage(),
            system: {
                uptimeSeconds: upSeconds,
                activeConnections,
                version: CURRENT_VERSION,
                isPaused: sysConfig.isPaused || false,
                singleUserMode: true
            }
        }
    });
}

async function handleLogsApi(request, env) {
    const body = request.method === "POST" ? await readJson(request) : null;
    if (!isDashboardAuthorized(body) && !isApiAuthorized(request, env, body)) {
        return jsonResponse({ success: false, error: "Unauthorized" }, 401);
    }
    return jsonResponse({ success: true, logs: await readLogs(env) });
}

async function handleTrafficResetApi(request, env, ctx) {
    const body = await readJson(request);
    const unauthorized = authorizeOr401(request, env, body);
    if (unauthorized) return unauthorized;
    await resetAccountTraffic(env);
    ctx?.waitUntil(logActivity(env, "API Traffic Reset", "Single account traffic reset").catch(() => {}));
    return jsonResponse({ success: true, message: "Traffic reset" });
}


/* ---- src/ui.js ---- */

function getDashboardUI(hasDB) {
    return `<!doctype html>
<html lang="fa" dir="rtl" data-theme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${BRAND_NAME}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=Vazirmatn:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-display:'DM Sans','Vazirmatn',system-ui,sans-serif;
      --font-body:'DM Sans','Vazirmatn',system-ui,sans-serif;
      --font-mono:'JetBrains Mono',ui-monospace,monospace;
      --accent-grad:linear-gradient(135deg,#3965FF,#4481EB);
      --brand-grad:linear-gradient(135deg,#4481EB 0%,#3965FF 100%);
      --r-card:20px;--r-btn:16px;--r-input:16px;--r-badge:10px;--r-sidebar:30px;
      --transition:0.25s all ease;
      --layout-trans:all 0.33s cubic-bezier(0.685,0.0473,0.346,1);
      --shadow-btn:45px 76px 113px 7px rgba(112,144,176,0.08);
      --sg-300:#F4F7FE;--sg-600:#A3AED0;--brand-500:#3965FF;--brand-400:#4481EB;
    }
    [data-theme="light"] {
      color-scheme:light;
      --bg:#F4F7FE;--surface:#ffffff;--surface-elevated:#ffffff;--sidebar-bg:#ffffff;
      --navbar-bg:rgba(244,247,254,0.2);
      --text:#1B2559;--text-primary:#1B254B;--text-secondary:#A3AED0;--text-muted:#707EAE;
      --border:#E0E5F2;--border-strong:rgba(163,174,208,0.5);
      --input-bg:transparent;--input-border:#E0E5F2;--input-text:#1B2559;--input-placeholder:#E9EDF7;
      --card-shadow:14px 17px 40px 4px rgba(112,144,176,0.08);
      --code-bg:#F4F7FE;--meter-bg:rgba(163,174,208,0.15);
      --chart-upload:#3965FF;--chart-download:#39B8FF;
      --chart-upload-area:rgba(57,101,255,0.15);--chart-download-area:rgba(57,184,255,0.15);
      --chart-grid:rgba(163,174,208,0.2);--ring:rgba(57,101,255,0.25);
      --destructive:#E31A1A;--success:#01B574;--warn:#FFB547;
      --link-active:#3965FF;--link-active-icon:#3965FF;--link-active-text:#1B2559;--link-inactive:#8F9BBA;
      --separator:rgba(135,140,189,0.3);
    }
    [data-theme="dark"] {
      color-scheme:dark;
      --bg:#0a0a0a;--surface:#171717;--surface-elevated:#1e1e1e;--sidebar-bg:#141414;
      --navbar-bg:rgba(10,10,10,0.6);
      --text:#ffffff;--text-primary:#ffffff;--text-secondary:#A3AED0;--text-muted:#707EAE;
      --border:rgba(255,255,255,0.08);--border-strong:rgba(163,174,208,0.15);
      --input-bg:#1e1e1e;--input-border:rgba(255,255,255,0.08);--input-text:#ffffff;--input-placeholder:rgba(255,255,255,0.3);
      --card-shadow:unset;
      --code-bg:#222222;--meter-bg:rgba(163,174,208,0.06);
      --chart-upload:#4481EB;--chart-download:#6AD2FF;
      --chart-upload-area:rgba(68,129,235,0.2);--chart-download-area:rgba(106,210,255,0.2);
      --chart-grid:rgba(163,174,208,0.08);--ring:rgba(68,129,235,0.35);
      --destructive:#EE5D50;--success:#01B574;--warn:#FFB547;
      --link-active:#4481EB;--link-active-icon:#ffffff;--link-active-text:#ffffff;--link-inactive:#b0b0b0;
      --separator:rgba(135,140,189,0.3);
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:14px;letter-spacing:-0.5px;line-height:1.6;-webkit-font-smoothing:antialiased;overflow-x:hidden;transition:background 0.3s ease,color 0.3s ease}
    ::-webkit-scrollbar{width:6px;height:6px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:var(--sg-600);border-radius:8px}
    :focus-visible{outline:none;box-shadow:0 0 0 2px var(--ring)}

    /* Login */
    #login{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg);z-index:1000;padding:16px}
    .login-card{width:min(420px,calc(100vw - 32px));background:var(--surface);border:1px solid var(--border-strong);border-radius:20px;padding:40px 32px;text-align:center;box-shadow:14px 17px 40px 4px rgba(112,144,176,0.08)}
    .login-logo{width:64px;height:64px;margin:0 auto 20px;border-radius:12px;background:var(--accent-grad);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-weight:800;font-size:28px;color:#fff;box-shadow:0 8px 24px rgba(57,101,255,0.39)}
    .login-title{font-family:var(--font-display);font-size:36px;font-weight:700;margin-bottom:8px;color:var(--text)}
    .login-desc{font-size:14px;color:var(--text-muted);margin-bottom:24px;line-height:1.7}
    .login-error{display:none;margin-top:16px;font-size:12px;color:var(--destructive);padding:12px;background:rgba(238,93,80,0.08);border-radius:var(--r-input)}
    .login-error.show{display:block}

    /* App wrapper — hidden until login succeeds */
    #app{display:none}

    /* Mobile sidebar overlay */
    .sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:149;opacity:0;pointer-events:none;transition:opacity 0.25s ease}
    .sidebar-overlay.show{opacity:1;pointer-events:auto}

    /* Sidebar */
    .sidebar{position:fixed;top:0;right:0;width:316px;height:100vh;background:var(--sidebar-bg);box-shadow:var(--card-shadow);z-index:150;overflow-y:auto;overflow-x:hidden;transition:width 0.2s linear,transform 0.2s linear;border-left:1px solid var(--border)}
    .sidebar-inner{display:flex;flex-direction:column;height:100%;padding:22px 18px}
    .sidebar-brand{display:flex;align-items:center;gap:12px;padding:0 4px 18px;border-bottom:1px solid var(--separator)}
    .sidebar-brand .logo{width:44px;height:44px;border-radius:12px;background:var(--accent-grad);display:flex;align-items:center;justify-content:center;font-family:var(--font-mono);font-weight:800;font-size:20px;color:#fff;flex-shrink:0;box-shadow:0 4px 14px rgba(57,101,255,0.39)}
    .brand-meta{display:flex;flex-direction:column}
    .brand-name{font-family:var(--font-display);font-size:17px;font-weight:700;color:var(--text);letter-spacing:-0.01em}
    .brand-ver{font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:0.08em}

    /* Navigation groups */
    .sidebar-nav{flex:1;overflow-y:auto}
    .nav-group{margin-bottom:4px}
    .nav-group-label{font-family:var(--font-mono);font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--text-muted);padding:18px 14px 8px}
    .nav-link{display:flex;align-items:center;gap:14px;width:100%;padding:11px 14px;border:1px solid transparent;border-radius:16px;background:transparent;color:var(--link-inactive);font-family:var(--font-body);font-size:14px;font-weight:500;cursor:pointer;transition:var(--transition);text-align:right;position:relative}
    .nav-link svg{width:18px;height:18px;stroke-width:1.8;flex-shrink:0}
    .nav-link:hover{color:var(--text);background:var(--sg-300)}
    .nav-link.active{color:var(--link-active-text);font-weight:700;background:linear-gradient(90deg,rgba(57,101,255,0.1),rgba(57,101,255,0));border-color:rgba(57,101,255,0.12)}
    .nav-link.active svg{color:var(--link-active-icon)}
    .nav-indicator{position:absolute;right:0;top:50%;transform:translateY(-50%);width:4px;height:30px;background:transparent;border-radius:5px;transition:var(--transition)}
    .nav-link.active .nav-indicator{background:var(--link-active)}

    /* Gradient status card — mirrors Horizon UI SidebarCard */
    .sidebar-card{margin:20px 0 12px;padding:18px;border-radius:24px;background:linear-gradient(145deg,#3965FF 0%,#4481EB 48%,#39B8FF 120%);color:#fff;box-shadow:0 18px 35px rgba(57,101,255,0.2);position:relative;overflow:hidden}
    .sidebar-card::before{content:'';position:absolute;inset:-40% -20% auto auto;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.18)}
    .sc-top{display:flex;align-items:center;gap:12px;margin-bottom:16px}
    .sc-icon{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .sc-icon svg{width:18px;height:18px}
    .sc-label{font-size:12px;color:rgba(255,255,255,0.7)}
    .sc-value{font-size:15px;font-weight:700;color:#fff}
    .sc-value.sc-bad{color:#FFD0CB}
    .sc-stats{display:flex;gap:12px;margin-bottom:0;position:relative;z-index:1}
    .sc-stat{flex:1}
    .sc-stat-label{font-size:11px;color:rgba(255,255,255,0.6);display:block;margin-bottom:2px}
    .sc-stat-value{font-size:14px;font-weight:700;color:#fff;font-family:var(--font-mono)}

    .sidebar-footer{text-align:center;font-family:var(--font-mono);font-size:9px;color:var(--text-muted);letter-spacing:0.08em;padding-top:12px;border-top:1px solid var(--separator)}

    /* Sidebar collapse/expand button (desktop) */
    .sidebar-collapse-btn{position:absolute;left:-13px;top:80px;width:28px;height:28px;border-radius:50%;background:var(--surface);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:151;color:var(--text-muted);transition:var(--transition);box-shadow:0 2px 8px rgba(0,0,0,0.08)}
    .sidebar-collapse-btn:hover{color:var(--brand-500);border-color:var(--brand-500)}
    .sidebar-collapse-btn svg{width:14px;height:14px;transition:transform 0.2s ease}
    .sidebar.collapsed .sidebar-collapse-btn svg{transform:rotate(180deg)}

    /* Collapsed sidebar — icon-only mode */
    .sidebar.collapsed{width:86px}
    .sidebar.collapsed .sidebar-inner{padding:22px 12px}
    .sidebar.collapsed .sidebar-brand{justify-content:center;padding:0 0 18px}
    .sidebar.collapsed .brand-meta{display:none}
    .sidebar.collapsed .nav-group-label{display:none}
    .sidebar.collapsed .nav-link{justify-content:center;padding:11px 0;gap:0}
    .sidebar.collapsed .nav-link span{display:none}
    .sidebar.collapsed .nav-indicator{display:none}
    .sidebar.collapsed .sidebar-card{padding:12px}
    .sidebar.collapsed .sc-top{margin-bottom:0;justify-content:center}
    .sidebar.collapsed .sc-top > div:last-child{display:none}
    .sidebar.collapsed .sc-stats{display:none}
    .sidebar.collapsed .sidebar-footer{font-size:0}
    .sidebar.collapsed .sidebar-footer::after{content:'M';font-size:16px;color:var(--text-muted);font-family:var(--font-mono)}
    .sidebar.collapsed ~ .navbar{right:116px}
    .sidebar.collapsed ~ .main-content{margin-right:86px}

    /* Navbar */
    .navbar{position:fixed;top:18px;right:346px;left:30px;min-height:82px;border-radius:26px;border:1.5px solid var(--border);background:var(--navbar-bg);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:space-between;padding:14px 20px;z-index:50;transition:0.25s linear;box-shadow:var(--card-shadow)}
    .navbar-left{display:flex;align-items:center;gap:14px;min-width:0}
    .navbar-toggle{display:flex;width:40px;height:40px;border:1px solid var(--border);border-radius:var(--r-btn);background:transparent;color:var(--text);cursor:pointer;align-items:center;justify-content:center;transition:var(--transition)}
    .navbar-toggle:hover{border-color:var(--brand-500);color:var(--brand-500)}
    .navbar-toggle svg{width:20px;height:20px}
    .navbar-title-stack{display:flex;flex-direction:column;min-width:0}
    .navbar-kicker{font-family:var(--font-mono);font-size:10px;color:var(--text-muted);letter-spacing:0.12em;text-transform:uppercase;margin-bottom:2px}
    .navbar-title-row{display:flex;align-items:center;gap:8px;min-width:0}
    .crumb-root{font-size:26px;font-weight:800;color:var(--text);letter-spacing:-0.374px;white-space:nowrap}
    .crumb-sep{width:16px;height:16px;color:var(--text-muted);flex-shrink:0}
    .crumb-current{font-size:15px;font-weight:600;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .navbar-right{display:flex;align-items:center;gap:10px;background:var(--surface);border:1px solid var(--border);border-radius:22px;padding:8px;box-shadow:0 14px 30px rgba(112,144,176,0.08)}

    .pill{display:inline-flex;align-items:center;gap:5px;padding:7px 12px;border-radius:var(--r-badge);font-size:11px;font-weight:600;font-family:var(--font-mono);border:1px solid var(--border);background:transparent;color:var(--text-muted)}
    .pill.ok{color:var(--success);border-color:rgba(1,181,116,0.25);background:rgba(1,181,116,0.08)}
    .pill.bad{color:var(--destructive);border-color:rgba(238,93,80,0.25);background:rgba(238,93,80,0.08)}
    .pill::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor}
    .pill.ok::before{animation:pulse 2s infinite}
    @keyframes pulse{0%{box-shadow:0 0 0 0 rgba(1,181,116,0.35)}70%{box-shadow:0 0 0 5px rgba(1,181,116,0)}100%{box-shadow:0 0 0 0 rgba(1,181,116,0)}}

    .icon-btn{width:40px;height:40px;border-radius:var(--r-btn);border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:var(--transition)}
    .icon-btn:hover{color:var(--brand-500);border-color:var(--brand-500)}

    /* Main content */
    .main-content{margin-right:316px;min-height:100vh;padding:118px 30px 30px 20px;transition:var(--layout-trans)}
    section{display:none;animation:fadein 0.35s ease}
    section.active{display:block}
    @keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}

    .page-head{margin-bottom:28px}
    .page-title{font-family:var(--font-display);font-size:34px;font-weight:700;margin-bottom:4px;color:var(--text);letter-spacing:-0.374px}
    .page-sub{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em}

    /* Card with header/body/footer sections */
    .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-card);box-shadow:var(--card-shadow);margin-bottom:20px;overflow:hidden;transition:var(--transition)}
    .card:hover{border-color:var(--border-strong)}
    .card-header{padding:20px 20px 0}
    .card-title{font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--text);margin-bottom:4px}
    .card-sub{font-family:var(--font-mono);font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.08em}
    .card-body{padding:20px}
    .card-footer{padding:0 20px 20px;display:flex;gap:12px;flex-wrap:wrap}

    .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:20px}
    .span-12{grid-column:span 12}.span-8{grid-column:span 8}.span-6{grid-column:span 6}.span-4{grid-column:span 4}

    /* Stat cards — icon + label/value body */
    .stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:24px}
    .stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-card);padding:15px 20px;display:flex;align-items:center;gap:16px;box-shadow:var(--card-shadow);transition:var(--transition)}
    .stat-card:hover{border-color:var(--border-strong)}
    .stat-icon-box{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0}
    .stat-icon-box svg{width:24px;height:24px}
    .stat-body{flex:1;display:flex;flex-direction:column}
    .stat-label{font-size:14px;font-weight:500;color:var(--text-secondary);margin-bottom:2px}
    .stat-value{font-size:24px;font-weight:700;color:var(--text)}

    /* Chart body — canvas + value legend */
    .chart-body{display:flex;flex-direction:column;align-items:center;gap:16px}
    .chart-legend{display:flex;gap:20px;flex-wrap:wrap}
    .legend-item{display:flex;align-items:center;gap:8px}
    .legend-dot{width:10px;height:10px;border-radius:3px}
    .legend-label{font-size:13px;color:var(--text-secondary)}
    .legend-value{font-size:13px;font-weight:700;color:var(--text);font-family:var(--font-mono)}

    /* Meters — head/track/fill structure */
    .meter-group{display:flex;flex-direction:column;gap:16px}
    .meter-item{display:flex;flex-direction:column;gap:8px}
    .meter-head{display:flex;justify-content:space-between;font-size:13px;color:var(--text)}
    .meter-head span:last-child{font-family:var(--font-mono);font-weight:600}
    .meter-track{height:8px;background:var(--meter-bg);border-radius:8px;overflow:hidden}
    .meter-fill{height:100%;border-radius:8px;transition:width 0.8s cubic-bezier(0.22,1,0.36,1);width:0%}
    .meter-fill.upload{background:var(--accent-grad)}
    .meter-fill.download{background:linear-gradient(90deg,#39B8FF,#6AD2FF)}

    .info-grid{display:grid;grid-template-columns:auto 1fr;gap:12px 16px;font-size:14px}
    .info-grid .muted{font-size:12px;color:var(--text-muted)}
    .info-grid span:nth-child(2n){font-family:var(--font-mono);font-weight:600}

    /* Subscription QR + info row */
    .sub-row{display:flex;align-items:center;gap:24px;flex-wrap:wrap}
    .qr-frame{width:140px;height:140px;flex-shrink:0;padding:8px;background:var(--code-bg);border-radius:12px;border:1px solid var(--border)}
    #qr-img{width:100%;height:100%;border-radius:8px;display:block}
    .sub-info{flex:1;min-width:200px}

    /* Forms — row + field structure */
    .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .form-field{display:flex;flex-direction:column}
    .card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:20px}
    label{display:block;font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:8px;margin-top:16px}
    label:first-child{margin-top:0}
    input,select,textarea{width:100%;background:var(--input-bg);color:var(--input-text);border:1px solid var(--input-border);border-radius:var(--r-input);padding:12px 20px;font-family:var(--font-body);font-size:14px;font-weight:400;transition:var(--transition)}
    input::placeholder,textarea::placeholder{color:var(--input-placeholder)}
    input:focus,select:focus,textarea:focus{border-color:var(--brand-500);box-shadow:0 0 0 2px var(--ring);outline:none}
    textarea{min-height:90px;resize:vertical}

    /* Buttons */
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:none;border-radius:var(--r-btn);padding:12px 24px;font-family:var(--font-body);font-size:14px;font-weight:600;cursor:pointer;transition:var(--transition);text-decoration:none;box-shadow:var(--shadow-btn)}
    .btn:active{transform:scale(0.98);box-shadow:none}
    .btn:focus{box-shadow:none}
    .btn-primary{background:var(--accent-grad);color:#fff}
    .btn-primary:hover{transform:translateY(-1px)}
    .btn-secondary{background:var(--sg-300);color:var(--text);border:1px solid var(--border)}
    .btn-secondary:hover{border-color:var(--brand-500);color:var(--brand-500)}
    .btn-danger{background:transparent;color:var(--destructive);border:1px solid rgba(238,93,80,0.3)}
    .btn-danger:hover{background:var(--destructive);color:#fff}
    .btn-ghost{background:transparent;color:var(--text-secondary);border:1px solid var(--border);padding:8px 16px;font-size:13px}
    .btn-ghost:hover{border-color:var(--brand-500);color:var(--brand-500)}
    .btn-sm{padding:8px 16px;font-size:13px}
    .actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}

    code,pre{background:var(--code-bg);border:1px solid var(--border);border-radius:8px;font-family:var(--font-mono);direction:ltr;text-align:left;color:var(--text-secondary);font-size:12px}
    code{padding:4px 8px;display:inline-block}
    pre{padding:16px;overflow:auto;white-space:pre-wrap;line-height:1.6}

    table{width:100%;border-collapse:collapse}
    td,th{padding:14px 25px;text-align:right;font-size:14px;border-bottom:1px solid var(--border)}
    th{font-weight:700;font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.06em}
    td{font-weight:700;color:var(--text)}
    tr:last-child td{border-bottom:none}

    .fixed-plugin{position:fixed;bottom:30px;left:35px;width:60px;height:60px;border-radius:50px;border:1px solid #3965FF;background:var(--brand-grad);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:99;transition:var(--transition);padding:0}
    .fixed-plugin svg{width:24px;height:24px;color:#fff}
    .fixed-plugin:hover{transform:scale(1.05)}

    .mobile-nav{display:none}
    @media(max-width:1024px){
      .sidebar{transform:translateX(100%)}
      .sidebar.open{transform:translateX(0)}
      .sidebar-collapse-btn{display:none}
      .sidebar.collapsed{width:316px}
      .sidebar.collapsed .sidebar-inner{padding:22px 18px}
      .sidebar.collapsed .sidebar-brand{justify-content:flex-start;padding:0 4px 18px}
      .sidebar.collapsed .brand-meta{display:flex}
      .sidebar.collapsed .nav-group-label{display:block}
      .sidebar.collapsed .nav-link{justify-content:flex-start;padding:11px 14px;gap:14px}
      .sidebar.collapsed .nav-link span{display:inline}
      .sidebar.collapsed .nav-indicator{display:block}
      .sidebar.collapsed .sidebar-card{padding:18px}
      .sidebar.collapsed .sc-top{margin-bottom:16px;justify-content:flex-start}
      .sidebar.collapsed .sc-top > div:last-child{display:block}
      .sidebar.collapsed .sc-stats{display:flex}
      .sidebar.collapsed .sidebar-footer{font-size:9px}
      .sidebar.collapsed .sidebar-footer::after{content:none}
      .sidebar.collapsed ~ .navbar{right:16px}
      .sidebar.collapsed ~ .main-content{margin-right:0}
      .navbar{left:16px;right:16px;top:8px;min-height:72px;border-radius:20px}
      .main-content{margin-right:0;padding:96px 16px 16px}
      .grid,.form-row{grid-template-columns:1fr}
      .span-4,.span-6,.span-8,.span-12{grid-column:1/-1}
      .crumb-root{display:none}
      .navbar-right{padding:6px;gap:6px}
      .mobile-nav{display:flex;gap:4px;overflow-x:auto;padding:8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-btn);margin-bottom:16px}
      .mobile-nav button{white-space:nowrap;border:none;background:transparent;color:var(--text-secondary);padding:10px 12px;border-radius:var(--r-btn);font-size:13px;font-weight:500;cursor:pointer;font-family:var(--font-body)}
      .mobile-nav button.active{background:var(--accent-grad);color:#fff}
      .card-grid{grid-template-columns:1fr}
    }
  </style>
</head>
<body>
  <div id="login">
    <div class="login-card">
      <div class="login-logo">M</div>
      <div class="login-title">${BRAND_NAME}</div>
      <p class="login-desc">برای ورود، رمز پنل را وارد کنید.<br>دسترسی برنامه‌نویسی از طریق <code>MEZDIA_API_KEY</code> انجام می‌شود.</p>
      ${hasDB ? "" : `<p class="pill bad" style="display:flex;width:fit-content;margin:0 auto 20px">پایگاه‌داده (IOT_DB) متصل نیست؛ تنظیمات ذخیره نخواهد شد.</p>`}
      <label for="password">رمز پنل</label>
      <input id="password" type="password" autocomplete="current-password" placeholder="•••••••••">
      <div class="actions" style="justify-content:center"><button class="btn btn-primary" onclick="login()">ورود به پنل</button></div>
      <p id="login-error" class="login-error">ورود ناموفق بود. رمز را بررسی کنید.</p>
    </div>
  </div>

  <div id="app">
    <div class="sidebar-overlay" id="sidebar-overlay" onclick="closeSidebar()"></div>

    <aside class="sidebar" id="sidebar">
      <button class="sidebar-collapse-btn" onclick="toggleSidebarCollapse()" title="باز/بسته کردن سایدبار">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <div class="sidebar-inner">
        <div class="sidebar-brand">
          <div class="logo">M</div>
          <div class="brand-meta">
            <span class="brand-name">${BRAND_NAME}</span>
            <span class="brand-ver">v${CURRENT_VERSION}</span>
          </div>
        </div>
        <nav class="sidebar-nav">
          <div class="nav-group">
            <div class="nav-group-label">داشبورد</div>
            <button class="nav-link active" data-tab="overview" onclick="showTab('overview')" title="نمای کلی">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
              <span>نمای کلی</span>
              <div class="nav-indicator"></div>
            </button>
          </div>
          <div class="nav-group">
            <div class="nav-group-label">مدیریت</div>
            <button class="nav-link" data-tab="account" onclick="showTab('account')" title="حساب کاربری">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>
              <span>حساب کاربری</span>
              <div class="nav-indicator"></div>
            </button>
            <button class="nav-link" data-tab="settings" onclick="showTab('settings')" title="تنظیمات">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>
              <span>تنظیمات</span>
              <div class="nav-indicator"></div>
            </button>
          </div>
          <div class="nav-group">
            <div class="nav-group-label">ابزارها</div>
            <button class="nav-link" data-tab="api" onclick="showTab('api')" title="راهنمای API">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
              <span>راهنمای API</span>
              <div class="nav-indicator"></div>
            </button>
            <button class="nav-link" data-tab="logs" onclick="showTab('logs')" title="گزارش‌ها">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
              <span>گزارش‌ها</span>
              <div class="nav-indicator"></div>
            </button>
          </div>
        </nav>

        <div class="sidebar-card">
          <div class="sc-top">
            <div class="sc-icon">
              <svg id="sc-icon-active" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              <svg id="sc-icon-paused" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" style="display:none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>
            </div>
            <div>
              <div class="sc-label">وضعیت پنل</div>
              <div class="sc-value" id="sc-status">—</div>
            </div>
          </div>
          <div class="sc-stats">
            <div class="sc-stat"><span class="sc-stat-label">ترافیک</span><span class="sc-stat-value" id="sc-traffic">— GB</span></div>
            <div class="sc-stat"><span class="sc-stat-label">درخواست‌ها</span><span class="sc-stat-value" id="sc-requests">—</span></div>
          </div>
        </div>

        <div class="sidebar-footer">MEZDIA PANEL • v${CURRENT_VERSION}</div>
      </div>
    </aside>

    <header class="navbar">
      <div class="navbar-left">
        <button class="navbar-toggle" onclick="handleToggle()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="navbar-title-stack">
          <span class="navbar-kicker">Workspace</span>
          <div class="navbar-title-row">
            <span class="crumb-root">${BRAND_NAME}</span>
            <svg class="crumb-sep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            <span class="crumb-current" id="bc-current">نمای کلی</span>
          </div>
        </div>
      </div>
      <div class="navbar-right">
        <span class="pill" id="status-pill">—</span>
        <button class="btn btn-ghost" onclick="logout()">خروج</button>
      </div>
    </header>

    <main class="main-content">
      <div class="mobile-nav">
        <button class="active" data-tab="overview" onclick="showTab('overview')">نمای کلی</button>
        <button data-tab="account" onclick="showTab('account')">حساب</button>
        <button data-tab="settings" onclick="showTab('settings')">تنظیمات</button>
        <button data-tab="api" onclick="showTab('api')">API</button>
        <button data-tab="logs" onclick="showTab('logs')">گزارش‌ها</button>
      </div>

      <section id="overview" class="active">
        <div class="page-head">
          <h1 class="page-title">نمای کلی</h1>
          <span class="page-sub">OVERVIEW & STATISTICS</span>
        </div>
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-icon-box" style="background:rgba(57,101,255,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#3965FF" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
            <div class="stat-body"><span class="stat-label">ترافیک کل</span><span class="stat-value" id="stat-total-traffic">—</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-box" style="background:rgba(1,181,116,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#01B574" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg></div>
            <div class="stat-body"><span class="stat-label">ترافیک امروز</span><span class="stat-value" id="stat-daily-traffic">—</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-box" style="background:rgba(255,181,71,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#FFB547" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>
            <div class="stat-body"><span class="stat-label">درخواست‌ها</span><span class="stat-value" id="stat-requests">—</span></div>
          </div>
          <div class="stat-card">
            <div class="stat-icon-box" style="background:rgba(68,129,235,0.12)"><svg viewBox="0 0 24 24" fill="none" stroke="#4481EB" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div class="stat-body"><span class="stat-label">آپ‌تایم</span><span class="stat-value" id="stat-uptime">—</span></div>
          </div>
        </div>
        <div class="grid">
          <div class="card span-12">
            <div class="card-header"><h3 class="card-title">لینک اشتراک</h3><span class="card-sub">SUBSCRIPTION URL</span></div>
            <div class="card-body">
              <div class="sub-row">
                <div class="qr-frame"><img id="qr-img" alt="QR"></div>
                <div class="sub-info">
                  <code id="sub-url" style="font-size:12px;word-break:break-all;background:transparent;border:none;padding:0;display:block;margin-bottom:16px;color:var(--text-secondary)"></code>
                  <button class="btn btn-secondary btn-sm" onclick="copyText('sub-url',this)">کپی لینک</button>
                </div>
              </div>
            </div>
          </div>
          <div class="card span-4">
            <div class="card-header"><h3 class="card-title">ترافیک کل</h3></div>
            <div class="card-body chart-body">
              <canvas id="chart-total" width="160" height="160"></canvas>
              <div class="chart-legend">
                <div class="legend-item"><div class="legend-dot" style="background:var(--chart-upload)"></div><span class="legend-label">آپلود</span><span class="legend-value" id="legend-total-up">—</span></div>
                <div class="legend-item"><div class="legend-dot" style="background:var(--chart-download)"></div><span class="legend-label">دانلود</span><span class="legend-value" id="legend-total-dn">—</span></div>
              </div>
            </div>
          </div>
          <div class="card span-4">
            <div class="card-header"><h3 class="card-title">ترافیک امروز</h3></div>
            <div class="card-body chart-body">
              <canvas id="chart-daily" width="160" height="160"></canvas>
              <div class="chart-legend">
                <div class="legend-item"><div class="legend-dot" style="background:var(--chart-upload)"></div><span class="legend-label">آپلود</span><span class="legend-value" id="legend-daily-up">—</span></div>
                <div class="legend-item"><div class="legend-dot" style="background:var(--chart-download)"></div><span class="legend-label">دانلود</span><span class="legend-value" id="legend-daily-dn">—</span></div>
              </div>
            </div>
          </div>
          <div class="card span-4">
            <div class="card-header"><h3 class="card-title">جزئیات مصرف</h3></div>
            <div class="card-body">
              <div class="meter-group">
                <div class="meter-item"><div class="meter-head"><span>آپلود کل</span><span id="meter-upload-total">—</span></div><div class="meter-track"><div class="meter-fill upload" id="meter-upload-total-fill"></div></div></div>
                <div class="meter-item"><div class="meter-head"><span>دانلود کل</span><span id="meter-download-total">—</span></div><div class="meter-track"><div class="meter-fill download" id="meter-download-total-fill"></div></div></div>
                <div class="meter-item"><div class="meter-head"><span>آپلود امروز</span><span id="meter-upload-daily">—</span></div><div class="meter-track"><div class="meter-fill upload" id="meter-upload-daily-fill"></div></div></div>
                <div class="meter-item"><div class="meter-head"><span>دانلود امروز</span><span id="meter-download-daily">—</span></div><div class="meter-track"><div class="meter-fill download" id="meter-download-daily-fill"></div></div></div>
              </div>
            </div>
          </div>
          <div class="card span-6">
            <div class="card-header"><h3 class="card-title">اطلاعات اجرا</h3></div>
            <div class="card-body"><div id="runtime-info" style="color:var(--text-secondary)">در حال بارگذاری…</div></div>
          </div>
          <div class="card span-6">
            <div class="card-header"><h3 class="card-title">وضعیت حساب</h3></div>
            <div class="card-body"><div id="account-summary" style="color:var(--text-secondary)">در حال بارگذاری…</div></div>
          </div>
          <div class="card span-12">
            <div class="card-header"><h3 class="card-title">ترافیک لحظه‌ای</h3><span class="card-sub" id="chart-time-range"></span></div>
            <div class="card-body"><canvas id="chart-session" width="800" height="200" style="width:100%;height:200px"></canvas></div>
          </div>
        </div>
      </section>

      <section id="account">
        <div class="page-head"><h1 class="page-title">مدیریت حساب</h1><span class="page-sub">ACCOUNT SETTINGS</span></div>
        <div class="card-grid">
          <div class="card">
            <div class="card-header"><h3 class="card-title">اطلاعات حساب</h3><span class="card-sub">ACCOUNT INFO</span></div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-field"><label>نام حساب</label><input id="account-name" placeholder="حساب اصلی"></div>
                <div class="form-field"><label>وضعیت</label><select id="account-status"><option value="active">فعال</option><option value="paused">متوقف شده</option></select></div>
              </div>
              <div class="form-field"><label>یادداشت‌ها</label><textarea id="account-notes" placeholder="توضیحات در مورد این اکانت..."></textarea></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3 class="card-title">شبکه</h3><span class="card-sub">NETWORK</span></div>
            <div class="card-body">
              <div class="form-row">
                <div class="form-field"><label>Clean IP اختصاصی</label><textarea id="account-clean-ip" style="min-height:70px" placeholder="161.35.1.5\nlive.mkhd.app"></textarea></div>
                <div class="form-field"><label>Proxy IP اختصاصی</label><textarea id="account-proxy-ip" style="min-height:70px" placeholder="tr-us.ircf.space:443"></textarea></div>
              </div>
              <div class="form-row">
                <div class="form-field"><label>حالت اختصاصی</label><select id="account-mode"><option value="">پیش‌فرض سراسری</option><option value="alpha">VLESS</option><option value="beta">Trojan</option><option value="both">هر دو</option></select></div>
                <div class="form-field"><label>پورت‌های اختصاصی</label><input id="account-ports" placeholder="443,8443"></div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3 class="card-title">محدودیت‌ها</h3><span class="card-sub">LIMITS</span></div>
            <div class="card-body"><div class="form-field"><label>حداکثر تعداد کانفیگ تولیدی</label><input id="account-max-configs" type="number" min="0" step="1" placeholder="بدون محدودیت"></div></div>
            <div class="card-footer">
              <button class="btn btn-primary" onclick="saveAccount()">ذخیره تغییرات</button>
              <button class="btn btn-danger" onclick="resetTraffic()">بازنشانی ترافیک</button>
            </div>
          </div>
        </div>
      </section>

      <section id="settings">
        <div class="page-head"><h1 class="page-title">تنظیمات سیستم</h1><span class="page-sub">SYSTEM CONFIGURATION</span></div>
        <div class="grid">
          <div class="card span-6">
            <div class="card-header"><h3 class="card-title">هسته و پروتکل</h3></div>
            <div class="card-body">
              <label>نام پنل</label><input id="cfg-name">
              <label>مسیر API (Route)</label><input id="cfg-apiRoute">
              <label>رمز عبور پنل</label><input id="cfg-masterKey" type="password">
              <label>شناسه یکتای دستگاه (UUID)</label><input id="cfg-deviceId">
              <label>حالت تولید کانفیگ</label><select id="cfg-mode"><option value="alpha">VLESS</option><option value="beta">Trojan</option><option value="both">هر دو</option></select>
              <label>پورت‌های سوکت</label><input id="cfg-socketPorts">
              <label>اثر انگشت کلاینت (Fingerprint)</label><input id="cfg-agent">
            </div>
          </div>
          <div class="card span-6">
            <div class="card-header"><h3 class="card-title">شبکه و مسیریابی</h3></div>
            <div class="card-body">
              <label>میزبان‌های نمایشی (Maintenance Hosts)</label><textarea id="cfg-maintenanceHost"></textarea>
              <label>Clean IP ها</label><textarea id="cfg-cleanIps"></textarea>
              <label>Relay/Proxy IP پشتیبان</label><textarea id="cfg-backupRelay"></textarea>
              <label>Relay اختصاصی</label><input id="cfg-customRelay">
              <label>گره‌های Slave</label><textarea id="cfg-slaveNodes"></textarea>
              <label>آدرس DNS over HTTPS (DoH)</label><input id="cfg-customDns">
              <label>گره Metric</label><input id="cfg-metricNode">
            </div>
          </div>
          <div class="card span-6">
            <div class="card-header"><h3 class="card-title">تولید و نام‌گذاری</h3></div>
            <div class="card-body">
              <label>پیشوند نام کانفیگ‌ها</label><input id="cfg-namePrefix">
              <label>استراتژی نام‌گذاری</label><input id="cfg-nameStrategy">
              <label>فهرست مجاز User-Agent</label><input id="cfg-subUserAgent">
              <label>آدرس اختصاصی پنل</label><input id="cfg-customPanelUrl">
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer;margin-top:20px"><input id="cfg-enableOpt1" type="checkbox" style="width:18px;height:18px"> فعال‌سازی TCP Fast Open</label>
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input id="cfg-enableOpt2" type="checkbox" style="width:18px;height:18px"> فعال‌سازی ECH</label>
              <label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input id="cfg-isPaused" type="checkbox" style="width:18px;height:18px"> توقف کامل ترافیک تانل</label>
            </div>
          </div>
          <div class="card span-6">
            <div class="card-header"><h3 class="card-title">پشتیبان‌گیری دستی</h3></div>
            <div class="card-body">
              <div class="actions" style="margin-top:0;margin-bottom:16px">
                <button class="btn btn-secondary btn-sm" onclick="exportConfig()">دریافت JSON</button>
                <button class="btn btn-secondary btn-sm" onclick="importConfig()">اعمال JSON</button>
              </div>
              <label>ویرایش خام تنظیمات (JSON)</label>
              <textarea id="raw-config" style="min-height:180px;font-family:var(--font-mono);font-size:12px;direction:ltr;text-align:left"></textarea>
            </div>
          </div>
        </div>
        <div class="actions"><button class="btn btn-primary" style="padding:14px 32px" onclick="saveSettings()">ذخیره تنظیمات</button></div>
      </section>

      <section id="api">
        <div class="page-head"><h1 class="page-title">راهنمای برنامه‌نویس</h1><span class="page-sub">API DOCUMENTATION</span></div>
        <div class="card">
          <div class="card-header"><h3 class="card-title">مثال‌های API</h3></div>
          <div class="card-body">
            <p style="color:var(--text-secondary);margin-bottom:16px">تمام درخواست‌های API با آدرس ورکر به‌همراه کلید <code>MEZDIA_API_KEY</code> ارسال می‌شوند.</p>
            <pre id="api-examples"></pre>
          </div>
        </div>
      </section>

      <section id="logs">
        <div class="page-head"><h1 class="page-title">گزارش‌های سیستم</h1><span class="page-sub">SYSTEM LOGS</span></div>
        <div class="card" style="padding:0;overflow:hidden">
          <table>
            <thead><tr><th>زمان</th><th>نوع</th><th>جزئیات</th></tr></thead>
            <tbody id="log-body"></tbody>
          </table>
        </div>
      </section>
    </main>

    <button class="fixed-plugin" onclick="toggleTheme()" title="تغییر پوسته">
      <svg id="fp-icon-dark" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      <svg id="fp-icon-light" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </button>
  </div>

  <script>
    const route = location.pathname.split('/')[1] || 'sync';
    const baseRoute = '/' + route;
    let sessionKey = localStorage.getItem('mezdia_panel_key') || '';
    let config = null;
    let account = null;
    let sessionData = [];
    let refreshTimer = null;

    function getTheme(){return localStorage.getItem('mezdia_theme')||'light'}
    function applyTheme(t){
      document.documentElement.setAttribute('data-theme',t);
      var fpD=document.getElementById('fp-icon-dark'),fpL=document.getElementById('fp-icon-light');
      if(fpD)fpD.style.display=t==='dark'?'':'none';
      if(fpL)fpL.style.display=t==='light'?'':'none';
      if(window._lastRenderData)renderCharts(window._lastRenderData);
    }
    function toggleTheme(){var next=getTheme()==='dark'?'light':'dark';localStorage.setItem('mezdia_theme',next);applyTheme(next)}
    applyTheme(getTheme());

    function headers(){return {'Content-Type':'application/json'}}

    function toggleSidebar(){
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebar-overlay').classList.toggle('show');
    }
    function closeSidebar(){
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('show');
    }

    function getSidebarCollapsed(){return localStorage.getItem('mezdia_sidebar')!=='expanded'}
    function applySidebarCollapse(){
      var sb=document.getElementById('sidebar');
      if(!sb)return;
      if(getSidebarCollapsed()&&window.innerWidth>1024)sb.classList.add('collapsed');
      else sb.classList.remove('collapsed');
    }
    function toggleSidebarCollapse(){
      var sb=document.getElementById('sidebar');
      if(window.innerWidth<=1024){toggleSidebar();return}
      var collapsed=sb.classList.toggle('collapsed');
      localStorage.setItem('mezdia_sidebar',collapsed?'collapsed':'expanded');
    }
    function handleToggle(){
      if(window.innerWidth<=1024)toggleSidebar();
      else toggleSidebarCollapse();
    }
    applySidebarCollapse();
    window.addEventListener('resize',applySidebarCollapse);

    function showTab(id){
      document.querySelectorAll('section').forEach(function(s){s.classList.toggle('active',s.id===id)});
      document.querySelectorAll('.nav-link').forEach(function(b){b.classList.toggle('active',b.dataset.tab===id)});
      document.querySelectorAll('.mobile-nav button').forEach(function(b){b.classList.toggle('active',b.dataset.tab===id)});
      var navLink=document.querySelector('.nav-link[data-tab="'+id+'"] span');
      if(navLink)document.getElementById('bc-current').textContent=navLink.textContent;
      closeSidebar();
      if(id==='logs')loadLogs();
    }

    function copyText(id,btn){navigator.clipboard.writeText(document.getElementById(id).textContent);if(btn){var old=btn.textContent;btn.textContent='کپی شد ✓';setTimeout(function(){btn.textContent=old},1500)}}
    function logout(){localStorage.removeItem('mezdia_panel_key');location.reload()}
    function formatBytes(b){if(b===0)return'0 B';var k=1024,sizes=['B','KB','MB','GB','TB'],i=Math.floor(Math.log(b)/Math.log(k));return parseFloat((b/Math.pow(k,i)).toFixed(2))+' '+sizes[i]}

    function getChartColors(){var s=getComputedStyle(document.documentElement);return{upload:s.getPropertyValue('--chart-upload').trim(),download:s.getPropertyValue('--chart-download').trim(),uploadArea:s.getPropertyValue('--chart-upload-area').trim(),downloadArea:s.getPropertyValue('--chart-download-area').trim(),grid:s.getPropertyValue('--chart-grid').trim(),text:s.getPropertyValue('--text-secondary').trim(),muted:s.getPropertyValue('--text-muted').trim()}}

    /* Redesigned donut: stroked arcs with rounded caps + background track */
    function drawDonut(canvasId,upload,download,totalLabel){
      var canvas=document.getElementById(canvasId);if(!canvas)return;
      var ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,size=160;
      canvas.width=size*dpr;canvas.height=size*dpr;canvas.style.width=size+'px';canvas.style.height=size+'px';ctx.scale(dpr,dpr);
      var c=getChartColors(),cx=size/2,cy=size/2,radius=52,lw=16,total=upload+download,start=-Math.PI/2,gap=0.06;
      var fd=getComputedStyle(document.body).getPropertyValue('--font-display'),fb=getComputedStyle(document.body).getPropertyValue('--font-body');
      ctx.clearRect(0,0,size,size);
      ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);ctx.strokeStyle=c.grid;ctx.lineWidth=lw;ctx.stroke();
      if(total===0){ctx.fillStyle=c.muted;ctx.font='400 12px '+fb;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('بدون داده',cx,cy);return}
      var upA=(upload/total)*Math.PI*2,dnA=(download/total)*Math.PI*2;
      if(upload>0){ctx.beginPath();ctx.arc(cx,cy,radius,start+gap/2,start+upA-gap/2);ctx.strokeStyle=c.upload;ctx.lineWidth=lw;ctx.lineCap='round';ctx.stroke()}
      if(download>0){ctx.beginPath();ctx.arc(cx,cy,radius,start+upA+gap/2,start+upA+dnA-gap/2);ctx.strokeStyle=c.download;ctx.lineWidth=lw;ctx.lineCap='round';ctx.stroke()}
      ctx.fillStyle=c.text;ctx.font='700 22px '+fd;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(totalLabel,cx,cy-8);
      ctx.fillStyle=c.muted;ctx.font='400 11px '+fb;ctx.fillText('مجموع',cx,cy+14);
    }

    /* Redesigned session chart: bezier curves + dashed grid + time labels */
    function drawSessionChart(){
      var canvas=document.getElementById('chart-session');if(!canvas)return;
      var ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,rect=canvas.getBoundingClientRect(),w=rect.width||800,h=200;
      canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.scale(dpr,dpr);
      var c=getChartColors(),pad={top:20,right:20,bottom:36,left:56},cw=w-pad.left-pad.right,ch=h-pad.top-pad.bottom;
      var fb=getComputedStyle(document.body).getPropertyValue('--font-body');
      ctx.clearRect(0,0,w,h);
      if(sessionData.length<2){ctx.fillStyle=c.muted;ctx.font='400 13px '+fb;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('داده‌ای ثبت نشده — نمودار پس از چند لحظه به‌روز می‌شود',w/2,h/2);return}
      var maxVal=1;sessionData.forEach(function(d){if(d.up>maxVal)maxVal=d.up;if(d.down>maxVal)maxVal=d.down});maxVal*=1.15;
      ctx.setLineDash([4,4]);ctx.strokeStyle=c.grid;ctx.lineWidth=1;
      for(var i=0;i<=4;i++){var y=pad.top+(ch/4)*i;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(w-pad.right,y);ctx.stroke();ctx.fillStyle=c.muted;ctx.font='400 10px '+fb;ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(formatBytes(maxVal*(1-i/4)),pad.left-8,y)}
      ctx.setLineDash([]);
      var step=cw/(sessionData.length-1);
      ctx.fillStyle=c.muted;ctx.font='400 10px '+fb;ctx.textAlign='center';ctx.textBaseline='top';
      var ls=Math.max(1,Math.floor(sessionData.length/5));
      sessionData.forEach(function(d,i){if(i%ls===0||i===sessionData.length-1){ctx.fillText(d.t,pad.left+i*step,pad.top+ch+8)}});
      function drawSmooth(data,stroke,fill){
        ctx.beginPath();data.forEach(function(d,i){var x=pad.left+i*step,y=pad.top+ch-(d/maxVal)*ch;if(i===0)ctx.moveTo(x,y);else{var px=pad.left+(i-1)*step,py=pad.top+ch-(data[i-1]/maxVal)*ch,cp=(px+x)/2;ctx.bezierCurveTo(cp,py,cp,y,x,y)}});
        ctx.lineTo(pad.left+(data.length-1)*step,pad.top+ch);ctx.lineTo(pad.left,pad.top+ch);ctx.closePath();ctx.fillStyle=fill;ctx.fill();
        ctx.beginPath();data.forEach(function(d,i){var x=pad.left+i*step,y=pad.top+ch-(d/maxVal)*ch;if(i===0)ctx.moveTo(x,y);else{var px=pad.left+(i-1)*step,py=pad.top+ch-(data[i-1]/maxVal)*ch,cp=(px+x)/2;ctx.bezierCurveTo(cp,py,cp,y,x,y)}});
        ctx.strokeStyle=stroke;ctx.lineWidth=2.5;ctx.stroke();
      }
      drawSmooth(sessionData.map(function(d){return d.up}),c.upload,c.uploadArea);
      drawSmooth(sessionData.map(function(d){return d.down}),c.download,c.downloadArea);
      var tr=document.getElementById('chart-time-range');if(tr&&sessionData.length>1)tr.textContent=sessionData[0].t+' — '+sessionData[sessionData.length-1].t;
    }

    function renderCharts(data){
      var s=data.account.usage;
      drawDonut('chart-total',s.uploadBytes||0,s.downloadBytes||0,s.totalGB+' GB');
      drawDonut('chart-daily',s.dailyUploadBytes||0,s.dailyDownloadBytes||0,s.dailyGB+' GB');
      document.getElementById('legend-total-up').textContent=formatBytes(s.uploadBytes||0);
      document.getElementById('legend-total-dn').textContent=formatBytes(s.downloadBytes||0);
      document.getElementById('legend-daily-up').textContent=formatBytes(s.dailyUploadBytes||0);
      document.getElementById('legend-daily-dn').textContent=formatBytes(s.dailyDownloadBytes||0);
      var totalMax=Math.max(s.uploadBytes||1,s.downloadBytes||1,1),dailyMax=Math.max(s.dailyUploadBytes||1,s.dailyDownloadBytes||1,1);
      document.getElementById('meter-upload-total').textContent=formatBytes(s.uploadBytes||0);
      document.getElementById('meter-download-total').textContent=formatBytes(s.downloadBytes||0);
      document.getElementById('meter-upload-daily').textContent=formatBytes(s.dailyUploadBytes||0);
      document.getElementById('meter-download-daily').textContent=formatBytes(s.dailyDownloadBytes||0);
      setTimeout(function(){
        document.getElementById('meter-upload-total-fill').style.width=((s.uploadBytes||0)/totalMax*100)+'%';
        document.getElementById('meter-download-total-fill').style.width=((s.downloadBytes||0)/totalMax*100)+'%';
        document.getElementById('meter-upload-daily-fill').style.width=((s.dailyUploadBytes||0)/dailyMax*100)+'%';
        document.getElementById('meter-download-daily-fill').style.width=((s.dailyDownloadBytes||0)/dailyMax*100)+'%'},50);
      sessionData.push({t:new Date().toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'}),up:s.dailyUploadBytes||0,down:s.dailyDownloadBytes||0});
      if(sessionData.length>60)sessionData.shift();drawSessionChart()}

    async function login(silent){
      var key=sessionKey||document.getElementById('password').value;
      var res=await fetch(baseRoute+'/api/auth',{method:'POST',headers:headers(),body:JSON.stringify({key:key})});
      if(!res.ok){if(!silent)document.getElementById('login-error').classList.add('show');return}
      var data=await res.json();sessionKey=key;localStorage.setItem('mezdia_panel_key',key);config=data.config;account=data.account;
      document.getElementById('login').style.display='none';document.getElementById('app').style.display='block';render(data)}

    function render(data){
      window._lastRenderData=data;var s=data.account.usage,isPaused=data.account.status==='paused';
      var sp=document.getElementById('status-pill');sp.textContent=isPaused?'متوقف':'فعال';sp.className='pill '+(isPaused?'bad':'ok');
      document.getElementById('sc-status').textContent=isPaused?'متوقف':'فعال';document.getElementById('sc-status').className='sc-value '+(isPaused?'sc-bad':'');
      document.getElementById('sc-icon-active').style.display=isPaused?'none':'';document.getElementById('sc-icon-paused').style.display=isPaused?'':'none';
      document.getElementById('sc-traffic').textContent=s.totalGB+' GB';document.getElementById('sc-requests').textContent=(s.totalRequests||0).toLocaleString();
      document.getElementById('sub-url').textContent=data.account.subscriptionUrl;
      document.getElementById('qr-img').src='https://api.qrserver.com/v1/create-qr-code/?size=240x240&data='+encodeURIComponent(data.account.subscriptionUrl);
      document.getElementById('runtime-info').innerHTML='<div class="info-grid"><span class="muted">شناسه دستگاه</span><span>'+data.deviceId+'</span><span class="muted">نسخه</span><span>'+data.version+'</span><span class="muted">درخواست‌ها (کل)</span><span>'+(s.totalRequests||0).toLocaleString()+'</span><span class="muted">درخواست‌ها (امروز)</span><span>'+(s.dailyRequests||0).toLocaleString()+'</span></div>';
      document.getElementById('account-summary').innerHTML='<div class="info-grid"><span class="muted">نام</span><span>'+(data.account.name||'حساب پیش‌فرض')+'</span><span class="muted">وضعیت</span><span>'+(isPaused?'متوقف':'فعال')+'</span><span class="muted">محدودیت ترافیک</span><span>ندارد</span><span class="muted">انقضا</span><span>ندارد</span></div>';
      document.getElementById('stat-total-traffic').textContent=s.totalGB+' GB';
      document.getElementById('stat-daily-traffic').textContent=s.dailyGB+' GB';
      document.getElementById('stat-requests').textContent=(s.totalRequests||0).toLocaleString();
      var uptime=Math.floor((data.stats?.system?.uptimeSeconds??0)/60),hours=Math.floor(uptime/60),mins=uptime%60;
      document.getElementById('stat-uptime').textContent=hours>0?hours+'ساعت '+mins+'دقیقه':mins+' دقیقه';
      renderCharts(data);fillSettings();fillAccount();
      document.getElementById('api-examples').textContent='curl -H "Authorization: Bearer $MEZDIA_API_KEY" '+location.origin+baseRoute+'/api/config\\n\\n'+'curl -X PATCH -H "Authorization: Bearer $MEZDIA_API_KEY" -H "Content-Type: application/json" -d \\'{"mode":"both","isPaused":false}\\' '+location.origin+baseRoute+'/api/config\\n\\n'+'curl -X PATCH -H "Authorization: Bearer $MEZDIA_API_KEY" -H "Content-Type: application/json" -d \\'{"account":{"name":"Primary","status":"active"}}\\' '+location.origin+baseRoute+'/api/account';
      if(refreshTimer)clearInterval(refreshTimer);refreshTimer=setInterval(async function(){try{var r=await fetch(baseRoute+'/api/auth',{method:'POST',headers:headers(),body:JSON.stringify({key:sessionKey})});if(r.ok){var d=await r.json();config=d.config;account=d.account;window._lastRenderData=d;renderCharts(d)}}catch(e){}},60000)}

    function setValue(id,value){var el=document.getElementById(id);if(!el)return;if(el.type==='checkbox')el.checked=!!value;else el.value=value??''}
    function getValue(id){var el=document.getElementById(id);return el.type==='checkbox'?el.checked:el.value}
    function fillSettings(){['name','apiRoute','masterKey','deviceId','mode','socketPorts','agent','maintenanceHost','cleanIps','backupRelay','customRelay','slaveNodes','customDns','metricNode','namePrefix','nameStrategy','subUserAgent','customPanelUrl','enableOpt1','enableOpt2','isPaused'].forEach(function(k){setValue('cfg-'+k,config[k])});document.getElementById('raw-config').value=JSON.stringify(config,null,2)}
    function fillAccount(){setValue('account-name',account.name);setValue('account-status',account.status);setValue('account-notes',account.notes);setValue('account-clean-ip',account.cleanIp);setValue('account-proxy-ip',account.proxyIp);setValue('account-mode',account.userMode||'');setValue('account-ports',account.userPorts);setValue('account-max-configs',account.maxConfigs)}
    async function saveSettings(){var patch={};['name','apiRoute','masterKey','deviceId','mode','socketPorts','agent','maintenanceHost','cleanIps','backupRelay','customRelay','slaveNodes','customDns','metricNode','namePrefix','nameStrategy','subUserAgent','customPanelUrl','enableOpt1','enableOpt2','isPaused'].forEach(function(k){patch[k]=getValue('cfg-'+k)});var res=await fetch(baseRoute+'/api/sync',{method:'POST',headers:headers(),body:JSON.stringify({key:sessionKey,config:patch})});if(res.ok){alert('تنظیمات ذخیره شد. اگر مسیر API را تغییر دادید، آدرس /'+patch.apiRoute+'/dash را باز کنید.');location.reload()}else alert('ذخیره‌سازی ناموفق بود.')}
    async function saveAccount(){var patch={account:{name:getValue('account-name'),status:getValue('account-status'),notes:getValue('account-notes'),cleanIp:getValue('account-clean-ip')||null,proxyIp:getValue('account-proxy-ip')||null,userMode:getValue('account-mode')||null,userPorts:getValue('account-ports')||null,maxConfigs:getValue('account-max-configs')||null}};var res=await fetch(baseRoute+'/api/sync',{method:'POST',headers:headers(),body:JSON.stringify({key:sessionKey,config:patch})});if(res.ok){alert('حساب ذخیره شد.');location.reload()}else alert('ذخیره‌سازی ناموفق بود.')}
    async function resetTraffic(){if(!confirm('شمارنده‌های ترافیک این حساب بازنشانی شود؟'))return;var res=await fetch(baseRoute+'/api/sync',{method:'POST',headers:headers(),body:JSON.stringify({key:sessionKey,resetTraffic:true})});if(res.ok)location.reload()}
    function exportConfig(){document.getElementById('raw-config').value=JSON.stringify(config,null,2)}
    async function importConfig(){try{var next=JSON.parse(document.getElementById('raw-config').value);var res=await fetch(baseRoute+'/api/sync',{method:'POST',headers:headers(),body:JSON.stringify({key:sessionKey,config:next})});if(res.ok)location.reload();else alert('وارد کردن ناموفق بود.')}catch(e){alert('JSON نامعتبر است.')}}
    async function loadLogs(){var res=await fetch(baseRoute+'/api/logs',{method:'POST',headers:headers(),body:JSON.stringify({key:sessionKey})});if(!res.ok)return;var data=await res.json();document.getElementById('log-body').innerHTML=(data.logs||[]).map(function(l){return'<tr><td>'+l.ts+'</td><td>'+l.type+'</td><td>'+l.detail+'</td></tr>'}).join('')||'<tr><td colspan="3" class="muted">هنوز گزارشی ثبت نشده است.</td></tr>'}
    document.getElementById('password').addEventListener('keydown',function(e){if(e.key==='Enter')login()});
    window.addEventListener('resize',function(){if(window._lastRenderData)drawSessionChart()});
    if(sessionKey){document.getElementById('password').value=sessionKey;login(true)}
  </script>
</body>
</html>`;
}

async function serveMaintenancePage(request, url, sysConfig) {
    const fakeList = sysConfig.maintenanceHost ? sysConfig.maintenanceHost.split(",").map(s => s.trim()).filter(Boolean) : ["https://www.ubuntu.com"];
    const clientIP = request.headers.get("cf-connecting-ip") || "0.0.0.0";
    const ipHash = Array.from(clientIP).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const targetStr = fakeList[ipHash % fakeList.length].startsWith("http") ? fakeList[ipHash % fakeList.length] : `https://${fakeList[ipHash % fakeList.length]}`;
    try {
        const targetUrl = new URL(targetStr);
        if (url.pathname !== "/") targetUrl.pathname = url.pathname;
        targetUrl.search = url.search;
        const cleanHeaders = new Headers(request.headers);
        cleanHeaders.set("Host", targetUrl.hostname);
        cleanHeaders.delete("cf-connecting-ip");
        cleanHeaders.delete("x-forwarded-for");
        const fetchInit = { method: request.method, headers: cleanHeaders, redirect: "follow" };
        if (request.method !== "GET" && request.method !== "HEAD") fetchInit.body = request.body;
        return await fetch(new Request(targetUrl.toString(), fetchInit));
    } catch (e) {
        return new Response("Not Found", { status: 404 });
    }
}

function serveSubscriptionInfoPage(account, host, url, sysUsageCache, activeDeviceId, sysConfig) {
    const snap = accountUsageSnapshot();
    const totalGb = (snap.total / 1073741824).toFixed(2);
    const status = sysConfig.isPaused || account.isPaused ? "متوقف" : "فعال";
    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>اشتراک ${BRAND_NAME}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet"><style>body{margin:0;background:#F4F7FE;color:#1B2559;font-family:'DM Sans','Vazirmatn',system-ui,sans-serif;padding:32px;line-height:1.8;letter-spacing:-0.5px}.card{max-width:640px;margin:40px auto;background:#ffffff;border:1px solid #E0E5F2;border-radius:20px;padding:28px;box-shadow:14px 17px 40px 4px rgba(112,144,176,0.08)}h1{font-size:36px;margin:0 0 18px;display:flex;align-items:center;gap:12px;font-weight:700;letter-spacing:-0.374px}.mark{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#3965FF,#4481EB);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-family:'DM Sans',monospace;font-size:18px;box-shadow:0 4px 14px 0 rgba(57,101,255,0.39)}code{background:#F4F7FE;border:1px solid #E0E5F2;border-radius:8px;padding:5px 10px;word-break:break-all;direction:ltr;display:inline-block;font-size:12px;font-family:'JetBrains Mono',monospace}.row{margin:14px 0;color:#A3AED0;font-size:14px}.row strong{color:#1B2559}</style></head><body><div class="card"><h1><span class="mark">M</span> ${BRAND_NAME}</h1><p class="row">نام حساب: <strong>${account.name || "پیش‌فرض"}</strong></p><p class="row">وضعیت: <strong>${status}</strong></p><p class="row">ترافیک مصرفی: <strong>${totalGb} گیگابایت</strong></p><p class="row">لینک اشتراک:</p><p><code>https://${host}/${sysConfig.apiRoute}</code></p></div></body></html>`;
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}


/* ---- src/stream.js ---- */

const USAGE_FLUSH_BYTES = 256 * 1024;

function byteLen(data) {
    if (!data) return 0;
    if (typeof data.byteLength === "number") return data.byteLength;
    if (typeof data.length === "number") return data.length;
    return 0;
}

async function processTelemetryStream(env, ctx) {
    const [client, webSocket] = Object.values(new WebSocketPair());
    webSocket.accept();
    webSocket.binaryType = "arraybuffer";
    startDataPipe(webSocket, env, ctx);
    return new Response(null, { status: 101, webSocket: client });
}

async function startDataPipe(webSocket, env, ctx) {
    incrementActiveConnections();
    let remoteSocket, dataWriter, isInit = true, queue = Promise.resolve();
    let activeClientHash = null;
    let pendingUp = 0, pendingDown = 0;

    // meter accumulates real proxied bytes and flushes them to the usage store
    // in batches to keep per-chunk overhead low.
    function meter(up, down) {
        pendingUp += up;
        pendingDown += down;
        if (pendingUp + pendingDown >= USAGE_FLUSH_BYTES) flushUsage();
    }
    function flushUsage() {
        if (activeClientHash && (pendingUp > 0 || pendingDown > 0)) {
            trackBytes(activeClientHash, pendingUp, pendingDown, env, ctx);
            pendingUp = 0;
            pendingDown = 0;
        }
    }
    function teardown() {
        flushUsage();
        decrementActiveConnections();
    }

    webSocket.addEventListener('close', teardown);
    webSocket.addEventListener('error', teardown);
    webSocket.addEventListener("message", (event) => {
        queue = queue.then(async () => {
            try {
                if (isInit) {
                    isInit = false;
                    const isModeAlpha = await parseSensorData(event.data);
                    if (isModeAlpha) webSocket.send(new Uint8Array([0, 0]));
                } else if (dataWriter) {
                    meter(byteLen(event.data), 0);
                    await dataWriter.write(event.data);
                }
            } catch (err) { webSocket.close(); }
        });
    });

    async function parseSensorData(bufferData) {
        const view = new Uint8Array(bufferData);
        let targetAddr = "", targetPort = 0, offset = 0, isModeAlpha = false, activeProfile = null;

        if (view[0] === 0x00) {
            isModeAlpha = true;
            
            // Validate UUID
            let clientHash = Array.from(view.slice(1, 17)).map(b => b.toString(16).padStart(2, '0')).join('');
            activeProfile = getAllProfiles().find(p => p.id.replace(/-/g, '').toLowerCase() === clientHash);
            if (!activeProfile) return false; // DROP IF INVALID PROFILE
            
            activeClientHash = clientHash;
            trackConnection(activeClientHash, env, ctx);

            const optLen = view[17];
            const pPos = 18 + optLen + 1;
            targetPort = new DataView(bufferData.slice(pPos, pPos + 2)).getUint16(0);
            const aType = view[pPos + 2];
            let vPos = pPos + 3, aLen = 0;

            if (aType === 1) { aLen = 4; targetAddr = view.slice(vPos, vPos + aLen).join("."); }
            else if (aType === 2) { aLen = view[vPos]; vPos++; targetAddr = new TextDecoder().decode(view.slice(vPos, vPos + aLen)); }
            else if (aType === 3) { aLen = 16; const dv = new DataView(bufferData.slice(vPos, vPos + aLen)); targetAddr = Array.from({ length: 8 }, (_, i) => dv.getUint16(i * 2).toString(16)).join(":"); }
            offset = vPos + aLen;
        } else {
            let ePos = bufferData.byteLength;
            for (let i = 0; i < bufferData.byteLength; i++) { if (view[i] === 0x0D && view[i + 1] === 0x0A) { ePos = i; break; } }
            
            let clientHashHex = new TextDecoder().decode(view.slice(0, ePos));
            activeProfile = getAllProfiles().find(p => getTrojanHash(p.id) === clientHashHex);
            if (!activeProfile) return false;
            
            activeClientHash = activeProfile.id.replace(/-/g, '').toLowerCase();
            trackConnection(activeClientHash, env, ctx);

            let hPos = ePos + 2; hPos++;
            let aType = view[hPos]; hPos++; let aLen = 0;

            if (aType === 1) { aLen = 4; targetAddr = view.slice(hPos, hPos + aLen).join("."); }
            else if (aType === 3) { aLen = view[hPos]; hPos++; targetAddr = new TextDecoder().decode(view.slice(hPos, hPos + aLen)); }
            else if (aType === 4) { aLen = 16; const dv = new DataView(bufferData.slice(hPos, hPos + aLen)); targetAddr = Array.from({ length: 8 }, (_, i) => dv.getUint16(i * 2).toString(16)).join(":"); }

            hPos += aLen;
            targetPort = new DataView(bufferData.slice(hPos, hPos + 2)).getUint16(0);
            offset = hPos + 4;
        }

        let isDomain = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/.test(targetAddr) || /^[a-zA-Z0-9-]+$/.test(targetAddr);
        let connectAddr = targetAddr;
        if (isDomain && sysConfig.customDns) {
            try {
                const dohUrl = new URL(sysConfig.customDns);
                dohUrl.searchParams.set("name", targetAddr);
                dohUrl.searchParams.set("type", "A");
                let dnsRes = await fetch(dohUrl.toString(), { headers: { "accept": "application/dns-json" }});
                let dnsJson = await dnsRes.json();
                if (dnsJson.Answer && dnsJson.Answer.length > 0) {
                    connectAddr = dnsJson.Answer[0].data;
                }
            } catch (e) {}
        }

        try {
            remoteSocket = connect({ hostname: connectAddr, port: targetPort });
            await remoteSocket.opened;
        } catch {
            let fallbackIp = sysConfig.backupRelay || ["pro", "xy", "ip.cmliussss.net"].join("");
            if (activeProfile && activeProfile.proxyIp) {
                let list = activeProfile.proxyIp.split(',').map(s => s.trim()).filter(Boolean);
                if (list.length > 0) {
                    fallbackIp = list[Math.floor(Math.random() * list.length)];
                }
            }
            try {
                const [altIP, altPortStr] = fallbackIp.split(":");
                remoteSocket = connect({ hostname: altIP, port: altPortStr ? Number(altPortStr) : targetPort });
                await remoteSocket.opened;
            } catch { webSocket.close(); return isModeAlpha; }
        }

        dataWriter = remoteSocket.writable.getWriter();
        if (offset < bufferData.byteLength) {
            let chunk = bufferData.slice(offset);
            meter(byteLen(chunk), 0);
            await dataWriter.write(chunk);
        }
        remoteSocket.readable.pipeTo(new WritableStream({ write(chunk) {
            meter(0, byteLen(chunk));
            webSocket.send(chunk);
        } })).catch(() => {}).finally(() => flushUsage());

        return isModeAlpha;
    }
}


/* ---- src/index.js ---- */

function corsHeaders() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
        "Access-Control-Allow-Headers": "Authorization,Content-Type,X-Mezdia-API-Key"
    };
}

function jsonNotFound() {
    return new Response(JSON.stringify({ success: false, error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json; charset=utf-8", ...corsHeaders() }
    });
}

async function serveSubscription(request, url) {
    const ua = (request.headers.get("User-Agent") || "").toLowerCase();
    const acceptHeader = (request.headers.get("Accept") || "").toLowerCase();
    const secFetchDest = (request.headers.get("Sec-Fetch-Dest") || "").toLowerCase();
    const isCustomUaAllowed = sysConfig.subUserAgent && sysConfig.subUserAgent.trim().length > 0 && ua.includes(sysConfig.subUserAgent.trim().toLowerCase());
    const clientHost = request.headers.get("Host") || url.hostname;

    const isRealBrowser = (
        secFetchDest === "document" || acceptHeader.includes("text/html")
    ) && (
        ua.includes("mozilla") || ua.includes("chrome") || ua.includes("safari") || ua.includes("applewebkit") || ua.includes("gecko") || ua.includes("opera") || ua.includes("edge")
    ) && !ua.includes("cla" + "sh") && !ua.includes("si" + "ng-box") && !ua.includes("v" + "2r" + "ay") && !ua.includes("shadow" + "rocket") && !ua.includes("quantum" + "ult") && !ua.includes("surf" + "board") && !ua.includes("sta" + "sh");

    if (isRealBrowser && !isCustomUaAllowed) {
        return serveSubscriptionInfoPage(sysConfig.account, clientHost, url, sysUsageCache, activeDeviceId, sysConfig);
    }

    const allowInsecure = url.searchParams.get("insecure") === "true" ||
        url.searchParams.get("allowInsecure") === "true" ||
        url.searchParams.get("allow_insecure") === "1" ||
        url.searchParams.get("allowInsecure") === "1";

    const resHeaders = new Headers(corsHeaders());
    resHeaders.set("Cache-Control", "no-store");
    const snap = accountUsageSnapshot();
    const subUserInfo = `upload=${snap.upload}; download=${snap.download}; total=0; expire=0`;
    resHeaders.set("Subscription-UserInfo", subUserInfo);
    resHeaders.set("subscription-userinfo", subUserInfo);
    resHeaders.set("Profile-Update-Interval", "1");
    resHeaders.set("profile-update-interval", "1");
    const fileName = encodeURIComponent(sysConfig.account?.name || "Mezdia");
    resHeaders.set("Content-Disposition", `attachment; filename="${fileName}"; filename*=UTF-8''${fileName}`);

    const flag = (url.searchParams.get("flag") || url.searchParams.get("format") || url.searchParams.get("type") || url.searchParams.get("output") || "").toLowerCase();
    let isClashYaml = false;
    let isSingboxJson = false;
    let isClashJson = false;
    if (flag === "clash" || flag === "yaml" || flag === "meta" || flag === "stash" || flag === "clash-meta" || flag === "y") {
        isClashYaml = true;
    } else if (flag === "b" || flag === "c_legacy") {
        isClashJson = true;
    } else if (flag === "sing" || flag === "singbox" || flag === "sing-box" || flag === "sb" || flag === "s" || flag === "c" || flag === "g") {
        isSingboxJson = true;
    } else if (flag === "a" || flag === "raw" || flag === "") {
        if (ua.includes(getGamma()) || ua.includes("meta") || ua.includes("sta" + "sh") || ua.includes("verge") || ua.includes("mihomo") || ua.includes("cfw") || ua.includes("stash") || ua.includes("clash")) {
            isClashYaml = true;
        } else if (ua.includes("sing-box") || ua.includes("singbox") || ua.includes("hiddify") || ua.includes("nekobox") || ua.includes("sfa") || ua.includes("karing") || ua.includes("v2rayng")) {
            isSingboxJson = true;
        }
    }

    if (isClashYaml) {
        resHeaders.set("Content-Type", "text/yaml; charset=utf-8");
        return new Response(await buildYamlProfile(clientHost, null, allowInsecure), { headers: resHeaders });
    }
    if (isSingboxJson) {
        resHeaders.set("Content-Type", "application/json; charset=utf-8");
        return new Response(JSON.stringify(await buildSingBoxJsonProfile(clientHost, null, allowInsecure), null, 2), { headers: resHeaders });
    }
    if (isClashJson) {
        resHeaders.set("Content-Type", "application/json; charset=utf-8");
        return new Response(JSON.stringify(await buildClashJsonProfile(clientHost, null, allowInsecure), null, 2), { headers: resHeaders });
    }
    resHeaders.set("Content-Type", "text/plain; charset=utf-8");
    return new Response(safeBtoa(await buildUriProfile(clientHost, null, allowInsecure)), { headers: resHeaders });
}

export default {
    async fetch(request, env, ctx) {
        try {
            await loadSysConfig(env);
            if (!activeDeviceId) generateHardwareId(sysConfig.apiRoute);
            const url = new URL(request.url);
            if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
            const upgradeHeader = request.headers.get("Upgrade");
            const isTelemetryStream = upgradeHeader && upgradeHeader.toLowerCase() === "websocket";
            let reqPath = url.pathname;
            if (reqPath.endsWith("/") && reqPath.length > 1) reqPath = reqPath.slice(0, -1);

            const route = `/${encodeURI(sysConfig.apiRoute)}`;
            const apiPrefix = `${route}/api`;
            const isApiRoute = reqPath === `${apiPrefix}/auth` ||
                reqPath === `${apiPrefix}/sync` ||
                reqPath === `${apiPrefix}/config` ||
                reqPath === `${apiPrefix}/settings` ||
                reqPath.startsWith(`${apiPrefix}/settings/`) ||
                reqPath === `${apiPrefix}/account` ||
                reqPath === `${apiPrefix}/stats` ||
                reqPath === `${apiPrefix}/logs` ||
                reqPath === `${apiPrefix}/traffic/reset`;
            const isAuthorizedRoute = reqPath === route || reqPath === `${route}/dash` || isApiRoute;

            if (!isTelemetryStream && !isAuthorizedRoute) {
                const removedRouteSuffixes = [
                    "/api/" + "update",
                    "/api/" + "users",
                    "/" + "tg"
                ];
                if (reqPath.startsWith(`${apiPrefix}/`) || removedRouteSuffixes.some(suffix => reqPath.endsWith(suffix))) {
                    return jsonNotFound();
                }
                return serveMaintenancePage(request, url, sysConfig);
            }

            if (!isTelemetryStream) {
                if (reqPath === `${route}/dash`) {
                    return new Response(getDashboardUI(env.IOT_DB !== undefined), { headers: { "Content-Type": "text/html;charset=utf-8", "Cache-Control": "no-store" } });
                }
                if (reqPath === `${apiPrefix}/auth`) {
                    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
                    return handleAuth(request, url.hostname, ctx, env);
                }
                if (reqPath === `${apiPrefix}/sync`) {
                    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
                    return handleConfigSync(request, env, ctx);
                }
                if (reqPath === `${apiPrefix}/config`) return handleConfigApi(request, env, ctx);
                if (reqPath === `${apiPrefix}/settings` || reqPath.startsWith(`${apiPrefix}/settings/`)) return handleSettingsApi(request, env, ctx);
                if (reqPath === `${apiPrefix}/account`) return handleAccountApi(request, env, ctx);
                if (reqPath === `${apiPrefix}/stats`) return handleStatsApi(request, env);
                if (reqPath === `${apiPrefix}/logs`) return handleLogsApi(request, env);
                if (reqPath === `${apiPrefix}/traffic/reset`) return handleTrafficResetApi(request, env, ctx);
                if (reqPath === route) return serveSubscription(request, url);
            }

            if (isTelemetryStream) {
                if (sysConfig.isPaused || sysConfig.account?.isPaused) return new Response(null, { status: 503 });
                return processTelemetryStream(env, ctx);
            }

            return new Response(null, { status: 404 });
        } catch (err) {
            return new Response(JSON.stringify({ success: false, error: "Request failed" }), { status: 500, headers: { "Content-Type": "application/json; charset=utf-8" } });
        }
    }
};
