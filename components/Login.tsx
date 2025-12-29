import React from 'react';
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from '../services/firebase';
import { Sparkles } from 'lucide-react';

const Login: React.FC = () => {
    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login failed:", error);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-stone-50 space-y-8 animate-in fade-in zoom-in duration-1000">
            <div className="w-24 h-24 bg-stone-900 rounded-[2rem] flex items-center justify-center shadow-2xl">
                <Sparkles className="w-10 h-10 text-emerald-400" />
            </div>
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-black tracking-tighter">yumi.</h1>
                <p className="text-stone-400 font-bold uppercase tracking-widest text-xs">AI Toy Studio</p>
            </div>
            <button
                onClick={handleGoogleLogin}
                className="bg-white border hover:bg-stone-100 text-stone-700 px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                Sign in with Google
            </button>
        </div>
    );
};

export default Login;
