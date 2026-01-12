import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, AlertCircle, FileText, ChevronDown, Map, BarChart2, Cpu, PlayCircle, Save, Clock, ArrowLeft, Plus, Trash2, Calendar, X } from 'lucide-react';
import { collection, query, getDocs, addDoc, deleteDoc, doc, onSnapshot, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { Card, CardBody, CardHeader, Button, Select, SelectItem, Input, Tooltip as HeroTooltip, Spinner } from "@heroui/react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';

const TrackMap = ({ data, color }) => {
  if (!data || data.length < 2) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
      <Map size={32} className="opacity-20" />
      <span className="text-xs uppercase tracking-widest opacity-50">No Layout Data</span>
    </div>
  );

  // 1. Calculate Bounds
  const xs = data.map(p => p.x);
  const ys = data.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX;
  const height = maxY - minY;

  // 2. Add Padding (15% for cleaner look)
  const paddingX = width * 0.15;
  const paddingY = height * 0.15;

  const viewBox = `${minX - paddingX} ${minY - paddingY} ${width + paddingX * 2} ${height + paddingY * 2}`;

  // 3. Generate Path
  const pathData = data.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

  // Dynamic sizing based on track scale
  const strokeWidth = Math.max(width, height) * 0.015;
  const markerRadius = Math.max(width, height) * 0.025;

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
        <svg 
            viewBox={viewBox} 
            preserveAspectRatio="xMidYMid meet" 
            className="w-full h-full overflow-visible drop-shadow-xl"
        >
            {/* Main Track Path */}
            <path 
                d={pathData} 
                fill="none" 
                stroke={color} 
                strokeWidth={strokeWidth}
                strokeLinecap="round" 
                strokeLinejoin="round"
            />
            {/* Start/Finish Dot */}
            <circle 
                cx={data[0].x} 
                cy={data[0].y} 
                r={markerRadius}
                fill="white" 
                stroke={color}
                strokeWidth={strokeWidth * 0.6}
            />
        </svg>
    </div>
  );
};

