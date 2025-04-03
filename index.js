// index.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const upload = multer();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/generate', upload.single('image'), async (req, res) => {
  const prompt = req.body.prompt;
  const style = req.body.style;
  const imageBuffer = req.file ? req.file.buffer.toString('base64') : null;

  const content = [
    { text: `Generate an image in ${style} style based on this prompt: ${prompt}` },
  ];

  if (imageBuffer) {
    content.push({
      inlineData: {
        mimeType: req.file.mimetype,
        data: imageBuffer
      }
    });
  }

  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemini-2.0-flash-exp-image-generation',
          contents: content,
          config: {
            responseModalities: ['Text', 'Image']
          }
        })
      }
    );

    const result = await response.json();
    const parts = result?.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find(part => part.inlineData?.data);

    if (!imagePart) {
      return res.status(500).json({ error: 'Image not found in response', full: result });
    }

    res.json({ imageUrl: `data:image/png;base64,${imagePart.inlineData.data}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error during generation.', details: err.message });
  }
});

app.listen(3000, () => console.log('✅ Server running on http://localhost:3000'));
