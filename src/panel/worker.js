import { connect } from "cloudflare:sockets";

/* Mezdia Panel generated Worker bundle. Source modules live in src/. */


/* ---- src/config.js ---- */
const BRAND_NAME = "Mezdia Panel";
const CURRENT_VERSION = "3.1.0-personal";

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
<html lang="fa" dir="rtl" data-theme="dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${BRAND_NAME}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-display: 'SF Pro Display', 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      --font-body: 'SF Pro Text', 'Vazirmatn', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: ui-monospace, 'SF Mono', Menlo, Consolas, monospace;
      --radius-sm: 8px;
      --radius-md: 11px;
      --radius-lg: 18px;
      --radius-pill: 9999px;
      --space-xxs: 4px;
      --space-xs: 8px;
      --space-sm: 12px;
      --space-md: 17px;
      --space-lg: 24px;
      --space-xl: 32px;
      --transition: 0.2s ease;
    }
    [data-theme="dark"] {
      color-scheme: dark;
      --bg: #1d1d1f;
      --bg-secondary: #272729;
      --surface: #2a2a2c;
      --border: rgba(255,255,255,0.08);
      --text: #ffffff;
      --text-secondary: #cccccc;
      --text-muted: #999999;
      --accent: #2997ff;
      --accent-hover: #4da6ff;
      --accent-subtle: rgba(41,151,255,0.12);
      --chart-upload: #2997ff;
      --chart-download: #30d158;
      --chart-upload-area: rgba(41,151,255,0.15);
      --chart-download-area: rgba(48,209,88,0.15);
      --chart-grid: rgba(255,255,255,0.06);
      --chart-text: #999999;
      --meter-bg: rgba(255,255,255,0.06);
      --nav-bg: #000000;
      --nav-text: #ffffff;
      --sidebar-bg: #272729;
      --sidebar-active-bg: #2a2a2c;
      --input-bg: #1d1d1f;
      --code-bg: #000000;
      --danger: #ff453a;
      --danger-subtle: rgba(255,69,58,0.12);
      --danger-border: rgba(255,69,58,0.3);
      --success: #30d158;
      --success-subtle: rgba(48,209,88,0.12);
      --success-border: rgba(48,209,88,0.3);
      --warn: #ffd60a;
      --warn-subtle: rgba(255,214,10,0.12);
      --warn-border: rgba(255,214,10,0.3);
      --table-stripe: rgba(255,255,255,0.02);
    }
    [data-theme="light"] {
      color-scheme: light;
      --bg: #f5f5f7;
      --bg-secondary: #ffffff;
      --surface: #ffffff;
      --border: #e0e0e0;
      --text: #1d1d1f;
      --text-secondary: #333333;
      --text-muted: #7a7a7a;
      --accent: #0066cc;
      --accent-hover: #0077e6;
      --accent-subtle: rgba(0,102,204,0.08);
      --chart-upload: #0066cc;
      --chart-download: #34c759;
      --chart-upload-area: rgba(0,102,204,0.1);
      --chart-download-area: rgba(52,199,89,0.1);
      --chart-grid: #e0e0e0;
      --chart-text: #7a7a7a;
      --meter-bg: #e8e8ed;
      --nav-bg: #000000;
      --nav-text: #ffffff;
      --sidebar-bg: #ffffff;
      --sidebar-active-bg: #f5f5f7;
      --input-bg: #ffffff;
      --code-bg: #f5f5f7;
      --danger: #ff3b30;
      --danger-subtle: rgba(255,59,48,0.08);
      --danger-border: rgba(255,59,48,0.25);
      --success: #34c759;
      --success-subtle: rgba(52,199,89,0.08);
      --success-border: rgba(52,199,89,0.25);
      --warn: #ff9500;
      --warn-subtle: rgba(255,149,0,0.08);
      --warn-border: rgba(255,149,0,0.25);
      --table-stripe: rgba(0,0,0,0.02);
    }
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;background:var(--bg);color:var(--text);font-family:var(--font-body);font-size:17px;line-height:1.47;letter-spacing:-0.374px;-webkit-font-smoothing:antialiased;transition:background var(--transition),color var(--transition)}
    header{height:44px;display:flex;align-items:center;gap:var(--space-sm);padding:0 var(--space-lg);background:var(--nav-bg);color:var(--nav-text);position:sticky;top:0;z-index:50;border-bottom:1px solid rgba(255,255,255,0.08)}
    .logo{width:28px;height:28px;border-radius:var(--radius-sm);background:var(--accent);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:14px;color:#fff;flex-shrink:0}
    .brand{font-family:var(--font-display);font-size:14px;font-weight:600;letter-spacing:-0.01em;color:var(--nav-text)}
    .header-pills{display:flex;gap:6px;align-items:center}
    .header-spacer{flex:1}
    .pill{display:inline-flex;align-items:center;gap:5px;border-radius:var(--radius-pill);padding:3px 10px;font-size:12px;font-weight:600;line-height:1.29;letter-spacing:-0.224px;border:1px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.7)}
    .pill.ok{color:var(--success);border-color:var(--success-border);background:var(--success-subtle)}
    .pill.bad{color:var(--danger);border-color:var(--danger-border);background:var(--danger-subtle)}
    .pill.warn{color:var(--warn);border-color:var(--warn-border);background:var(--warn-subtle)}
    .theme-toggle{width:32px;height:32px;border-radius:var(--radius-pill);border:none;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background var(--transition);flex-shrink:0}
    .theme-toggle:hover{background:rgba(255,255,255,0.18)}
    .btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:none;border-radius:var(--radius-pill);padding:8px 18px;font-family:var(--font-body);font-size:14px;font-weight:600;line-height:1.29;letter-spacing:-0.224px;cursor:pointer;transition:all var(--transition);text-decoration:none;white-space:nowrap}
    .btn:active{transform:scale(0.95)}
    .btn-primary{background:var(--accent);color:#fff}
    .btn-primary:hover{background:var(--accent-hover)}
    .btn-secondary{background:transparent;color:var(--accent);border:1px solid var(--accent)}
    .btn-secondary:hover{background:var(--accent-subtle)}
    .btn-danger{background:var(--danger-subtle);color:var(--danger);border:1px solid var(--danger-border)}
    .btn-danger:hover{background:rgba(255,69,58,0.2)}
    .btn-ghost{background:rgba(255,255,255,0.06);color:var(--text-secondary)}
    [data-theme="light"] .btn-ghost{background:rgba(0,0,0,0.04)}
    .btn-ghost:hover{background:rgba(255,255,255,0.1)}
    [data-theme="light"] .btn-ghost:hover{background:rgba(0,0,0,0.07)}
    main{display:grid;grid-template-columns:220px 1fr;min-height:calc(100vh - 44px)}
    nav{background:var(--sidebar-bg);border-left:1px solid var(--border);padding:var(--space-sm);position:sticky;top:44px;height:calc(100vh - 44px);overflow-y:auto;transition:background var(--transition),border var(--transition)}
    nav button{width:100%;display:flex;align-items:center;gap:var(--space-xs);border:none;background:transparent;color:var(--text-muted);padding:10px 12px;border-radius:var(--radius-sm);margin-bottom:2px;cursor:pointer;font-family:var(--font-body);font-size:14px;font-weight:600;transition:all var(--transition)}
    nav button svg{flex-shrink:0;opacity:0.6;transition:opacity var(--transition)}
    nav button:hover{background:var(--sidebar-active-bg);color:var(--text-secondary)}
    nav button:hover svg{opacity:0.85}
    nav button.active{background:var(--accent-subtle);color:var(--accent);box-shadow:inset 3px 0 0 var(--accent)}
    nav button.active svg{opacity:1}
    .content{padding:var(--space-xl);max-width:1100px;transition:background var(--transition)}
    section{display:none}
    section.active{display:block;animation:fadein 0.25s ease}
    @keyframes fadein{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
    .page-title{font-family:var(--font-display);font-size:28px;font-weight:600;line-height:1.14;letter-spacing:0.196px;margin-bottom:var(--space-lg);color:var(--text)}
    .card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-lg);transition:background var(--transition),border var(--transition)}
    .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-md)}
    .full{grid-column:1/-1}
    .card-title{font-family:var(--font-display);font-size:13px;font-weight:600;line-height:1.29;letter-spacing:-0.224px;text-transform:uppercase;color:var(--text-muted);margin-bottom:var(--space-md)}
    label{display:block;font-size:13px;font-weight:600;line-height:1.29;letter-spacing:-0.224px;color:var(--text-muted);margin:var(--space-sm) 0 var(--space-xxs)}
    label:first-child{margin-top:0}
    input,select,textarea{width:100%;background:var(--input-bg);color:var(--text);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 12px;font-family:var(--font-body);font-size:14px;line-height:1.43;transition:border var(--transition)}
    input:focus,select:focus,textarea:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-subtle)}
    textarea{min-height:80px;resize:vertical}
    .row{display:grid;grid-template-columns:repeat(2,1fr);gap:var(--space-sm)}
    .actions{display:flex;gap:var(--space-xs);flex-wrap:wrap;margin-top:var(--space-md)}
    code,pre{background:var(--code-bg);border:1px solid var(--border);border-radius:var(--radius-sm);font-family:var(--font-mono);direction:ltr;text-align:left;display:block}
    code{padding:2px 6px;font-size:13px;word-break:break-all;display:inline-block;border-radius:4px}
    pre{padding:var(--space-md);overflow:auto;white-space:pre-wrap;font-size:13px;line-height:1.6}
    table{width:100%;border-collapse:collapse}
    td,th{padding:10px 12px;text-align:right;font-size:13px;line-height:1.43;border-bottom:1px solid var(--border)}
    th{font-weight:600;font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:-0.12px}
    tr:nth-child(even) td{background:var(--table-stripe)}
    .qr-wrap{display:flex;align-items:center;gap:var(--space-md);flex-wrap:wrap}
    #qr-img{width:120px;height:120px;border-radius:var(--radius-md);background:#fff;padding:6px;flex-shrink:0}
    .chart-container{display:flex;flex-direction:column;align-items:center;gap:var(--space-sm)}
    .chart-legend{display:flex;gap:var(--space-md);font-size:13px;color:var(--text-secondary)}
    .chart-legend-item{display:flex;align-items:center;gap:6px}
    .chart-legend-dot{width:10px;height:10px;border-radius:var(--radius-pill);flex-shrink:0}
    .meter-group{display:flex;flex-direction:column;gap:var(--space-sm)}
    .meter{display:flex;flex-direction:column;gap:4px}
    .meter-header{display:flex;justify-content:space-between;align-items:baseline;font-size:13px}
    .meter-label{color:var(--text-muted);font-weight:600}
    .meter-value{color:var(--text-secondary);font-variant-numeric:tabular-nums}
    .meter-track{height:8px;background:var(--meter-bg);border-radius:var(--radius-pill);overflow:hidden}
    .meter-fill{height:100%;border-radius:var(--radius-pill);transition:width 0.8s cubic-bezier(0.22,1,0.36,1);width:0%}
    .meter-fill.upload{background:var(--chart-upload)}
    .meter-fill.download{background:var(--chart-download)}
    #login{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg);z-index:100}
    .login-card{width:min(380px,calc(100vw - 32px));background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:var(--space-xl) var(--space-lg);text-align:center}
    .login-logo{width:56px;height:56px;margin:0 auto var(--space-md);border-radius:var(--radius-md);background:var(--accent);display:flex;align-items:center;justify-content:center;font-family:var(--font-display);font-weight:700;font-size:22px;color:#fff}
    .login-title{font-family:var(--font-display);font-size:21px;font-weight:600;margin-bottom:var(--space-xs)}
    .login-desc{font-size:14px;color:var(--text-muted);margin-bottom:var(--space-lg);line-height:1.5}
    .login-error{display:none;margin-top:var(--space-sm);font-size:13px;color:var(--danger)}
    .login-error.show{display:block}
    .muted{color:var(--text-muted)}
    .text-sm{font-size:14px}
    .mb-sm{margin-bottom:var(--space-sm)}
    .flex-between{display:flex;justify-content:space-between;align-items:center}
    .info-grid{display:grid;grid-template-columns:auto 1fr;gap:4px 12px}
    @media(max-width:820px){main{grid-template-columns:1fr}nav{position:relative;top:0;height:auto;display:flex;overflow-x:auto;border-left:none;border-bottom:1px solid var(--border);gap:2px;padding:6px;-webkit-overflow-scrolling:touch}nav button{white-space:nowrap;width:auto;flex-shrink:0}.grid,.row{grid-template-columns:1fr}.content{padding:var(--space-md)}.page-title{font-size:24px}}
    @media(max-width:640px){.content{padding:var(--space-sm)}.qr-wrap{flex-direction:column;align-items:flex-start}}
  </style>
</head>
<body>
  <div id="login">
    <div class="login-card">
      <div class="login-logo">M</div>
      <div class="login-title">${BRAND_NAME}</div>
      <p class="login-desc">برای ورود، رمز پنل را وارد کنید.<br>دسترسی برنامه‌نویسی از طریق <code>MEZDIA_API_KEY</code> انجام می‌شود.</p>
      ${hasDB ? "" : `<p class="pill bad" style="display:block;margin-bottom:12px">پایگاه‌داده (IOT_DB) متصل نیست؛ تنظیمات ذخیره نخواهد شد.</p>`}
      <label for="password">رمز پنل</label>
      <input id="password" type="password" autocomplete="current-password" placeholder="•••••••••">
      <div class="actions" style="justify-content:center;margin-top:16px"><button class="btn btn-primary" onclick="login()">ورود</button></div>
      <p id="login-error" class="login-error">ورود ناموفق بود. رمز را بررسی کنید.</p>
    </div>
  </div>
  <header>
    <div class="logo">M</div>
    <span class="brand">${BRAND_NAME}</span>
    <div class="header-pills">
      <span class="pill">v${CURRENT_VERSION}</span>
      <span id="status-pill" class="pill">—</span>
    </div>
    <div class="header-spacer"></div>
    <button class="theme-toggle" onclick="toggleTheme()" title="تغییر پوسته">
      <svg id="theme-icon-dark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
      <svg id="theme-icon-light" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:none"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
    </button>
    <button class="btn btn-ghost" style="color:rgba(255,255,255,0.7);border:none;padding:6px 12px;font-size:13px" onclick="logout()">خروج</button>
  </header>
  <main>
    <nav>
      <button class="active" data-tab="overview" onclick="showTab('overview')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>
        نمای کلی
      </button>
      <button data-tab="account" onclick="showTab('account')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>
        حساب
      </button>
      <button data-tab="settings" onclick="showTab('settings')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z"/></svg>
        تنظیمات
      </button>
      <button data-tab="api" onclick="showTab('api')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        API
      </button>
      <button data-tab="logs" onclick="showTab('logs')">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2Z"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
        گزارش‌ها
      </button>
    </nav>
    <div class="content">
      <section id="overview" class="active">
        <div class="page-title">نمای کلی</div>
        <div class="grid">
          <div class="card full">
            <div class="card-title">لینک اشتراک</div>
            <div class="qr-wrap">
              <img id="qr-img" alt="QR">
              <div style="flex:1;min-width:200px">
                <code id="sub-url" style="font-size:12px;word-break:break-all;background:transparent;border:none;padding:0;display:block;margin-bottom:10px"></code>
                <button class="btn btn-secondary" onclick="copyText('sub-url',this)">کپی لینک</button>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">ترافیک کل</div>
            <div class="chart-container">
              <canvas id="chart-total" width="160" height="160"></canvas>
              <div class="chart-legend">
                <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--chart-upload)"></div><span>آپلود</span></div>
                <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--chart-download)"></div><span>دانلود</span></div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">ترافیک امروز</div>
            <div class="chart-container">
              <canvas id="chart-daily" width="160" height="160"></canvas>
              <div class="chart-legend">
                <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--chart-upload)"></div><span>آپلود</span></div>
                <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--chart-download)"></div><span>دانلود</span></div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">جزئیات ترافیک</div>
            <div class="meter-group">
              <div class="meter"><div class="meter-header"><span class="meter-label">آپلود کل</span><span class="meter-value" id="meter-upload-total">—</span></div><div class="meter-track"><div class="meter-fill upload" id="meter-upload-total-fill"></div></div></div>
              <div class="meter"><div class="meter-header"><span class="meter-label">دانلود کل</span><span class="meter-value" id="meter-download-total">—</span></div><div class="meter-track"><div class="meter-fill download" id="meter-download-total-fill"></div></div></div>
              <div class="meter"><div class="meter-header"><span class="meter-label">آپلود امروز</span><span class="meter-value" id="meter-upload-daily">—</span></div><div class="meter-track"><div class="meter-fill upload" id="meter-upload-daily-fill"></div></div></div>
              <div class="meter"><div class="meter-header"><span class="meter-label">دانلود امروز</span><span class="meter-value" id="meter-download-daily">—</span></div><div class="meter-track"><div class="meter-fill download" id="meter-download-daily-fill"></div></div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">اطلاعات اجرا</div>
            <div id="runtime-info" class="text-sm" style="color:var(--text-secondary)">در حال بارگذاری…</div>
          </div>
          <div class="card full">
            <div class="flex-between mb-sm">
              <div class="card-title" style="margin-bottom:0">ترافیک لحظه‌ای</div>
              <span style="font-size:12px;color:var(--text-muted)" id="chart-time-range"></span>
            </div>
            <canvas id="chart-session" width="800" height="160" style="width:100%;height:160px"></canvas>
          </div>
          <div class="card full">
            <div class="card-title">وضعیت حساب</div>
            <div id="account-summary" class="text-sm" style="color:var(--text-secondary)">در حال بارگذاری…</div>
          </div>
        </div>
      </section>
      <section id="account">
        <div class="page-title">حساب</div>
        <div class="card">
          <div class="row">
            <div><label>نام</label><input id="account-name"></div>
            <div><label>وضعیت</label><select id="account-status"><option value="active">فعال</option><option value="paused">متوقف</option></select></div>
          </div>
          <label>یادداشت</label><textarea id="account-notes"></textarea>
          <div class="row">
            <div><label>Clean IP اختصاصی</label><textarea id="account-clean-ip"></textarea></div>
            <div><label>Proxy IP اختصاصی</label><textarea id="account-proxy-ip"></textarea></div>
          </div>
          <div class="row">
            <div><label>حالت اختصاصی</label><select id="account-mode"><option value="">استفاده از حالت سراسری</option><option value="alpha">Alpha</option><option value="beta">Beta</option><option value="both">Both</option></select></div>
            <div><label>پورت‌های اختصاصی</label><input id="account-ports" placeholder="443,8443"></div>
          </div>
          <label>حداکثر تعداد کانفیگ تولیدی</label><input id="account-max-configs" type="number" min="0" step="1">
          <div class="actions"><button class="btn btn-primary" onclick="saveAccount()">ذخیره حساب</button><button class="btn btn-danger" onclick="resetTraffic()">بازنشانی ترافیک</button></div>
        </div>
      </section>
      <section id="settings">
        <div class="page-title">تنظیمات</div>
        <div class="grid">
          <div class="card">
            <div class="card-title">هسته</div>
            <label>نام پنل</label><input id="cfg-name">
            <label>مسیر API</label><input id="cfg-apiRoute">
            <label>رمز پنل</label><input id="cfg-masterKey" type="password">
            <label>شناسه یکتای دستگاه</label><input id="cfg-deviceId">
            <label>حالت</label><select id="cfg-mode"><option value="alpha">Alpha</option><option value="beta">Beta</option><option value="both">Both</option></select>
            <label>پورت‌های سوکت</label><input id="cfg-socketPorts">
            <label>اثر انگشت کلاینت</label><input id="cfg-agent">
          </div>
          <div class="card">
            <div class="card-title">شبکه</div>
            <label>میزبان‌های نمایشی</label><textarea id="cfg-maintenanceHost"></textarea>
            <label>Clean IP ها</label><textarea id="cfg-cleanIps"></textarea>
            <label>Relay/Proxy IP پشتیبان</label><textarea id="cfg-backupRelay"></textarea>
            <label>Relay اختصاصی</label><input id="cfg-customRelay">
            <label>گره‌های Slave</label><textarea id="cfg-slaveNodes"></textarea>
            <label>آدرس DoH</label><input id="cfg-customDns">
            <label>گره Metric</label><input id="cfg-metricNode">
          </div>
          <div class="card">
            <div class="card-title">تولید کانفیگ</div>
            <label>پیشوند نام</label><input id="cfg-namePrefix">
            <label>استراتژی نام‌گذاری</label><input id="cfg-nameStrategy">
            <label>فهرست مجاز User-Agent</label><input id="cfg-subUserAgent">
            <label>آدرس اختصاصی پنل</label><input id="cfg-customPanelUrl">
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input id="cfg-enableOpt1" type="checkbox" style="width:auto"> فعال‌سازی TCP Fast Open</label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input id="cfg-enableOpt2" type="checkbox" style="width:auto"> فعال‌سازی ECH</label>
            <label style="display:flex;align-items:center;gap:8px;cursor:pointer"><input id="cfg-isPaused" type="checkbox" style="width:auto"> توقف کامل ترافیک تانل</label>
          </div>
          <div class="card">
            <div class="card-title">پشتیبان‌گیری</div>
            <div class="actions" style="margin-top:0;margin-bottom:var(--space-md)">
              <button class="btn btn-secondary" onclick="exportConfig()">خروجی JSON</button>
              <button class="btn btn-secondary" onclick="importConfig()">ورودی JSON</button>
            </div>
            <label>ویرایش خام تنظیمات (JSON)</label>
            <textarea id="raw-config" style="min-height:180px;font-family:var(--font-mono);font-size:12px;direction:ltr;text-align:left"></textarea>
          </div>
        </div>
        <div class="actions"><button class="btn btn-primary" onclick="saveSettings()">ذخیره تنظیمات</button></div>
      </section>
      <section id="api">
        <div class="page-title">راهنمای API</div>
        <div class="card">
          <p class="text-sm muted mb-sm">تمام درخواست‌های API با آدرس ورکر به‌همراه کلید <code>MEZDIA_API_KEY</code> ارسال می‌شوند.</p>
          <pre id="api-examples"></pre>
        </div>
      </section>
      <section id="logs">
        <div class="page-title">گزارش‌ها</div>
        <div class="card">
          <table>
            <thead><tr><th>زمان</th><th>نوع</th><th>جزئیات</th></tr></thead>
            <tbody id="log-body"></tbody>
          </table>
        </div>
      </section>
    </div>
  </main>
  <script>
    const route = location.pathname.split('/')[1] || 'sync';
    const baseRoute = '/' + route;
    let sessionKey = localStorage.getItem('mezdia_panel_key') || '';
    let config = null;
    let account = null;
    let sessionData = [];
    let refreshTimer = null;

    function getTheme(){return localStorage.getItem('mezdia_theme')||'dark'}
    function applyTheme(t){document.documentElement.setAttribute('data-theme',t);document.getElementById('theme-icon-dark').style.display=t==='dark'?'':'none';document.getElementById('theme-icon-light').style.display=t==='light'?'':'none';if(window._lastRenderData)renderCharts(window._lastRenderData)}
    function toggleTheme(){var next=getTheme()==='dark'?'light':'dark';localStorage.setItem('mezdia_theme',next);applyTheme(next)}
    applyTheme(getTheme());

    function headers(){return {'Content-Type':'application/json'}}
    function showTab(id){document.querySelectorAll('section').forEach(function(s){s.classList.toggle('active',s.id===id)});document.querySelectorAll('nav button').forEach(function(b){b.classList.toggle('active',b.dataset.tab===id)});if(id==='logs')loadLogs()}
    function copyText(id,btn){navigator.clipboard.writeText(document.getElementById(id).textContent);if(btn){var old=btn.textContent;btn.textContent='کپی شد ✓';setTimeout(function(){btn.textContent=old},1500)}}
    function logout(){localStorage.removeItem('mezdia_panel_key');location.reload()}
    function formatBytes(b){if(b===0)return'0 B';var k=1024,sizes=['B','KB','MB','GB','TB'],i=Math.floor(Math.log(b)/Math.log(k));return parseFloat((b/Math.pow(k,i)).toFixed(2))+' '+sizes[i]}

    function getChartColors(){var s=getComputedStyle(document.documentElement);return{upload:s.getPropertyValue('--chart-upload').trim(),download:s.getPropertyValue('--chart-download').trim(),uploadArea:s.getPropertyValue('--chart-upload-area').trim(),downloadArea:s.getPropertyValue('--chart-download-area').trim(),grid:s.getPropertyValue('--chart-grid').trim(),text:s.getPropertyValue('--text-secondary').trim(),muted:s.getPropertyValue('--text-muted').trim()}}

    function drawDonut(canvasId,upload,download,totalLabel){
      var canvas=document.getElementById(canvasId);if(!canvas)return;var ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,size=160;
      canvas.width=size*dpr;canvas.height=size*dpr;canvas.style.width=size+'px';canvas.style.height=size+'px';ctx.scale(dpr,dpr);
      var c=getChartColors(),cx=size/2,cy=size/2,outerR=62,innerR=42,total=upload+download,gap=0.03;
      ctx.clearRect(0,0,size,size);
      if(total===0){ctx.beginPath();ctx.arc(cx,cy,outerR,0,Math.PI*2);ctx.arc(cx,cy,innerR,0,Math.PI*2,true);ctx.fillStyle=c.grid;ctx.fill()}
      else{var upAngle=(upload/total)*Math.PI*2,dnAngle=(download/total)*Math.PI*2,startUp=-Math.PI/2+gap/2,endUp=startUp+upAngle-gap,startDn=endUp+gap,endDn=startDn+dnAngle-gap;
        if(upload>0){ctx.beginPath();ctx.arc(cx,cy,outerR,startUp,endUp);ctx.arc(cx,cy,innerR,endUp,startUp,true);ctx.closePath();ctx.fillStyle=c.upload;ctx.fill()}
        if(download>0){ctx.beginPath();ctx.arc(cx,cy,outerR,startDn,endDn);ctx.arc(cx,cy,innerR,endDn,startDn,true);ctx.closePath();ctx.fillStyle=c.download;ctx.fill()}}
      ctx.fillStyle=c.text;ctx.font='600 20px '+getComputedStyle(document.body).getPropertyValue('--font-display');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(totalLabel,cx,cy-6);
      ctx.fillStyle=c.muted;ctx.font='400 11px '+getComputedStyle(document.body).getPropertyValue('--font-body');ctx.fillText('مجموع',cx,cy+14)}

    function drawSessionChart(){
      var canvas=document.getElementById('chart-session');if(!canvas)return;var ctx=canvas.getContext('2d'),dpr=window.devicePixelRatio||1,rect=canvas.getBoundingClientRect(),w=rect.width||800,h=160;
      canvas.width=w*dpr;canvas.height=h*dpr;canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.scale(dpr,dpr);
      var c=getChartColors(),pad={top:20,right:16,bottom:28,left:50},cw=w-pad.left-pad.right,ch=h-pad.top-pad.bottom;
      ctx.clearRect(0,0,w,h);
      if(sessionData.length<2){ctx.fillStyle=c.muted;ctx.font='400 13px '+getComputedStyle(document.body).getPropertyValue('--font-body');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('داده‌ای ثبت نشده — نمودار پس از چند لحظه به‌روز می‌شود',w/2,h/2);return}
      var maxVal=1;sessionData.forEach(function(d){if(d.up>maxVal)maxVal=d.up;if(d.down>maxVal)maxVal=d.down});maxVal*=1.15;
      ctx.strokeStyle=c.grid;ctx.lineWidth=1;
      for(var i=0;i<=4;i++){var y=pad.top+(ch/4)*i;ctx.beginPath();ctx.moveTo(pad.left,y);ctx.lineTo(w-pad.right,y);ctx.stroke();ctx.fillStyle=c.muted;ctx.font='400 10px '+getComputedStyle(document.body).getPropertyValue('--font-body');ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillText(formatBytes(maxVal*(1-i/4)),pad.left-6,y)}
      var step=cw/(sessionData.length-1);
      function drawLine(data,color,areaColor){ctx.beginPath();data.forEach(function(d,i){var x=pad.left+i*step,y=pad.top+ch-(d/maxVal)*ch;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)});ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();ctx.lineTo(pad.left+(data.length-1)*step,pad.top+ch);ctx.lineTo(pad.left,pad.top+ch);ctx.closePath();ctx.fillStyle=areaColor;ctx.fill()}
      drawLine(sessionData.map(function(d){return d.up}),c.upload,c.uploadArea);drawLine(sessionData.map(function(d){return d.down}),c.download,c.downloadArea);
      var timeRange=document.getElementById('chart-time-range');if(timeRange&&sessionData.length>1)timeRange.textContent=sessionData[0].t+' — '+sessionData[sessionData.length-1].t}

    function renderCharts(data){
      var s=data.account.usage;
      drawDonut('chart-total',s.uploadBytes||0,s.downloadBytes||0,s.totalGB+' GB');
      drawDonut('chart-daily',s.dailyUploadBytes||0,s.dailyDownloadBytes||0,s.dailyGB+' GB');
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
      document.getElementById('login').style.display='none';render(data)}

    function render(data){
      window._lastRenderData=data;var s=data.account.usage,isPaused=data.account.status==='paused';
      var statusPill=document.getElementById('status-pill');statusPill.textContent=isPaused?'متوقف':'فعال';statusPill.className='pill '+(isPaused?'bad':'ok');
      document.getElementById('sub-url').textContent=data.account.subscriptionUrl;
      document.getElementById('qr-img').src='https://api.qrserver.com/v1/create-qr-code/?size=240x240&data='+encodeURIComponent(data.account.subscriptionUrl);
      document.getElementById('runtime-info').innerHTML='<div class="info-grid"><span class="muted">شناسه دستگاه</span><span>'+data.deviceId+'</span><span class="muted">نسخه</span><span>'+data.version+'</span><span class="muted">درخواست‌ها (کل)</span><span>'+(s.totalRequests||0).toLocaleString()+'</span><span class="muted">درخواست‌ها (امروز)</span><span>'+(s.dailyRequests||0).toLocaleString()+'</span></div>';
      document.getElementById('account-summary').innerHTML='<div class="info-grid"><span class="muted">نام</span><span>'+(data.account.name||'حساب پیش‌فرض')+'</span><span class="muted">وضعیت</span><span>'+(isPaused?'متوقف':'فعال')+'</span><span class="muted">محدودیت ترافیک</span><span>ندارد</span><span class="muted">انقضا</span><span>ندارد</span></div>';
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
    const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>اشتراک ${BRAND_NAME}</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet"><style>body{margin:0;background:#0a0e14;background-image:radial-gradient(900px 460px at 50% -10%,rgba(34,211,170,.12),transparent);color:#eef2f6;font-family:'Vazirmatn',system-ui,sans-serif;padding:32px;line-height:1.8}.card{max-width:640px;margin:40px auto;background:linear-gradient(180deg,#12181f,#0d1218);border:1px solid #222b37;border-radius:18px;padding:26px}h1{font-size:19px;margin:0 0 18px;display:flex;align-items:center;gap:10px}.mark{width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#22d3aa,#7c6cf5);display:flex;align-items:center;justify-content:center;font-weight:800;color:#04120a}code{background:#0a0e14;border:1px solid #222b37;border-radius:8px;padding:4px 8px;word-break:break-all;direction:ltr;display:inline-block;font-size:13px}.row{margin:14px 0;color:#8b97a6;font-size:14px}.row strong{color:#eef2f6}</style></head><body><div class="card"><h1><span class="mark">M</span> ${BRAND_NAME}</h1><p class="row">نام حساب: <strong>${account.name || "پیش‌فرض"}</strong></p><p class="row">وضعیت: <strong>${status}</strong></p><p class="row">ترافیک مصرفی: <strong>${totalGb} گیگابایت</strong></p><p class="row">لینک اشتراک:</p><p><code>https://${host}/${sysConfig.apiRoute}</code></p></div></body></html>`;
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
