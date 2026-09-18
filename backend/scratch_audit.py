import os, re, json

with open('src/locales/en.json', 'r', encoding='utf-8') as f:
    en_dict = json.load(f)
    en_keys = set(en_dict.keys())

with open('src/locales/hi.json', 'r', encoding='utf-8') as f:
    hi_dict = json.load(f)

with open('src/locales/gu.json', 'r', encoding='utf-8') as f:
    gu_dict = json.load(f)

t_pattern = re.compile(r"""\bt\(\s*['"]([^'"$`]+)['"]""")

def extract_jsx_strings(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        lines = f.readlines()
    
    findings = []
    fallback_re = re.compile(r"""t\(['"]([^'"]+)['"]\)\s*\|\|\s*['"]([^'"]+)['"]""")
    prop_re = re.compile(r"""(placeholder|title|label|aria-label)\s*=\s*['"]([^'"{}\n]+)['"]""")
    jsx_text_re = re.compile(r">([^<>{}\n]+)<")
    alert_re = re.compile(r"""\b(alert|confirm|prompt)\s*\(\s*['"]([^'"]+)['"]\s*\)""")
    
    for i, line in enumerate(lines, 1):
        # check missing t() keys
        for m in t_pattern.finditer(line):
            key = m.group(1).strip()
            if key and key not in en_keys and not key.startswith(('http', 'var(--', 'card.')):
                findings.append({
                    "line": i,
                    "type": "MISSING_KEY",
                    "key": key
                })

        # check fallback pattern
        for m in fallback_re.finditer(line):
            findings.append({
                "line": i,
                "type": "OR_FALLBACK",
                "key": m.group(1),
                "fallback": m.group(2)
            })
            
        # check props
        for m in prop_re.finditer(line):
            attr = m.group(1)
            val = m.group(2).strip()
            if len(val) > 1 and not re.match(r'^[0-9\s.,₹%:\-_/]+$', val):
                findings.append({
                    "line": i,
                    "type": "HARDCODED_PROP",
                    "attr": attr,
                    "value": val
                })

        # check alerts
        for m in alert_re.finditer(line):
            findings.append({
                "line": i,
                "type": "HARDCODED_ALERT",
                "func": m.group(1),
                "message": m.group(2)
            })
                
        # check raw text
        for m in jsx_text_re.finditer(line):
            text = m.group(1).strip()
            if len(text) > 1 and not re.match(r'^[0-9\s.,₹%:\-_/|•→←↑↓+*()#?]+$', text):
                if not text.startswith('var(--') and not text.startswith('url(') and not text.startswith('&') and not text.endswith('&&') and not text.endswith('||'):
                    if any(c.isalpha() for c in text):
                        findings.append({
                            "line": i,
                            "type": "RAW_JSX_TEXT",
                            "text": text
                        })
                    
    return findings

all_findings = {}
missing_keys_set = set()

for root, dirs, files in os.walk('src'):
    if 'locales' in root or 'node_modules' in root:
        continue
    for f in sorted(files):
        if f.endswith(('.jsx', '.js')):
            p = os.path.join(root, f)
            res = extract_jsx_strings(p)
            if res:
                all_findings[p] = res
                for item in res:
                    if item.get("type") == "MISSING_KEY":
                        missing_keys_set.add(item["key"])

with open('backend/audit_report.json', 'w', encoding='utf-8') as f:
    json.dump(all_findings, f, indent=2, ensure_ascii=False)

print(f"Audit completed. Found issues in {len(all_findings)} files.")
print(f"Total unique missing keys called in t(): {len(missing_keys_set)}")
for k in sorted(missing_keys_set):
    print(f"  MISSING KEY: {k}")

