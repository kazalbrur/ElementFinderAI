const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

module.exports = {
  model: genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }),
  config: {
    temperature: 0.2,
    topK: 1,
    topP: 0.8,
    maxOutputTokens: 1024
  }
};