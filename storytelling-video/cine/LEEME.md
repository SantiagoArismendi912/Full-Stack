# Jornexa · Centro de Mando — versión cinematográfica (vertical 9:16)

Video de ~90 s (1080×1920, 30 fps) para LinkedIn, TikTok, Facebook e Instagram, con la **voz real de Nyla** (Google Vids),
música original y efectos. Los silencios largos del audio original (2–7 s entre bloques) se comprimieron: de 1:53 a 1:30.

## Estilo
- **Apertura en frío** sobre fondo oscuro con latido grave; el caos de notas, mensajes y planillas termina en "Nadie ve todo."
- **Seis transiciones distintas**, una por cambio de escena: blanco total → logotipo; zoom a través del logotipo; barrido rápido;
  iris que se abre desde el botón del copiloto; corte con destello justo después del clic; fundido a negro antes del cierre.
- **Cámara en movimiento** (empuje lento) sobre capturas reales del demo, llamadas sobre cada dato y rótulos sincronizados con la voz.
- **Cine:** viñeta y grano de película sobre todo el video; música con impactos y subidas en cada transición y un golpe final en "Solicita tu demo".

## Regenerarlo
```bash
# 1) voz: edita Nyla y calcula tiempos (usa referencia/voz-nyla-original.mp3 convertido a wav)
python tools/construir_cine.py voz-original.wav cine/assets/audio tools/tiempos_cine.json
# 2) música a la medida (tarda unos minutos)
python tools/construir_audio.py - <carpeta-temporal> x.json --solo-musica tools/tiempos_cine.json   # → copiar musica.mp3 a cine/assets/audio/musica-cine.mp3
# 3) ensamblar, validar, renderizar y normalizar volumen
python tools/ensamblar_cine.py && npx hyperframes check cine && npx hyperframes render cine -q high -o cine/out/crudo.mp4
ffmpeg -i cine/out/crudo.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k cine/out/jornexa-cine-vertical.mp4
```
Para otra voz con los mismos bloques, cambia los tiempos de `tools/anclas_nyla.json` (tiempos del audio original por bloque).

## Nota sobre la pronunciación
Nyla pronuncia el nombre de la marca como "Yornexa/Giornexa" (no "Jornexa"). Si quieres corregirlo, en Vids prueba escribir "Hornexa"
o "Jornéxa" en las tres frases donde aparece (escena 2, 4 y cierre) y pásame el audio nuevo: solo hay que reemplazar esos bloques.
