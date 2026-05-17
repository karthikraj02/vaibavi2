const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

// @desc    Chat with AI Assistant
// @route   POST /api/ai/chat
// @access  Public
const chatWithAI = async (req, res) => {
  const { message } = req.body;
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(200).json({ reply: "AI Assistant is currently in demo mode. Please configure the OpenAI API key to get real flight recommendations." });
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are an expert AI travel assistant for FlightAgent. Help users find flights, understand refund policies, and navigate the booking process." },
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    res.json({ reply: response.choices[0].message.content });
  } catch (error) {
    console.error('AI Chat Error:', error);
    res.status(500).json({ message: 'Failed to communicate with AI Assistant' });
  }
};

module.exports = { chatWithAI };