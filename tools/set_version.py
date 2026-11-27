"""
AquaThrust — set the release version everywhere and cache-bust every asset URL.

Browsers, WordPress caching plugins and CDNs cache JavaScript modules by URL. WordPress
only versions the entry file (main.js?ver=…), so the modules it imports would stay
stale after an update. This script stamps ?v=<version> onto every relative module
import, the CSS URL and the standalone page, and updates the version in the plugin
header, readme.txt and the app footer. Each new version means new URLs, so nothing
stale can be served.

Usage (from anywhere):
    python tools/set_version.py 1.2.1
    python tools/set_version.py 1.2.1 --zip     # also builds ../aquathrust-simulator-wordpress.zip
"""
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def rw(path, fn):
    p = os.path.join(ROOT, path)
    with open(p, encoding='utf-8') as f:
        s = f.read()
    t = fn(s)
    if t != s:
        with open(p, 'w', encoding='utf-8', newline='') as f:
            f.write(t)
        return True
    return False


def stamp_js(ver):
    # from './x.js'  |  from "../x.js?v=old"  |  import('./x.js')
    spec = re.compile(r"""((?:from|import)\s*\(?\s*['"])(\.{1,2}/[^'"?]+\.js)(?:\?v=[^'"]*)?(['"])""")
    css = re.compile(r"""(new URL\(\s*['"])(\.{1,2}/[^'"?]+\.css)(?:\?v=[^'"]*)?(['"])""")
    changed = 0
    for base in ('assets/js', 'assets/vendor'):
        for dirpath, _, files in os.walk(os.path.join(ROOT, base)):
            for name in files:
                if not name.endswith('.js'):
                    continue
                rel = os.path.relpath(os.path.join(dirpath, name), ROOT)

                def fn(s):
                    s = spec.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={ver}{m.group(3)}", s)
                    s = css.sub(lambda m: f"{m.group(1)}{m.group(2)}?v={ver}{m.group(3)}", s)
                    return s

                changed += rw(rel, fn)
    return changed


def main():
    if len(sys.argv) < 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
        print(__doc__)
        sys.exit(1)
    ver = sys.argv[1]
    n = stamp_js(ver)
    rw('assets/js/app.js', lambda s: re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{ver}';", s))
    rw('aquathrust-simulator.php', lambda s: re.sub(r"(\* Version:\s+)\S+", rf"\g<1>{ver}", re.sub(r"define\( 'AQUATHRUST_VERSION', '[^']*' \);", f"define( 'AQUATHRUST_VERSION', '{ver}' );", s)))
    rw('readme.txt', lambda s: re.sub(r"Stable tag: \S+", f"Stable tag: {ver}", s))
    rw('index.html', lambda s: re.sub(r'src="assets/js/main\.js(?:\?v=[^"]*)?"', f'src="assets/js/main.js?v={ver}"', s))
    print(f"Version {ver}: stamped {n} JS files, plugin header, readme.txt, index.html.")

    if '--zip' in sys.argv:
        out = os.path.join(os.path.dirname(ROOT), 'aquathrust-simulator-wordpress.zip')
        folder = os.path.basename(ROOT)
        if os.path.exists(out):
            os.remove(out)
        with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
            for dirpath, dirs, files in os.walk(ROOT):
                dirs[:] = [d for d in dirs if d not in ('tools', '.git', '__pycache__')]
                for name in files:
                    full = os.path.join(dirpath, name)
                    arc = os.path.join(folder, os.path.relpath(full, ROOT)).replace(os.sep, '/')
                    z.write(full, arc)
        print(f"Built {out} ({os.path.getsize(out) // 1024} KB)")


if __name__ == '__main__':
    main()
