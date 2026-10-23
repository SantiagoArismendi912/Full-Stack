#!/usr/bin/env python3
"""Genera las 19 frases del storytelling con VoiceStudio (API local) usando una voz clonada.

Requisitos: VoiceStudio abierto en tu PC (backend en http://127.0.0.1:3900). Solo usa la librería estándar.

  # opción A: clonar al vuelo con la muestra del repo
  python generar_con_voicestudio.py voces --muestra ../referencia/referencia-nyla.wav --texto-muestra ../referencia/referencia-nyla.txt
  # opción B: usar una voz ya guardada en VoiceStudio (perfil)
  python generar_con_voicestudio.py voces --perfil <id-del-perfil>

Las frases salen como voces/voz-<escena>-<n>.wav, listas para:
  python construir_audio.py - ../assets/audio tiempos.json --voces voces
"""
import argparse, json, os, re, sys, urllib.request, uuid
from pathlib import Path

aqui = Path(__file__).resolve().parent
fuente = (aqui / "construir_audio.py").read_text(encoding="utf-8")
ns = {}
exec(fuente[fuente.index("GUION = ["):fuente.index("SR_VOZ")], ns)   # el guion vive en un solo lugar
# Un poco más de ritmo y energía hacia el final (la voz clonada hereda la entrega de la muestra)
VELOCIDAD = {"problema": 1.0, "jornexa": 1.02, "datos": 1.02, "contexto": 1.04, "decision": 1.05, "accion": 1.06, "cierre": 1.08}


def multipart(campos, archivos):
    frontera = uuid.uuid4().hex
    partes = []
    for k, v in campos.items():
        partes.append(f'--{frontera}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    for k, (nombre, contenido, tipo) in archivos.items():
        partes.append(f'--{frontera}\r\nContent-Disposition: form-data; name="{k}"; filename="{nombre}"\r\nContent-Type: {tipo}\r\n\r\n'.encode() + contenido + b"\r\n")
    partes.append(f"--{frontera}--\r\n".encode())
    return b"".join(partes), f"multipart/form-data; boundary={frontera}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("salida", type=Path)
    ap.add_argument("--url", default=os.environ.get("VOICESTUDIO_URL", "http://127.0.0.1:3900"))
    ap.add_argument("--muestra", type=Path)
    ap.add_argument("--texto-muestra", type=Path)
    ap.add_argument("--perfil")
    ap.add_argument("--semilla", type=int, default=7, help="misma semilla = mismo timbre en todas las frases")
    a = ap.parse_args()
    if not a.muestra and not a.perfil:
        sys.exit("Indica --muestra o --perfil")
    a.salida.mkdir(parents=True, exist_ok=True)
    muestra = a.muestra.read_bytes() if a.muestra else None
    texto_muestra = a.texto_muestra.read_text(encoding="utf-8").strip() if a.texto_muestra else None
    cabeceras = {"Authorization": f"Bearer {os.environ['OMNIVOICE_API_KEY']}"} if os.environ.get("OMNIVOICE_API_KEY") else {}
    for escena, frases in ns["GUION"]:
        for i, texto in enumerate(frases, 1):
            campos = {"text": texto, "language": "es", "speed": str(VELOCIDAD[escena]), "seed": str(a.semilla)}
            archivos = {}
            if a.perfil:
                campos["profile_id"] = a.perfil
            else:
                archivos["ref_audio"] = (a.muestra.name, muestra, "audio/wav")
                if texto_muestra:
                    campos["ref_text"] = texto_muestra
            cuerpo, tipo = multipart(campos, archivos)
            req = urllib.request.Request(a.url + "/generate", data=cuerpo, headers={"Content-Type": tipo, **cabeceras})
            with urllib.request.urlopen(req, timeout=600) as r:
                audio = r.read()
            destino = a.salida / f"voz-{escena}-{i}.wav"
            destino.write_bytes(audio)
            print("ok", destino.name, f"{len(audio) // 1024} KB", "-", texto[:50])


main()
