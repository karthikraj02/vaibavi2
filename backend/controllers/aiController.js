const { GoogleGenAI } = require('@google/genai');
const Flight = require('../models/Flight');

// Collect all configured Gemini keys
const geminiKeys = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
  process.env.GEMINI_API_KEY_5,
  process.env.GEMINI_API_KEY_6,
].filter(Boolean);

let keyIndex = 0;

// @desc    Simple AI chat (used by the floating AIChat widget)
// @route   POST /api/ai/chat
// @access  Public
const chatWithAI = async (req, res) => {
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Message is required.' });
  }

  if (geminiKeys.length === 0) {
    return res.status(200).json({
      reply:
        'AI Assistant is currently in demo mode. Please configure at least one GEMINI_API_KEY in your .env to get real responses.',
    });
  }

  // Fetch available flights to give AI real-time context
  let flightContext = "Here is the real-time data from our database about available flights and prices:\n";
  try {
    const flights = await Flight.find({ status: { $ne: 'cancelled' } }).limit(30);
    if (flights.length > 0) {
      flights.forEach(f => {
        const dep = new Date(f.departureTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        flightContext += `- ${f.airline} (Flight ${f.flightNumber}): ${f.departureAirport} -> ${f.arrivalAirport}. Departure: ${dep}. Price: $${f.price}.\n`;
      });
    } else {
      flightContext += "No flights are currently available in the database.\n";
    }
  } catch (error) {
    flightContext += "Flight data is temporarily unavailable.\n";
  }

  let lastError = null;

  for (let attempt = 0; attempt < geminiKeys.length; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKeys[keyIndex] });

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: message }] }],
        config: {
          systemInstruction:
            'You are a helpful AI travel assistant for FlightAgent. ' +
            'Help users find flights, understand refund policies, manage bookings, ' +
            'and navigate the platform. Be concise, friendly, and professional.\n\n' +
            flightContext,
        },
      });

      // Round-robin rotate key after success
      keyIndex = (keyIndex + 1) % geminiKeys.length;

      return res.status(200).json({ reply: response.text });
    } catch (error) {
      console.error(`[AI Chat] Gemini key[${keyIndex}] failed:`, error.message);
      lastError = error;
      keyIndex = (keyIndex + 1) % geminiKeys.length;
    }
  }

  console.error('[AI Chat] All Gemini keys failed:', lastError?.message);
  return res.status(500).json({ message: 'Failed to communicate with AI Assistant. Please try again.' });
};

module.exports = { chatWithAI };
