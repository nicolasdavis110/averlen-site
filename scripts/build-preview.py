"""Build a single-file copy of the sample preview that opens directly from disk.

preview/index.html is the deployed page (served over HTTP by GitHub Pages);
this only writes the standalone file outside the website repository.
"""
import base64
import hashlib
import re
from pathlib import Path

site = Path(__file__).resolve().parents[1]
preview = site / 'preview'
demo = (preview / 'demo.js').read_text().replace('export const transactions =', 'const specs =')
model = re.sub(r'^import .*;\n', '', (preview / 'model.js').read_text(), flags=re.M)
model = model.replace('export const ', 'const ').replace('export function ', 'function ')
app = re.sub(r'^import .*;\n', '', (preview / 'app.js').read_text(), flags=re.M)
app = app.replace('export function ', 'function ')
logo = 'data:image/png;base64,' + base64.b64encode((site / 'averlen-logo.png').read_bytes()).decode()
script = ('\n' + '\n'.join([demo, model, app]) + '\n').replace('../averlen-logo.png', logo)
digest = base64.b64encode(hashlib.sha256(script.encode()).digest()).decode()
html = (preview / 'index.html').read_text()
html = html.replace('<link rel="stylesheet" href="./styles.css">', '<style>' + (preview / 'styles.css').read_text() + '</style>')
html = html.replace('<script type="module" src="./app.js"></script>', '<script type="module">' + script + '</script>')
html = html.replace("script-src 'self'", f"script-src 'sha256-{digest}'")
html = html.replace('../averlen-logo.png', logo)
(site.parent / 'AVERLEN_WEB_PREVIEW.html').write_text(html)
print('Built standalone AVERLEN_WEB_PREVIEW.html.')
