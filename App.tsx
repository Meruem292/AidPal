import React, { useState, useRef, useEffect } from 'react';
import { Camera, History, AlertCircle, X, ChevronRight, Loader2, Sparkles, Heart, Zap, Stethoscope, Image as ImageIcon } from 'lucide-react';
import { analyzeWound } from './geminiService.ts';
import { AnalysisResult, HistoryItem } from './types.ts';

const App: React.FC = () => {
  const [image, setImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('aidpal_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setError(null);
        // If we just picked an image, we don't auto-scan yet to let user add description
      };
      reader.readAsDataURL(file);
    }
  };

  const handleScan = async () => {
    if (!image) {
      // If no image, default to opening camera
      cameraCaptureRef.current?.click();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const analysis = await analyzeWound(image, description);
      setResult(analysis);
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        image,
        result: analysis
      };
      const updatedHistory = [newHistoryItem, ...history];
      setHistory(updatedHistory);
      localStorage.setItem('aidpal_history', JSON.stringify(updatedHistory));
    } catch (err: any) {
      setError(err?.message || 'Oopsie! I couldn\'t see it clearly. Try again?');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setResult(null);
    setDescription('');
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 pb-24 md:p-8 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-20%] w-64 h-64 bg-yellow-400 opacity-20 blob -z-10 blur-xl"></div>
      <div className="absolute bottom-[5%] right-[-10%] w-80 h-80 bg-red-400 opacity-20 blob -z-10 blur-xl"></div>

      {/* Header */}
      <div className="w-full max-w-md flex justify-between items-center mb-10 z-10 animate-pop" style={{ animationDelay: '0.1s' }}>
        <div className="bg-white border-[3px] border-black rounded-full py-2 px-6 flex items-center gap-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="bg-[#FFD100] p-1.5 rounded-full border-2 border-black">
            <Heart className="w-5 h-5 text-[#7C3AED] fill-[#7C3AED]" />
          </div>
          <div className="flex flex-col">
            <span className="font-fredoka font-bold text-xl leading-tight text-[#2D3436]">AidPal</span>
            <span className="text-[10px] font-black text-[#7C3AED] tracking-widest uppercase">Health Buddy</span>
          </div>
        </div>
        
        <button 
          onClick={() => setShowHistory(true)}
          className="bg-[#FFD100] p-4 rounded-full border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
        >
          <History className="w-6 h-6 text-black" />
        </button>
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md flex flex-col items-center space-y-10 z-10">
        
        {/* Floating Emojis Decoration */}
        <div className="flex justify-around w-full px-10 absolute pointer-events-none opacity-50">
           <span className="text-4xl animate-float" style={{ animationDelay: '0s' }}>🩹</span>
           <span className="text-4xl animate-float" style={{ animationDelay: '2s' }}>🩺</span>
           <span className="text-4xl animate-float" style={{ animationDelay: '4s' }}>💊</span>
        </div>

        {/* Badge */}
        <div className="bg-[#FFD100] text-black border-2 border-black px-6 py-2 rounded-full font-fredoka font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] animate-bounce">
           ✨ 100% Magic AI ✨
        </div>

        {/* Title */}
        <div className="text-center animate-pop" style={{ animationDelay: '0.2s' }}>
          <h1 className="text-white font-fredoka text-4xl font-black mb-3 [text-shadow:4px_4px_0px_#000]">
            Let's Fix That!
          </h1>
          <p className="text-white font-fredoka font-medium text-lg max-w-xs mx-auto">
            Take a snap of your ouchie and I'll help you feel better! 🚀
          </p>
        </div>

        {/* Scan Area */}
        <div className="relative group animate-pop" style={{ animationDelay: '0.3s' }}>
            {/* Action Hint */}
            {!image && (
              <div className="absolute -top-5 -right-5 bg-[#FF6B6B] text-white text-xs font-black px-4 py-2 rounded-xl rotate-12 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] z-20">
                SNAP ME!
              </div>
            )}
            
            <div 
              className={`w-64 h-64 rounded-full border-[6px] border-dashed border-white/60 flex flex-col items-center justify-center p-4 transition-all duration-500 ${image ? 'border-solid border-white scale-110' : 'hover:scale-105'}`}
            >
              <div 
                onClick={handleScan}
                className={`w-full h-full rounded-full flex flex-col items-center justify-center cursor-pointer overflow-hidden border-[4px] border-black shadow-[12px_12px_0px_0px_rgba(0,0,0,0.3)] relative transition-all active:scale-90 ${image ? 'bg-black' : 'bg-white'}`}
              >
                {image ? (
                  <>
                    <img src={image} alt="Target" className={`w-full h-full object-cover ${isLoading ? 'opacity-60 grayscale' : 'opacity-90'}`} />
                    {isLoading && <div className="scanning-line"></div>}
                    <div className="absolute inset-0 bg-black/30 flex flex-col items-center justify-center">
                       {isLoading ? (
                         <div className="flex flex-col items-center gap-4">
                           <Loader2 className="w-16 h-16 text-[#FFD100] animate-spin" />
                           <span className="text-[#FFD100] font-fredoka font-black text-xl tracking-wider uppercase [text-shadow:2px_2px_0px_#000]">Thinking...</span>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center group-hover:scale-110 transition-transform">
                           <Zap className="w-14 h-14 text-[#FFD100] fill-[#FFD100] mb-2 drop-shadow-[0_4px_0_rgba(0,0,0,1)]" />
                           <span className="text-white font-fredoka font-black text-lg tracking-widest uppercase [text-shadow:2px_2px_0px_#000]">ANALYZE!</span>
                         </div>
                       )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-[#7C3AED] p-5 rounded-full mb-3 border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                      <Camera className="w-12 h-12 text-white" />
                    </div>
                    <span className="text-[#2D3436] font-fredoka font-black text-lg tracking-tighter uppercase">TAP TO START</span>
                  </>
                )}
              </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-6 w-full animate-pop" style={{ animationDelay: '0.4s' }}>
          <button 
            onClick={() => cameraCaptureRef.current?.click()}
            className="cartoon-btn bg-[#FFD100] rounded-3xl py-8 flex flex-col items-center justify-center gap-2"
          >
            <Camera className="w-10 h-10 text-black" />
            <span className="font-fredoka font-black text-black text-sm uppercase">Camera</span>
          </button>
          
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="cartoon-btn bg-[#2ECC71] rounded-3xl py-8 flex flex-col items-center justify-center gap-2"
          >
            <ImageIcon className="w-10 h-10 text-black" />
            <span className="font-fredoka font-black text-black text-sm uppercase">Gallery</span>
          </button>
        </div>

        {/* Context Input */}
        <div className="w-full cartoon-card p-8 space-y-4 animate-pop" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🗣️</span>
            <span className="font-fredoka font-black text-md uppercase text-gray-800">What's the Story?</span>
          </div>
          <textarea 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell me where it hurts... (Optional)"
            className="w-full h-32 bg-yellow-50 rounded-2xl p-5 text-lg font-medium focus:outline-none border-[3px] border-black focus:ring-0 resize-none placeholder:text-gray-400"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-[#FF6B6B] border-[4px] border-black text-white p-5 rounded-3xl flex items-center gap-4 w-full shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] animate-bounce">
            <AlertCircle className="w-8 h-8 flex-shrink-0" />
            <p className="text-lg font-fredoka font-bold">{error}</p>
          </div>
        )}

        {/* Sticky Disclaimer */}
        <div className="w-full cartoon-card p-6 bg-white flex items-center gap-5 animate-pop" style={{ animationDelay: '0.6s' }}>
           <div className="bg-[#FFD100] p-4 rounded-full border-2 border-black flex-shrink-0">
             <Stethoscope className="w-8 h-8 text-black" />
           </div>
           <p className="text-xs font-fredoka font-bold leading-snug text-gray-800">
             <span className="text-[#FF4757] text-sm font-black">HEADS UP!</span> I'm a robot buddy, not a doc! Always check with a real human professional if it's serious! 🚨
           </p>
        </div>
      </div>

      {/* Hidden Native Inputs */}
      {/* This 'capture' attribute is the key for Kodular WebView compatibility */}
      <input 
        type="file" 
        accept="image/*" 
        capture="environment" 
        ref={cameraCaptureRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleImageUpload} 
        className="hidden" 
      />

      {/* Result Modal */}
      {result && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end">
          <div className="bg-white w-full border-t-[8px] border-black rounded-t-[50px] max-h-[92vh] overflow-y-auto p-10 animate-slide-up">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                 <div className="bg-[#2ECC71] p-3 rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    <Sparkles className="w-8 h-8 text-white fill-white" />
                 </div>
                 <h2 className="font-fredoka font-black text-3xl text-black">Looky Here!</h2>
              </div>
              <button onClick={reset} className="p-3 bg-gray-100 hover:bg-gray-200 border-[3px] border-black rounded-full transition-all active:scale-90">
                <X className="w-8 h-8 text-black" />
              </button>
            </div>

            <div className="space-y-10">
               <div className="cartoon-card bg-purple-50 p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">I Found a...</h3>
                    <span className={`px-5 py-2 rounded-xl text-xs font-black uppercase border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                      result.severity === 'Low' ? 'bg-green-400' :
                      result.severity === 'Medium' ? 'bg-yellow-400' : 'bg-red-400 text-white'
                    }`}>
                      {result.severity} Risk
                    </span>
                  </div>
                  <p className="font-fredoka font-black text-4xl text-[#7C3AED] mb-4 drop-shadow-[2px_2px_0_#000]">{result.woundType}</p>
                  <p className="text-gray-800 font-medium text-lg leading-relaxed bg-white/50 p-4 rounded-2xl border-2 border-dashed border-purple-200">{result.description}</p>
               </div>

               <div className="space-y-6">
                 <h3 className="font-fredoka font-black text-2xl text-black flex items-center gap-3">
                    <div className="w-4 h-10 bg-[#FFD100] rounded-lg border-2 border-black" />
                    How to Fix it!
                 </h3>
                 <div className="space-y-4">
                   {result.firstAidSteps.map((step, idx) => (
                     <div key={idx} className="flex gap-5 items-center cartoon-card p-6 bg-white hover:-translate-y-1 transition-transform">
                        <div className="bg-[#7C3AED] text-white w-10 h-10 rounded-xl border-2 border-black flex items-center justify-center text-xl font-black flex-shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          {idx + 1}
                        </div>
                        <p className="text-lg text-gray-800 font-bold">{step}</p>
                     </div>
                   ))}
                 </div>
               </div>

               <div className="bg-blue-400 border-[4px] border-black rounded-[40px] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                 <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">💡</span>
                    <h3 className="font-fredoka font-black text-2xl text-white [text-shadow:2px_2px_0px_#000]">AidPal Pro Tip:</h3>
                 </div>
                 <p className="text-lg text-white font-bold italic leading-snug">"{result.recommendation}"</p>
               </div>

               <button 
                 onClick={reset}
                 className="w-full bg-[#FFD100] text-black border-[4px] border-black font-fredoka font-black text-2xl py-8 rounded-[40px] shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all active:scale-95 mb-10"
               >
                 AWESOME, BYE! 👋
               </button>
            </div>
          </div>
        </div>
      )}

      {/* History Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/90 flex justify-end">
          <div className="bg-[#7C3AED] w-[90%] max-w-md h-full overflow-y-auto p-10 border-l-[8px] border-black animate-slide-left">
            <div className="flex justify-between items-center mb-12">
              <h2 className="font-fredoka font-black text-4xl text-white [text-shadow:4px_4px_0px_#000]">Old Ouchies</h2>
              <button onClick={() => setShowHistory(false)} className="p-3 bg-white border-[3px] border-black rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all">
                <X className="w-8 h-8 text-black" />
              </button>
            </div>

            <div className="space-y-6">
              {history.length === 0 ? (
                <div className="text-center py-20 bg-white/10 rounded-[40px] border-4 border-dashed border-white/20">
                  <p className="text-white font-fredoka font-black text-2xl opacity-60">Nothing here yet! 💨</p>
                </div>
              ) : (
                history.map((item) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      setResult(item.result);
                      setImage(item.image);
                      setShowHistory(false);
                    }}
                    className="flex items-center gap-5 p-6 bg-white rounded-[30px] border-[4px] border-black cursor-pointer shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-all"
                  >
                    <img src={item.image} alt="Wound" className="w-20 h-20 rounded-2xl border-[3px] border-black object-cover flex-shrink-0" />
                    <div className="flex-grow min-w-0">
                      <p className="font-fredoka font-black text-2xl text-black truncate leading-tight">{item.result.woundType}</p>
                      <p className="text-xs font-black text-purple-600 uppercase tracking-widest mt-1">{new Date(item.timestamp).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className="w-8 h-8 text-black" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slide-left {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .animate-slide-left {
          animation: slide-left 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export default App;