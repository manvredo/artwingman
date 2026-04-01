# ArtWingman

Color analysis tool for painters. Hue, Value, Chroma — Munsell system.

## Features (v0.1)
- Load any reference photo
- Click any pixel to analyze its color
- Munsell HVC readout (Hue, Value, Chroma)
- Adjustable sample radius (1–20px averaging)

## Stack
- Next.js 14
- React
- Canvas API
- CSS Modules

## Run locally
```bash
npm install
npm run dev
```

## Roadmap
- Value grouping mode (posterize into 3–7 tonal steps)
- Hue wheel visualization
- Oil paint matching (Gamblin, Rembrandt, W&N)
- PWA / offline support
- Pro version with Stripe paywall