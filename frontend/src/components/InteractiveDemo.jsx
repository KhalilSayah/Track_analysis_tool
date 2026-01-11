import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion';

// Generate dummy telemetry data
const generateData = () => {
  const data = [];
  for (let i = 0; i <= 100; i++) {
    data.push({
      distance: i,
      speed: 40 + Math.sin(i / 10) * 30 + Math.random() * 5,
      throttle: Math.max(0, Math.sin(i / 15) * 100),
      brake: Math.max(0, -Math.sin(i / 15) * 100),
    });
  }
  return data;
};

// Track path definition
const trackPath = "M 50,150 C 50,50 150,50 150,100 C 150,150 250,150 250,100 C 250,50 350,50 350,150 C 350,250 250,250 250,200 C 250,150 150,150 150,200 C 150,250 50,250 50,150 Z";

const InteractiveDemo = () => {
  const containerRef = useRef(null);
  const pathRef = useRef(null);
  const [carPosition, setCarPosition] = useState({ x: 0, y: 0 });
  const data = useMemo(() => generateData(), []);
  
  // Scroll progress for the entire section
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end end"]
  });

  // Smooth out the scroll progress
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const [currentPercent, setCurrentPercent] = useState(0);

  // Sync scroll to percentage state and calculate car position
  useEffect(() => {
    const unsubscribe = smoothProgress.on("change", (latest) => {
      // Map 0-1 to 0-100
      const percent = Math.min(100, Math.max(0, latest * 100));
      setCurrentPercent(percent);

      if (pathRef.current) {
        const length = pathRef.current.getTotalLength();
        const point = pathRef.current.getPointAtLength((percent / 100) * length);
        setCarPosition({ x: point.x, y: point.y });
      }
    });
    return () => unsubscribe();
  }, [smoothProgress]);

  // Insights data
  const insights = [
    { x: 100, y: 60, text: "Here you can have better entry", delay: 0.1 },
    { x: 300, y: 100, text: "Here you are losing time", delay: 0.3 },
    { x: 200, y: 220, text: "Perfect apex speed!", delay: 0.5 }
  ];

  // Slice data for charts based on current scroll percentage
  const currentData = data.slice(0, Math.max(1, Math.floor((currentPercent / 100) * data.length)));

  return (
    // Tall container to enable scrolling - reduced to 110vh for 2x speed interaction
    <div ref={containerRef} className="relative w-full h-[110vh] bg-zinc-950">
      
      {/* Sticky Content Wrapper */}
      <div className="sticky top-0 w-full h-screen flex items-center justify-center p-4">
        
        {/* Main Card */}
        <div className="w-full max-w-5xl bg-zinc-900/50 backdrop-blur-md rounded-3xl border border-zinc-800 shadow-2xl flex flex-col lg:flex-row relative">
          
          {/* Left Panel: Track */}
          <div className="relative w-full lg:w-1/2 bg-zinc-900/30 p-8 flex items-center justify-center border-b lg:border-b-0 lg:border-r border-zinc-800 h-[40vh] lg:h-[400px] z-20">
             {/* Title Overlay */}
             <div className="absolute top-8 left-8 z-10 max-w-md">
              <h2 className="text-2xl font-bold text-white mb-1 leading-tight">
                Skip the spreadsheets—let AI do the work.
              </h2>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Get <span className="text-white font-semibold">clear, instant insights</span> on your driving so you can focus on <span className="text-[#e8fe41] font-semibold">speed, not data</span>.
              </p>
            </div>

            <div className="relative w-full h-full flex items-center justify-center pt-20">
              <svg viewBox="0 0 400 300" className="w-full h-full max-w-lg overflow-visible">
                <path 
                  d={trackPath} 
                  fill="none" 
                  stroke="#27272a" 
                  strokeWidth="20" 
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path 
                  ref={pathRef}
                  d={trackPath} 
                  fill="none" 
                  stroke="#3f3f46" 
                  strokeWidth="2" 
                  strokeDasharray="5,5"
                />
                
                {/* Car Marker */}
                <circle 
                  cx={carPosition.x} 
                  cy={carPosition.y} 
                  r="8" 
                  fill="#e8fe41" 
                  stroke="black"
                  strokeWidth="2"
                  className="shadow-[0_0_15px_#e8fe41]"
                />

                {/* Insight Cards (appear at > 98%) */}
                <AnimatePresence>
                  {currentPercent > 98 && insights.map((insight, index) => (
                    <motion.g
                      key={index}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                      transition={{ delay: insight.delay, duration: 0.5, type: "spring" }}
                    >
                      {/* Line to point */}
                      <line x1={insight.x} y1={insight.y} x2={insight.x + 20} y2={insight.y - 20} stroke="#e8fe41" strokeWidth="1" />
                      
                      {/* Card Group */}
                      <foreignObject x={insight.x + 20} y={insight.y - 80} width="160" height="80">
                        <div className="bg-zinc-800/90 border border-[#e8fe41]/30 p-3 rounded-lg shadow-lg backdrop-blur-sm">
                          <p className="text-xs text-zinc-200 font-medium leading-tight">
                            {insight.text}
                          </p>
                        </div>
                      </foreignObject>
                      
                      {/* Dot on track */}
                      <circle cx={insight.x} cy={insight.y} r="4" fill="#e8fe41" />
                    </motion.g>
                  ))}
                </AnimatePresence>
              </svg>
            </div>
          </div>

          {/* Right Panel: Graphs */}
          <div className="w-full lg:w-1/2 flex flex-col h-[40vh] lg:h-[400px]">
            {/* Speed Graph */}
            <div className="flex-1 border-b border-zinc-800 relative group overflow-hidden">
               {/* Background Grid */}
               <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
               <div className="h-full w-full p-6 pt-8">
                 <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData}>
                    <defs>
                      <linearGradient id="colorSpeed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="distance" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Area 
                      type="monotone" 
                      dataKey="speed" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      fill="url(#colorSpeed)" 
                      isAnimationActive={false} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Throttle Graph */}
            <div className="flex-1 border-b border-zinc-800 relative group overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              <div className="h-full w-full p-6 pt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData}>
                    <defs>
                      <linearGradient id="colorThrottle" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="distance" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Area 
                      type="monotone" 
                      dataKey="throttle" 
                      stroke="#22c55e" 
                      strokeWidth={2}
                      fill="url(#colorThrottle)" 
                      isAnimationActive={false} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Brake Graph */}
            <div className="flex-1 relative group overflow-hidden">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px]"></div>
              <div className="h-full w-full p-6 pt-8">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={currentData}>
                    <defs>
                      <linearGradient id="colorBrake" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.6}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="distance" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Area 
                      type="monotone" 
                      dataKey="brake" 
                      stroke="#ef4444" 
                      strokeWidth={2}
                      fill="url(#colorBrake)" 
                      isAnimationActive={false} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveDemo;
