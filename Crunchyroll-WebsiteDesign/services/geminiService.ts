import { GoogleGenAI } from "@google/genai";
import { AnimeDetails } from "../types";

// Initialize the client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAnimeTrivia = async (animeTitle: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Tell me a fun, obscure fact about the anime "${animeTitle}" in one short sentence. Do not use markdown.`,
    });
    return response.text || "Could not generate trivia.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Trivia currently unavailable.";
  }
};

export const chatWithAnimeCompanion = async (
  history: { role: string; parts: { text: string }[] }[],
  message: string,
  context: AnimeDetails
): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: history,
      config: {
        systemInstruction: `You are a helpful anime companion expert on the show "${context.title}". 
        Answer questions about the plot, characters, and lore briefly and enthusiastically. 
        Keep spoilers to a minimum unless asked. 
        The current context is: ${context.description}.`,
      },
    });

    const result = await chat.sendMessage({ message });
    return result.text || "I couldn't understand that.";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "I'm having trouble connecting to the anime database right now.";
  }
};