const TrackAnalysis = () => {
  const { currentUser } = useAuth();
  const { currentTeam } = useTeam();
  // Mode: 'history' | 'new' | 'analysis'
  const [mode, setMode] = useState('history');
  const [currentAnalysisId, setCurrentAnalysisId] = useState(null);
  const [savedAnalyses, setSavedAnalyses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains('dark'));

  useEffect(() => {
    document.title = "Track Analysis | Karting Analysis";
  }, []);

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setIsDark(document.documentElement.classList.contains('dark'));
        }
      });
    });
    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // Selection State
  const [tracks, setTracks] = useState([]);
  
  // Slot 1
  const [track1, setTrack1] = useState('');
  const [sessions1, setSessions1] = useState([]);
  const [selectedSession1, setSelectedSession1] = useState(null);

  // Slot 2
  const [track2, setTrack2] = useState('');
  const [sessions2, setSessions2] = useState([]);
  const [selectedSession2, setSelectedSession2] = useState(null);

  // Analysis State
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  
  const [metricsResult, setMetricsResult] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  
  const [error, setError] = useState('');

  // Fetch Tracks on Mount
  useEffect(() => {
    if (!currentUser) return;
    const fetchTracks = async () => {
      let q;
      if (currentTeam) {
          q = query(collection(db, "tracks"), where("teamId", "==", currentTeam.id));
      } else {
          q = query(collection(db, "tracks"), where("createdBy", "==", currentUser.uid));
      }
      
      const snapshot = await getDocs(q);
      let tracksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (!currentTeam) {
          tracksData = tracksData.filter(t => !t.teamId);
      }

      tracksData.sort((a, b) => a.name.localeCompare(b.name));
      setTracks(tracksData);
    };
    fetchTracks();
  }, [currentUser, currentTeam]);

  // Fetch Sessions when Track 1 changes
  useEffect(() => {
    if (!track1) {
      setSessions1([]);
      setSelectedSession1(null);
      return;
    }
    const fetchSessions = async () => {
      const q = query(collection(db, "tracks", track1, "sessions"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
      setSessions1(data);
    };
    fetchSessions();
  }, [track1]);

  // Fetch Sessions when Track 2 changes
  useEffect(() => {
    if (!track2) {
      setSessions2([]);
      setSelectedSession2(null);
      return;
    }
    const fetchSessions = async () => {
      const q = query(collection(db, "tracks", track2, "sessions"));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
      setSessions2(data);
    };
    fetchSessions();
  }, [track2]);

  // Fetch Saved Analyses
  useEffect(() => {
    if (!currentUser) {
      setSavedAnalyses([]);
      return;
    }
    
    let q;
    if (currentTeam) {
        q = query(collection(db, "analyses"), where("teamId", "==", currentTeam.id));
    } else {
        q = query(collection(db, "analyses"), where("userId", "==", currentUser.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      if (!currentTeam) {
          docs = docs.filter(d => !d.teamId);
      }

      docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSavedAnalyses(docs);
    });
    return unsubscribe;
  }, [currentUser, currentTeam]);

  const handleSaveAnalysis = async () => {
    if (!metricsResult || !selectedSession1 || !selectedSession2) return;
    
    setSaving(true);
    try {
      const name = `${metricsResult[0].label} vs ${metricsResult[1].label}`;
      const analysisData = {
        name,
        createdAt: serverTimestamp(),
        userId: currentUser.uid,
        track1Id: track1,
        track2Id: track2,
        session1: selectedSession1,
        session2: selectedSession2,
        metricsResult,
        aiResult: aiResult || null
      };

      if (currentTeam) {
          analysisData.teamId = currentTeam.id;
      }

      const docRef = await addDoc(collection(db, "analyses"), analysisData);
      setCurrentAnalysisId(docRef.id);
      // Optional: Show success toast
    } catch (err) {
      console.error("Error saving analysis:", err);
      setError("Failed to save analysis.");
    } finally {
      setSaving(false);
    }
  };

  const handleLoadAnalysis = (analysis) => {
    setTrack1(analysis.track1Id);
    setTrack2(analysis.track2Id);
    setSelectedSession1(analysis.session1);
    setSelectedSession2(analysis.session2);
    setMetricsResult(analysis.metricsResult);
    setAiResult(analysis.aiResult);
    setCurrentAnalysisId(analysis.id);
    setMode('analysis');
  };

  const handleDeleteAnalysis = async (e, id) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation();
    }
    if (window.confirm("Are you sure you want to delete this analysis?")) {
      try {
        await deleteDoc(doc(db, "analyses", id));
        if (currentAnalysisId === id) {
          setMode('history');
          setCurrentAnalysisId(null);
          setMetricsResult(null);
          setAiResult(null);
        }
      } catch (err) {
        console.error("Error deleting analysis:", err);
      }
    }
  };

  const handleNewAnalysis = () => {
    setMode('new');
    setMetricsResult(null);
    setAiResult(null);
    setError('');
    setCurrentAnalysisId(null);
  };

  const handleAnalyze = async () => {
    if (!selectedSession1 || !selectedSession2) {
      setError('Please select two sessions to compare.');
      return;
    }

    setLoadingMetrics(true);
    setLoadingAI(false); // Reset AI loading until metrics are done
    setError('');
    setMetricsResult(null);
    setAiResult(null);
    setCurrentAnalysisId(null);

    try {
      const t1Name = tracks.find(t => t.id === track1)?.name || 'Track 1';
      const t2Name = tracks.find(t => t.id === track2)?.name || 'Track 2';

      // 1. Fetch Metrics (Fast)
      const payloadMetrics = {
        urls: [selectedSession1.storageUrl, selectedSession2.storageUrl],
        storage_paths: [selectedSession1.storagePath, selectedSession2.storagePath],
        labels: [t1Name, t2Name] // Use Track Name only for cleaner UI
      };

      const metricsResponse = await axios.post('http://localhost:8000/api/v1/analyze/metrics', payloadMetrics);
      const metricsData = metricsResponse.data;
      setMetricsResult(metricsData);
      setLoadingMetrics(false);

      // 2. Fetch AI Insights (Slow)
      setLoadingAI(true);
      const payloadAI = {
        features1: metricsData[0].features,
        features2: metricsData[1].features,
        label1: metricsData[0].label,
        label2: metricsData[1].label,
        language: 'en'
      };

      const aiResponse = await axios.post('http://localhost:8000/api/v1/analyze/ai', payloadAI);
      setAiResult(aiResponse.data);

    } catch (err) {
      console.error(err);
      setError('Analysis failed. Check backend logs.');
    } finally {
      setLoadingMetrics(false);
      setLoadingAI(false);
    }
  };

  // Helper to format Radar Data
  const getRadarData = () => {
    if (!metricsResult) return [];
    
    // Define Min/Max reference values (approximate global ranges for karting tracks)
    const references = {
      'Downforce': { min: 100, max: 800 }, // m/s^2 * speed
      'Braking': { min: 2, max: 12 },      // m/s^2 (average g * 9.81)
      'Tyre Wear': { min: 5000, max: 20000 }, // Energy sum
      'Mechanical Grip': { min: 500, max: 3000 }, // Low speed cornering sum
      'Engine': { min: 0.3, max: 0.8 }     // % of lap full throttle
    };

    const keys = ['Downforce', 'Braking', 'Tyre Wear', 'Mechanical Grip', 'Engine'];
    
    return keys.map(key => {
      const valA = metricsResult[0].features[key];
      const valB = metricsResult[1].features[key];
      const ref = references[key];

      // Normalize to 0-100 scale based on reference range
      const normA = Math.max(0, Math.min(100, ((valA - ref.min) / (ref.max - ref.min)) * 100));
      const normB = Math.max(0, Math.min(100, ((valB - ref.min) / (ref.max - ref.min)) * 100));

      return {
        subject: key,
        A: normA,
        B: normB,
        fullMark: 100,
        originalA: valA, // Keep original for tooltip
        originalB: valB
      };
    });
  };

  const METRIC_DESCRIPTIONS = {
    'Downforce': 'Calculated based on lateral acceleration at high speeds. Higher values indicate better aerodynamic grip.',
    'Braking': 'Average longitudinal deceleration during braking zones. Indicates braking severity.',
    'Tyre Wear': 'Accumulated energy transmitted to tyres (friction + load). Higher values mean higher degradation.',
    'Mechanical Grip': 'Lateral acceleration in low-speed corners where aerodynamics are negligible.',
    'Engine': 'Percentage of the lap spent at full throttle. Indicates power sensitivity.'
  };

  const InfoTooltip = ({ text }) => (
    <HeroTooltip content={text} className="max-w-xs text-black bg-white shadow-md rounded-lg">
        <div className="cursor-help text-gray-400 hover:text-primary hover:border-primary border border-gray-300 rounded-full w-4 h-4 flex items-center justify-center text-xs ml-2 transition-colors">?</div>
    </HeroTooltip>
  );

  const SessionSelector = ({ label, tracks, selectedTrack, onTrackChange, sessions, selectedSession, onSessionChange, badgeColor, borderColor }) => (
    <Card className={`bg-white dark:bg-zinc-900 shadow-sm hover:shadow-md transition-all duration-300 rounded-[32px] overflow-visible h-full border-l-4 ${borderColor}`}>
      <CardHeader className="flex flex-col items-start gap-4 px-8 pt-8 pb-0">
        <div className={`flex items-center gap-3 px-4 py-1.5 rounded-full ${badgeColor} w-fit`}>
           <div className="w-2 h-2 rounded-full bg-current"></div>
           <span className="text-xs font-bold uppercase tracking-widest">{label}</span>
        </div>
      </CardHeader>
      <CardBody className="space-y-8 px-8 pb-10 pt-6 overflow-visible">
        <div className="space-y-3 relative z-20">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">01. Select Track</label>
            <Select
                aria-label="Select Track"
                placeholder="Choose a track..."
                selectedKeys={selectedTrack ? new Set([selectedTrack]) : new Set()}
                onChange={(e) => onTrackChange(e.target.value)}
                className="w-full"
                classNames={{
                  trigger: "bg-gray-50 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 border-2 border-transparent hover:border-gray-200 dark:hover:border-zinc-600 shadow-sm h-16 rounded-2xl transition-all data-[hover=true]:bg-white dark:data-[hover=true]:bg-zinc-700",
                  value: "text-xl font-bold text-black dark:text-white",
                  placeholder: "text-gray-400 text-lg",
                  popoverContent: "bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 min-w-[300px]"
                }}
                renderValue={(items) => items.map(item => <div key={item.key}><span className="text-xl font-bold text-black dark:text-white">{item.textValue}</span></div>)}
            >
                {tracks.map(t => (
                  <SelectItem key={t.id} value={t.id} textValue={t.name}>
                    <div className="py-2"><span className="text-lg font-medium text-black dark:text-white">{t.name}</span></div>
                  </SelectItem>
                ))}
            </Select>
        </div>

        <div className={`space-y-3 relative z-10 transition-all duration-500 ${!selectedTrack ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">02. Select Session</label>
            <Select
                aria-label="Select Session"
                placeholder="Choose a session..."
                selectedKeys={selectedSession ? new Set([JSON.stringify(selectedSession)]) : new Set()}
                onChange={(e) => { const val = e.target.value; onSessionChange(val ? JSON.parse(val) : null); }}
                isDisabled={!selectedTrack}
                className="w-full"
                classNames={{
                  trigger: "bg-gray-50 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 border-2 border-transparent hover:border-gray-200 dark:hover:border-zinc-600 shadow-sm h-16 rounded-2xl transition-all data-[hover=true]:bg-white dark:data-[hover=true]:bg-zinc-700",
                  value: "text-lg font-bold text-black dark:text-white",
                  placeholder: "text-gray-400 text-lg",
                  popoverContent: "bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 min-w-[300px]"
                }}
                renderValue={(items) => items.map(item => <div key={item.key}><span className="text-lg font-bold text-black dark:text-white">{item.textValue}</span></div>)}
            >
                {sessions.map(s => (
                    <SelectItem key={JSON.stringify(s)} value={JSON.stringify(s)} textValue={`${new Date(s.uploadedAt.seconds * 1000).toLocaleDateString()} - ${s.fileName}`}>
                        <div className="py-2">
                           <div className="font-bold text-black dark:text-white text-md">{s.fileName}</div>
                           <div className="text-xs text-gray-400 font-mono mt-1">{new Date(s.uploadedAt.seconds * 1000).toLocaleDateString()}</div>
                        </div>
                    </SelectItem>
                ))}
            </Select>
        </div>
      </CardBody>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4">
      
      {/* MODE: HISTORY LIST */}
      {mode === 'history' && (
        <div className="space-y-8 animate-fade-in">
          <header className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 text-black dark:text-white">Saved Analyses</h1>
              <p className="text-gray-600 dark:text-gray-400">Resume previous comparisons or start a new one.</p>
            </div>
            <Button 
              onPress={handleNewAnalysis}
              className="bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-[#e8fe41] hover:text-black shadow-lg rounded-full"
              startContent={<Plus size={20} />}
              size="lg"
            >
              New Analysis
            </Button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedAnalyses.map((analysis) => (
              <Card 
                key={analysis.id} 
                isPressable 
                onPress={() => handleLoadAnalysis(analysis)}
                className="bg-white dark:bg-zinc-900 hover:shadow-xl transition-all duration-300 border-none group"
              >
                <CardBody className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-primary/10 p-3 rounded-full text-primary group-hover:bg-primary group-hover:text-black transition-colors">
                      <Activity size={24} />
                    </div>
                    <Button 
                      isIconOnly 
                      variant="light" 
                      color="danger" 
                      size="sm" 
                      onPress={(e) => handleDeleteAnalysis(e, analysis.id)}
                      className="text-danger-300 hover:text-danger hover:bg-danger-50"
                    >
                      <Trash2 size={18} />
                    </Button>
                  </div>
                  
                  <h3 className="text-xl font-bold text-black dark:text-white mb-2 line-clamp-2">{analysis.name}</h3>
                  
                  <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{analysis.createdAt?.toDate().toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} />
                      <span>{analysis.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {analysis.metricsResult?.[0]?.label}
                    </span>
                    <span className="text-gray-300 dark:text-zinc-600">vs</span>
                    <span className="bg-[#e8fe41]/20 text-black dark:text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {analysis.metricsResult?.[1]?.label}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
            
            {savedAnalyses.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 dark:text-zinc-600 bg-gray-50 dark:bg-zinc-900 rounded-3xl border-2 border-dashed border-gray-200 dark:border-zinc-800">
                <FileText size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">No saved analyses yet.</p>
                <Button onPress={handleNewAnalysis} variant="light" color="primary" className="mt-2 font-bold">
                  Start your first analysis
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE: NEW / SETUP */}
      {mode === 'new' && (
        <div className="animate-fade-in">
          <header className="mb-8 flex items-center gap-4">
             <Button isIconOnly variant="light" onPress={() => setMode('history')} className="text-black dark:text-white">
               <ArrowLeft size={24} />
             </Button>
             <div>
               <h1 className="text-3xl font-bold mb-2 text-black dark:text-white">New Comparison</h1>
               <p className="text-gray-600 dark:text-gray-400">Select stored sessions to compare circuit characteristics.</p>
             </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <SessionSelector
              label="Circuit A"
              tracks={tracks}
              selectedTrack={track1}
              onTrackChange={setTrack1}
              sessions={sessions1}
              selectedSession={selectedSession1}
              onSessionChange={setSelectedSession1}
              badgeColor="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300"
              borderColor="border-gray-300 dark:border-zinc-700"
            />
            <SessionSelector
              label="Circuit B"
              tracks={tracks}
              selectedTrack={track2}
              onTrackChange={setTrack2}
              sessions={sessions2}
              selectedSession={selectedSession2}
              onSessionChange={setSelectedSession2}
              badgeColor="bg-[#e8fe41] text-black"
              borderColor="border-[#e8fe41]"
            />
          </div>

          <div className="flex justify-end mb-8">
            <Button
              onPress={() => {
                 handleAnalyze().then(() => {
                    if (!error) setMode('analysis');
                 });
              }}
              isDisabled={loadingMetrics || loadingAI}
              size="lg"
              className={`
                w-full md:w-auto px-12 py-6 
                font-bold text-lg rounded-xl
                transition-all duration-300
                ${loadingMetrics || loadingAI 
                  ? 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600' 
                  : 'bg-black dark:bg-white text-white dark:text-black hover:bg-[#e8fe41] hover:text-black shadow-lg hover:shadow-[#e8fe41]/50'
                }
              `}
              isLoading={loadingMetrics}
              startContent={!loadingMetrics && <PlayCircle size={24} />}
            >
              {loadingMetrics ? 'Calculating...' : 'Run Analysis'}
            </Button>
          </div>

          {error && (
            <div className="bg-danger-50 dark:bg-danger-900/20 border border-danger-200 dark:border-danger-900/50 text-danger-700 dark:text-danger-400 p-4 rounded-2xl flex items-center gap-3 mb-8 shadow-sm">
              <AlertCircle /> {error}
            </div>
          )}
        </div>
      )}

      {/* MODE: ANALYSIS RESULTS */}
      {(mode === 'analysis' && metricsResult) && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Results Header */}
          <div className="flex justify-between items-center mb-6">
             <div className="flex items-center gap-4">
               <Button isIconOnly variant="light" onPress={() => setMode('history')} className="text-black dark:text-white">
                 <ArrowLeft size={24} />
               </Button>
               <div>
                 <h2 className="text-2xl font-bold text-black dark:text-white">Analysis Results</h2>
                 <p className="text-gray-500 dark:text-gray-400 text-sm">
                   {metricsResult[0].label} vs {metricsResult[1].label}
                 </p>
               </div>
             </div>
             
             <div className="flex gap-2">
                <Button 
                  onPress={handleNewAnalysis}
                  variant="flat"
                  className="font-bold rounded-full dark:text-white"
                >
                  New Comparison
                </Button>
                
                {currentAnalysisId ? (
                  <>
                    <Button 
                      onPress={(e) => handleDeleteAnalysis(e, currentAnalysisId)}
                      className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/40 shadow-lg rounded-full"
                      startContent={<Trash2 size={18} />}
                    >
                      Delete
                    </Button>
                    <Button 
                      onPress={() => setMode('history')}
                      className="bg-gray-100 dark:bg-zinc-800 text-black dark:text-white font-bold hover:bg-gray-200 dark:hover:bg-zinc-700 shadow-lg rounded-full"
                      startContent={<X size={18} />}
                    >
                      Close Analysis
                    </Button>
                  </>
                ) : (
                    <Button 
                      onPress={handleSaveAnalysis}
                      isLoading={saving}
                      className="bg-black dark:bg-white text-white dark:text-black font-bold hover:bg-[#e8fe41] hover:text-black shadow-lg rounded-full"
                      startContent={!saving && <Save size={18} />}
                    >
                      Save Analysis
                    </Button>
                )}
             </div>
          </div>

          {/* Top Section: Radar (Left) & Metrics (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left: Characteristic Profile (Radar) */}
            <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl h-full">
              <CardHeader className="flex gap-3 px-6 pt-6">
                <BarChart2 className="text-primary" />
                <div className="flex flex-col">
                  <p className="text-md font-bold text-black dark:text-white">Characteristic Profile</p>
                </div>
              </CardHeader>
              <CardBody className="h-[400px] w-full px-6 pb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={getRadarData()}>
                    <PolarGrid stroke={isDark ? '#374151' : '#e5e7eb'} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: isDark ? '#9ca3af' : '#4b5563', fontSize: 12, fontWeight: 600 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={false} axisLine={false} />
                    <Radar name={metricsResult[0].label} dataKey="A" stroke="#6b7280" fill="#6b7280" fillOpacity={0.1} />
                    <Radar name={metricsResult[1].label} dataKey="B" stroke="#e8fe41" fill="#e8fe41" fillOpacity={0.4} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: isDark ? '#18181b' : '#fff', border: 'none', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: isDark ? '#fff' : '#000' }}
                      formatter={(value, name, props) => {
                        const originalVal = name === metricsResult[0].label ? props.payload.originalA : props.payload.originalB;
                        return [originalVal.toFixed(2), name];
                      }}
                    />
                    <Legend wrapperStyle={{ color: isDark ? '#fff' : '#000' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            {/* Right: Metrics Cards (2 Columns) */}
            <div className="grid grid-cols-2 gap-4 content-start">
              {[
                { key: 'Downforce', color: 'bg-blue-50 dark:bg-blue-900/20' },
                { key: 'Braking', color: 'bg-red-50 dark:bg-red-900/20' },
                { key: 'Tyre Wear', color: 'bg-orange-50 dark:bg-orange-900/20' },
                { key: 'Mechanical Grip', color: 'bg-green-50 dark:bg-green-900/20' },
                { key: 'Engine', color: 'bg-purple-50 dark:bg-purple-900/20' }
              ].map(({ key, color }) => (
                <Card key={key} className={`${color} shadow-sm border-none rounded-2xl`}>
                  <CardBody className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{key}</span>
                      <InfoTooltip text={METRIC_DESCRIPTIONS[key]} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-300 font-mono font-bold text-lg">{metricsResult[0].features[key]?.toFixed(1)}</span>
                        <div className="flex items-center gap-1">
                           <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                           <span className="text-[10px] text-gray-400 font-bold uppercase">{metricsResult[0].label}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-black dark:text-white font-mono font-bold text-lg">{metricsResult[1].features[key]?.toFixed(1)}</span>
                         <div className="flex items-center gap-1">
                           <div className="w-2 h-2 rounded-full bg-[#e8fe41]"></div>
                           <span className="text-[10px] text-gray-400 font-bold uppercase">{metricsResult[1].label}</span>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>

          {/* Bottom Section: Track Layouts (Side by Side) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Track A Layout */}
            <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl h-full">
               <CardHeader className="flex gap-3 px-6 pt-6">
                 <Map className="text-gray-400" />
                 <div className="flex flex-col">
                   <p className="text-md font-bold text-gray-600 dark:text-gray-400">{metricsResult[0].label} Layout</p>
                 </div>
               </CardHeader>
               <CardBody className="h-[400px] w-full px-6 pb-6">
                 <TrackMap 
                   data={metricsResult[0].features.track_path} 
                   color="#6b7280" 
                 />
               </CardBody>
            </Card>

            {/* Track B Layout */}
            <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl h-full">
               <CardHeader className="flex gap-3 px-6 pt-6">
                 <Map className="text-black dark:text-white" />
                 <div className="flex flex-col">
                   <p className="text-md font-bold text-black dark:text-white">{metricsResult[1].label} Layout</p>
                 </div>
               </CardHeader>
               <CardBody className="h-[400px] w-full px-6 pb-6">
                 <TrackMap 
                   data={metricsResult[1].features.track_path} 
                   color="#e8fe41" 
                 />
               </CardBody>
            </Card>
          </div>

          {/* AI Insights Section */}
          <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl min-h-[200px]">
            <CardHeader className="flex gap-3 px-6 pt-6">
              <Cpu className="text-primary" /> 
              <div className="flex items-center gap-2">
                <p className="text-xl font-bold text-black dark:text-white">AI Race Engineer</p>
                {loadingAI && <span className="text-sm font-normal text-gray-400 ml-2 animate-pulse">(Analyzing telemetry...)</span>}
              </div>
            </CardHeader>
            <CardBody className="px-6 pb-6">
              {loadingAI ? (
                 <div className="space-y-4 animate-pulse">
                   <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-3/4"></div>
                   <div className="h-4 bg-gray-100 dark:bg-zinc-800 rounded w-1/2"></div>
                   <div className="h-32 bg-gray-100 dark:bg-zinc-800 rounded w-full mt-4"></div>
                 </div>
              ) : aiResult ? (
                <div className="space-y-8 animate-fade-in">
                  
                  {/* 1. Key Differences */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border-none p-6 rounded-2xl">
                     <h3 className="text-black dark:text-white font-bold mb-2">Key Metric Differences</h3>
                     <p className="text-gray-700 dark:text-gray-300">{aiResult.key_metric_differences}</p>
                  </div>

                  {/* 2. Defining Characteristics */}
                  <div className="grid md:grid-cols-2 gap-6">
                     <Card className="bg-purple-50 dark:bg-purple-900/20 border-none shadow-none rounded-2xl">
                        <CardBody className="p-6">
                          <h3 className="font-bold text-black dark:text-white mb-3 text-lg">{Object.keys(aiResult.defining_characteristics)[0]}</h3>
                          <ul className="space-y-2">
                            {aiResult.defining_characteristics[Object.keys(aiResult.defining_characteristics)[0]]?.map((item, i) => (
                               <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                 <span className="text-primary mt-1 font-bold">•</span> {item}
                               </li>
                            ))}
                          </ul>
                        </CardBody>
                     </Card>
                     <Card className="bg-pink-50 dark:bg-pink-900/20 border-none shadow-none rounded-2xl">
                        <CardBody className="p-6">
                          <h3 className="font-bold text-gray-500 dark:text-gray-400 mb-3 text-lg">{Object.keys(aiResult.defining_characteristics)[1]}</h3>
                          <ul className="space-y-2">
                            {aiResult.defining_characteristics[Object.keys(aiResult.defining_characteristics)[1]]?.map((item, i) => (
                               <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                                 <span className="text-gray-400 mt-1 font-bold">•</span> {item}
                               </li>
                            ))}
                          </ul>
                        </CardBody>
                     </Card>
                  </div>

                  {/* 3. Driving Style */}
                  <div>
                     <h3 className="text-lg font-bold text-black dark:text-white mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">Driving Style Implications</h3>
                     <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(aiResult.driving_style_implications).map(([trackName, data], idx) => (
                          <div key={idx} className={`${idx === 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-orange-50 dark:bg-orange-900/20'} border-none p-6 rounded-2xl shadow-sm`}>
                             <h4 className={`font-bold mb-1 ${idx===0 ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{trackName}</h4>
                             <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 italic">{data.title}</p>
                             <ul className="space-y-2">
                                {data.points.map((pt, i) => (
                                  <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex gap-2">
                                     <span>→</span> {pt}
                                  </li>
                                ))}
                             </ul>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* 4. Setup Recommendations */}
                  <div>
                     <h3 className="text-lg font-bold text-black dark:text-white mb-4 border-b border-gray-100 dark:border-zinc-800 pb-2">Setup Recommendations</h3>
                     <div className="grid md:grid-cols-2 gap-6">
                        {Object.entries(aiResult.setup_recommendations).map(([trackName, data], idx) => (
                          <div key={idx} className={`p-6 rounded-2xl border-none ${idx===0 ? 'bg-cyan-50 dark:bg-cyan-900/20' : 'bg-yellow-50 dark:bg-yellow-900/20'}`}>
                             <h4 className={`font-bold mb-3 ${idx===0 ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{trackName}</h4>
                             <div className="grid grid-cols-1 gap-3 text-sm">
                                {['chassis', 'gearing', 'tyres', 'brakes', 'diff'].map(comp => (
                                  <div key={comp} className="flex flex-col">
                                     <span className="text-gray-400 uppercase text-xs font-bold">{comp}</span>
                                     <span className="text-gray-800 dark:text-gray-200">{data[comp]}</span>
                                  </div>
                                ))}
                             </div>
                          </div>
                        ))}
                     </div>
                  </div>

                  {/* 5. Final Summary */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 p-8 rounded-2xl text-center border-none">
                     <h3 className="font-bold text-black dark:text-white mb-4">Final Summary</h3>
                     <div className="grid md:grid-cols-2 gap-8">
                        {Object.entries(aiResult.final_summary).map(([trackName, summary], idx) => (
                          <div key={idx}>
                             <h4 className={`text-sm font-bold mb-2 ${idx===0 ? 'text-black dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}>{trackName}</h4>
                             <p className="text-gray-600 dark:text-gray-300 italic">"{summary}"</p>
                          </div>
                        ))}
                     </div>
                  </div>

                </div>
              ) : null}
            </CardBody>
          </Card>

        </div>
      )}
    </div>
  );
};

export default TrackAnalysis;
