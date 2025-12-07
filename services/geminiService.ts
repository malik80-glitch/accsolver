import { GoogleGenAI, Content, Part } from "@google/genai";
import { SYSTEM_INSTRUCTION } from "../constants";
import { Message, Attachment } from "../types";

// Initialize the client
// The API key is guaranteed to be in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

interface GeminiResponse {
  text: string;
  generatedImage?: string;
}

// Helper to determine if a mime type is text-based and should be decoded
const isTextBased = (mimeType: string) => {
  return mimeType.startsWith('text/') || 
         mimeType === 'application/json' ||
         mimeType === 'application/xml' || 
         mimeType === 'application/x-yaml' ||
         mimeType.includes('csv') || 
         mimeType.includes('script');
};

// Helper to safely decode base64 text content (handling UTF-8)
const decodeBase64Text = (base64: string): string => {
  try {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch (e) {
    console.error("Failed to decode base64 text:", e);
    return "";
  }
};

export const sendMessageToGemini = async (
  prompt: string,
  history: Message[] = [],
  attachment?: Attachment | null,
): Promise<GeminiResponse> => {
  try {
    // Check for Image Generation Intent
    if (prompt.startsWith("Generate Image:")) {
      const imagePrompt = prompt.replace("Generate Image:", "").trim();
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: imagePrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "4:3", // Good for charts and graphs
          },
        },
      });

      let text = "";
      let generatedImage: string | undefined;

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
          } else if (part.text) {
            text += part.text;
          }
        }
      }

      return {
        text: text || "Here is the visual representation you requested.",
        generatedImage
      };
    }

    // Standard Text/Multimodal Chat Flow
    const contents: Content[] = [];

    // 1. Process History
    // Convert app Message objects to Gemini Content objects
    history.forEach(msg => {
      const parts: Part[] = [];
      
      // Handle new attachment structure
      if (msg.attachment) {
        const base64Data = msg.attachment.data.split(',')[1] || msg.attachment.data;
        
        // If text-based (CSV, TXT, MD), send as text part for better reasoning
        if (isTextBased(msg.attachment.mimeType)) {
          const textContent = decodeBase64Text(base64Data);
          parts.push({ 
            text: `[Attached File: ${msg.attachment.name}]\n${textContent}\n[End of File]` 
          });
        } 
        // If PDF or Image, send as inlineData with a text hint
        else {
          parts.push({ text: `[Attached File: ${msg.attachment.name}]` });
          parts.push({
            inlineData: {
              mimeType: msg.attachment.mimeType,
              data: base64Data,
            },
          });
        }
      } 
      // Handle legacy image structure
      else if (msg.image) {
        const base64Data = msg.image.split(',')[1] || msg.image;
        parts.push({
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Data,
          },
        });
      }
      
      parts.push({ text: msg.text });
      
      contents.push({
        role: msg.role,
        parts: parts
      });
    });

    // 2. Process Current Message
    const currentParts: Part[] = [];

    // Add attachment if present
    if (attachment) {
      // Remove data URL prefix if present
      const base64Data = attachment.data.split(',')[1] || attachment.data;
      
      if (isTextBased(attachment.mimeType)) {
        const textContent = decodeBase64Text(base64Data);
        currentParts.push({ 
           text: `[Attached File: ${attachment.name}]\n${textContent}\n[End of File]\n\n` 
        });
      } else {
        // Provide context about the file name for PDFs/Images
        currentParts.push({ text: `[Attached File: ${attachment.name}]` });
        currentParts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: base64Data,
          },
        });
      }
    }

    // Add text prompt
    currentParts.push({ text: prompt });

    // Append current message to contents
    contents.push({
      role: 'user',
      parts: currentParts
    });

    // Use gemini-2.5-flash for speed and multimodal capabilities
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents, 
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.3, // Keep it factual for accounting
      },
    });

    if (response.text) {
      return { text: response.text };
    }

    return { text: "I analyzed the input but couldn't generate a text response. Please try clarifying your question." };
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return { text: "I encountered an error while processing your request. Please try again." };
  }
};

export const extractTextFromImage = async (base64Image: string): Promise<string> => {
  try {
    const base64Data = base64Image.split(',')[1] || base64Image;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          { text: "Perform OCR: Transcribe all text from this image exactly as it appears. Return ONLY the extracted text, no introductory or concluding remarks. If there is no legible text, say so." }
        ],
      },
    });

    return response.text || "";
  } catch (error) {
    console.error("OCR extraction failed:", error);
    return "";
  }
};