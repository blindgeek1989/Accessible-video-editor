#!/usr/bin/env python3
"""
audit.py — static accessibility audit for index.html

Usage:
  python audit.py            # audits index.html in the current directory
  python audit.py path/to/index.html
"""

import sys
from html.parser import HTMLParser
from pathlib import Path

# Void elements never emit handle_endtag so we don't push them to the stack
VOID_ELEMENTS = frozenset({
    'area', 'base', 'br', 'col', 'embed', 'hr', 'img',
    'input', 'link', 'meta', 'param', 'source', 'track', 'wbr',
})

VALID_ROLES = {
    'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
    'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
    'contentinfo', 'definition', 'dialog', 'directory', 'document',
    'figure', 'form', 'grid', 'gridcell', 'group', 'heading', 'img',
    'link', 'list', 'listbox', 'listitem', 'log', 'main', 'marquee',
    'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox',
    'menuitemradio', 'navigation', 'none', 'note', 'option', 'presentation',
    'progressbar', 'radio', 'radiogroup', 'region', 'row', 'rowgroup',
    'rowheader', 'scrollbar', 'search', 'searchbox', 'separator',
    'slider', 'spinbutton', 'status', 'switch', 'tab', 'table',
    'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar',
    'tooltip', 'tree', 'treegrid', 'treeitem',
}


class AuditParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = {}           # id -> count
        self.labels = {}        # for-id -> True
        self.inputs = []
        self.images = []
        self.buttons_count = 0
        self.progressbars = []
        self.live_regions = []
        self.aria_refs = []     # (attr, ref_id, from_id)
        self.unknown_roles = []
        self.high_tabindex = []
        self.has_skip_link = False
        self.has_lang = False
        self.has_title = False
        self.has_meta_description = False
        self._stack = []
        self._in_title = False
        self._title_seen = False

    def _attrs(self, raw):
        return dict(raw)

    def handle_starttag(self, tag, raw_attrs):
        attrs = self._attrs(raw_attrs)
        elem_id = attrs.get('id')

        # Check wrapping context BEFORE pushing this tag
        wrapped_in_label = 'label' in self._stack

        if tag not in VOID_ELEMENTS:
            self._stack.append(tag)
        if tag == 'title':
            self._in_title = True

        # ── lang ─────────────────────────────────────────────
        if tag == 'html' and attrs.get('lang'):
            self.has_lang = True

        # ── meta description ─────────────────────────────────
        if tag == 'meta' and attrs.get('name') == 'description' and attrs.get('content'):
            self.has_meta_description = True

        # ── IDs (duplicate detection) ────────────────────────
        if elem_id:
            self.ids[elem_id] = self.ids.get(elem_id, 0) + 1

        # ── Skip link ─────────────────────────────────────────
        if tag == 'a' and 'skip-link' in attrs.get('class', ''):
            self.has_skip_link = True

        # ── ARIA roles ────────────────────────────────────────
        role = attrs.get('role', '').strip()
        if role and role not in VALID_ROLES:
            self.unknown_roles.append((tag, elem_id, role))

        # ── aria-live regions ────────────────────────────────
        live = attrs.get('aria-live')
        if live in ('polite', 'assertive'):
            self.live_regions.append({
                'tag': tag, 'id': elem_id, 'type': live,
                'role': attrs.get('role', ''),
            })

        # ── aria reference attributes ────────────────────────
        for attr in ('aria-labelledby', 'aria-describedby', 'aria-controls'):
            val = attrs.get(attr, '')
            for ref_id in val.split():
                self.aria_refs.append((attr, ref_id, elem_id or tag))

        # ── inputs ───────────────────────────────────────────
        if tag == 'input' and attrs.get('type') != 'hidden':
            self.inputs.append({
                'id': elem_id,
                'type': attrs.get('type', 'text'),
                'aria_label': attrs.get('aria-label'),
                'aria_labelledby': attrs.get('aria-labelledby'),
                'wrapped_in_label': wrapped_in_label,
            })

        # ── labels ───────────────────────────────────────────
        if tag == 'label':
            for_id = attrs.get('for')
            if for_id:
                self.labels[for_id] = True

        # ── images ───────────────────────────────────────────
        if tag == 'img':
            self.images.append({'id': elem_id, 'alt': attrs.get('alt'), 'src': attrs.get('src', '')})

        # ── buttons ──────────────────────────────────────────
        if tag == 'button':
            self.buttons_count += 1

        # ── progress bars ────────────────────────────────────
        if role == 'progressbar':
            self.progressbars.append({
                'id': elem_id,
                'valuenow': 'aria-valuenow' in attrs,
                'valuemin': 'aria-valuemin' in attrs,
                'valuemax': 'aria-valuemax' in attrs,
                'labelled':  bool(attrs.get('aria-label') or attrs.get('aria-labelledby')),
            })

        # ── tabindex > 0 ──────────────────────────────────────
        ti = attrs.get('tabindex')
        if ti:
            try:
                if int(ti) > 0:
                    self.high_tabindex.append((tag, elem_id, ti))
            except ValueError:
                pass

    def handle_endtag(self, tag):
        if tag == 'title':
            self._in_title = False
        if self._stack and self._stack[-1] == tag:
            self._stack.pop()

    def handle_data(self, data):
        if self._in_title and data.strip() and not self._title_seen:
            self.has_title = True
            self._title_seen = True


