#!/usr/bin/env python3
"""Edita la voz de Nyla para la versión cinematográfica y calcula la línea de tiempo.

Uso: python construir_cine.py <voz-original.wav> <assets/audio> <tiempos_cine.json>
- Corta cada bloque de voz (uno por escena) y comprime los silencios largos entre bloques.
- Procesa la voz (filtro de graves, compresión suave) y la deja en <assets/audio>/voz-nyla.wav.
- Escribe los tiempos de cada escena, plano y anclas (ya en la línea de tiempo nueva).
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np
import soundfile as sf

origen, salida, tiempos = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
aqui = Path(__file__).resolve().parent
anclas = json.loads((aqui / "anclas_nyla.json").read_text(encoding="utf-8"))["bloques"]
LEAD, GAP, TAIL = 1.6, 1.0, 4.3     # apertura sin voz, hueco (transición) entre bloques, cierre sin voz
PRE, POST, SOLAPE = 0.5, 0.5, 0.5   # la imagen entra antes que la voz, sale después, y se solapa con la siguiente
PAD_I, PAD_F = 0.10, 0.18           # respiración antes y cola después de cada bloque

voz, sr = sf.read(origen, dtype="float32")
if voz.ndim > 1:
    voz = voz.mean(axis=1)
escenas, cursor, partes = [], LEAD, []
for i, b in enumerate(anclas):
    dur = b["t1"] - b["t0"]
    v_ini, v_fin = cursor, cursor + dur
    corte = voz[int((b["t0"] - PAD_I) * sr): int((b["t1"] + PAD_F) * sr)].copy()
    f_in, f_out = int(0.015 * sr), int(0.05 * sr)
    corte[:f_in] *= np.linspace(0, 1, f_in)
    corte[-f_out:] *= np.linspace(1, 0, f_out)
    partes.append((v_ini - PAD_I, corte))
    ini = 0.0 if i == 0 else v_ini - PRE
    ultimo = i == len(anclas) - 1
    fin = v_fin + TAIL if ultimo else v_fin + POST + SOLAPE
    mapa = lambda t: round(v_ini + (t - b["t0"]) - ini, 3)           # tiempo original -> relativo al inicio de la escena
    tomas = [mapa(t) for t in b["tomas"]] + [round(v_fin - ini, 3)]
    escenas.append({
        "id": b["id"], "ini": round(ini, 3), "fin": round(fin, 3), "voz_ini": round(v_ini, 3), "voz_fin": round(v_fin, 3),
        "shots": [{"s": tomas[k], "d": round(tomas[k + 1] - tomas[k], 3)} for k in range(len(b["tomas"]))],
        "anc": {k: mapa(t) for k, t in b["anc"].items()},
        "tomas": [{"ini": round(v_ini, 3), "dur": round(dur, 3)}],     # para la música (bajada bajo la voz)
    })
    cursor = v_fin + GAP
total = round(escenas[-1]["voz_fin"] + TAIL, 3)

pista = np.zeros(int(total * sr), dtype="float32")
for t, corte in partes:
    a = int(max(0, t) * sr)
    pista[a:a + len(corte)] += corte[: len(pista) - a]
salida.mkdir(parents=True, exist_ok=True)
crudo = salida / "_voz_cruda.wav"
sf.write(crudo, pista, sr)
# Voz: filtro de graves, compresión suave y limitador (sonido de locución de cine, sin colorear el timbre)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(crudo), "-af",
                "highpass=f=70,acompressor=threshold=-22dB:ratio=3:attack=8:release=140:makeup=3,alimiter=limit=0.89",
                "-ar", "24000", "-ac", "1", str(salida / "voz-nyla.wav")], check=True)
crudo.unlink()
tiempos.write_text(json.dumps({"total": total, "bpm": 100, "escenas": escenas}, ensure_ascii=False, indent=2), encoding="utf-8")
print("total", total, "s")
for e in escenas:
    print(f'{e["id"]:9s} escena {e["ini"]:6.2f} → {e["fin"]:6.2f}  voz {e["voz_ini"]:6.2f} → {e["voz_fin"]:6.2f}')
