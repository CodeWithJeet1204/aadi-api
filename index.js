// index.js
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const upload = multer();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.post('/generate', upload.single('image'), async (req, res) => {
  const prompt = req.body.prompt;
  const style = req.body.style;
  const imageBuffer = req.file ? req.file.buffer.toString('base64') : null;

  const parts = [];

  parts.push({
    text: `Generate an image in ${style} style based on this prompt: ${prompt}`
  });

  if (imageBuffer) {
    parts.push({
      inline_data: {
        mime_type: req.file.mimetype,
        data: imageBuffer
      }
    });
  }

  const requestBody = {
    model: "gemini-2.0-flash-exp-image-generation",
    contents: [{
      role: "user",
      parts: parts
    }],
    generation_config: {
      response_modality: ["TEXT", "IMAGE"]
    }
  };

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody)
      }
    );

    const result = await response.json();

    const imagePart = result?.candidates?.[0]?.content?.parts?.find(p => p.inline_data?.data);

    if (!imagePart) {
      return res.status(500).json({ error: "Image not found in response", full: result });
    }

    const imageData = imagePart.inline_data.data;
    res.json({ imageUrl: `data:image/png;base64,${imageData}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error during generation.", details: err.message });
  }
});

app.listen(3000, () => console.log("✅ Server running on http://localhost:3000"));
