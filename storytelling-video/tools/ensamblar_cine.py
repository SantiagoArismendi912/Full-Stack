#!/usr/bin/env python3
"""Ensambla cine/ (1080x1920, voz de Nyla + música + efectos) a partir de tools/tiempos_cine.json y tools/plantillas_cine/."""
import json
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
d = json.loads((raiz / "tools" / "tiempos_cine.json").read_text(encoding="utf-8"))
total, E = d["total"], {e["id"]: e for e in d["escenas"]}
c = raiz / "cine"
(c / "compositions").mkdir(parents=True, exist_ok=True)
hosts = []
for i, e in enumerate(d["escenas"]):
    dur = round(e["fin"] - e["ini"], 3)
    html = (raiz / "tools" / "plantillas_cine" / f"{e['id']}.html").read_text(encoding="utf-8")
    html = html.replace("__SHOTS__", json.dumps(e["shots"])).replace("__DUR__", str(dur)).replace("__ANC__", json.dumps(e["anc"]))
    (c / "compositions" / f"{e['id']}.html").write_text(html, encoding="utf-8")
    hosts.append(f'    <div id="{e["id"]}" data-composition-id="{e["id"]}" data-composition-src="compositions/{e["id"]}.html"\n'
                 f'         data-start="{e["ini"]}" data-duration="{dur}" data-track-index="1" data-track-kind="graphics"\n'
                 f'         data-width="1080" data-height="1920" style="z-index:{i + 1}"></div>')

# Efectos de sonido: el pico de cada uno cae un instante después de su imagen
PICO = {"whoosh-short": 0.162, "impact-bass-1": 0.073, "riser": 3.472, "click": 0.073, "pop": 0.12}
DUR = {"whoosh-short": 0.57, "impact-bass-1": 2.1, "riser": 10.0, "click": 0.36, "pop": 0.7}
sfx = []
def fx(nombre, momento, vol, pista=4):
    ini = max(0.0, round(momento + 0.033 - PICO[nombre], 3))
    dur = min(DUR[nombre], round(total - ini, 3))
    sfx.append(f'    <audio id="sfx-{len(sfx) + 1}" class="clip" src="assets/audio/sfx/{nombre}.mp3" data-start="{ini}" data-duration="{dur}" data-track-index="{pista}" data-volume="{vol}"></audio>')
corte = lambda k: E[k]["ini"] + 0.25
fx("riser", corte("jornexa") + 0.1, 0.35, 5);          fx("impact-bass-1", corte("jornexa"), 0.5)
fx("whoosh-short", corte("datos"), 0.5);               fx("whoosh-short", corte("contexto"), 0.6)
fx("whoosh-short", corte("decision"), 0.45)
fx("click", E["decision"]["ini"] + E["decision"]["anc"]["click"], 0.7); fx("pop", E["decision"]["ini"] + E["decision"]["anc"]["click"] + 0.25, 0.4, 5)
fx("impact-bass-1", corte("accion"), 0.55);            fx("riser", corte("cierre") + 0.2, 0.3, 5)
for k in ("n0", "n1", "n2", "n3"):
    fx("pop", E["jornexa"]["ini"] + E["jornexa"]["anc"][k], 0.35, 5 if k in ("n1", "n3") else 6)
fx("impact-bass-1", E["cierre"]["ini"] + E["cierre"]["anc"]["solicita"], 0.6)
musica = "musica-cine.mp3"
index = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Jornexa · Centro de Mando — versión cinematográfica</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: #040A1C; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1080" data-height="1920">
{chr(10).join(hosts)}

      <!-- Capa de cine: viñeta y grano de película sobre todo el video -->
      <div id="capa" data-composition-id="capa" data-composition-src="compositions/capa.html"
           data-start="0" data-duration="{total}" data-track-index="9" data-track-kind="graphics"
           data-width="1080" data-height="1920" style="z-index:100"></div>

      <!-- Voz de Nyla (Google Vids), editada: silencios largos comprimidos -->
      <audio id="voz" class="clip" src="assets/audio/voz-nyla.wav" data-start="0" data-duration="{total}" data-track-index="2" data-volume="1"></audio>
      <!-- Música original: tensión, impactos y subidas sincronizados con las transiciones -->
      <audio id="musica" class="clip" src="assets/audio/{musica}" data-start="0" data-duration="{total}" data-track-index="3" data-volume="0.55"></audio>
      <!-- Efectos -->
{chr(10).join(sfx)}
    </div>
    <script>
      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""
(c / "compositions" / "capa.html").write_text((raiz / "tools" / "plantillas_cine" / "capa.html").read_text(encoding="utf-8").replace("__DUR__", str(total)), encoding="utf-8")
(c / "index.html").write_text(index, encoding="utf-8")
print("ok cine", total, "s;", len(sfx), "efectos")
