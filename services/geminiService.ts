
import { GoogleGenAI, Type } from "@google/genai";
import { Job, Candidate } from "../types";

// Initialize GoogleGenAI with API_KEY obtained directly from process.env.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAIRecommendation = async (
  target: Job | Candidate,
  role: 'SEEKER' | 'RECRUITER'
) => {
  try {
    const prompt = role === 'SEEKER' 
      ? `Analyze this job posting: ${JSON.stringify(target)}. Provide a brief 1-sentence "Why it matches" based on a generic senior software engineer profile.`
      : `Analyze this candidate: ${JSON.stringify(target)}. Provide a brief 1-sentence "Why they are a good fit" for a technical startup.`;

    // Create a new instance right before making an API call as per best practices.
    const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        // Removed maxOutputTokens to avoid reaching limit without thinkingBudget.
        temperature: 0.7,
      },
    });

    // Access the .text property directly from the response object.
    return response.text || "Top recommendation based on your profile.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI insights currently unavailable.";
  }
};

export const parseResume = async (base64Resume: string) => {
  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await genAI.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { 
        parts: [
          { text: "Extract Name, Title, and top 3 Skills from this resume text/data." },
          { inlineData: { mimeType: "application/pdf", data: base64Resume } }
        ] 
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            title: { type: Type.STRING },
            skills: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          // Using propertyOrdering instead of required as per @google/genai guidelines.
          propertyOrdering: ["name", "title", "skills"]
        }
      }
    });
    // Access the .text property directly.
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Parse Resume Error:", error);
    return null;
  }
};
