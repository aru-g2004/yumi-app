
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
  if (process.env.API_KEY) return true;
  if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
};

export const requestApiKey = async () => {
  if (process.env.API_KEY) return true;
  if (typeof window !== 'undefined' && (window as any).aistudio?.openSelectKey) {
    await (window as any).aistudio.openSelectKey();
    return true;
  }
  return false;
};

// LIVE API DECODING HELPERS
export function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export function encodeAudio(bytes: Uint8Array) {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function createPcmBlob(data: Float32Array): any {
  const l = data.length;
  const int16 = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    int16[i] = data[i] * 32768;
  }
  return {
    data: encodeAudio(new Uint8Array(int16.buffer)),
    mimeType: 'audio/pcm;rate=16000',
  };
}

export const connectToDesignLab = async (callbacks: {
  onAudio: (base64: string) => void;
  onTranscription: (text: string) => void;
  onGrantBudget: (amount: number, reason: string, themeName: string) => void;
  onClose: () => void;
}) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const grantBudgetTool = {
    name: 'grantBudget',
    parameters: {
      type: Type.OBJECT,
      description: 'Approve a research and design budget (grant coins) for a creative idea.',
      properties: {
        amount: {
          type: Type.NUMBER,
          description: 'Amount to grant (100-1000).',
        },
        reason: {
          type: Type.STRING,
          description: 'Brief design critique.',
        },
        themeName: {
          type: Type.STRING,
          description: 'A short, catchy name for the toy series based on the user\'s pitch.',
        }
      },
      required: ['amount', 'reason', 'themeName'],
    },
  };

  const sessionPromise = ai.live.connect({
    model: 'gemini-2.5-flash-native-audio-preview-09-2025',
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
      },
      outputAudioTranscription: {},
      tools: [{ functionDeclarations: [grantBudgetTool] }],
      systemInstruction: `You are 'The Curator'. Enthusiastic, fun, and insightful. Analyze toy pitches. Grant budget (100-1000) for cute, popular, or creative ideas. Short, friendly audio responses.`
    },
    callbacks: {
      onopen: () => console.log("[Live API] Connected"),
      onmessage: async (message: LiveServerMessage) => {
        if (message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
          callbacks.onAudio(message.serverContent.modelTurn.parts[0].inlineData.data);
        }

        if (message.serverContent?.outputTranscription) {
          callbacks.onTranscription(message.serverContent.outputTranscription.text);
        }

        if (message.toolCall) {
          for (const fc of message.toolCall.functionCalls) {
            if (fc.name === 'grantBudget') {
              const args = fc.args as any;
              console.log("[Live API] grantBudget args:", args);
              const amount = args.amount;
              const reason = args.reason || "For creative excellence.";
              const themeName = args.themeName || "New Idea";
              callbacks.onGrantBudget(amount, reason, themeName);

              sessionPromise.then(session => {
                session.sendToolResponse({
                  functionResponses: {
                    id: fc.id,
                    name: fc.name,
                    response: { result: "Budget granted." },
                  }
                });
              });
            }
          }
        }
      },
      onclose: () => callbacks.onClose(),
      onerror: (e) => console.error("[Live API] Error:", e),
    },
  });

  return sessionPromise;
};

export const generateThemeSet = async (themeIdea: string, advancedData?: Partial<CollectionTheme>): Promise<CollectionTheme> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  3. A global "visualStyle" summary that incorporates the finish and color scheme.
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
};

export const generateBoxArt = async (userId: string, themeId: string, themeName: string, visualStyle: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash-image';
  const prompt = `Commercial product photography of a premium 3D vinyl toy blind box packaging for a series called "${themeName}". Aesthetic: ${visualStyle}. The box should be colorful, have high-end graphic design, and clearly display "yumi. mystery series" in elegant typography. Studio lighting, isolated on white.`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      const base64 = `data:image/png;base64,${part.inlineData.data}`;
      return await uploadImageToStorage(base64, userId, themeId, 'box.png');
    }
  }
  throw new Error("Box art generation failed.");
};

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 15000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isRateLimit = String(err).includes('429');
    if (isRateLimit && retries > 0) {
      await new Promise(r => setTimeout(r, delay));
      return withRetry(fn, retries - 1, delay);
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
  size: '1K' | '2K' | '4K' = '1K'
): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = size === '1K' ? 'gemini-2.5-flash-image' : 'gemini-3-pro-image-preview';

    const prompt = `Adorable 3D vinyl collectible toy of "${character.name}". ${character.description}. Visual style: ${visualStyle}. Part of the "${themeName}" series. IMPORTANT: All characters must have consistent cute chibi proportions (big head, small body), front facing camera angle, and neutral studio lighting on a solid pastel background. High-quality 3D render.`;

    const config: any = {
      imageConfig: { aspectRatio: "1:1" },
    };

    if (modelName === 'gemini-3-pro-image-preview') {
      config.imageConfig.imageSize = size;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: prompt }] },
      config,
    });

    console.group(`[Gemini Debug] generateCharacterImage`);
    console.log("Character:", character.name);
    console.log("Model:", modelName);
    console.log("Prompt:", prompt);
    console.log("Config:", config);
    console.groupEnd();

    logUsage(modelName, "Character Image Generation", response);

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const base64 = `data:image/png;base64,${part.inlineData.data}`;
        // Use character name for filename since id might not be set yet
        const safeCharName = (character.name || 'char').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const characterFilename = `characters/${safeCharName}.png`;
        return await uploadImageToStorage(base64, userId, themeId, characterFilename);
      }
    }
    throw new Error("No image found.");
  });
};

export const editCharacterImage = async (
  base64Image: string,
  editPrompt: string
): Promise<string> => {
  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelName = 'gemini-2.5-flash-image';

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
          { text: `Modify this toy material to be: ${editPrompt}. Maintain character shape and pose exactly.` }
        ]
      }
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Edit failed.");
  });
};

export const animateCharacter = async (
  base64Image: string,
  prompt: string,
  aspectRatio: '16:9' | '9:16' = '16:9'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'veo-3.1-fast-generate-preview';

  try {
    let operation = await ai.models.generateVideos({
      model: modelName,
      prompt: prompt || '3D character toy rotates slightly in place, waving.',
      image: { imageBytes: base64Image.split(',')[1], mimeType: 'image/png' },
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error(`[VideoGen Error] ${modelName}:`, err);
    throw err;
  }
};
