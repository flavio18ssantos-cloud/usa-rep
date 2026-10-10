import json
from pathlib import Path

import pytest

from instadl import core
from instadl.core import InstadlError, Options, parse_url, parse_graphql_media, parse_embed_html

FIX = Path(__file__).parent / "fixtures"


@pytest.mark.parametrize(
    "url,code",
    [
        ("https://www.instagram.com/p/C3ZLMq7v2V1/", "C3ZLMq7v2V1"),
        ("https://instagram.com/p/C3ZLMq7v2V1", "C3ZLMq7v2V1"),
        ("www.instagram.com/reel/DAbc_12-xyz/?igsh=abc123", "DAbc_12-xyz"),
        ("https://www.instagram.com/reels/DAbc_12-xyz/", "DAbc_12-xyz"),
        ("https://www.instagram.com/tv/CKxyz123/", "CKxyz123"),
        ("https://www.instagram.com/natgeo/p/C3ZLMq7v2V1/?img_index=2", "C3ZLMq7v2V1"),
        ("C3ZLMq7v2V1", "C3ZLMq7v2V1"),
    ],
)
def test_parse_url(url, code):
    assert parse_url(url) == code


@pytest.mark.parametrize("url", ["https://twitter.com/x/status/1", "https://www.instagram.com/natgeo/", ""])
def test_parse_url_rejects(url):
    with pytest.raises(InstadlError):
        parse_url(url)


def test_parse_graphql_single_photo():
    node = json.loads((FIX / "graphql_single.json").read_text())["data"]["xdt_shortcode_media"]
    post = parse_graphql_media(node)
    assert post.shortcode == "C3ZLMq7v2V1"
    assert post.owner == "natgeo"
    assert post.caption.startswith("Foto de")
    assert len(post.items) == 1
    assert post.items[0].url.endswith("1080.jpg")  # maior resolução
    assert not post.items[0].is_video


def test_parse_graphql_carousel_with_video():
    node = json.loads((FIX / "graphql_carousel.json").read_text())["data"]["xdt_shortcode_media"]
    post = parse_graphql_media(node)
    assert [i.index for i in post.items] == [0, 1, 2]
    assert [i.is_video for i in post.items] == [False, False, True]
    assert post.items[2].url.endswith(".mp4")


def test_parse_embed_html_img_tag():
    html = (FIX / "embed.html").read_text()
    post = parse_embed_html(html, "C3ZLMq7v2V1")
    assert post.owner == "natgeo"
    assert len(post.items) == 1
    assert post.items[0].url == "https://scontent.cdninstagram.com/v/t51/photo_1080.jpg?stp=dst-jpg&ccb=1"


def test_parse_embed_html_without_image():
    with pytest.raises(InstadlError):
        parse_embed_html("<html><body>Login required</body></html>", "X")


def test_download_falls_through_strategies(monkeypatch, tmp_path):
    calls = []

    def failing(code, opts):
        calls.append("direct")
        raise InstadlError("boom")

    def ok(code, opts):
        calls.append("gallery-dl")
        return [tmp_path / "x.jpg"]

    monkeypatch.setitem(core.STRATEGIES, "direct", failing)
    monkeypatch.setitem(core.STRATEGIES, "gallery-dl", ok)
    files = core.download("https://www.instagram.com/p/ABCDEF1/", Options(out_dir=tmp_path))
    assert files == [tmp_path / "x.jpg"]
    assert calls == ["direct", "gallery-dl"]


def test_cookies_put_gallery_dl_first(monkeypatch, tmp_path):
    calls = []
    for name in ("direct", "gallery-dl", "yt-dlp"):
        def rec(code, opts, _n=name):
            calls.append(_n)
            raise InstadlError("x")
        monkeypatch.setitem(core.STRATEGIES, name, rec)
    with pytest.raises(InstadlError):
        core.download("ABCDEF1", Options(out_dir=tmp_path, cookies_file=tmp_path / "c.txt"))
    assert calls[0] == "gallery-dl"


def test_save_items_names_files(monkeypatch, tmp_path):
    class FakeResp:
        def __init__(self, data): self.raw = __import__("io").BytesIO(data)
        def raise_for_status(self): pass
        def __enter__(self): return self
        def __exit__(self, *a): pass

    class FakeSession:
        headers = {}
        cookies = {}
        def get(self, url, **kw): return FakeResp(b"IMG" + url.encode())

    monkeypatch.setattr(core, "_session", lambda opts: FakeSession())
    node = json.loads((FIX / "graphql_carousel.json").read_text())["data"]["xdt_shortcode_media"]
    post = parse_graphql_media(node)
    files = core._save_items(post, Options(out_dir=tmp_path, only_photos=True))
    assert [f.name for f in files] == ["natgeo_C3ZLMq7v2V1_1.jpg", "natgeo_C3ZLMq7v2V1_2.jpg"]
    assert (tmp_path / "natgeo_C3ZLMq7v2V1.txt").read_text() == "Carrossel"


def test_parse_embed_html_js_escaped_json_gives_full_carousel():
    html = (FIX / "embed_escaped.html").read_text()
    post = parse_embed_html(html, "C3ZLMq7v2V1")
    assert post.owner == "natgeo"
    assert len(post.items) == 3
    assert post.items[1].url.endswith("b_1080.jpg")
    assert post.items[2].is_video


@pytest.mark.parametrize(
    "url,platform",
    [
        ("https://www.instagram.com/p/C3ZLMq7v2V1/", "instagram"),
        ("ABCDEF1", "instagram"),
        ("https://vt.tiktok.com/ZSb7L7TFS/", "tiktok"),
        ("https://www.tiktok.com/@user/video/7694772702212541703", "tiktok"),
        ("https://www.tiktok.com/@user/photo/123", "tiktok"),
    ],
)
def test_detect_platform(url, platform):
    assert core.detect_platform(url) == platform


def test_detect_platform_rejects_other():
    with pytest.raises(InstadlError):
        core.detect_platform("https://youtube.com/watch?v=x")


def test_tiktok_uses_ytdlp_then_gallery_dl_with_original_url(monkeypatch, tmp_path):
    calls = []
    for name in ("direct", "gallery-dl", "yt-dlp"):
        def rec(url, opts, _n=name):
            calls.append((_n, url))
            raise InstadlError("x")
        monkeypatch.setitem(core.STRATEGIES, name, rec)
    with pytest.raises(InstadlError):
        core.download("https://vt.tiktok.com/ZSb7L7TFS/", Options(out_dir=tmp_path))
    assert calls == [("yt-dlp", "https://vt.tiktok.com/ZSb7L7TFS/"), ("gallery-dl", "https://vt.tiktok.com/ZSb7L7TFS/")]
