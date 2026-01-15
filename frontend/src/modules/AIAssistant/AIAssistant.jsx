import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Textarea, Card, CardBody, Spinner, Chip } from "@heroui/react";
import { Mic, MicOff, Sparkles, ArrowRight, Play, CheckCircle, AlertCircle, RefreshCcw, FileText, BrainCircuit } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../api/config';
import SectionTitle from '../../components/SectionTitle';

// Reusing the logic from VoiceInput but expanding it for a full page experience
const AIAssistant = () => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const recognitionRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "AI Assistant | Karting Analysis";
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        
        setTranscript(prev => {
            // Logic to append final results correctly
            const current = prev.endsWith(' ') ? prev : prev + ' ';
            // Ideally we'd manage this better, but for now:
            // Just use the latest finalized chunk + interim
            // Note: This simple concatenation might duplicate if not careful, 
            // but for a demo flow where we reset on start, it's okay.
            // Actually, let's just show what the API gives us currently:
            return finalTranscript + interimTranscript;
        });
        
        if (finalTranscript) {
             setTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        setError("Microphone access error or silence timeout.");
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError("Web Speech API not supported in this browser.");
    }
  }, []);

  const toggleListening = () => {
    setError(null);
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setTranscript(''); // Clear previous on new recording
      setExtractedData(null); // Reset extracted data
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
        const response = await axios.post(`${API_URL}/api/v1/analyze/voice-command`, {
            text: transcript
        });
        
        const data = response.data;
        if (data && !data.error) {
            setExtractedData(data);
        } else {
            setError(data.error || "Failed to analyze text.");
        }
    } catch (err) {
        console.error(err);
        setError("Server error during analysis.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleCreateSession = () => {
    // Navigate to session form with the extracted data
    navigate('/dashboard/sessions/new', { state: { initialData: extractedData } });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto pb-32 space-y-8">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
           <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold font-display">AI Assistant</h1>
                <Chip size="sm" className="bg-[#e8fe41] text-black font-bold">BETA</Chip>
           </div>
           <p className="text-zinc-400">Record your voice notes and let AI structure your session data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Left Column: Input & Transcript */}
          <div className="space-y-6">
              
              {/* Recording Control */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[300px] relative overflow-hidden group">
                  {/* Background Animation Pulse */}
                  {isListening && (
                      <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-64 h-64 bg-red-500/10 rounded-full animate-ping absolute"></div>
                          <div className="w-48 h-48 bg-red-500/10 rounded-full animate-ping delay-75 absolute"></div>
                      </div>
                  )}

                  <Button
                    isIconOnly
                    className={`w-24 h-24 rounded-full transition-all duration-500 z-10 ${
                        isListening 
                        ? 'bg-red-500 text-white shadow-[0_0_40px_rgba(239,68,68,0.4)] scale-110' 
                        : 'bg-zinc-800 text-zinc-400 hover:text-[#e8fe41] hover:bg-zinc-700 hover:scale-105 shadow-xl'
                    }`}
                    onPress={toggleListening}
                  >
                    {isListening ? <MicOff size={40} /> : <Mic size={40} />}
                  </Button>
                  
                  <div className="mt-6 text-center z-10">
                      <h3 className={`text-lg font-bold transition-colors ${isListening ? 'text-red-500' : 'text-zinc-300'}`}>
                          {isListening ? "Listening..." : "Tap to Record"}
                      </h3>
                      <p className="text-zinc-500 text-sm mt-1">
                          "I drove at Spa today, track was wet..."
                      </p>
                  </div>
              </div>

              {/* Transcript Display */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 min-h-[200px]">
                  <SectionTitle icon={FileText}>Transcript</SectionTitle>
                  <Textarea 
                     value={transcript}
                     onChange={(e) => setTranscript(e.target.value)}
                     placeholder="Your speech will appear here..."
                     minRows={6}
                     classNames={{
                         input: "bg-transparent text-lg font-mono text-zinc-300",
                         inputWrapper: "bg-transparent shadow-none hover:bg-transparent focus-within:bg-transparent"
                     }}
                  />
                  
                  <div className="flex justify-end mt-4">
                      <Button 
                        color="primary"
                        className="font-bold text-black bg-[#e8fe41]"
                        startContent={isProcessing ? <Spinner size="sm" color="current" /> : <Sparkles size={18} />}
                        onPress={handleAnalyze}
                        isLoading={isProcessing}
                        isDisabled={!transcript.trim()}
                      >
                          Analyze with AI
                      </Button>
                  </div>
              </div>
          </div>

          {/* Right Column: AI Analysis & Extraction */}
          <div className="space-y-6">
              
              <div className={`h-full bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 transition-all duration-500 ${extractedData ? 'opacity-100 translate-x-0' : 'opacity-50 grayscale'}`}>
                   <div className="flex items-center justify-between mb-6">
                       <SectionTitle icon={BrainCircuit}>AI Understanding</SectionTitle>
                       {extractedData && <Chip color="success" variant="flat" size="sm" startContent={<CheckCircle size={14} />}>Analysis Complete</Chip>}
                   </div>

                   {!extractedData ? (
                       <div className="h-[400px] flex flex-col items-center justify-center text-zinc-600 space-y-4">
                           <BrainCircuit size={64} strokeWidth={1} />
                           <p>Record and analyze to see extracted data.</p>
                       </div>
                   ) : (
                       <div className="space-y-6">
                           <div className="grid grid-cols-2 gap-4">
                               <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                                   <span className="text-xs text-zinc-500 uppercase font-bold">Track</span>
                                   <div className="text-lg font-bold text-white mt-1">{extractedData.track || "--"}</div>
                               </div>
                               <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                                   <span className="text-xs text-zinc-500 uppercase font-bold">Date</span>
                                   <div className="text-lg font-bold text-white mt-1">{extractedData.date || "--"}</div>
                               </div>
                               <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                                   <span className="text-xs text-zinc-500 uppercase font-bold">Session Type</span>
                                   <div className="text-lg font-bold text-white mt-1">{extractedData.sessionType || "--"}</div>
                               </div>
                               <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                                   <span className="text-xs text-zinc-500 uppercase font-bold">Kart #</span>
                                   <div className="text-lg font-bold text-white mt-1">{extractedData.kartNumber || "--"}</div>
                               </div>
                           </div>
                           
                           <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                               <span className="text-xs text-zinc-500 uppercase font-bold">Setup Notes</span>
                               <div className="text-sm text-zinc-300 mt-2 leading-relaxed">{extractedData.setup || "No setup details found."}</div>
                           </div>

                           <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                               <span className="text-xs text-zinc-500 uppercase font-bold">Conditions</span>
                               <div className="text-sm text-zinc-300 mt-2 leading-relaxed">{extractedData.conditions || "No conditions specified."}</div>
                           </div>

                           <div className="pt-4 border-t border-zinc-800 flex justify-end gap-3">
                               <Button variant="flat" onPress={() => setExtractedData(null)}>
                                   Discard
                               </Button>
                               <Button 
                                   className="bg-white text-black font-bold" 
                                   endContent={<ArrowRight size={18} />}
                                   onPress={handleCreateSession}
                               >
                                   Create Session
                               </Button>
                           </div>
                       </div>
                   )}
              </div>

          </div>
      </div>
    </div>
  );
};

export default AIAssistant;
