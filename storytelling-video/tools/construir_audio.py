#!/usr/bin/env python3
"""Genera la voz (Kokoro, voz femenina en español) y la música original del storytelling.

Uso:  python construir_audio.py <carpeta-con-modelos-kokoro> <salida-assets/audio> <tiempos.json>
Modelos: kokoro-v1.0.onnx y voices-v1.0.bin (https://github.com/thewh1teagle/kokoro-onnx/releases).
La música se sintetiza aquí mismo (numpy/scipy): es obra original, sin muestras ni derechos de terceros.
"""
import json, math, subprocess, sys
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from scipy.signal import butter, lfilter

modelos, salida, tiempos_json = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
salida.mkdir(parents=True, exist_ok=True)

# Cada escena: lista de frases. Cada frase es una toma de imagen.
GUION = [
    ("problema", [
        "Cada mañana, una empresa de limpieza y mantenimiento enfrenta lo mismo.",
        "Personal repartido en decenas de sedes, pedidos por mensajes, incidencias en papel.",
        "Y nadie que vea el panorama completo.",
    ]),
    ("jornexa", [
        "Jornexa, gestión conectada, convierte esa operación en un centro de mando vivo.",
        "Datos, contexto, decisión y acción, en un solo lugar.",
    ]),
    ("datos", [
        "Primero, los datos. Amanece, y el personal marca su entrada desde el celular.",
        "La geocerca confirma que cada persona está donde debe estar, y cada jornada aparece en el mapa, en tiempo real.",
    ]),
    ("contexto", [
        "Después, el contexto. Jornexa detecta lo que necesita atención:",
        "una entrada fuera de la geocerca,",
        "una fuga de agua en el centro comercial,",
        "y el desinfectante del colegio por debajo del mínimo.",
    ]),
    ("decision", [
        "Y llega la decisión. El copiloto de inteligencia artificial propone y explica.",
        "¡Y tú tienes la última palabra! Apruebas con un solo clic.",
    ]),
    ("accion", [
        "Entonces, la acción. La camioneta sale con los insumos, y el técnico llega a resolver la incidencia.",
        "Hasta el nuevo cliente, un hotel en construcción, pasa de obra a operación.",
        "Todo queda registrado.",
    ]),
    ("cierre", [
        "Jornexa.",
        "Software que entiende lo que está pasando, propone qué hacer, y deja la decisión a las personas.",
        "¡Qué esperas! ¡Solicita tu demo!",
    ]),
]
SR_VOZ = 24000
GAP_FRASE = 0.30       # silencio entre frases de una escena
ENTRADA_ESCENA = {"jornexa": 0.9, "cierre": 0.9}   # la imagen entra antes de que hable la voz
ENTRADA_DEF = 0.55
SALIDA_ESCENA = 0.7
SOLAPE = 0.45          # fundido cruzado entre escenas
COLA_FINAL = 3.4       # cierre sin voz, la música resuelve

# ---------------- Voz ----------------
k = Kokoro(str(modelos / "kokoro-v1.0.onnx"), str(modelos / "voices-v1.0.bin"))
escenas, cursor = [], 0.6   # 0.6 s de música sola al inicio
for nombre, frases in GUION:
    ini = cursor
    t = ini + ENTRADA_ESCENA.get(nombre, ENTRADA_DEF)
    tomas = []
    for i, texto in enumerate(frases):
        audio, sr = k.create(texto, voice="ef_dora", speed=0.97, lang="es")
        assert sr == SR_VOZ
        audio = audio / max(1e-9, float(np.max(np.abs(audio)))) * 0.85
        archivo = f"voz-{nombre}-{i + 1}.wav"
        sf.write(salida / archivo, audio, sr)
        dur = len(audio) / sr
        tomas.append({"texto": texto, "archivo": f"assets/audio/{archivo}", "ini": round(t, 3), "dur": round(dur, 3)})
        t += dur + GAP_FRASE
    fin = t - GAP_FRASE + (COLA_FINAL if nombre == "cierre" else SALIDA_ESCENA)
    escenas.append({"id": nombre, "ini": round(ini, 3), "fin": round(fin, 3), "tomas": tomas})
    cursor = fin - SOLAPE
total = escenas[-1]["fin"]

# ---------------- Música original ----------------
SR = 44100
N = int(total * SR)
BPM = 112
beat = 60 / BPM
rng = np.random.default_rng(7)  # semilla fija: la pista es siempre la misma


def lp(x, fc, orden=2):
    b, a = butter(orden, fc / (SR / 2), "low")
    return lfilter(b, a, x)


def hp(x, fc, orden=2):
    b, a = butter(orden, fc / (SR / 2), "high")
    return lfilter(b, a, x)


