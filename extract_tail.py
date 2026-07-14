import json
import re

log_file = r'C:\Users\KANZ\.gemini\antigravity-ide\brain\41b1ccfe-6b59-4b6a-8976-cf29d0081db6\.system_generated\logs\transcript_full.jsonl'

with open(log_file, 'r', encoding='utf-8') as f:
    text = f.read()

idx = 0
while True:
    idx = text.find('function getDirectAuditLogs', idx)
    if idx == -1:
        break
    
    start = text.rfind('"output":', 0, idx)
    # Look for the end of the JSON object containing output
    end = text.find('"}', idx)
    if start != -1 and end != -1:
        chunk = text[start:end+2]
        if 'Showing lines' in chunk:
            print('Found view_file output!')
            chunk_obj = json.loads('{' + chunk + '}')
            with open('tail_of_code.js', 'w', encoding='utf-8') as out:
                raw = chunk_obj['output']
                for line in raw.split('\n'):
                    m = re.match(r'^\d+: (.*)', line)
                    if m:
                        out.write(m.group(1) + '\n')
                    elif not re.match(r'^\d+:', line):
                        out.write(line + '\n')
            break
    idx += 10
