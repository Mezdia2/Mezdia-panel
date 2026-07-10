const LEADING_IMPORT_RE = /^(\s*import\s+[\s\S]*?from\s+["'][^"']+["'];?\s*)+/;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomName() {
  return `_mz${randomInt(0x100000, 0xffffff).toString(16)}${Date.now().toString(36)}`;
}

function splitSensitiveString(value) {
  if (value.length < 4) return JSON.stringify(value);
  const parts = [];
  let index = 0;
  while (index < value.length) {
    const remaining = value.length - index;
    const size = Math.min(remaining, randomInt(1, Math.max(1, Math.min(5, remaining))));
    parts.push(JSON.stringify(value.slice(index, index + size)));
    index += size;
  }
  return parts.join("+");
}

function escapeSensitiveValue(value) {
  return Array.from(value)
    .map((char) => {
      const code = char.charCodeAt(0);
      return code <= 0xff ? `\\x${code.toString(16).padStart(2, "0")}` : `\\u${code.toString(16).padStart(4, "0")}`;
    })
    .join("");
}

function encodeSensitiveWordsInLiteral(literal) {
  let encoded = literal;
  for (const word of SENSITIVE_WORDS) {
    encoded = encoded.split(word).join(escapeSensitiveValue(word));
  }
  return encoded;
}

function sanitizeCode(source) {
  let output = "";
  let i = 0;
  while (i < source.length) {
    const char = source[i];
    const next = source[i + 1];

    if (char === "/" && next === "/") {
      i += 2;
      while (i < source.length && source[i] !== "\n") i++;
      if (i < source.length) output += source[i++];
      continue;
    }

    if (char === "/" && next === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      continue;
    }

    if (char === '"' || char === "'") {
      const quote = char;
      let literal = quote;
      i++;
      while (i < source.length) {
        const current = source[i];
        literal += current;
        i++;
        if (current === "\\" && i < source.length) {
          literal += source[i++];
          continue;
        }
        if (current === quote) break;
      }
      output += encodeSensitiveWordsInLiteral(literal);
      continue;
    }

    if (char === "`") {
      let literal = char;
      i++;
      while (i < source.length) {
        const current = source[i];
        literal += current;
        i++;
        if (current === "\\" && i < source.length) {
          literal += source[i++];
          continue;
        }
        if (current === "`") break;
      }
      output += encodeSensitiveWordsInLiteral(literal);
      continue;
    }

    output += char;
    i++;
  }
  return output;
}

function stripSensitiveWords(source) {
  let protectedSource = sanitizeCode(source);
  for (const word of SENSITIVE_WORDS) {
    protectedSource = protectedSource.split(JSON.stringify(word)).join(splitSensitiveString(word));
  }
  return protectedSource;
}

function splitLeadingImports(source) {
  const match = source.match(LEADING_IMPORT_RE);
  if (!match) return { imports: "", body: source };
  return { imports: match[0].trimEnd(), body: source.slice(match[0].length) };
}

const SENSITIVE_WORDS = ["Cloudflare", "cloudflare", "CLOUDFLARE", "کلادفلر", "VPN", "vpn"];

export function protectPanelSource(source) {
  const { imports, body } = splitLeadingImports(source);
  const saltName = randomName();
  const saltValue = randomInt(0x10000000, 0x7fffffff);
  const protectedBody = stripSensitiveWords(body);
  const saltLine = `const ${saltName}=${saltValue};void ${saltName};`;

  return imports ? `${imports}\n${saltLine}\n${protectedBody}` : `${saltLine}\n${protectedBody}`;
}

export function findSensitiveWords(source) {
  return SENSITIVE_WORDS.filter((word) => source.includes(word));
}
