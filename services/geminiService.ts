
import { GoogleGenAI, Type, GenerateContentResponse, Modality, LiveServerMessage } from "@google/genai";
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
  if (typeof window !== 'undefined' && (window as any).aistudio?.hasSelectedApiKey) {
    return await (window as any).aistudio.hasSelectedApiKey();
  }
  return false;
};

export const requestApiKey = async () => {
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
  onGrantBudget: (amount: number) => void;
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
          description: 'Amount of coins to grant (10 to 100 based on creativity).',
        },
        reason: {
          type: Type.STRING,
          description: 'A brief reason why this design idea deserves the budget.',
        }
      },
      required: ['amount', 'reason'],
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
      systemInstruction: `You are 'The Curator', the lead creative director for the 'yumi' 3D collectible studio. 
      Users talk to you to pitch new toy series, character designs, or refined material ideas.
      BE CHIC, SOPHISTICATED, PASSIONATE, AND DISCERNING. 
      When you hear a 'VISIONARY CONCEPT' (truly unique or high-end design idea), use the grantBudget tool to reward them with credits.
      Always respond with spoken audio. Keep your spoken responses snappy, elegant, and full of creative insight.
      If an idea is pedestrian or lacks 'vibe', tell them to 'Think more comfortably, more chic!'. 
      Your goal is to elevate the digital shelf to a work of art.`
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
              const amount = (fc.args as any).amount;
              callbacks.onGrantBudget(amount);
              
              sessionPromise.then(session => {
                session.sendToolResponse({
                  functionResponses: {
                    id: fc.id,
                    name: fc.name,
                    response: { result: "Budget approved and credits granted." },
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

export const generateThemeSet = async (themeIdea: string): Promise<CollectionTheme> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-preview';
  const prompt = `Create a 3D designer toy collection theme based on: "${themeIdea}". 
  Provide a name, a short description, and exactly 6 unique characters with their names, personality descriptions, and rarities (3 Common, 2 Rare, 1 Legendary). 
  The descriptions should focus on their physical 3D toy appearance (materials, textures, shapes).`;

  const response = await ai.models.generateContent({
    model: modelName,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      maxOutputTokens: 2000,
      thinkingConfig: { thinkingBudget: 1000 },
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          description: { type: Type.STRING },
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
        required: ['name', 'description', 'characterDefinitions']
      }
    }
  });

  logUsage(modelName, "Theme Generation", response);

  const result = JSON.parse(response.text || '{}');
  return {
    id: Math.random().toString(36).substr(2, 9),
    ...result
  };
};

export const generateCharacterImage = async (
  character: Partial<Character>, 
  theme: string, 
  size: '1K' | '2K' | '4K' = '1K'
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-pro-image-preview';
  const prompt = `Full-body 3D stylized character render of a collectible designer toy vinyl figure. 
  Character Name: "${character.name}". 
  Description: ${character.description}. 
  Collection Theme: "${theme}". 
  Style: High-quality 3D digital sculpt, premium vinyl material, subsurface scattering, vibrant saturated colors, professional studio product photography, clean solid pastel background, cinematic soft lighting, 8k resolution, Octane render, stylized toy-like proportions, intricate 3D details.`;

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1", imageSize: size },
      }
    });

    logUsage(modelName, "Character Image Generation", response);

    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) throw new Error("No candidates returned from the image model.");
    
    for (const part of candidates[0].content.parts) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("API returned success but no image data was found in parts.");
  } catch (err) {
    console.error("[ImageGen] Critical error:", err);
    throw err;
  }
};

export const editCharacterImage = async (
  base64Image: string, 
  editPrompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-2.5-flash-image';
  
  const response = await ai.models.generateContent({
    model: modelName,
    contents: {
      parts: [
        { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
        { text: `Modify this 3D toy character based on this request: ${editPrompt}. Maintain the same 3D render style, character silhouette, and studio lighting, but apply the requested physical changes.` }
      ]
    },
    config: { maxOutputTokens: 1000, thinkingConfig: { thinkingBudget: 500 } }
  });

  logUsage(modelName, "Character Image Edit", response);

  const candidates = response.candidates;
  if (!candidates || candidates.length === 0) throw new Error("No edit candidates generated");

  for (const part of candidates[0].content.parts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Failed to extract edited image data");
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
      prompt: prompt || 'The 3D vinyl toy comes to life with smooth, cute idle animations and a slow rotation to show off the 3D form.',
      image: { imageBytes: base64Image.split(',')[1], mimeType: 'image/png' },
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation completed but no download link was returned.");
    
    const res = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!res.ok) throw new Error(`Failed to fetch video binary: ${res.statusText}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error("[Animate] Critical error in Veo pipeline:", err);
    throw err;
  }
};