def hz(nota):  # nota MIDI -> Hz
    return 440.0 * 2 ** ((nota - 69) / 12)


def poner(buf, inicio_s, snd, g=1.0, pan=0.0):
    i = int(inicio_s * SR)
    if i >= buf.shape[1]:
        return
    f = min(buf.shape[1], i + len(snd))
    s = snd[: f - i] * g
    buf[0, i:f] += s * (1 - max(0, pan))
    buf[1, i:f] += s * (1 + min(0, pan))


def diente(f, n):
    t = np.arange(n) / SR
    return 2 * ((t * f) % 1.0) - 1


def cuadrada(f, n, ancho=0.5):
    t = np.arange(n) / SR
    return np.where((t * f) % 1.0 < ancho, 1.0, -1.0)


# Progresión Am - F - C - G (un acorde por compás), 4 tiempos por compás
ACORDES = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [55, 60, 64]), (55, [55, 59, 62])]
RAICES = [33, 29, 36, 31]
compas = beat * 4
n_compases = int(total / compas) + 2

capas = {n: np.zeros((2, N)) for n in ("pad", "bajo", "arp", "bombo", "palmas", "hats")}

# Pad: dientes de sierra desafinados, filtro suave
for c in range(n_compases):
    t0 = c * compas
    notas = ACORDES[c % 4][1]
    n = int(compas * 1.05 * SR)
    snd = np.zeros(n)
    for m in notas:
        for desafine in (-0.12, 0.0, 0.12):
            snd += diente(hz(m) * 2 ** (desafine / 12), n)
    snd = lp(snd, 1100) / (len(notas) * 3)
    env = np.minimum(1, np.arange(n) / (0.5 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.4 * SR))
    poner(capas["pad"], t0, snd * env, 0.55)

# Bajo: corcheas con la raíz del acorde
for c in range(n_compases):
    raiz = hz(RAICES[c % 4])
    for j in range(8):
        n = int(beat * 0.5 * SR * 0.9)
        snd = lp(diente(raiz, n) + 0.5 * cuadrada(raiz / 2, n), 380)
        env = np.exp(-np.arange(n) / SR * 7)
        octava = 2 if j in (3, 7) else 1
        if octava == 2:
            snd = lp(diente(raiz * 2, n), 500)
        poner(capas["bajo"], c * compas + j * beat * 0.5, snd * env, 0.7)

# Arpegio en semicorcheas, panoramizado
patron = [0, 1, 2, 1, 2, 1, 0, 2]
for c in range(n_compases):
    notas = [m + 12 for m in ACORDES[c % 4][1]]
    for j in range(16):
        m = notas[patron[j % 8] % 3] + (12 if j % 8 == 7 else 0)
        n = int(beat * 0.25 * SR * 1.6)
        snd = lp(diente(hz(m), n) + 0.6 * cuadrada(hz(m), n, 0.3), 3200)
        env = np.exp(-np.arange(n) / SR * 14)
        poner(capas["arp"], c * compas + j * beat * 0.25, snd * env, 0.30, pan=-0.45 if j % 2 else 0.45)

# Bombo a cuatro tiempos
n = int(0.32 * SR)
tt = np.arange(n) / SR
frec = 50 + 110 * np.exp(-tt * 28)
bombo = np.sin(2 * np.pi * np.cumsum(frec) / SR) * np.exp(-tt * 9)
for c in range(n_compases):
    for j in range(4):
        poner(capas["bombo"], c * compas + j * beat, bombo, 1.0)

# Palmas en 2 y 4, hi-hats a contratiempo
n = int(0.22 * SR)
palma = hp(rng.standard_normal(n), 1200) * np.exp(-np.arange(n) / SR * 22)
palma = lp(palma, 6500)
n2 = int(0.07 * SR)
hat = hp(rng.standard_normal(n2), 7500) * np.exp(-np.arange(n2) / SR * 70)
for c in range(n_compases):
    for j in (1, 3):
        poner(capas["palmas"], c * compas + j * beat, palma, 0.55)
    for j in range(4):   # contratiempos (corcheas)
        poner(capas["hats"], c * compas + (j + 0.5) * beat, hat, 0.30)
    for j in range(1, 16, 2):   # semicorcheas suaves
        poner(capas["hats"], c * compas + j * beat * 0.25, hat, 0.10)


def rampa(ini, fin, v0, v1):
    """Curva de ganancia lineal entre dos instantes; 0 fuera de ella (se combina con np.maximum)."""
    g = np.zeros(N)
    a, b = int(ini * SR), int(fin * SR)
    g[a:b] = np.linspace(v0, v1, b - a)
    return g


