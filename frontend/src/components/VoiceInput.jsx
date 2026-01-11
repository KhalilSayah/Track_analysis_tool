import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2, Sparkles } from 'lucide-react';
import { Button } from "@heroui/react";

const VoiceInput = ({ onTranscript, isProcessing }) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US'; // Default to English, could be configurable

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
        
        // Combine previous finalized transcript with new one if needed, 
        // but typically we just want to capture the current session.
        // Here we update state to show feedback.
        setTranscript(prev => {
            // If we have a new final chunk, append it. 
            // Note: This logic can be tricky with React state updates.
            // Simplified: Just use the latest final + interim for display.
            return finalTranscript + interimTranscript;
        });
        
        // If we have a final result, we could auto-submit, but better to let user finish speaking.
        if (finalTranscript) {
            setTranscript(finalTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        // If we were listening but it stopped (silence), we might want to auto-restart 
        // or just let it be. For now, we sync state.
        if (isListening) {
             // connection closed
             setIsListening(false);
        }
      };
    } else {
      console.warn('Web Speech API is not supported in this browser.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      // Send result when stopping
      if (transcript.trim()) {
        onTranscript(transcript);
      }
    } else {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  if (!recognitionRef.current) {
    return null; // Don't render if not supported
  }

  return (
    <div className="relative inline-block">
      <Button
        isIconOnly
        className={`rounded-full transition-all duration-300 ${
          isListening 
            ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 animate-pulse' 
            : 'bg-zinc-800 text-zinc-400 hover:text-[#e8fe41] hover:bg-[#e8fe41]/10'
        }`}
        onPress={toggleListening}
        isDisabled={isProcessing}
      >
        {isProcessing ? (
           <Loader2 size={20} className="animate-spin" />
        ) : isListening ? (
           <MicOff size={20} />
        ) : (
           <Mic size={20} />
        )}
      </Button>
      
      {/* Tooltip / Status Popup */}
      {isListening && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-xl z-50">
          <div className="flex items-center gap-2 mb-2 text-xs text-zinc-500 uppercase font-bold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"/>
            Listening...
          </div>
          <p className="text-sm text-white italic min-h-[1.5em]">
            {transcript || "Speak now..."}
          </p>
          <div className="mt-2 text-[10px] text-zinc-500 text-center">
            Click mic again to analyze
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceInput;
