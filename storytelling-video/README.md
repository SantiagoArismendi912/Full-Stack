# Jornexa · Centro de Mando — storytelling (HyperFrames)

Video de ~85 s (1920×1080, 30 fps) que cuenta qué es la plataforma: **Datos → Contexto → Decisión → Acción**.
Usa capturas reales del demo (`../centro-mando`), voz femenina en español neutro y música electrónica original.

## Qué hay aquí
- `index.html` y `compositions/` — la composición (una escena por archivo). **Se generan** con `tools/ensamblar.py`.
- `tools/plantillas/` — el código fuente de cada escena (HTML + GSAP).
- `tools/construir_audio.py` — genera la voz (Kokoro `ef_dora`) y la música; escribe `tools/tiempos.json`.
- `assets/` — capturas del demo, logos, fuente Quicksand, voz, música y efectos.

## Audio y derechos
- **Voz:** Kokoro-82M (licencia Apache-2.0), voz femenina `ef_dora`, español.
- **Música:** composición propia sintetizada en `construir_audio.py` (sin muestras ni terceros): no tiene derechos de autor ajenos.
- **Efectos:** 3 efectos incluidos con HyperFrames (Pixabay Content License, uso comercial sin atribución; ver `assets/audio/sfx/CREDITS.md`).

## Reproducir
```bash
python3 -m venv venv && ./venv/bin/pip install kokoro-onnx soundfile numpy scipy
# modelos: kokoro-v1.0.onnx y voices-v1.0.bin de https://github.com/thewh1teagle/kokoro-onnx/releases
./venv/bin/python tools/construir_audio.py <carpeta-modelos> assets/audio tools/tiempos.json
python3 tools/ensamblar.py
npx hyperframes check .
npx hyperframes render . -o out/jornexa-storytelling.mp4
```
Para cambiar el texto de la narración, edita `GUION` en `construir_audio.py` y repite los pasos: los tiempos de cada imagen se recalculan solos.
