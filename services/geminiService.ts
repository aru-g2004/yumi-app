
import { GoogleGenAI, Type, GenerateContentResponse, Modality, LiveServerMessage } from "@google/genai";
import { uploadImageToStorage } from "./firebase";
import { CollectionTheme, Character } from "../types";

// Enhanced usage logger for easier tracking
const logUsage = (model: string, operation: string, response: any) => {
  console.group(`%c[Gemini API Debug] ${operation}`, "color: #6366f1; font-weight: bold; background: #f0f0ff; padding: 2px 5px; border-radius: 4px;");
  console.log("Model:", model);
  console.log("Timestamp:", new Date().toLocaleTimeString());
  console.log("Full Response Object:", response);
  console.groupEnd();
};

export const checkApiKey = async (): Promise<boolean> => {
  console.log("DEBUG: Checking VITE_GEMINI_API_KEY...", import.meta.env.VITE_GEMINI_API_KEY ? "Present (Starts with " + import.meta.env.VITE_GEMINI_API_KEY.substring(0, 4) + ")" : "Missing");
  if (import.meta.env.VITE_GEMINI_API_KEY) return true;
  if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
};

export const requestApiKey = async () => {
  if (import.meta.env.VITE_GEMINI_API_KEY) return true;
  if (typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
    await (window as any).aistudio.openSelectKey();
    return true;
  }
  return false;
};

export const generateThemeSet = async (themeIdea: string, advancedData?: Partial<CollectionTheme>): Promise<CollectionTheme> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const modelName = 'gemini-3-flash-preview';

    const colors = advancedData?.colorScheme?.join(', ') || 'user-defined harmonious colors';
    const finish = advancedData?.toyFinish || 'high-gloss vinyl';
    const variation = advancedData?.variationHint || 'varying themes and details';
    const rareTraits = advancedData?.rareTraits || 'special material details';
    const legendaryTraits = advancedData?.legendaryTraits || 'unique premium accents';

    const prompt = `Design a consistent high-end 3D toy collection.
  Theme Idea: "${themeIdea}"
  Keywords: "${advancedData?.keywords || themeIdea}"
  Color Scheme: ${colors}
  Toy Finish: ${finish}
  Variation Logic: ${variation}
  Rare Traits: ${rareTraits}
  Legendary Traits: ${legendaryTraits}

  Provide:
  1. A catchy series name.
  2. A whimsical description for the entire series.
  3. A global "visualStyle" summary that incorporates the finish and color scheme, make sure to include faces and facial expressions.
  4. Exactly 6 characters (3 Common, 2 Rare, 1 Legendary). 
  
  For each character, include a highly detailed visual description (2-3 sentences) ensuring they all fit the global visual style but have unique traits based on their rarity (Rare and Legendary must be visibly more special).
  
  Output valid JSON only.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            visualStyle: { type: Type.STRING },
            characterDefinitions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  rarity: { type: Type.STRING, enum: ['Common', 'Rare', 'Legendary'] }
                },
                required: ['name', 'description', 'rarity']
              }
            }
          },
          required: ['name', 'description', 'visualStyle', 'characterDefinitions']
        }
      }
    });

    logUsage(modelName, "Theme Generation", response);

    const text = response.text || '{}';
    const result = JSON.parse(text);
    return {
      id: Math.random().toString(36).substr(2, 9),
      ...result
    };
  });
};

export const generateBoxArt = async (userId: string, themeId: string, themeName: string, visualStyle: string, studioName?: string): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const modelName = 'gemini-2.5-flash-image';
    const branding = studioName ? `"${studioName}"` : '"yumi"';
    const prompt = `Commercial product photography of a premium 3D vinyl toy blind box packaging for a series called "${themeName}". Aesthetic: ${visualStyle}. The box should be colorful, have high-end graphic design, and clearly display ${branding} in elegant, prominent typography. Studio lighting, isolated on white.`;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });

    logUsage(modelName, "Box Art Generation", response);

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const base64 = `data:image/png;base64,${part.inlineData.data}`;
        return await uploadImageToStorage(base64, userId, themeId, 'box.png');
      }
    }
    throw new Error("No image found.");
  });
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 5000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const errorStr = String(err);
    const retryableErrors = ['429', 'No image found', 'finishReason: SAFETY', 'finishReason: RECITATION', 'RECITATION'];
    const isRetryable = retryableErrors.some(msg => errorStr.includes(msg));

    if (isRetryable && retries > 0) {
      console.warn(`[Gemini Retry] ${errorStr}. Retries left: ${retries}`);
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay * 2); // Exponential backoff
    }
    throw err;
  }
}

export const generateCharacterImage = async (
  userId: string,
  themeId: string,
  character: Partial<Character>,
  themeName: string,
  visualStyle: string,
  size: '1K' | '2K' | '4K' = '1K',
  baselineImageData?: string
): Promise<{ url: string; base64: string }> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const modelName = size === '1K' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

    let prompt = `Adorable 3D vinyl collectible toy of "${character.name}". ${character.description}. Visual style: ${visualStyle}. Part of the "${themeName}" series. 
    
    IMPORTANT: While each character in the series should be highly unique and varied in design, theme, and accessories to match their specific traits, they MUST all share the exact same underlying "base character outline" or silhouette (classic chibi proportions: big round head, small stylized body). 
    
    Ensure significant visual diversity between characters while maintaining this shared 3D base shape. Professional 3D render, front facing, neutral studio lighting on a solid pastel background. If the user selects less than 8 colors, use colors that match the color scheme of the `;

    if (baselineImageData) {
      prompt += ` MAINTAIN THE EXACT BASE SILHOUETTE, STANCE, AND CAMERA ANGLE AS THE PROVIDED BASELINE IMAGE, but creatively apply the new "${character.name}" details, colors, and theme.`;
    }

    const config: any = {
      imageConfig: { aspectRatio: "1:1" },
    };

    if (modelName === 'gemini-3-pro-image-preview') {
      config.imageConfig.imageSize = size;
    }

    const contentParts: any[] = [{ text: prompt }];

    if (baselineImageData) {
      contentParts.unshift({ inlineData: { data: baselineImageData, mimeType: 'image/png' } });
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: contentParts },
      config,
    });

    const candidate = response.candidates?.[0];
    const finishReason = candidate?.finishReason;
    const parts = candidate?.content?.parts || [];

    console.group(`[Gemini Debug] generateCharacterImage`);
    console.log("Character:", character.name);
    console.log("Model:", modelName);
    console.log("Finish Reason:", finishReason);
    console.log("Has Baseline:", !!baselineImageData);
    if (finishReason && finishReason !== 'STOP') {
      console.warn("Interrupted Generation:", finishReason);
    }
    console.groupEnd();

    logUsage(modelName, "Character Image Generation", response);

    for (const part of parts) {
      if (part.inlineData?.data) {
        const base64 = part.inlineData.data;
        const dataUrl = `data:image/png;base64,${base64}`;
        const safeCharName = (character.name || 'char').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const characterFilename = `characters/${safeCharName}.png`;
        const url = await uploadImageToStorage(dataUrl, userId, themeId, characterFilename);
        return { url, base64 };
      }

      // If there's text but no image, it might be a refusal message
      if (part.text) {
        console.warn("[Gemini Refusal/Text]:", part.text);
      }
    }

    throw new Error(`No image found. finishReason: ${finishReason || 'UNKNOWN'}`);
  });
};
