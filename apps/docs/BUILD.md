# Building the Docs

The docs site uses Docusaurus 3. Build and serve locally:

```bash
cd apps/docs
npm install
npm run build    # static site → build/
npm run start    # dev server with hot reload
```

Output goes to `build/` directory. Deployed via Vercel (see `vercel.json`).
