"""
Núcleo do instadl.

Estratégias, em ordem (cada uma é tentada se a anterior falhar):
  1. direct   - API GraphQL pública / página "embed" do Instagram (sem dependências
                além de `requests`; funciona para a maioria dos posts públicos).
  2. gallery-dl - extrator maduro, suporta cookies/login, carrosséis, vídeos.
  3. yt-dlp   - último recurso (bom para reels/vídeos).

Com `--cookies` ou `--cookies-from-browser`, o gallery-dl passa a ser a
primeira opção, pois é o que melhor lida com posts privados/login-wall.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Optional
from urllib.parse import urlparse

import requests

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)
# ID de documento GraphQL usado pelo site do Instagram para `PolarisPostActionLoadPostQueryQuery`.
GRAPHQL_DOC_ID = "8845758582119845"
GRAPHQL_URL = "https://www.instagram.com/graphql/query"

_SHORTCODE_RE = re.compile(r"/(?:p|reel|reels|tv)/([A-Za-z0-9_-]+)")


class InstadlError(Exception):
    pass


@dataclass
class MediaItem:
    url: str
    is_video: bool = False
    index: int = 0


@dataclass
class Post:
    shortcode: str
    owner: str = ""
    caption: str = ""
    items: list[MediaItem] = field(default_factory=list)


@dataclass
class Options:
    out_dir: Path = Path("downloads")
    cookies_file: Optional[Path] = None
    cookies_from_browser: Optional[str] = None
    only_photos: bool = False
    verbose: bool = False
    strategies: tuple[str, ...] = ("direct", "gallery-dl", "yt-dlp")


# --------------------------------------------------------------------------- #
# URL
# --------------------------------------------------------------------------- #
def parse_url(url: str) -> str:
    """Extrai o shortcode de um link de post/reel do Instagram.

    Aceita:
      https://www.instagram.com/p/ABC123/
      https://instagram.com/reel/ABC123/?igsh=xyz
      https://www.instagram.com/usuario/p/ABC123/
      ABC123  (shortcode puro)
    """
    url = url.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{5,}", url):
        return url
    parsed = urlparse(url if "://" in url else "https://" + url)
    host = parsed.netloc.lower().removeprefix("www.")
    if host not in ("instagram.com", "instagr.am"):
        raise InstadlError(f"Isso não parece um link do Instagram: {url}")
    m = _SHORTCODE_RE.search(parsed.path)
    if not m:
        raise InstadlError(
            "Não achei o código do post no link. "
            "Use um link no formato https://www.instagram.com/p/XXXXXXX/"
        )
    return m.group(1)


def canonical_url(shortcode: str) -> str:
    return f"https://www.instagram.com/p/{shortcode}/"


# --------------------------------------------------------------------------- #
# Estratégia 1: direct (GraphQL público -> embed)
# --------------------------------------------------------------------------- #
def _session(opts: Options) -> requests.Session:
    s = requests.Session()
    s.headers.update(
        {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9,pt-BR;q=0.8",
        }
    )
    if opts.cookies_file:
        _load_netscape_cookies(s, opts.cookies_file)
    return s


def _load_netscape_cookies(session: requests.Session, path: Path) -> None:
    from http.cookiejar import MozillaCookieJar

    jar = MozillaCookieJar(str(path))
    jar.load(ignore_discard=True, ignore_expires=True)
    session.cookies.update(jar)


def parse_graphql_media(node: dict) -> Post:
    """Converte o nó `xdt_shortcode_media`/`shortcode_media` num Post."""
    post = Post(
        shortcode=node.get("shortcode", ""),
        owner=(node.get("owner") or {}).get("username", ""),
    )
    edges = ((node.get("edge_media_to_caption") or {}).get("edges") or [])
    if edges:
        post.caption = (edges[0].get("node") or {}).get("text", "") or ""

    children = (node.get("edge_sidecar_to_children") or {}).get("edges") or []
    if children:
        for i, edge in enumerate(children):
            child = edge.get("node") or {}
            post.items.append(_media_from_node(child, i))
    else:
        post.items.append(_media_from_node(node, 0))
    return post


def _media_from_node(node: dict, index: int) -> MediaItem:
    is_video = bool(node.get("is_video"))
    if is_video and node.get("video_url"):
        return MediaItem(url=node["video_url"], is_video=True, index=index)
    # maior resolução disponível
    resources = node.get("display_resources") or []
    if resources:
        best = max(resources, key=lambda r: r.get("config_width", 0))
        return MediaItem(url=best["src"], is_video=False, index=index)
    return MediaItem(url=node["display_url"], is_video=False, index=index)


def fetch_graphql(shortcode: str, opts: Options) -> Post:
    s = _session(opts)
    s.headers.update(
        {
            "X-IG-App-ID": "936619743392459",
            "X-FB-LSD": "AVqbxe3J_YA",
            "X-ASBD-ID": "129477",
            "Content-Type": "application/x-www-form-urlencoded",
            "Origin": "https://www.instagram.com",
            "Referer": canonical_url(shortcode),
        }
    )
    data = {
        "lsd": "AVqbxe3J_YA",
        "doc_id": GRAPHQL_DOC_ID,
        "variables": json.dumps(
            {"shortcode": shortcode, "fetch_tagged_user_count": None, "hoisted_comment_id": None, "hoisted_reply_id": None}
        ),
    }
    r = s.post(GRAPHQL_URL, data=data, timeout=30)
    r.raise_for_status()
    payload = r.json()
    node = (payload.get("data") or {}).get("xdt_shortcode_media") or (payload.get("data") or {}).get("shortcode_media")
    if not node:
        raise InstadlError("GraphQL não retornou mídia (post privado, removido ou bloqueio anti-bot).")
    return parse_graphql_media(node)


_EMBED_IMG_RE = re.compile(r'class="EmbeddedMediaImage"[^>]*\ssrc="([^"]+)"', re.S)
_EMBED_IMG_RE2 = re.compile(r'<img[^>]+src="([^"]+)"[^>]*class="EmbeddedMediaImage"', re.S)
_EMBED_JSON_RE = re.compile(r'"shortcode_media"\s*:\s*(\{.*?\})\s*\}\s*\}', re.S)
_EMBED_OWNER_RE = re.compile(r'class="UsernameText"[^>]*>([^<]+)<', re.S)


def parse_embed_html(html: str, shortcode: str) -> Post:
    """Extrai a foto principal da página /embed/captioned/ (apenas 1ª mídia)."""
    # Tenta o JSON embutido (contém carrossel completo em alguns casos)
    for m in re.finditer(r'"shortcode_media":', html):
        start = m.end()
        depth, i = 0, start
        while i < len(html):
            c = html[i]
            if c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    try:
                        raw = html[start : i + 1].encode().decode("unicode_escape")
                        node = json.loads(raw)
                        post = parse_graphql_media(node)
                        if post.items:
                            return post
                    except Exception:
                        pass
                    break
            i += 1
    m = _EMBED_IMG_RE.search(html) or _EMBED_IMG_RE2.search(html)
    if not m:
        raise InstadlError("Página embed sem imagem (post privado ou bloqueado).")
    src = m.group(1).replace("&amp;", "&")
    owner_m = _EMBED_OWNER_RE.search(html)
    return Post(
        shortcode=shortcode,
        owner=owner_m.group(1).strip() if owner_m else "",
        items=[MediaItem(url=src, is_video=False, index=0)],
    )


def fetch_embed(shortcode: str, opts: Options) -> Post:
    s = _session(opts)
    r = s.get(f"https://www.instagram.com/p/{shortcode}/embed/captioned/", timeout=30)
    r.raise_for_status()
    return parse_embed_html(r.text, shortcode)


def _ext_for(url: str, is_video: bool) -> str:
    path = urlparse(url).path
    ext = os.path.splitext(path)[1].lower()
    if ext in (".jpg", ".jpeg", ".png", ".webp", ".mp4", ".heic"):
        return ext
    return ".mp4" if is_video else ".jpg"


def _save_items(post: Post, opts: Options) -> list[Path]:
    s = _session(opts)
    saved: list[Path] = []
    opts.out_dir.mkdir(parents=True, exist_ok=True)
    items = [i for i in post.items if not (opts.only_photos and i.is_video)]
    for item in items:
        suffix = f"_{item.index + 1}" if len(post.items) > 1 else ""
        name = f"{post.owner or 'instagram'}_{post.shortcode}{suffix}{_ext_for(item.url, item.is_video)}"
        dest = opts.out_dir / name
        with s.get(item.url, stream=True, timeout=60) as r:
            r.raise_for_status()
            with open(dest, "wb") as fh:
                shutil.copyfileobj(r.raw, fh)
        saved.append(dest)
        _log(opts, f"  salvo: {dest}")
    if post.caption:
        (opts.out_dir / f"{post.owner or 'instagram'}_{post.shortcode}.txt").write_text(post.caption, encoding="utf-8")
    return saved


def strategy_direct(shortcode: str, opts: Options) -> list[Path]:
    errors = []
    for name, fn in (("graphql", fetch_graphql), ("embed", fetch_embed)):
        try:
            post = fn(shortcode, opts)
            _log(opts, f"[direct/{name}] {len(post.items)} mídia(s) encontrada(s)")
            return _save_items(post, opts)
        except Exception as e:  # noqa: BLE001
            errors.append(f"{name}: {e}")
            _log(opts, f"[direct/{name}] falhou: {e}")
    raise InstadlError("; ".join(errors))


# --------------------------------------------------------------------------- #
# Estratégia 2: gallery-dl
# --------------------------------------------------------------------------- #
def _exe(name: str) -> Optional[list[str]]:
    """Retorna o comando para executar `name` (binário ou `python -m`)."""
    path = shutil.which(name)
    if path:
        return [path]
    mod = name.replace("-", "_")
    try:
        __import__(mod)
        return [sys.executable, "-m", mod]
    except ImportError:
        return None


def _run(cmd: list[str], opts: Options) -> subprocess.CompletedProcess:
    _log(opts, "$ " + " ".join(cmd))
    return subprocess.run(cmd, capture_output=True, text=True)


def _snapshot(dirpath: Path) -> set[Path]:
    return {p for p in dirpath.rglob("*") if p.is_file()} if dirpath.exists() else set()


def strategy_gallery_dl(shortcode: str, opts: Options) -> list[Path]:
    cmd = _exe("gallery-dl")
    if not cmd:
        raise InstadlError("gallery-dl não está instalado (pip install gallery-dl)")
    before = _snapshot(opts.out_dir)
    cmd = cmd + ["-D", str(opts.out_dir), "--user-agent", USER_AGENT]
    if opts.cookies_file:
        cmd += ["--cookies", str(opts.cookies_file)]
    elif opts.cookies_from_browser:
        cmd += ["--cookies-from-browser", opts.cookies_from_browser]
    if opts.only_photos:
        cmd += ["-o", "extractor.instagram.videos=false"]
    cmd.append(canonical_url(shortcode))
    proc = _run(cmd, opts)
    new = sorted(_snapshot(opts.out_dir) - before)
    if proc.returncode != 0 and not new:
        raise InstadlError((proc.stderr or proc.stdout).strip()[-500:] or f"exit {proc.returncode}")
    if not new:
        raise InstadlError("gallery-dl terminou sem baixar nada")
    for p in new:
        _log(opts, f"  salvo: {p}")
    return new


# --------------------------------------------------------------------------- #
# Estratégia 3: yt-dlp
# --------------------------------------------------------------------------- #
def strategy_yt_dlp(shortcode: str, opts: Options) -> list[Path]:
    cmd = _exe("yt-dlp")
    if not cmd:
        raise InstadlError("yt-dlp não está instalado (pip install yt-dlp)")
    before = _snapshot(opts.out_dir)
    cmd = cmd + [
        "--user-agent", USER_AGENT,
        "-o", str(opts.out_dir / "%(uploader)s_%(id)s.%(ext)s"),
        "--no-warnings",
    ]
    if opts.cookies_file:
        cmd += ["--cookies", str(opts.cookies_file)]
    elif opts.cookies_from_browser:
        cmd += ["--cookies-from-browser", opts.cookies_from_browser]
    cmd.append(canonical_url(shortcode))
    proc = _run(cmd, opts)
    new = sorted(_snapshot(opts.out_dir) - before)
    if not new:
        raise InstadlError((proc.stderr or proc.stdout).strip()[-500:] or f"exit {proc.returncode}")
    for p in new:
        _log(opts, f"  salvo: {p}")
    return new


STRATEGIES = {
    "direct": strategy_direct,
    "gallery-dl": strategy_gallery_dl,
    "yt-dlp": strategy_yt_dlp,
}


# --------------------------------------------------------------------------- #
# API pública
# --------------------------------------------------------------------------- #
def download(url: str, opts: Optional[Options] = None) -> list[Path]:
    """Baixa todas as mídias do post. Retorna os arquivos salvos."""
    opts = opts or Options()
    shortcode = parse_url(url)
    order = list(opts.strategies)
    if (opts.cookies_file or opts.cookies_from_browser) and "gallery-dl" in order:
        order.remove("gallery-dl")
        order.insert(0, "gallery-dl")
    _log(opts, f"post {shortcode} -> {opts.out_dir}  (ordem: {', '.join(order)})")

    failures: list[str] = []
    for name in order:
        try:
            files = STRATEGIES[name](shortcode, opts)
            if files:
                return files
        except Exception as e:  # noqa: BLE001
            failures.append(f"{name}: {e}")
            _log(opts, f"[{name}] falhou: {e}")
    raise InstadlError(
        "Nenhum método conseguiu baixar o post.\n  - "
        + "\n  - ".join(failures)
        + "\n\nDicas: o post pode ser privado ou o Instagram pediu login. "
        "Tente --cookies-from-browser chrome (ou firefox) ou exporte cookies.txt e use --cookies."
    )


def _log(opts: Options, msg: str) -> None:
    if opts.verbose:
        print(msg, file=sys.stderr)