def audit(html_path: str) -> bool:
    source = Path(html_path).read_text(encoding='utf-8')
    p = AuditParser()
    p.feed(source)

    passed, warnings, failed = [], [], []

    def ok(msg):   passed.append(f'  PASS  {msg}')
    def warn(msg): warnings.append(f'  WARN  {msg}')
    def fail(msg): failed.append(f'  FAIL  {msg}')

    # ── Basic structure ───────────────────────────────────────
    if p.has_lang:             ok('html[lang] is set')
    else:                      fail('html element is missing lang attribute')

    if p.has_title:            ok('Page <title> is set')
    else:                      fail('Page is missing <title>')

    if p.has_meta_description: ok('<meta name="description"> is present')
    else:                      warn('<meta name="description"> not found (recommended for SEO)')

    if p.has_skip_link:        ok('Skip navigation link (.skip-link) found')
    else:                      fail('No skip navigation link — add <a class="skip-link" href="#main-content">')

    # ── Duplicate IDs ─────────────────────────────────────────
    dupes = [id_ for id_, n in p.ids.items() if n > 1]
    if dupes:
        for d in dupes: fail(f'Duplicate id="{d}" ({p.ids[d]} occurrences)')
    else:
        ok(f'No duplicate IDs ({len(p.ids)} unique IDs found)')

    # ── ARIA reference integrity ──────────────────────────────
    broken = [(attr, ref, src) for attr, ref, src in p.aria_refs if ref not in p.ids]
    if broken:
        for attr, ref, src in broken:
            fail(f'{attr}="{ref}" on "{src}" references a non-existent ID')
    else:
        ok(f'All ARIA reference attributes resolve to existing IDs ({len(p.aria_refs)} checked)')

    # ── Input labels ─────────────────────────────────────────
    unlabelled = []
    for inp in p.inputs:
        labelled = (
            (inp['id'] and inp['id'] in p.labels)  # <label for="id">
            or inp['aria_label']                    # aria-label="..."
            or inp['aria_labelledby']               # aria-labelledby="..."
            or inp['wrapped_in_label']              # <label><input></label>
        )
        if not labelled:
            unlabelled.append(inp)

    if unlabelled:
        for inp in unlabelled:
            fail(f'Input type="{inp["type"]}" id="{inp["id"] or "(no id)"}" has no accessible label')
    else:
        ok(f'All {len(p.inputs)} inputs have accessible labels')

    # ── Images ───────────────────────────────────────────────
    if not p.images:
        ok('No <img> elements found (none to audit)')
    else:
        missing_alt = [img for img in p.images if img['alt'] is None]
        if missing_alt:
            for img in missing_alt:
                fail(f'Image src="{img["src"]}" is missing alt attribute')
        else:
            ok(f'All {len(p.images)} images have alt attributes')

    # ── Progress bars ─────────────────────────────────────────
    for pb in p.progressbars:
        pb_id = pb['id'] or '(no id)'
        missing = []
        if not pb['valuenow']:  missing.append('aria-valuenow')
        if not pb['valuemin']:  missing.append('aria-valuemin')
        if not pb['valuemax']:  missing.append('aria-valuemax')
        if not pb['labelled']:  missing.append('aria-label or aria-labelledby')
        if missing:
            fail(f'Progressbar id="{pb_id}" missing: {", ".join(missing)}')
        else:
            ok(f'Progressbar id="{pb_id}" has all required ARIA attributes')

    # ── Live regions ──────────────────────────────────────────
    if p.live_regions:
        assertive = [r for r in p.live_regions if r['type'] == 'assertive']
        polite    = [r for r in p.live_regions if r['type'] == 'polite']
        ok(f'{len(p.live_regions)} aria-live region(s): {len(assertive)} assertive, {len(polite)} polite')
    else:
        fail('No aria-live regions found — SR users will not hear status updates')

    # ── ARIA roles ────────────────────────────────────────────
    if p.unknown_roles:
        for tag, elem_id, role in p.unknown_roles:
            fail(f'Unknown ARIA role="{role}" on <{tag}> id="{elem_id}"')
    else:
        ok('All ARIA role values are valid')

    # ── Positive tabindex ─────────────────────────────────────
    if p.high_tabindex:
        for tag, elem_id, ti in p.high_tabindex:
            warn(f'tabindex="{ti}" on <{tag}> id="{elem_id}" — positive values disrupt natural focus order')
    else:
        ok('No positive tabindex values (focus order follows DOM order)')

    # ── Buttons count (informational) ─────────────────────────
    ok(f'{p.buttons_count} <button> elements found (text content requires manual check)')

    # ── Report ────────────────────────────────────────────────
    width = 60
    print(f'\nAccessibility Audit: {html_path}')
    print('=' * width)

    if passed:
        print(f'\nPassed ({len(passed)}):')
        for line in passed: print(line)

    if warnings:
        print(f'\nWarnings ({len(warnings)}):')
        for line in warnings: print(line)

    if failed:
        print(f'\nFailed ({len(failed)}):')
        for line in failed: print(line)

    total = len(passed) + len(warnings) + len(failed)
    print(f'\n{"-" * width}')
    print(f'Total: {total} checks - {len(passed)} passed, {len(warnings)} warnings, {len(failed)} failed')

    if not failed and not warnings:
        print('\nAll checks passed.')
    elif not failed:
        print('\nNo failures. Review warnings above.')
    else:
        print(f'\n{len(failed)} issue(s) need attention.')

    return len(failed) == 0


if __name__ == '__main__':
    html_file = sys.argv[1] if len(sys.argv) > 1 else 'index.html'
    if not Path(html_file).exists():
        print(f'Error: file not found: {html_file}')
        sys.exit(1)
    ok = audit(html_file)
    sys.exit(0 if ok else 1)
