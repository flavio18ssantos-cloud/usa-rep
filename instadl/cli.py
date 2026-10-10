"""Interface de linha de comando do instadl."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from .core import InstadlError, Options, download


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="instadl",
        description="Baixa as fotos (e vídeos) de um post do Instagram ou TikTok a partir do link.",
        epilog=(
            "Exemplos:\n"
            "  instadl https://www.instagram.com/p/ABC123xyz/\n"
            "  instadl -o ~/Pictures/insta https://www.instagram.com/reel/ABC123xyz/\n"
            "  instadl --cookies-from-browser chrome https://www.instagram.com/p/ABC123xyz/\n"
            "  instadl https://vt.tiktok.com/ZSxxxxxxx/\n"
            "  instadl -f links.txt\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("urls", nargs="*", help="um ou mais links de posts/reels (Instagram ou TikTok)")
    p.add_argument("-f", "--file", type=Path, help="arquivo com um link por linha")
    p.add_argument("-o", "--out", type=Path, default=Path("downloads"), help="pasta de destino (padrão: ./downloads)")
    p.add_argument("--cookies", type=Path, help="arquivo cookies.txt (formato Netscape) para posts privados/login")
    p.add_argument(
        "--cookies-from-browser",
        metavar="NAVEGADOR",
        help="usa os cookies do navegador instalado: chrome, firefox, edge, brave, chromium, safari",
    )
    p.add_argument("--only-photos", action="store_true", help="ignora vídeos, baixa só fotos")
    p.add_argument(
        "--method",
        choices=["direct", "gallery-dl", "yt-dlp"],
        help="força um único método em vez da sequência automática",
    )
    p.add_argument("-q", "--quiet", action="store_true", help="só imprime os arquivos salvos")
    return p


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    urls = list(args.urls)
    if args.file:
        urls += [l.strip() for l in args.file.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]
    if not urls:
        build_parser().print_help()
        return 2

    opts = Options(
        out_dir=args.out,
        cookies_file=args.cookies,
        cookies_from_browser=args.cookies_from_browser,
        only_photos=args.only_photos,
        verbose=not args.quiet,
    )
    if args.method:
        opts.strategies = (args.method,)

    rc = 0
    for url in urls:
        try:
            files = download(url, opts)
            for f in files:
                print(f)
        except InstadlError as e:
            print(f"ERRO [{url}]: {e}", file=sys.stderr)
            rc = 1
    return rc


if __name__ == "__main__":
    sys.exit(main())
