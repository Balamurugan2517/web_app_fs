#!/usr/bin/env python3
"""Builds docs/pdf/*.pdf from docs/{internal,external}/*.md  (needs: pandoc, python3 playwright + chromium).  Usage: python3 scripts/build-pdfs.py"""
import glob, os, re, subprocess, tempfile
from playwright.sync_api import sync_playwright
ROOT = os.path.join(os.path.dirname(__file__), '..', 'docs'); OUT = os.path.join(ROOT, 'pdf'); os.makedirs(OUT, exist_ok=True)
CSS = """
@page{size:A4;margin:18mm 15mm 18mm 15mm}
body{font:10.5pt/1.55 'DejaVu Sans',Arial,sans-serif;color:#2b1114}
h1{font:600 22pt 'DejaVu Serif',Georgia,serif;color:#4A151B;border-bottom:3px solid #4A151B;padding-bottom:6px;margin:0 0 14px}
h2{font:600 15pt 'DejaVu Serif',serif;color:#4A151B;margin:26px 0 8px;border-bottom:1px solid #e8c9ce;padding-bottom:3px;page-break-after:avoid}
h3{font-size:12pt;color:#4A151B;margin:18px 0 6px;page-break-after:avoid}h4{font-size:10.5pt;margin:12px 0 4px}
table{border-collapse:collapse;width:100%;margin:10px 0 14px;font-size:8.8pt;page-break-inside:auto}th{background:#FAF0E6;color:#4A151B;text-align:left}th,td{border:1px solid #e3c4c9;padding:5px 7px;vertical-align:top}tr{page-break-inside:avoid}
code{font:8.6pt 'DejaVu Sans Mono',monospace;background:#f6efe9;padding:1px 4px;border-radius:3px}
pre{background:#1f1416;color:#f6e9e0;padding:10px 12px;border-radius:6px;font:8.2pt/1.45 'DejaVu Sans Mono',monospace;white-space:pre-wrap;word-break:break-word;page-break-inside:avoid}pre code{background:none;color:inherit;padding:0}
blockquote{border-left:4px solid #c9a46a;background:#fbf5ea;margin:10px 0;padding:6px 12px}
img{max-width:100%;display:block;margin:10px auto;border:1px solid #ecd3d6;border-radius:6px}
a{color:#7a1f2b}hr{border:0;border-top:1px solid #e8c9ce;margin:18px 0}
.cover{border:2px solid #4A151B;border-radius:10px;padding:22px;margin-bottom:18px;background:#FAF6F0}.cover small{letter-spacing:.2em;text-transform:uppercase;color:#7a1f2b;font-weight:700}
.badge-int{background:#4A151B;color:#fff}.badge-ext{background:#2e7d32;color:#fff}.b{display:inline-block;padding:2px 10px;border-radius:99px;font-size:8.5pt;font-weight:700}
"""
files = sorted(glob.glob(f'{ROOT}/internal/*.md') + glob.glob(f'{ROOT}/external/*.md'))
with sync_playwright() as p:
    b = p.chromium.launch()
    for f in files:
        name = os.path.splitext(os.path.basename(f))[0]
        kind = 'Internal' if name.startswith('Internal') else 'External'
        html = subprocess.run(['pandoc', f, '-f', 'gfm', '-t', 'html5', '--wrap=none'], capture_output=True, text=True, check=True).stdout
        title = re.sub(r'^(Internal|External)_\d+_', '', name).replace('_', ' ')
        cover = f'<div class="cover"><small>Luxe &amp; Thread · Documentation</small><br><span class="b {"badge-int" if kind=="Internal" else "badge-ext"}">{kind.upper()} – {"for developers" if kind=="Internal" else "for the customer"}</span></div>'
        doc = f'<html><head><meta charset="utf-8"><title>{title}</title><style>{CSS}</style></head><body>{cover}{html}</body></html>'
        # make relative image links absolute so Chromium can load them
        base = os.path.dirname(f)
        doc = re.sub(r'src="((?:\.\./)+[^"]+)"', lambda m: f'src="file://{os.path.normpath(os.path.join(base, m.group(1)))}"', doc)
        with tempfile.NamedTemporaryFile('w', suffix='.html', delete=False) as t: t.write(doc); tmp = t.name
        pg = b.new_page(); pg.goto(f'file://{tmp}')
        pg.pdf(path=f'{OUT}/{name}.pdf', format='A4', print_background=True, display_header_footer=True,
               header_template='<div style="font-size:7px;color:#999;width:100%;text-align:right;padding-right:15mm">Luxe &amp; Thread · __N__</div>'.replace('__N__', name.replace('_', ' ')),
               footer_template='<div style="font-size:7px;color:#999;width:100%;text-align:center">Page <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
               margin={'top': '18mm', 'bottom': '18mm', 'left': '15mm', 'right': '15mm'})
        pg.close(); os.unlink(tmp); print('pdf', name)
    b.close()
