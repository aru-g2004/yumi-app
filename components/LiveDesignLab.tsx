
import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Sparkles, Wand2, Volume2, Coins, AlertCircle, Loader2, Sparkle } from 'lucide-react';
import SpinWheel from './SpinWheel';
import { connectToDesignLab, decodeAudioData, decodeBase64, createPcmBlob } from '../services/geminiService';

export interface LiveDesignLabProps {
  onEarn: (amount: number, themeName?: string) => void;
}

const LiveDesignLab: React.FC<LiveDesignLabProps> = ({ onEarn }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcription, setTranscription] = useState<string[]>([]);
  const [pendingReward, setPendingReward] = useState<{ amount: number; reason: string; themeName?: string } | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRef = useRef<any>(null);

  const startSession = async () => {
    setIsConnecting(true);
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const sessionPromise = connectToDesignLab({
        onAudio: async (base64) => {
          if (!audioContextRef.current) return;
          const ctx = audioContextRef.current;
          nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);

          const audioBuffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.addEventListener('ended', () => sourcesRef.current.delete(source));
          source.start(nextStartTimeRef.current);
          nextStartTimeRef.current += audioBuffer.duration;
          sourcesRef.current.add(source);
        },
        onTranscription: (text) => {
          setTranscription(prev => [text, ...prev].slice(0, 5));
        },
        onGrantBudget: (amount, reason, themeName) => {
          setPendingReward({ amount, reason, themeName });
        },
        onClose: () => stopSession(),
      });

      sessionRef.current = sessionPromise;
      const session = await sessionPromise;

      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBlob = createPcmBlob(inputData);
        session.sendRealtimeInput({ media: pcmBlob });
      };
      source.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);

      setIsActive(true);
    } catch (err) {
      console.error("Failed to start Live Lab:", err);
      alert("Microphone access is required for the yumi Design Lab.");
    } finally {
      setIsConnecting(false);
    }
  };

  const stopSession = () => {
    setIsActive(false);
    streamRef.current?.getTracks().forEach(t => t.stop());
    sourcesRef.current.forEach(s => s.stop());
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  };

  useEffect(() => {
    return () => stopSession();
  }, []);

  const handleCollect = () => {
    if (pendingReward) {
      onEarn(pendingReward.amount, pendingReward.themeName);
      setSuccessMsg(`+${pendingReward.amount} Credits Added!`);
      setPendingReward(null);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleSpinWin = (amount: number) => {
    onEarn(amount);
    setShowSpinner(false);
    setSuccessMsg(`+${amount} Bonus Credits!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in zoom-in duration-700">
      {showSpinner && (
        <SpinWheel
          onWin={handleSpinWin}
          onClose={() => setShowSpinner(false)}
        />
      )}
      <div className="bg-stone-900 rounded-[4rem] p-16 text-white relative overflow-hidden shadow-2xl border border-stone-800">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="flex items-center justify-around h-full px-20">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className={`w-1 bg-white rounded-full transition-all duration-300 ${isActive ? 'animate-pulse' : 'h-2'}`}
                style={{
                  height: isActive ? `${Math.random() * 60 + 20}%` : '8px',
                  opacity: 0.2 + (Math.random() * 0.5)
                }}
              ></div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="absolute top-0 right-0">
            <button
              onClick={() => setShowSpinner(true)}
              className="bg-amber-400/30 backdrop-blur-md text-amber-100 border border-amber-300/30 px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-amber-200" /> Lucky Spin
            </button>
          </div>
          <div className="bg-stone-800 border border-stone-700 p-5 rounded-[2rem] mb-8 shadow-inner">
            <Mic className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-5xl font-black mb-6 tracking-tighter drop-shadow-md">The Design Lab.</h2>
          <p className="text-white/60 max-w-lg text-lg font-light leading-relaxed mb-12">
            Pitch your collection ideas to **The Curator**. Speak naturally about materials, vibes, and characters to earn yumi credits.
          </p>

          {!isActive ? (
            <button
              onClick={startSession}
              disabled={isConnecting || !!pendingReward}
              className={`bg-white/20 backdrop-blur-md border border-white/20 text-white px-12 py-6 rounded-3xl font-black text-lg tracking-widest uppercase hover:bg-white/30 transition-all flex items-center gap-3 shadow-2xl disabled:opacity-50 ${pendingReward ? 'opacity-20 pointer-events-none' : ''}`}
            >
              {isConnecting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Sparkle className="w-5 h-5 text-yellow-300" />}
              {isConnecting ? 'Initializing...' : 'Enter Lab'}
            </button>
          ) : (
            <button
              onClick={stopSession}
              className="bg-rose-500/80 backdrop-blur-md text-white px-12 py-6 rounded-3xl font-black text-lg tracking-widest uppercase hover:bg-rose-600 transition-all flex items-center gap-3 shadow-2xl border border-rose-400/50"
            >
              <MicOff className="w-6 h-6" /> Leave Session
            </button>
          )}
        </div>
      </div>

      {isActive && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in slide-in-from-bottom-12 duration-700">
          <div className="md:col-span-2 bg-stone-900 rounded-[3rem] p-10 shadow-xl border border-stone-800">
            <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
              <Volume2 className="w-4 h-4" /> Feedback Stream
            </h3>
            <div className="space-y-6">
              {transcription.length === 0 ? (
                <p className="text-white/20 italic font-light">"Describe your vision for a new series..."</p>
              ) : (
                transcription.map((t, i) => (
                  <div key={i} className={`p-6 rounded-[2rem] transition-all border border-white/10 ${i === 0 ? 'bg-white/10 text-white font-medium shadow-lg' : 'text-white/40 text-sm opacity-50'}`}>
                    {t}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-stone-900 rounded-[3rem] p-10 shadow-xl border border-stone-800 flex flex-col items-center justify-center text-center relative transition-all duration-500">
            {pendingReward ? (
              <div className="space-y-6 animate-in zoom-in duration-500 w-full">
                <div className="bg-emerald-400/20 p-6 rounded-full inline-block animate-bounce border border-emerald-400/30">
                  <Coins className="w-10 h-10 text-emerald-300" />
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Curator's Critique</h4>
                  <p className="font-medium text-lg italic text-white leading-relaxed">"{pendingReward.reason}"</p>
                </div>
                <div className="pt-2">
                  <button onClick={handleCollect} className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-emerald-400 hover:scale-105 active:scale-95 transition-all">
                    Accept <span className="bg-white/20 px-2 py-0.5 rounded ml-1">{pendingReward.amount} Credits</span>
                  </button>
                </div>
              </div>
            ) : successMsg ? (
              <div className="animate-in zoom-in duration-500">
                <div className="bg-emerald-100/10 p-6 rounded-full mb-6 inline-block border border-emerald-400/30">
                  <Coins className="w-12 h-12 text-emerald-300" />
                </div>
                <p className="text-2xl font-black text-emerald-300 tracking-tight">{successMsg}</p>
              </div>
            ) : (
              <>
                <Sparkles className="w-12 h-12 text-white/10 mb-6" />
                <p className="text-white/40 font-light px-4">Impress the curator with chic design concepts to unlock budget.</p>
              </>
            )}
          </div>
        </div>
      )}

      <div className="bg-stone-900 p-8 rounded-[3rem] border border-stone-800 flex items-start gap-6 text-white/50">
        <Sparkles className="w-6 h-6 flex-shrink-0 text-rose-300" />
        <div className="text-sm font-light leading-relaxed">
          <p className="font-bold mb-2 text-white/90">Curation Logic</p>
          <p>The Design Lab uses Gemini 2.5 Flash Native Audio to analyze your pitch in real-time. It evaluates stylistic consistency and creative depth before granting credits to your account.</p>
        </div>
      </div>
    </div>
  );
};

export default LiveDesignLab;
