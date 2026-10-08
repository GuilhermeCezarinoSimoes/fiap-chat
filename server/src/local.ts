import app from './app.js';

// Execução local (desenvolvimento). Na Vercel, src/app.ts é usado diretamente.
const port = Number(process.env.PORT ?? 3333);

app.listen(port, () => {
  console.log(`FIAP Chat API ouvindo em http://localhost:${port}`);
});
