import json
import re
import os

log_file = r'C:\Users\KANZ\.gemini\antigravity-ide\brain\41b1ccfe-6b59-4b6a-8976-cf29d0081db6\.system_generated\logs\transcript_full.jsonl'
lines_map = {}

with open(log_file, 'r', encoding='utf-8') as f:
    text = f.read()

# We need to find patterns like \r\n1234: some code here
for m in re.finditer(r'\\r\\n(\d+): (.*?)(?=\\r\\n\d+: |\\r\\n\"|$)', text):
    line_num = int(m.group(1))
    content = m.group(2)
    content = content.replace('\\"', '"').replace('\\\\', '\\').replace('\\t', '\t')
    lines_map[line_num] = content

print('Found', len(lines_map), 'lines.')
with open('recovered_lines.txt', 'w', encoding='utf-8') as out:
    for i in range(1, 3000):
        if i in lines_map:
            out.write(lines_map[i] + '\n')
        else:
            out.write('// MISSING LINE ' + str(i) + '\n')

