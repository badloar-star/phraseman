import json
with open('package.json') as f:
    json.load(f)
print('package.json VALID')