def escalon(ini, fin, v=1.0, fade=0.8):
    g = np.zeros(N)
    a, b = int(ini * SR), min(N, int(fin * SR))
    g[a:b] = v
    k = int(fade * SR)
    return np.convolve(g, np.ones(k) / k, mode="same")


E = {e["id"]: e for e in escenas}
t_jornexa, t_datos = E["jornexa"]["ini"], E["datos"]["ini"]
t_decision, t_accion, t_cierre = E["decision"]["ini"], E["accion"]["ini"], E["cierre"]["ini"]

# Estructura por escena: problema = solo pad y arpegio suave y filtrado; Jornexa = entra el pulso;
# datos/contexto = groove; decisión = palmas; acción = todo; cierre = se retira el ritmo y resuelve.
g_pad = np.maximum(escalon(0, total - 0.5, 1.0, 1.5), 0)
g_arp = escalon(1.5, total - COLA_FINAL * 0.6, 0.55, 1.0) + escalon(t_datos, t_cierre, 0.45, 1.0)
g_bajo = escalon(t_jornexa + 1.5, t_cierre + 0.8, 1.0, 0.6)
g_bombo = escalon(t_jornexa + 1.5, t_cierre + 0.3, 1.0, 0.1)
g_hats = escalon(t_datos, t_cierre, 1.0, 0.4)
g_palmas = escalon(t_decision, t_cierre, 1.0, 0.3)

# Subida de ruido justo antes de que entre el pulso
n = int(1.5 * SR)
subida = hp(rng.standard_normal(n), 600) * np.linspace(0, 1, n) ** 3
riser = np.zeros((2, N))
poner(riser, t_jornexa + 0.0, subida, 0.35)

mezcla = (capas["pad"] * g_pad * 0.9 + capas["arp"] * np.clip(g_arp, 0, 1) + capas["bajo"] * g_bajo * 0.9
          + capas["bombo"] * g_bombo * 0.95 + capas["hats"] * g_hats + capas["palmas"] * g_palmas * 0.8 + riser)

# Compresión por el bombo (sidechain simple sobre pad, arpegio y bajo)
env_bombo = np.zeros(N)
for c in range(n_compases):
    for j in range(4):
        a = int((c * compas + j * beat) * SR)
        if a >= N:
            break
        m = min(N, a + int(0.3 * SR))
        env_bombo[a:m] = np.maximum(env_bombo[a:m], np.exp(-np.arange(m - a) / SR * 9))
duck_kick = 1 - 0.55 * env_bombo * (g_bombo > 0.5)
base = (capas["pad"] * g_pad * 0.9 + capas["arp"] * np.clip(g_arp, 0, 1) + capas["bajo"] * g_bajo * 0.9) * duck_kick
mezcla = base + capas["bombo"] * g_bombo * 0.95 + capas["hats"] * g_hats + capas["palmas"] * g_palmas * 0.8 + riser

# Bajar la música mientras habla la voz (con subida y bajada suaves)
voz = np.zeros(N)
for e in escenas:
    for t in e["tomas"]:
        voz[int((t["ini"] - 0.12) * SR): int((t["ini"] + t["dur"] + 0.25) * SR)] = 1.0
suave = np.convolve(voz, np.ones(int(0.35 * SR)) / int(0.35 * SR), mode="same")
mezcla *= (1 - 0.80 * suave)

# Cierre: la música sube un poco al terminar la voz y se apaga en 2,2 s
ultimo = escenas[-1]["tomas"][-1]
fin_voz = ultimo["ini"] + ultimo["dur"]
mezcla *= 1 + 0.9 * escalon(fin_voz + 0.2, total - 1.6, 1.0, 0.6)
mezcla *= np.clip((total - np.arange(N) / SR) / 2.2, 0, 1)
mezcla *= np.minimum(1, np.arange(N) / (0.8 * SR))

mezcla = np.tanh(mezcla * 1.3)
mezcla /= max(1e-9, float(np.max(np.abs(mezcla))))
mezcla *= 0.89
sf.write(salida / "musica.wav", mezcla.T.astype(np.float32), SR)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(salida / "musica.wav"), "-codec:a", "libmp3lame", "-b:a", "192k", str(salida / "musica.mp3")], check=True)
(salida / "musica.wav").unlink()

tiempos_json.write_text(json.dumps({"total": round(total, 3), "bpm": BPM, "escenas": escenas}, ensure_ascii=False, indent=2), encoding="utf-8")
print("total", round(total, 2), "s")
for e in escenas:
    print(e["id"], e["ini"], "→", e["fin"], [t["dur"] for t in e["tomas"]])
