#!/usr/bin/env python3
"""
Genera los iconos de la app (favicon, icono de inicio de iOS y los del
manifest) a partir de la identidad de la Junta: gota de agua aqua sobre azul
marino.

Uso:
    python3 scripts/generar_iconos.py

Escribe en src/app/ (Next.js los enlaza solo) y en public/.
El icono de iOS lleva el texto "JRAS / Hidalgo"; el favicon va sin texto
porque a 16 px las letras se vuelven ilegibles.
"""

from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

RAIZ = Path(__file__).resolve().parent.parent
APP = RAIZ / "src" / "app"
PUBLIC = RAIZ / "public"

LIENZO = 1024  # se dibuja en grande y se reduce con LANCZOS

MARINO_ALTO = (14, 43, 78)      # #0e2b4e
MARINO_BAJO = (6, 21, 39)       # #061527
AQUA_CLARO = (125, 233, 250)    # #7de9fa
AQUA_OSCURO = (6, 182, 212)     # #06b6d4
AQUA_TEXTO = (99, 228, 244)     # #63e4f4
BLANCO = (255, 255, 255)

FUENTES_BOLD = [
    "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/Library/Fonts/Arial Bold.ttf",
]


def fuente(tam: int) -> ImageFont.FreeTypeFont:
    for ruta in FUENTES_BOLD:
        if Path(ruta).exists():
            return ImageFont.truetype(ruta, tam)
    return ImageFont.load_default()


def gradiente_vertical(ancho, alto, arriba, abajo) -> Image.Image:
    """Franja de color que va de 'arriba' a 'abajo'."""
    img = Image.new("RGB", (1, alto))
    px = img.load()
    for y in range(alto):
        t = y / max(alto - 1, 1)
        px[0, y] = tuple(round(a + (b - a) * t) for a, b in zip(arriba, abajo))
    return img.resize((ancho, alto), Image.Resampling.BILINEAR)


def figura_gota(cx: float, cy: float, r: float, punta_y: float) -> list:
    """
    Contorno de una gota: circulo abajo, punta arriba y las dos rectas
    tangentes que las unen.
    """
    d = cy - punta_y                      # distancia del centro a la punta
    alfa = math.acos(min(r / d, 1.0))     # angulo entre el eje y la tangente
    puntos = [(cx, punta_y)]
    # Tangente derecha, luego el arco por abajo hasta la tangente izquierda.
    inicio = math.pi / 2 - alfa           # medido desde el eje +x, hacia abajo
    for i in range(101):
        ang = inicio - (2 * math.pi - 2 * alfa) * (i / 100)
        puntos.append((cx + r * math.cos(ang), cy - r * math.sin(ang)))
    return puntos


def texto_centrado(draw, y, texto, font, color, espaciado=0):
    """Dibuja 'texto' centrado horizontalmente; devuelve su alto."""
    if espaciado:
        anchos = [draw.textlength(c, font=font) for c in texto]
        total = sum(anchos) + espaciado * (len(texto) - 1)
        x = (LIENZO - total) / 2
        for c, w in zip(texto, anchos):
            draw.text((x, y), c, font=font, fill=color)
            x += w + espaciado
    else:
        w = draw.textlength(texto, font=font)
        draw.text(((LIENZO - w) / 2, y), texto, font=font, fill=color)
    caja = draw.textbbox((0, 0), texto, font=font)
    return caja[3] - caja[1]


def lienzo_base() -> Image.Image:
    return gradiente_vertical(LIENZO, LIENZO, MARINO_ALTO, MARINO_BAJO).convert("RGBA")


def pegar_gota(img: Image.Image, cx, cy, r, punta_y):
    """Pinta la gota con su propio gradiente aqua usando una mascara."""
    mascara = Image.new("L", (LIENZO, LIENZO), 0)
    ImageDraw.Draw(mascara).polygon(figura_gota(cx, cy, r, punta_y), fill=255)
    relleno = gradiente_vertical(
        LIENZO, LIENZO, AQUA_CLARO, AQUA_OSCURO
    ).convert("RGBA")
    img.paste(relleno, (0, 0), mascara)

    # Brillo: elipse clara arriba a la izquierda, recortada por la gota.
    brillo = Image.new("L", (LIENZO, LIENZO), 0)
    ImageDraw.Draw(brillo).ellipse(
        [cx - r * 0.55, cy - r * 0.75, cx - r * 0.05, cy - r * 0.05], fill=70
    )
    brillo = Image.composite(brillo, Image.new("L", brillo.size, 0), mascara)
    img.paste(Image.new("RGBA", (LIENZO, LIENZO), BLANCO + (255,)), (0, 0), brillo)


def icono_con_texto() -> Image.Image:
    """Icono para la pantalla de inicio del iPad: gota + JRAS + Hidalgo."""
    img = lienzo_base()
    pegar_gota(img, cx=LIENZO / 2, cy=390, r=158, punta_y=118)

    draw = ImageDraw.Draw(img)
    texto_centrado(draw, 590, "JRAS", fuente(196), BLANCO, espaciado=10)
    texto_centrado(draw, 818, "Hidalgo", fuente(104), AQUA_TEXTO, espaciado=4)
    return img


def icono_solo_gota() -> Image.Image:
    """Favicon: solo la gota, para que se lea a 16 px."""
    img = lienzo_base()
    pegar_gota(img, cx=LIENZO / 2, cy=610, r=250, punta_y=180)
    return img


def guardar(img: Image.Image, destino: Path, tam: int):
    destino.parent.mkdir(parents=True, exist_ok=True)
    img.resize((tam, tam), Image.Resampling.LANCZOS).convert("RGB").save(
        destino, "PNG", optimize=True
    )
    print(f"  {destino.relative_to(RAIZ)}  {tam}x{tam}")


def main():
    con_texto = icono_con_texto()
    solo_gota = icono_solo_gota()

    print("Iconos generados:")
    # Next.js enlaza solo estos dos por convencion de nombre.
    guardar(solo_gota, APP / "icon.png", 512)
    guardar(con_texto, APP / "apple-icon.png", 180)
    # Los del manifest (instalacion como app web).
    guardar(con_texto, PUBLIC / "icono-192.png", 192)
    guardar(con_texto, PUBLIC / "icono-512.png", 512)
    # Vista previa para revisar el diseno a tamano grande.
    guardar(con_texto, PUBLIC / "icono-completo.png", 1024)


if __name__ == "__main__":
    main()
