
import { GoogleGenAI, Type } from "@google/genai";
import { Job, Candidate } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getAIRecommendation = async (
  target: Job | Candidate,
  role: 'SEEKER' | 'RECRUITER'
) => {
  try {
    const prompt = role === 'SEEKER' 
      ? `Analyze this job posting: ${JSON.stringify(target)}. Provide a brief 1-sentence "Why it matches" based on a generic senior software engineer profile.`
      : `Analyze this candidate: ${JSON.stringify(target)}. Provide a brief 1-sentence "Why they are a good fit" for a technical startup.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        maxOutputTokens: 100,
        temperature: 0.7,
      },
    });

    return response.text || "Top recommendation based on your profile.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI insights currently unavailable.";
  }
};

export const parseResume = async (base64Resume: string) => {
  try {
    const response = await ai.models.generateContent({
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
          required: ["name", "title", "skills"]
        }
      }
    });
    const text = response.text;
    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error("Parse Resume Error:", error);
    return null;
  }
};
