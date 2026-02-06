# Petorka Math 🎮

Dječja edukativna igra (React + Vite + TypeScript), spremna za Netlify.

## Lokalno

```bash
npm install
npm run dev
```

## Build (Netlify)

Netlify build command:
- `npm run build`

Publish directory:
- `dist`

## GitHub Pages

1. Ensure the repository Settings → Pages is set to **GitHub Actions**.
2. Push to `main` to trigger the workflow; it builds and deploys `dist` automatically.
3. The app will be served from `https://<username>.github.io/petorka-math/`.

## Pravila igre

- 10 vrata: 5 matematika, 5 jezik (b/d)
- Točno: +10, netočno: -10 (score može u minus)
- Jezero: Game Over
- Vuk: lovi ako si blizu, kontakt = Game Over
- Mobile: on-screen D-pad, držanje = kontinuirano kretanje
