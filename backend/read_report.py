import json

with open('backend/audit_report.json', encoding='utf-8') as f:
    report = json.load(f)

with open('backend/audit_summary.txt', 'w', encoding='utf-8') as out:
    for f, items in report.items():
        out.write(f"\n=== {f} ({len(items)} items) ===\n")
        for it in items:
            t = it['type']
            line = it['line']
            if t == 'OR_FALLBACK':
                out.write(f"  L{line} [FALLBACK]: t('{it['key']}') || '{it['fallback']}'\n")
            elif t == 'HARDCODED_PROP':
                out.write(f"  L{line} [PROP]: {it['attr']}='{it['value']}'\n")
            elif t == 'HARDCODED_ALERT':
                out.write(f"  L{line} [ALERT]: {it['func']}('{it['message']}')\n")
            elif t == 'RAW_JSX_TEXT':
                out.write(f"  L{line} [RAW]: '{it['text']}'\n")

print("Written to backend/audit_summary.txt successfully.")
