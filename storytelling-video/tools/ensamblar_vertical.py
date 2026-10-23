#!/usr/bin/env python3
"""Ensambla vertical/ (1080x1920, sin audio) a partir de tools/tiempos_nyla.json y tools/plantillas_vertical/."""
import json
from pathlib import Path

raiz = Path(__file__).resolve().parent.parent
datos = json.loads((raiz / "tools" / "tiempos_nyla.json").read_text(encoding="utf-8"))
total = datos["total"]
v = raiz / "vertical"
(v / "compositions").mkdir(parents=True, exist_ok=True)
hosts = []
for i, e in enumerate(datos["escenas"]):
    if i == 0:
        e["ini"] = 0.0   # primer fotograma con contenido (miniatura)
    dur = round(e["fin"] - e["ini"], 3)
    shots = [{"s": round(t["ini"] - e["ini"], 3), "d": t["dur"]} for t in e["tomas"]]
    html = (raiz / "tools" / "plantillas_vertical" / f"{e['id']}.html").read_text(encoding="utf-8")
    (v / "compositions" / f"{e['id']}.html").write_text(html.replace("__SHOTS__", json.dumps(shots)).replace("__DUR__", str(dur)), encoding="utf-8")
    hosts.append(
        f'    <div id="{e["id"]}" data-composition-id="{e["id"]}" data-composition-src="compositions/{e["id"]}.html"\n'
        f'         data-start="{e["ini"]}" data-duration="{dur}" data-track-index="1" data-track-kind="graphics"\n'
        f'         data-width="1080" data-height="1920" style="z-index:{i + 1}"></div>')
index = f"""<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1080, height=1920" />
    <title>Jornexa · Centro de Mando — vertical sin audio</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      * {{ margin: 0; padding: 0; box-sizing: border-box; }}
      html, body {{ width: 1080px; height: 1920px; overflow: hidden; background: #EDF5F5; }}
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="{total}" data-width="1080" data-height="1920">
{chr(10).join(hosts)}
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
(v / "index.html").write_text(index, encoding="utf-8")
print("ok vertical", total, "s")
