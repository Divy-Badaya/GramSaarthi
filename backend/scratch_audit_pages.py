import os
import re
import json

with open('src/locales/en.json', 'r', encoding='utf-8') as f:
    en_keys = set(json.load(f).keys())

def analyze_file(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
        code = f.read()
    
    uses_t = ('useT' in code) or ('t(' in code)
    
    raw_jsx = []
    lines = code.splitlines()
    for line_num, line in enumerate(lines, 1):
        line_clean = line.strip()
        if line_clean.startswith('//') or line_clean.startswith('/*') or line_clean.startswith('*'):
            continue
        matches = re.findall(r'>([^<>{}\n]+)<', line)
        for text in matches:
            text_clean = text.strip()
            if len(text_clean) > 1 and any(c.isalpha() for c in text_clean):
                if not text_clean.startswith('var(--') and not text_clean.startswith('url(') and not text_clean.startswith('&') and not text_clean.endswith('&&') and not text_clean.endswith('||'):
                    if not re.match(r'^[0-9\s.,₹%:\-_/|•→←↑↓+*()#?]+$', text_clean):
                        raw_jsx.append((line_num, text_clean))

    props = []
    for line_num, line in enumerate(lines, 1):
        line_clean = line.strip()
        if line_clean.startswith('//'):
            continue
        matches = re.findall(r'(placeholder|title|aria-label)=["\']([^"\']+)["\']', line)
        for attr, val in matches:
            val_clean = val.strip()
            if len(val_clean) > 1 and any(c.isalpha() for c in val_clean):
                props.append((line_num, attr, val_clean))

    alerts = []
    for line_num, line in enumerate(lines, 1):
        matches = re.findall(r'\b(alert|confirm|prompt)\(["\'`]([^"\'`]+)["\'`]\)', line)
        for fn, msg in matches:
            alerts.append((line_num, fn, msg))

    t_calls = re.findall(r'\bt\(\s*["\']([^"\'$`]+)["\']', code)
    missing_keys = [k for k in t_calls if k not in en_keys]

    return {
        'uses_t': uses_t,
        'raw_jsx': raw_jsx,
        'props': props,
        'alerts': alerts,
        'missing_keys': missing_keys
    }

print("=== PAGES AUDIT ===")
for f in sorted(os.listdir('src/pages')):
    if f.endswith('.jsx') or f.endswith('.js'):
        p = os.path.join('src/pages', f)
        res = analyze_file(p)
        total = len(res['raw_jsx']) + len(res['props']) + len(res['alerts']) + len(res['missing_keys'])
        print(f"{f:25} | uses_t: {str(res['uses_t']):5} | issues: {total:3} (raw_jsx: {len(res['raw_jsx'])}, props: {len(res['props'])}, alerts: {len(res['alerts'])}, missing_t: {len(res['missing_keys'])})")
        if total > 0:
            for line_num, text in res['raw_jsx'][:5]:
                print(f"   [RAW_JSX L{line_num}]: {text}")
            for line_num, attr, val in res['props'][:5]:
                print(f"   [PROP L{line_num}]: {attr}='{val}'")
            for line_num, fn, msg in res['alerts'][:5]:
                print(f"   [ALERT L{line_num}]: {fn}('{msg}')")
            for k in res['missing_keys'][:5]:
                print(f"   [MISSING KEY]: {k}")

print("\n=== COMPONENTS AUDIT ===")
for root, dirs, files in os.walk('src/components'):
    for f in sorted(files):
        if f.endswith('.jsx') or f.endswith('.js'):
            p = os.path.join(root, f)
            rel = os.path.relpath(p, 'src/components')
            res = analyze_file(p)
            total = len(res['raw_jsx']) + len(res['props']) + len(res['alerts']) + len(res['missing_keys'])
            if total > 0:
                print(f"{rel:35} | uses_t: {str(res['uses_t']):5} | issues: {total:3} (raw_jsx: {len(res['raw_jsx'])}, props: {len(res['props'])}, alerts: {len(res['alerts'])}, missing_t: {len(res['missing_keys'])})")
                for line_num, text in res['raw_jsx'][:3]:
                    print(f"   [RAW_JSX L{line_num}]: {text}")
                for line_num, attr, val in res['props'][:3]:
                    print(f"   [PROP L{line_num}]: {attr}='{val}'")
