"""
글꼴 줄이기: 사이트에서 실제로 쓰는 글자만 남긴 작은 글꼴 파일을 만든다.
  실행: npm run fonts   (원고나 화면 문구를 바꾼 뒤 한 번 실행하고 결과를 커밋)
  필요: python, fonttools, brotli  (pip install fonttools brotli)

- 고운바탕(본문)·갈무리11(라벨)  (Neo둥근모 Pro는 원본 그대로)
- 남기는 글자: 원고(md) + 화면 문구(html·ts) + 자주 쓰는 한글 2,350자(KS X 1001) + 영문·숫자·문장부호
  → 원고에 새 글자가 생겨도 대부분 그대로 보이고, 혹시 빠진 글자는 기본 명조체로 대신 보임
"""
import glob
import io
import os
import urllib.request

from fontTools import subset

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'fonts')
CACHE = os.path.join(ROOT, 'node_modules', '.cache', 'font-src')

# 고운바탕 원본 (SIL OFL-1.1, Google Fonts 저장소)
GOWUN = {
    'GowunBatang-Regular.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/GowunBatang-Regular.ttf',
    'GowunBatang-Bold.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/gowunbatang/GowunBatang-Bold.ttf',
}


def source(name):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print('download', name)
        urllib.request.urlretrieve(GOWUN[name], path)
    return path


def used_text():
    chars = set()
    files = glob.glob(os.path.join(ROOT, 'src', 'content', '**', '*.md'), recursive=True)
    files += glob.glob(os.path.join(ROOT, 'src', '*.ts')) + [os.path.join(ROOT, 'index.html')]
    for f in files:
        chars |= set(io.open(f, encoding='utf-8').read())
    # 자주 쓰는 한글 2,350자
    for b1 in range(0xB0, 0xC9):
        for b2 in range(0xA1, 0xFF):
            try:
                chars.add(bytes([b1, b2]).decode('euc-kr'))
            except UnicodeDecodeError:
                pass
    chars |= set(chr(c) for c in range(0x20, 0x7F))  # 영문·숫자·기호
    chars |= set('…“”‘’—–·『』「」《》◆◇❦←→◀▶▲▼✕×♪')
    return ''.join(sorted(c for c in chars if c.isprintable()))


def make(src, out_name, text):
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    font = subset.load_font(src, opts)
    sub = subset.Subsetter(opts)
    sub.populate(text=text)
    sub.subset(font)
    out = os.path.join(OUT, out_name)
    subset.save_font(font, out, opts)
    print(f'{out_name}: {os.path.getsize(src) // 1024}KB -> {os.path.getsize(out) // 1024}KB')


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    text = used_text()
    print('glyphs:', len(text))
    make(source('GowunBatang-Regular.ttf'), 'GowunBatang-Regular.woff2', text)
    make(source('GowunBatang-Bold.ttf'), 'GowunBatang-Bold.woff2', text)
    make(os.path.join(ROOT, 'node_modules', 'galmuri', 'dist', 'Galmuri11.ttf'), 'Galmuri11.woff2', text)
    # Neo둥근모 Pro는 자모 조합 방식이라 줄이면 글자가 깨짐 → 원본 그대로 사용
