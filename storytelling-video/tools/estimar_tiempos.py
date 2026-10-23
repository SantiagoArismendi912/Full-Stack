#!/usr/bin/env python3
"""Estima los tiempos del video para una voz de ritmo conocido (sin generar audio).

Uso: python estimar_tiempos.py <tiempos-salida.json> [palabras-por-segundo]
Nyla (medida en tu video de Vids) habla a ~2,2 palabras/s con pausas en cada coma: de ahí el valor por defecto.
Usa las mismas reglas de maquetación que construir_audio.py (entradas, huecos y solapes entre escenas).
"""
import json, re, sys
from pathlib import Path

aqui = Path(__file__).resolve().parent
fuente = (aqui / "construir_audio.py").read_text(encoding="utf-8")
ns = {}
exec(fuente[fuente.index("GUION = ["):fuente.index("SR_VOZ")], ns)
pps = float(sys.argv[2]) if len(sys.argv) > 2 else 2.2
GAP, SALIDA, SOLAPE, COLA = 0.45, 0.7, 0.45, 3.4
ENTRADA = {"jornexa": 0.9, "cierre": 0.9}

def duracion(texto):
    palabras = len(re.findall(r"\w+", texto))
    pausas = texto.count(",") * 0.18 + texto.count(".") * 0.25 + texto.count(":") * 0.2 + texto.count("!") * 0.2
    return round(palabras / pps + pausas + 0.15, 3)

escenas, cursor = [], 0.6
for nombre, frases in ns["GUION"]:
    ini, t, tomas = cursor, cursor + ENTRADA.get(nombre, 0.55), []
    for i, texto in enumerate(frases):
        d = duracion(texto)
        tomas.append({"texto": texto, "archivo": f"voz-{nombre}-{i + 1}.wav", "ini": round(t, 3), "dur": d})
        t += d + GAP
    fin = t - GAP + (COLA if nombre == "cierre" else SALIDA)
    escenas.append({"id": nombre, "ini": round(ini, 3), "fin": round(fin, 3), "tomas": tomas})
    cursor = fin - SOLAPE
total = escenas[-1]["fin"]
Path(sys.argv[1]).write_text(json.dumps({"total": round(total, 3), "bpm": 112, "escenas": escenas}, ensure_ascii=False, indent=2), encoding="utf-8")
print("total", round(total, 1), "s a", pps, "palabras/s")
for e in escenas: print(f'{e["id"]:9s} {e["ini"]:6.1f} → {e["fin"]:6.1f}')
