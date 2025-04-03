const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/analyze-fracture', upload.single('image'), async (req, res) => {
  try {
    const filePath = path.join(__dirname, req.file.path);
    const classification = JSON.parse(req.body.classification);

    const topClass = classification.reduce((prev, curr) =>
      curr.probability > prev.probability ? curr : prev
    );

    const prompt = `
You are a metal fracture expert. The image is a black background with white edges representing texture.

The image is classified as: ${topClass.label} (${Math.round(topClass.probability * 100)}%)

Give a concise and educational explanation of why this pattern matches that fracture type.
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo", // ✅ use this updated model
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${fs.readFileSync(filePath, { encoding: 'base64' })}`
              }
            }
          ]
        }
      ],
      max_tokens: 500,
    });

    const analysis = response.choices[0]?.message?.content || "No analysis returned.";
    fs.unlinkSync(filePath);
    res.json({ analysis });

  } catch (error) {
    console.error("❌ OpenAI analysis error:", error.message);
    res.status(500).json({ error: 'OpenAI request failed' });
  }
});

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
