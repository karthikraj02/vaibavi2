const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');
const { openAiTools, geminiTools } = require('../utils/aiTools');

const { getUserContext } = require('./userController');
const { searchLocations } = require('./locationController');
const { searchFlights, trackFlight } = require('./flightController');
const { createBooking, cancelBooking, getBooking, lockSeats } = require('./bookingController');
// const { processPayment, getPaymentStatus } = require('./paymentController');
const { getPaymentStatus } = require('./paymentController');

const Chat = require('../models/Chat');

const openai = new OpenAI();

// ✅ NEW: Multi-key Gemini setup (NO logic change)
const geminiKeys = [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6
].filter(Boolean);

let currentKeyIndex = 0;

async function generateGeminiContentWithRetry(geminiHistory) {
    if (geminiKeys.length === 0) {
        throw new Error("No Gemini API keys configured");
    }

    let attempts = 0;
    let lastError = null;

    while (attempts < geminiKeys.length) {
        try {
            const key = geminiKeys[currentKeyIndex];
            const ai = new GoogleGenAI({ apiKey: key });

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: geminiHistory,
                config: {
                    systemInstruction: SYSTEM_PROMPT,
                    tools: geminiTools
                }
            });

            // Rotate after successful use (round-robin)
            currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
            return response;
        } catch (error) {
            console.error(`[Gemini API Error] Key index ${currentKeyIndex} failed:`, error.message || error);
            lastError = error;

            // Rotate on failure and prepare to retry
            currentKeyIndex = (currentKeyIndex + 1) % geminiKeys.length;
            attempts++;

            if (attempts >= geminiKeys.length) {
                console.error("[Gemini API] All available keys failed.");
                throw lastError;
            }
            console.log(`[Gemini API] Retrying with next key (index: ${currentKeyIndex})...`);
        }
    }
}

const SYSTEM_PROMPT = `
You are an expert, helpful AI Flight Booking Agent. 
Your primary goal is to help users find flights, manage their profiles, and create bookings seamlessly.

Guidelines:
1. ALWAYS use the provided tools to fetch real data or perform actions. DO NOT invent flights or bookings.
2. If the user asks for "any flights" or "all flights" without specifying a location, you MUST call 'searchFlights' with NO arguments to fetch the complete list.
3. If the user doesn't provide exact airport codes (e.g. they say "New York" instead of JFK), ALWAYS use the 'searchLocations' tool first to find the correct 3-letter IATA code before calling 'searchFlights'.
4. If the user asks what cities or airports are supported, call 'searchLocations' with no query argument to see the full list of options.
5. If the user provides an email (e.g., to log in or check their account), ALWAYS use the 'getUserContext' tool to fetch their preferences and past bookings.
6. When booking, if you are missing REQUIRED passenger details (passport number, dob, phone, etc.), ask the user for them.
7. BEFORE asking for payment or calling createBooking, you MUST call 'lockSeats' with the chosen flightId, cabinClass, and passenger count to ensure the seats don't sell out. Save the returned \`lockId\`.
8. Once a booking is created, proudly present the PNR to the user.
9. If a tool (like 'createBooking') returns a URL, ALWAYS present it as a clickable Markdown link: [Click here to Pay](URL). Ensure it opens in a new tab.
10. Be conversational, polite, and concise. Format output cleanly.
`;

async function executeControllerFunction(controllerFunc, reqBody, reqQuery, reqParams, reqHeaders) {
    return new Promise(async (resolve) => {
        const req = {
            body: reqBody || {},
            query: reqQuery || {},
            params: reqParams || {},
            headers: reqHeaders || {}
        };
        const res = {
            status: function () {
                return this;
            },
            json: function (data) {
                resolve(data);
            }
        };

        try {
            await controllerFunc(req, res);
        } catch (err) {
            resolve({ success: false, message: "Sync Error executing tool", error: err.message });
        }
    });
}

