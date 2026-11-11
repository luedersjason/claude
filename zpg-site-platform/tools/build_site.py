#!/usr/bin/env python3
"""Build a ZPG project site from the shared template and one project config.

    python3 tools/build_site.py <project>      # e.g. nitto-watermain, l152
    python3 tools/build_site.py --all
    python3 tools/build_site.py --check        # before every push: every built page must equal template + config

template/   page.html, site.css, app.js, panel-*.html  (the same for every project; playbook is the spec)
projects/<name>/project.json                           (everything that differs per project)
Output: public/<path>/index.html. Project data (tracker, requests, feed) lives in the site database, not here.
A change to how sites look or work goes in template/ and the playbook in the same commit, then --all.
"""
import json, html, os, re, subprocess, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
T = os.path.join(ROOT, 'template'); PUB = os.path.join(ROOT, 'public')
E = html.escape
TAB_LABELS = {'home': 'Home', 'tracker': 'Tracker', 'documents': 'Documents', 'schedule': 'Schedule', 'team': 'Team', 'meetings': 'Meetings', 'photos': 'Photos'}
PILL = 'text-decoration:none;border:1px solid rgba(255,255,255,.45);border-radius:6px;padding:6px 12px;margin-left:8px'

def read(name): return open(os.path.join(T, name), encoding='utf-8').read()

def fill(tpl, values):
    """Replace {{key}} and {{a.b}}; fail loudly on anything missing or left over."""
    def get(m):
        cur = values
        for part in m.group(1).split('.'):
            if not isinstance(cur, dict) or part not in cur: raise KeyError('missing template value: ' + m.group(1))
            cur = cur[part]
        return str(cur)
    return re.sub(r'\{\{([\w.]+)\}\}', get, tpl)

