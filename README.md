# instadl — baixar fotos do Instagram pelo link

Ferramenta de linha de comando que recebe o link de um post/reel do Instagram e
salva as fotos (e vídeos) em alta resolução, incluindo todos os itens de um
carrossel.

Ela tenta vários métodos em sequência até um funcionar:

| Ordem | Método       | Como funciona                                                | Precisa de login? |
|-------|--------------|--------------------------------------------------------------|-------------------|
| 1     | `direct`     | API GraphQL pública e página *embed* do Instagram            | Não (posts públicos) |
| 2     | `gallery-dl` | Extrator dedicado, suporta carrossel, vídeo e cookies        | Opcional          |
| 3     | `yt-dlp`     | Último recurso, bom para reels/vídeos                        | Opcional          |

Se você passar cookies (`--cookies` ou `--cookies-from-browser`), o
`gallery-dl` vira o primeiro método, pois é o que melhor lida com posts
privados ou com a tela de login do Instagram.

## Instalação

Precisa só de **Python 3.9+**.

**Linux / macOS / WSL**
```bash
git clone https://github.com/flavio18ssantos-cloud/usa-rep.git
cd usa-rep
./install.sh
source .venv/bin/activate
```

**Windows (CMD ou PowerShell)**
```bat
git clone https://github.com/flavio18ssantos-cloud/usa-rep.git
cd usa-rep
install.bat
.venv\Scripts\activate
```

Ou, sem clonar, instale direto com pip:
```bash
pip install git+https://github.com/flavio18ssantos-cloud/usa-rep.git
```

## Uso

```bash
# baixa para ./downloads
instadl https://www.instagram.com/p/XXXXXXX/

# escolhe a pasta de destino
instadl -o ~/Imagens/insta https://www.instagram.com/p/XXXXXXX/

# vários links de uma vez
instadl https://www.instagram.com/p/AAA/ https://www.instagram.com/reel/BBB/

# lista de links num arquivo (um por linha)
instadl -f links.txt

# só fotos, ignora vídeos
instadl --only-photos https://www.instagram.com/p/XXXXXXX/
```

Sem ativar o ambiente virtual, o atalho `./baixar.sh <link>` faz a mesma coisa.

Os arquivos saem como `usuario_SHORTCODE.jpg` (ou `_1`, `_2`… em carrosséis),
mais um `.txt` com a legenda.

## Post privado ou "faça login para continuar"

O Instagram às vezes bloqueia acesso anônimo. Nesse caso use os cookies da sua
conta logada (**você precisa já seguir o perfil, se ele for privado**):

```bash
# usa direto os cookies do navegador instalado (chrome, firefox, edge, brave, chromium, safari)
instadl --cookies-from-browser chrome https://www.instagram.com/p/XXXXXXX/

# ou exporta cookies.txt (extensão "Get cookies.txt LOCALLY") e passa o arquivo
instadl --cookies cookies.txt https://www.instagram.com/p/XXXXXXX/
```

> No Windows, o Chrome bloqueia a leitura dos cookies enquanto está aberto.
> Feche o Chrome antes de usar `--cookies-from-browser chrome`, ou exporte um `cookies.txt`.

## Forçar um método

```bash
instadl --method gallery-dl https://www.instagram.com/p/XXXXXXX/
instadl --method yt-dlp     https://www.instagram.com/reel/XXXXXXX/
```

## Testes

```bash
python -m pytest -q
```

Os testes rodam offline (usam fixtures HTML/JSON) e cobrem a leitura do link,
o parse da resposta GraphQL e da página embed.

## Aviso

Baixe apenas conteúdo que você tem permissão para usar. Respeite os termos de
uso do Instagram e os direitos autorais dos autores.