exports.handleChat = async (req, res) => {
    try {
        const { messages, aiModel, chatId } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ success: false, message: "An array of messages is required." });
        }

        let currentChatId = chatId;
        const validMessages = messages.filter(msg => msg.content && String(msg.content).trim() !== "");

        // ✅ Ensure chatId exists if we're about to process a message
        if (!currentChatId && validMessages.length > 0) {
            const titleStr = validMessages[0]?.content || "New Chat";
            const title = titleStr.substring(0, 40) + (titleStr.length > 40 ? "..." : "");
            const newChat = await Chat.create({ title, messages: validMessages });
            currentChatId = newChat._id;
        }

        const useGemini = aiModel === 'gemini';

        if (useGemini) {
            const geminiHistory = validMessages.map(msg => ({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: String(msg.content) }]
            }));

            // Robust rotation with automatic retry
            let response = await generateGeminiContentWithRetry(geminiHistory);

            while (response.functionCalls && response.functionCalls.length > 0) {
                const modelMessageParts = response.candidates[0].content.parts;

                geminiHistory.push({
                    role: 'model',
                    parts: modelMessageParts
                });

                const functionResponses = [];

                for (const functionCall of response.functionCalls) {
                    const functionName = functionCall.name;
                    const functionArgs = functionCall.args;
                    let functionResult;
                    console.log(`[Gemini Orchestrator] Executing Tool: ${functionName}`);

                    switch (functionName) {
                        case 'getUserContext':
                            functionResult = await executeControllerFunction(getUserContext, null, null, { email: functionArgs.email }, req.headers);
                            break;
                        case 'searchLocations':
                            functionResult = await executeControllerFunction(searchLocations, null, { query: functionArgs.query }, null, req.headers);
                            break;
                        case 'searchFlights':
                            functionResult = await executeControllerFunction(searchFlights, null, functionArgs, null, req.headers);
                            break;
                        case 'trackFlight':
                            functionResult = await executeControllerFunction(trackFlight, null, null, { flightNumber: functionArgs.flightNumber }, req.headers);
                            break;
                        case 'lockSeats':
                            functionResult = await executeControllerFunction(lockSeats, functionArgs, null, null, req.headers);
                            break;
                        case 'createBooking':
                            functionResult = await executeControllerFunction(createBooking, { ...functionArgs, chatId: currentChatId }, null, null, req.headers);
                            break;
                        case 'cancelBooking':
                            functionResult = await executeControllerFunction(cancelBooking, functionArgs, null, null, req.headers);
                            break;
                        case 'getBooking':
                            functionResult = await executeControllerFunction(getBooking, null, null, { pnr: functionArgs.pnr }, req.headers);
                            break;
                        /*
                        case 'processPayment':
                            functionResult = await executeControllerFunction(processPayment, functionArgs, null, null, req.headers);
                            break;
                        */
                        case 'getPaymentStatus':
                            functionResult = await executeControllerFunction(getPaymentStatus, null, null, { transactionId: functionArgs.transactionId }, req.headers);
                            break;
                        default:
                            functionResult = { success: false, message: `Unknown function: ${functionName}` };
                    }

                    functionResponses.push({
                        functionResponse: {
                            name: functionName,
                            response: functionResult
                        }
                    });
                }

                geminiHistory.push({
                    role: 'user',
                    parts: functionResponses
                });

                // Continue executing tools iteratively with robust rotation
                response = await generateGeminiContentWithRetry(geminiHistory);
            }

            const newAssistantMsg = { role: 'assistant', content: response.text };

            await Chat.findByIdAndUpdate(currentChatId, { $push: { messages: newAssistantMsg } });

            return res.status(200).json({
                success: true,
                message: newAssistantMsg,
                chatId: currentChatId
            });

        } else {
            const conversation = [
                { role: "system", content: SYSTEM_PROMPT },
                ...validMessages
            ];

            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: conversation,
                tools: openAiTools,
                tool_choice: "auto"
            });

            let responseMessage = response.choices[0].message;

            if (responseMessage.tool_calls) {
                conversation.push(responseMessage);

                for (const toolCall of responseMessage.tool_calls) {
                    const functionName = toolCall.function.name;
                    const functionArgs = JSON.parse(toolCall.function.arguments || "{}");

                    let functionResult;
                    console.log(`[OpenAI Orchestrator] Executing Tool: ${functionName}`);

                    switch (functionName) {
                        case 'getUserContext':
                            functionResult = await executeControllerFunction(getUserContext, null, null, { email: functionArgs.email }, req.headers);
                            break;
                        case 'searchLocations':
                            functionResult = await executeControllerFunction(searchLocations, null, { query: functionArgs.query }, null, req.headers);
                            break;
                        case 'searchFlights':
                            functionResult = await executeControllerFunction(searchFlights, null, functionArgs, null, req.headers);
                            break;
                        case 'trackFlight':
                            functionResult = await executeControllerFunction(trackFlight, null, null, { flightNumber: functionArgs.flightNumber }, req.headers);
                            break;
                        case 'createBooking':
                            functionResult = await executeControllerFunction(createBooking, { ...functionArgs, chatId: currentChatId }, null, null, req.headers);
                            break;
                        case 'cancelBooking':
                            functionResult = await executeControllerFunction(cancelBooking, functionArgs, null, null, req.headers);
                            break;
                        case 'getBooking':
                            functionResult = await executeControllerFunction(getBooking, null, null, { pnr: functionArgs.pnr }, req.headers);
                            break;
                        /*
                        case 'processPayment':
                            functionResult = await executeControllerFunction(processPayment, functionArgs, null, null, req.headers);
                            break;
                        */
                        case 'getPaymentStatus':
                            functionResult = await executeControllerFunction(getPaymentStatus, null, null, { transactionId: functionArgs.transactionId }, req.headers);
                            break;
                        default:
                            functionResult = { success: false, message: `Unknown function: ${functionName}` };
                    }

                    conversation.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(functionResult)
                    });
                }

                const finalResponse = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: conversation
                });

                let finalContent = finalResponse.choices[0].message.content;

                const newAssistantMsg = { role: 'assistant', content: finalContent };

                await Chat.findByIdAndUpdate(currentChatId, { $push: { messages: newAssistantMsg } });

                return res.status(200).json({
                    success: true,
                    message: finalResponse.choices[0].message,
                    chatId: currentChatId
                });

            } else {
                const newAssistantMsg = { role: 'assistant', content: responseMessage.content };

                await Chat.findByIdAndUpdate(currentChatId, { $push: { messages: newAssistantMsg } });

                return res.status(200).json({
                    success: true,
                    message: responseMessage,
                    chatId: currentChatId
                });
            }
        }

    } catch (error) {
        console.error("[Chat API Error]:", error);

        const errorMessage = error.message || String(error);
        const isQuota = errorMessage.includes("429") || errorMessage.includes("Quota") || errorMessage.includes("503");

        // Send a 200 response with a graceful assistant message so the UI doesn't crash from 5xx errors
        return res.status(200).json({
            success: true,
            message: {
                role: "assistant",
                content: isQuota
                    ? "⚠️ **API Quota Exceeded**: My AI backend keys have exhausted their free-tier requests per minute. Please give me about 60 seconds to cool down and try your request again!"
                    : "⚠️ **System Overload**: I encountered an internal error trying to process your request. Please try again."
            }
        });
    }
};

// CRUD Operations for Chats (restored)
exports.getChats = async (req, res) => {
    try {
        const chats = await Chat.find().sort({ updatedAt: -1 });
        res.json({ success: true, chats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getChat = async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });
        res.json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.renameChat = async (req, res) => {
    try {
        const { title } = req.body;
        const chat = await Chat.findByIdAndUpdate(req.params.id, { title }, { new: true });
        res.json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.deleteChat = async (req, res) => {
    try {
        await Chat.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};