def build(name):
    c = json.load(open(os.path.join(ROOT, 'projects', name, 'project.json'), encoding='utf-8'))
    labels = dict(TAB_LABELS); labels.update({t['id']: t['label'] for t in c.get('extraTabs', [])})
    missing = [t for t in c['tabs'] if t not in labels]
    assert not missing, 'tabs without a label: %s' % missing
    # A project in another repo (C251) sets publicDir, relative to this folder: its own public/ and sheets manifest.
    pub = os.path.normpath(os.path.join(ROOT, c['publicDir'])) if c.get('publicDir') else PUB
    if not os.path.isdir(pub):
        # Rule 12: a platform change is not done until every connected site is built. Missing checkout = FAIL, never a silent pass.
        print(name, 'FAILED: %s is not checked out next to this repo, so this site was NOT built. '
              'Clone luedersjason/c251-caledonia-portal beside this repo (or run where it is), then --all. '
              'Pass --allow-missing only for a build you will finish elsewhere, and say so in the report.' % c['publicDir'])
        return ALLOW_MISSING
    sheets = json.load(open(os.path.join(pub, 'sheets', 'manifest.json')))
    if pub == PUB:
        spec = {s['id']: s for s in json.load(open(os.path.join(ROOT, 'tools', 'build', 'src', 'spec.json')))}
        for m in sheets:
            if m['id'] in spec: m['pdf'], m['pg'] = 'docs/' + spec[m['id']]['pdf'].split('/')[-1], spec[m['id']]['page']
    # what the page script reads
    cfg = {k: c[k] for k in ('name', 'ns', 'refPrefix', 'filePrefix', 'vcardNote', 'trackerFor', 'areasText', 'disciplines', 'schedule', 'documents', 'team', 'drawings')}
    cfg['tabLabels'] = {t: labels[t] for t in c['tabs']}; cfg['sheets'] = sheets
    for k in ('paths', 'defaultTab', 'wideTabs'):
        if k in c: cfg[k] = c[k]
    cover = c['cover']; btn = cover['button']
    cover_btn = ('<button type="button" class="cover-zoom" data-sheets="%s">%s</button>' % (','.join(btn['sheets']), E(btn['label'])) if 'sheets' in btn
                 else '<button type="button" class="vimg cover-zoom" data-full="%s" data-cap="%s">%s</button>' % (E(btn['image']), E(btn['caption']), E(btn['label'])))
    panels = []
    for t in c.get('extraTabs', []):
        panels.append(fill(read('panel-%s.html' % t['type']), {k: (v if k in ('id', 'href') else E(v)) for k, v in t.items() if isinstance(v, str)}))
    build_id = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=ROOT).stdout.strip() + ' ' + __import__('datetime').date.today().isoformat()
    js = read('app.js'); assert '</script' not in js
    values = {
        'baseTag': '<base href="/">' if c['path'] != '/' else '',
        'title': E(c['title']), 'description': E(c['description']), 'name': E(c['name']), 'subtitle': E(c['subtitle']),
        'tabButtons': '\n'.join('    <button class="tab" data-tab="%s" type="button">%s</button>' % (t, E(labels[t])) for t in c['tabs']),
        'siteLinks': '\n'.join('    <a class="tab" href="%s" style="%s">%s</a>' % (E(l['href']), PILL, E(l['label'])) for l in c.get('siteLinks', [])),
        'cover': {k: E(v) for k, v in cover.items() if isinstance(v, str)},
        'coverChips': ''.join('<span class="chip%s">%s%s</span>' % (' now' if i == 0 else '', '<span class="dot"></span>' if i == 0 else '', E(x)) for i, x in enumerate(cover['chips'])),
        'coverButton': cover_btn,
        'drawings': {'label': E(c['drawings']['label']), 'pdf': E(c['drawings']['pdf'])},
        'rail': '\n'.join('  <div class="rstep%s"><i></i><span class="eyebrow">%s</span><b>%s</b><small>%s</small></div>' % ('' if r['kind'] == 'step' else ' ' + r['kind'], E(r['when']), E(r['title']), E(r['note'])) for r in c['rail']),
        'approval': {k: E(v) for k, v in c['approval'].items() if isinstance(v, str)},
        'approvalSteps': ''.join('<div class="step%s"><span class="eyebrow%s">%s</span><b>%s</b><span>%s</span></div>' % (' next' if s.get('next') else '', ' nd' if s.get('noDate') else '', E(s['when']), E(s['title']), E(s['note'])) for s in c['approval']['steps']),
        'directoryEyebrow': E(c['directoryEyebrow']), 'meetingsLede': E(c['meetingsLede']),
        'extraPanels': '\n'.join(panels), 'footer': E(c['footer']), 'ownerLine': E(c['ownerLine']), 'build': build_id,
        'areaOptions': ''.join('<option value="%s">%s</option>' % (E(k), E(n)) for k, n in c['disciplines']),
        'nsJson': json.dumps(c['ns']), 'refPrefix': E(c['refPrefix']), 'css': read('site.css'),
        'configJson': json.dumps(cfg, separators=(',', ':'), ensure_ascii=False).replace('</', '<\\/'), 'js': js,
    }
    page = fill(read('page.html').replace('{{css}}', '\x00CSS').replace('{{js}}', '\x00JS'), {k: v for k, v in values.items() if k not in ('css', 'js')})
    page = page.replace('\x00CSS', values['css']).replace('\x00JS', js)
    out = os.path.join(pub, c['path'].strip('/'), 'index.html'); os.makedirs(os.path.dirname(out), exist_ok=True)
    if CHECK:   # has someone edited a built page (or the template) without rebuilding every site?
        strip = lambda t: re.sub(r'· build [0-9a-f]* [0-9-]+', '', t)
        same = os.path.exists(out) and strip(open(out, encoding='utf-8').read()) == strip(page)
        print(name, 'OK' if same else 'OUT OF DATE: %s differs from template + config. Move the change into template/ or project.json, then --all.' % os.path.relpath(out, ROOT))
        return same
    open(out, 'w', encoding='utf-8').write(page)
    print(name, '->', out if pub != PUB else os.path.relpath(out, ROOT), len(page) // 1024, 'KB')
    return True

CHECK = False
ALLOW_MISSING = False
if __name__ == '__main__':
    args = sys.argv[1:]
    if '--allow-missing' in args: ALLOW_MISSING = True; args = [a for a in args if a != '--allow-missing']
    if '--check' in args: CHECK = True; args = [a for a in args if a != '--check'] or ['--all']
    names = sorted(os.listdir(os.path.join(ROOT, 'projects'))) if args == ['--all'] else args
    assert names, __doc__
    ok = all([build(n) for n in names])
    sys.exit(0 if ok else 1)
