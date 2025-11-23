// server.js
import express from 'express';
import fetch from 'node-fetch'; // se usar Node 18+, pode usar fetch global sem instalar
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// validação mínima
if (!process.env.GEMINI_API_KEY) {
  console.error('ERRO: variavel GEMINI_API_KEY não definida. Coloque sua chave em .env (NÃO no frontend).');
  // não encerra o processo para facilitar testes locais; mas avise
}

app.use(express.json());
app.use(express.static(path.resolve('public')));

// endpoint de proxy -> chama a Gemini 2.5 flash (REST)
app.post('/api/chat', async (req, res) => {
  try {
    const userMessage = (req.body && req.body.message) ? String(req.body.message) : '';
    if (!userMessage) return res.status(400).json({ error: 'Mensagem vazia' });

    // Constrói o payload conforme a doc (generateContent REST).
    const payload = {
      contents: [
        { parts: [{ text: userMessage }] }
      ],
      // se quiser opções adicionais (ex: temperatura, max tokens), adicione aqui conforme a doc
      // exemplo (opcional):
      // temperature: 0.7
    };

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    const apiKey = process.env.GEMINI_API_KEY;

    const r = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // chave enviada via header x-goog-api-key conforme exemplos REST oficiais
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload),
    });

    if (!r.ok) {
      const text = await r.text();
      console.error('Erro da Gemini:', r.status, text);
      return res.status(502).json({ error: 'Erro do provedor', status: r.status, detail: text });
    }

    const j = await r.json();
    // o caminho para o texto na resposta: candidates[0].content.parts[0].text
    const reply = (j?.candidates?.[0]?.content?.parts?.[0]?.text) || (j?.candidates?.[0]?.content?.parts?.map(p=>p.text).join('\n')) || JSON.stringify(j);

    return res.json({ reply });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'erro interno', detail: String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT} — frontend em /public (não exponha a GEMINI_API_KEY no cliente).`);
});