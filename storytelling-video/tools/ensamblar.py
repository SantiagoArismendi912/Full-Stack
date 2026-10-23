#!/usr/bin/env python3
"""Ensambla index.html y compositions/*.html a partir de tools/tiempos.json y tools/plantillas/*.html."""
import json
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
datos = json.loads((raiz / "tools" / "tiempos.json").read_text(encoding="utf-8"))
total = datos["total"]
(raiz / "compositions").mkdir(exist_ok=True)

NOMBRES_ESCENA = {"problema": "Problema", "jornexa": "Jornexa", "datos": "Datos", "contexto": "Contexto",
                  "decision": "Decisión", "accion": "Acción", "cierre": "Cierre"}
hosts, audios = [], []
for i, e in enumerate(datos["escenas"]):
    if i == 0:
        e["ini"] = 0.0   # la imagen ya está en pantalla en el primer fotograma (miniatura); la música abre sola 0,6 s
    dur = round(e["fin"] - e["ini"], 3)
    shots = [{"s": round(t["ini"] - e["ini"], 3), "d": t["dur"]} for t in e["tomas"]]
    html = (raiz / "tools" / "plantillas" / f"{e['id']}.html").read_text(encoding="utf-8")
    html = html.replace("__SHOTS__", json.dumps(shots)).replace("__DUR__", str(dur)).replace("__DVH__", "91")
    (raiz / "compositions" / f"{e['id']}.html").write_text(html, encoding="utf-8")
    hosts.append(
        f'    <div id="{e["id"]}" data-composition-id="{e["id"]}" data-composition-src="compositions/{e["id"]}.html"\n'
        f'         data-start="{e["ini"]}" data-duration="{dur}" data-track-index="1" data-track-kind="graphics"\n'
        f'         data-width="1920" data-height="1080" style="z-index:{i + 1}"></div>')
    for k, t in enumerate(e["tomas"], 1):
        audios.append(f'    <audio id="voz-{e["id"]}-{k}" class="clip" src="{t["archivo"]}" data-start="{t["ini"]}" data-duration="{t["dur"]}" data-track-index="2" data-volume="1"></audio>')

# Efectos: cada pico cae un instante después de su imagen (el sonido llega tarde, nunca antes)
DURS = {"whoosh-short": 0.57, "click": 0.36, "pop": 0.7}
PICO = {"whoosh-short": 0.162, "click": 0.073, "pop": 0.12}
sfx = []
def efecto(nombre, momento, vol, idx):
    ini = max(0.0, round(momento + 0.033 - PICO[nombre], 3))
    sfx.append(f'    <audio id="sfx-{idx}" class="clip" src="assets/audio/sfx/{nombre}.mp3" data-start="{ini}" data-duration="{DURS[nombre]}" data-track-index="{4 if nombre != "pop" else 5}" data-volume="{vol}"></audio>')

E = {e["id"]: e for e in datos["escenas"]}
n = 0
for e in datos["escenas"][1:]:
    n += 1; efecto("whoosh-short", e["ini"], 0.45, n)
jx = E["jornexa"]; b = jx["tomas"][1]
for f in (0.02, 0.28, 0.52, 0.76):
    n += 1; efecto("pop", b["ini"] - 0.0 + b["dur"] * f - 0.0 + 0.0, 0.5, n)
dc = E["decision"]; b = dc["tomas"][1]
n += 1; efecto("click", b["ini"] + b["dur"] * 0.45, 0.6, n)
n += 1; efecto("pop", b["ini"] + b["dur"] * 0.45 + 0.35, 0.4, n)
cz = E["cierre"]
n += 1; efecto("pop", cz["tomas"][2]["ini"] + 0.05, 0.5, n)

index = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>Jornexa · Centro de Mando — storytelling</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1920px; height: 1080px; overflow: hidden; background: #EDF5F5; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1920" data-height="1080">
{chr(10).join(hosts)}

      <!-- Voz femenina (Kokoro · ef_dora, español), una pista por frase -->
{chr(10).join(audios)}

      <!-- Música electrónica original (sintetizada en código; sin derechos de terceros). Ya baja sola bajo la voz. -->
      <audio id="musica" class="clip" src="assets/audio/musica.mp3" data-start="0" data-duration="{total}" data-track-index="3" data-volume="0.8"></audio>

      <!-- Efectos de sonido -->
{chr(10).join(sfx)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      tl.set({{}}, {{}}, {total});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
(raiz / "index.html").write_text(index, encoding="utf-8")
print("ok", total, "s;", len(sfx), "efectos")
