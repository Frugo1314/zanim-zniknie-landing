# Zanim Zniknie — Landing Page

## Podgląd lokalny
```bash
python -m http.server 8080
```
Otwórz: http://localhost:8080

## Struktura
- index.html — główny plik
- css/style.css — style główne
- css/animations.css — animacje keyframe
- js/main.js — interaktywność

## Paleta kolorów
- Tło: #0a0a0a
- Akcent cyan: #00ffe5
- Akcent magenta: #ff006e
- Tekst: #f0f0f0

## Decyzje projektowe
- Pozycjonowanie oparte o early adopter advantage, nie agresywne „ostatnie sztuki”.
- Radar, siatka i neonowe akcenty wzmacniają motyw predykcji AI oraz cyber-curation.
- Mobile-first z osobnym sticky CTA na małych ekranach i pełnoekranowym menu.
- Interakcje napisane w vanilla JS: countdown do poniedziałku 18:00, carousel, FAQ, counter, koszyk i exit intent.
- Produkty eksponują trend score oraz czas wykrycia, żeby uzasadnić selekcję algorytmiczną.

## TODO
- Podłączyć backend (zamówienia, email newsletter)
- Dodać Google Analytics / Meta Pixel
- Podłączyć płatności Stripe
- Wdrożyć na Vercel/Netlify
