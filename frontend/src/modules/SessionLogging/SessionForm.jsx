import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp, collectionGroup, getDocs, orderBy, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { Button, Input, Select, SelectItem, Textarea, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@heroui/react";
import { ArrowLeft, Save, FileText, Loader2, CheckCircle, AlertCircle, Star, Sparkles, Plus } from 'lucide-react';
import axios from 'axios';
import VoiceInput from '../../components/VoiceInput';

// Helper for Input fields to reduce clutter
const Field = ({ label, value, onChange, type="text", className="", ...props }) => (
    <div className={`flex flex-col gap-1 ${className}`}>
        <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">{label}</label>
        <Input 
           size="sm" 
           type={type} 
           value={value} 
           onChange={e => onChange(e.target.value)} 
           {...props} 
           classNames={{
               input: "bg-zinc-800 text-sm text-white",
               inputWrapper: "bg-zinc-800 h-9 min-h-0 hover:bg-zinc-700 data-[hover=true]:bg-zinc-700 group-data-[focus=true]:bg-zinc-700 px-3"
           }}
        />
    </div>
);

const SectionTitle = ({ children, icon: Icon }) => (
    <h2 className="text-sm font-bold text-zinc-400 mb-4 flex items-center gap-2 uppercase tracking-wider">
        {Icon && <Icon size={16} />}
        {children}
    </h2>
);

const SessionForm = () => {
  const { currentUser } = useAuth();
  const { currentTeam } = useTeam();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;
  
  const [loading, setLoading] = useState(false);
  const [processingCsv, setProcessingCsv] = useState(false);
  const [processingVoice, setProcessingVoice] = useState(false);
  const [availableFiles, setAvailableFiles] = useState([]);
  
  // Track Management
  const [tracks, setTracks] = useState([]);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [newTrackName, setNewTrackName] = useState("");
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    // 1. Metadata
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    driver: '',
    track: '',
    runNumber: '',
    sessionIndex: 1,
    sessionType: 'Test',
    kartNumber: '',
    sessionId: '',
    
    // 2. Track & Conditions
    trackTemp: '',
    trackConditions: 'DRY',
    tyreType: 'SLICK',
    tyreBrand: '',
    tyreLapsBefore: 0,
    tyreLapsAfter: 0,
    pressureUnit: 'mbar',
    
    // 3. Tyre Data
    coldPressures: { fl: '', fr: '', rl: '', rr: '' },
    coldTemp: '',
    hotPressures: { fl: '', fr: '', rl: '', rr: '' },
    hotTemps: { front: '', rear: '' },
    
    // 4. Objectives
    noOffTrack: false,
    regularityTarget: '',
    
    // 5. Metrics (Auto-computed or Manual)
    metrics: {
        laps: [],
        best_lap: 0,
        average_lap: 0,
        regularity: 0,
        theoretical_lap: 0
    },
    
    // 6. Setup & Feedback
    setup: '',
    pilotFeedback: '',
    teamNotes: '',
    
    // Link CSV
    linkedCsvUrl: ''
  });

  // Handle Initial Data from Navigation State (e.g. from AI Assistant)
  useEffect(() => {
      if (location.state && location.state.initialData) {
          const { initialData } = location.state;
          setFormData(prev => ({
              ...prev,
              track: initialData.track || prev.track,
              date: initialData.date || prev.date,
              sessionType: initialData.sessionType || prev.sessionType,
              setup: initialData.setup || prev.setup,
              conditions: initialData.conditions || prev.conditions,
              notes: initialData.notes || prev.notes,
              kartNumber: initialData.kartNumber || prev.kartNumber
          }));
      }
  }, [location.state]);

  // Fetch Tracks
  useEffect(() => {
    if (!currentUser) return;
    
    let q;
    if (currentTeam) {
        q = query(collection(db, "tracks"), where("teamId", "==", currentTeam.id));
    } else {
        q = query(collection(db, "tracks"), where("createdBy", "==", currentUser.uid));
    }

    getDocs(q).then(snapshot => {
      let data = snapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
      if (!currentTeam) {
          data = data.filter(t => !t.teamId);
      }
      data.sort((a, b) => a.name.localeCompare(b.name));
      setTracks(data);
    });
  }, [currentUser, currentTeam]);

  // Fetch Available CSV Files
  useEffect(() => {
    if (!currentUser || !formData.track) return;
    
    // Find track ID
    const selectedTrack = tracks.find(t => t.name === formData.track);
    if (!selectedTrack) return;

    // Fetch files from subcollection
    const fetchFiles = async () => {
        try {
            const sessionsRef = collection(db, "tracks", selectedTrack.id, "sessions");
            const snapshot = await getDocs(sessionsRef);
            const files = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
            setAvailableFiles(files);
        } catch (error) {
            console.error("Error fetching files:", error);
        }
    };
    fetchFiles();
  }, [currentUser, formData.track, tracks]);

  useEffect(() => {
    if (isEdit && currentUser) {
      const fetchSession = async () => {
        const docRef = doc(db, "log_sessions", id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.userId && data.userId !== currentUser.uid) {
             alert("You don't have permission to edit this session");
             navigate('/dashboard/sessions');
             return;
          }
          setFormData({ ...data });
        }
      };
      fetchSession();
    }
  }, [id, isEdit, currentUser]);

  const handleChange = (field, value, section = null) => {
      if (section) {
          setFormData(prev => ({
              ...prev,
              [section]: {
                  ...prev[section],
                  [field]: value
              }
          }));
      } else {
          setFormData(prev => ({ ...prev, [field]: value }));
      }
  };

  const handleCreateTrack = async () => {
      if (!newTrackName.trim()) return;
      setIsCreatingTrack(true);
      try {
          const trackData = {
              name: newTrackName.trim(),
              createdAt: serverTimestamp(),
              createdBy: currentUser.uid
          };

          if (currentTeam) {
              trackData.teamId = currentTeam.id;
          }

          const docRef = await addDoc(collection(db, "tracks"), trackData);
          // Update local state
          const newTrack = { id: docRef.id, ...trackData };
          const updatedTracks = [...tracks, newTrack].sort((a, b) => a.name.localeCompare(b.name));
          setTracks(updatedTracks);
          setFormData(prev => ({ ...prev, track: newTrack.name })); // Auto select
          setNewTrackName("");
          onOpenChange(false);
      } catch (error) {
          console.error("Error creating track:", error);
          alert("Failed to create track.");
      } finally {
          setIsCreatingTrack(false);
      }
  };

  const handleVoiceTranscript = async (text) => {
    if (!text) return;
    
    setProcessingVoice(true);
    try {
        const response = await axios.post('http://localhost:8000/api/v1/analyze/voice-command', {
            text: text
        });
        
        const data = response.data;
        if (data && !data.error) {
            // Merge extracted data into form
            setFormData(prev => ({
                ...prev,
                track: data.track || prev.track,
                date: data.date || prev.date,
                sessionType: data.sessionType || prev.sessionType,
                setup: data.setup || prev.setup,
                conditions: data.conditions || prev.conditions,
                notes: data.notes || prev.notes,
                kartNumber: data.kartNumber || prev.kartNumber
            }));
        }
    } catch (error) {
        console.error("Voice analysis failed", error);
        alert("Failed to process voice command.");
    } finally {
        setProcessingVoice(false);
    }
  };

  const handleProcessCsv = async (file) => {
      if (!file || !file.storageUrl) return;
      setProcessingCsv(true);

      try {
          const response = await axios.post(`${API_URL}/api/v1/sessions/process-csv`, {
              file_url: file.storageUrl,
              storage_path: file.storagePath || null
          });
          
          const { metrics, metadata } = response.data;

          setFormData(prev => ({
              ...prev,
              metrics: metrics,
              // Autofill metadata if available and empty in form
              driver: prev.driver || metadata.Racer || metadata.Driver || '',
              track: prev.track || metadata.Session || metadata.Track || '',
              date: metadata.Date ? new Date(metadata.Date).toISOString().split('T')[0] : prev.date,
              time: metadata.Time ? convertTime12to24(metadata.Time) : prev.time
          }));
          alert("Data File Processed Successfully! Metrics updated.");
      } catch (error) {
          console.error(error);
          alert("Error processing Data File. Check URL and try again.");
      } finally {
          setProcessingCsv(false);
      }
  };

  const convertTime12to24 = (time12h) => {
      try {
        const [time, modifier] = time12h.split(' ');
        let [hours, minutes] = time.split(':');
        if (hours === '12') {
            hours = '00';
        }
        if (modifier === 'PM') {
            hours = parseInt(hours, 10) + 12;
        }
        return `${hours}:${minutes}`;
      } catch {
          return time12h;
      }
  };

  const handleSubmit = async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      setLoading(true);
      try {
          const sessionData = {
              ...formData,
              userId: currentUser.uid,
              startAt: new Date(`${formData.date}T${formData.time}`).toISOString(),
              updatedAt: serverTimestamp()
          };

          if (currentTeam) {
              sessionData.teamId = currentTeam.id;
          }
          
          if (!isEdit) {
              sessionData.createdAt = serverTimestamp();
              await addDoc(collection(db, "log_sessions"), sessionData);
          } else {
              await setDoc(doc(db, "log_sessions", id), sessionData);
          }
          navigate('/dashboard/sessions');
      } catch (error) {
          console.error("Error saving session:", error);
          alert("Error saving session");
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto pb-32">
      <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-4">
              <Button 
                isIconOnly
                variant="light" 
                onPress={() => navigate('/dashboard/sessions')}
                className="text-zinc-400 hover:text-white"
              >
                <ArrowLeft size={24} />
              </Button>
              <div>
                <h1 className="text-2xl font-bold">New Session Log</h1>
                <p className="text-zinc-400 text-sm">Record details about your run</p>
              </div>
            </div>
            
            {/* Voice Input Integration */}
            <div className="flex items-center gap-3 bg-zinc-900/50 p-2 pr-4 rounded-full border border-zinc-800">
                <VoiceInput onTranscript={handleVoiceTranscript} isProcessing={processingVoice} />
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-white flex items-center gap-1">
                        AI Voice Fill <Sparkles size={10} className="text-[#e8fe41]" />
                    </span>
                    <span className="text-[10px] text-zinc-500">"I drove at Genk yesterday..."</span>
                </div>
            </div>

            <div className="flex gap-2">
            <Button 
                color="primary" 
                className="font-bold"
                startContent={loading ? <Loader2 className="animate-spin" /> : <Save size={18} />}
                onPress={handleSubmit}
                isLoading={loading}
            >
                {isEdit ? 'Update' : 'Save'}
            </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN (Main Data) */}
          <div className="lg:col-span-8 space-y-6">
              
              {/* 1. Metadata Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                  <SectionTitle icon={FileText}>Session Metadata</SectionTitle>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <Field label="Date" type="date" value={formData.date} onChange={v => handleChange('date', v)} />
                      <Field label="Time" type="time" value={formData.time} onChange={v => handleChange('time', v)} />
                      <Field label="Driver" value={formData.driver} onChange={v => handleChange('driver', v)} className="md:col-span-2" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2 flex flex-col gap-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Track</label>
                          <div className="flex gap-2">
                              <Select 
                                  aria-label="Track"
                                  selectedKeys={formData.track ? new Set([tracks.find(t => t.name === formData.track)?.id].filter(Boolean)) : new Set([])}
                                  onSelectionChange={(keys) => {
                                      const selectedId = Array.from(keys)[0];
                                      const selectedTrack = tracks.find(t => t.id === selectedId);
                                      if (selectedTrack) {
                                          handleChange('track', selectedTrack.name);
                                      }
                                  }}
                                  placeholder="Select a track"
                                  size="sm"
                                  classNames={{ 
                                      trigger: "bg-zinc-800 h-9 min-h-0",
                                      value: "text-white group-data-[has-value=true]:text-white"
                                  }}
                                  popoverProps={{ 
                                      classNames: { 
                                          content: "bg-zinc-900 border border-zinc-800" 
                                      } 
                                  }}
                              >
                                  {tracks.map((track) => (
                                      <SelectItem key={track.id} textValue={track.name} className="text-white data-[hover=true]:bg-zinc-800">
                                          {track.name}
                                      </SelectItem>
                                  ))}
                              </Select>
                              <Button isIconOnly size="sm" onPress={onOpen} className="bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 min-w-9 h-9">
                                  <Plus size={16} />
                              </Button>
                          </div>
                      </div>
                      <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Session Type</label>
                          <Select 
                            aria-label="Session type"
                            selectedKeys={new Set([formData.sessionType])} 
                            onSelectionChange={(keys) => handleChange('sessionType', Array.from(keys)[0])}
                            size="sm"
                            classNames={{ 
                                trigger: "bg-zinc-800 h-9 min-h-0",
                                value: "text-white group-data-[has-value=true]:text-white"
                            }}
                            popoverProps={{ 
                                classNames: { 
                                    content: "bg-zinc-900 border border-zinc-800" 
                                } 
                            }}
                          >
                              <SelectItem key="Test" className="text-white data-[hover=true]:bg-zinc-800">Test</SelectItem>
                              <SelectItem key="Race" className="text-white data-[hover=true]:bg-zinc-800">Race</SelectItem>
                              <SelectItem key="Practice" className="text-white data-[hover=true]:bg-zinc-800">Practice</SelectItem>
                              <SelectItem key="Qualifying" className="text-white data-[hover=true]:bg-zinc-800">Qualifying</SelectItem>
                          </Select>
                      </div>
                      <Field label="Run #" value={formData.runNumber} onChange={v => handleChange('runNumber', v)} />
                  </div>
              </div>

              {/* 2. Technical Setup */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                  <SectionTitle icon={AlertCircle}>Technical Conditions</SectionTitle>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <Field label="Track Temp (°C)" type="number" value={formData.trackTemp} onChange={v => handleChange('trackTemp', v)} />
                      <Field label="Conditions" value={formData.trackConditions} onChange={v => handleChange('trackConditions', v)} />
                      <Field label="Tyre Type" value={formData.tyreType} onChange={v => handleChange('tyreType', v)} />
                      <Field label="Tyre Brand" value={formData.tyreBrand} onChange={v => handleChange('tyreBrand', v)} />
                      <Field label="Pressure Unit" value={formData.pressureUnit} onChange={v => handleChange('pressureUnit', v)} />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                       <Field label="Tyre Laps (Start)" type="number" value={formData.tyreLapsBefore} onChange={v => handleChange('tyreLapsBefore', v)} />
                       <Field label="Tyre Laps (End)" type="number" value={formData.tyreLapsAfter} onChange={v => handleChange('tyreLapsAfter', v)} />
                  </div>
              </div>

              {/* 3. Tyre Pressures (Visual Grid) */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                      <SectionTitle icon={CheckCircle}>Tyre Pressures</SectionTitle>
                      <div className="flex gap-4 text-xs">
                          <span className="flex items-center gap-1 text-blue-400"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Cold</span>
                          <span className="flex items-center gap-1 text-red-400"><div className="w-2 h-2 rounded-full bg-red-400"></div> Hot</span>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Left Side (FL + RL) */}
                      <div className="space-y-4">
                          {/* FL */}
                          <div className="flex gap-2 items-end">
                              <div className="w-8 text-right font-bold text-zinc-500 text-xs py-2">FL</div>
                              <Field label="Cold" value={formData.coldPressures.fl} onChange={v => handleChange('fl', v, 'coldPressures')} className="flex-1" />
                              <Field label="Hot" value={formData.hotPressures.fl} onChange={v => handleChange('fl', v, 'hotPressures')} className="flex-1" />
                          </div>
                          {/* RL */}
                          <div className="flex gap-2 items-end">
                              <div className="w-8 text-right font-bold text-zinc-500 text-xs py-2">RL</div>
                              <Field label="Cold" value={formData.coldPressures.rl} onChange={v => handleChange('rl', v, 'coldPressures')} className="flex-1" />
                              <Field label="Hot" value={formData.hotPressures.rl} onChange={v => handleChange('rl', v, 'hotPressures')} className="flex-1" />
                          </div>
                      </div>

                      {/* Right Side (FR + RR) */}
                      <div className="space-y-4">
                          {/* FR */}
                          <div className="flex gap-2 items-end">
                              <Field label="Cold" value={formData.coldPressures.fr} onChange={v => handleChange('fr', v, 'coldPressures')} className="flex-1" />
                              <Field label="Hot" value={formData.hotPressures.fr} onChange={v => handleChange('fr', v, 'hotPressures')} className="flex-1" />
                              <div className="w-8 font-bold text-zinc-500 text-xs py-2">FR</div>
                          </div>
                          {/* RR */}
                          <div className="flex gap-2 items-end">
                              <Field label="Cold" value={formData.coldPressures.rr} onChange={v => handleChange('rr', v, 'coldPressures')} className="flex-1" />
                              <Field label="Hot" value={formData.hotPressures.rr} onChange={v => handleChange('rr', v, 'hotPressures')} className="flex-1" />
                              <div className="w-8 font-bold text-zinc-500 text-xs py-2">RR</div>
                          </div>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-zinc-800/50">
                      <Field label="General Cold Temp" value={formData.coldTemp} onChange={v => handleChange('coldTemp', v)} />
                      <Field label="Hot Temp Front" value={formData.hotTemps.front} onChange={v => handleChange('front', v, 'hotTemps')} />
                      <Field label="Hot Temp Rear" value={formData.hotTemps.rear} onChange={v => handleChange('rear', v, 'hotTemps')} />
                  </div>
              </div>

              {/* 4. Feedback & Notes */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                  <SectionTitle icon={FileText}>Feedback & Notes</SectionTitle>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                           <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Setup Details</label>
                           <Textarea 
                              minRows={2}
                              value={formData.setup} 
                              onChange={e => handleChange('setup', e.target.value)} 
                              classNames={{ input: "bg-zinc-800 text-sm", inputWrapper: "bg-zinc-800" }}
                              placeholder="Chassis settings, engine tuning, etc."
                          />
                      </div>
                      <div>
                           <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Pilot Feedback</label>
                           <Textarea 
                              minRows={3}
                              value={formData.pilotFeedback} 
                              onChange={e => handleChange('pilotFeedback', e.target.value)} 
                              classNames={{ input: "bg-zinc-800 text-sm", inputWrapper: "bg-zinc-800" }}
                              placeholder="Handling, braking, acceleration..."
                          />
                      </div>
                      <div>
                           <label className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1 block">Team Notes</label>
                           <Textarea 
                              minRows={3}
                              value={formData.teamNotes} 
                              onChange={e => handleChange('teamNotes', e.target.value)} 
                              classNames={{ input: "bg-zinc-800 text-sm", inputWrapper: "bg-zinc-800" }}
                              placeholder="Observations, strategy, changes..."
                          />
                      </div>
                  </div>
              </div>
          </div>

          {/* RIGHT COLUMN (Metrics & Linking) */}
          <div className="lg:col-span-4 space-y-6">
              
              {/* CSV Linker */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                  <SectionTitle icon={FileText}>Data File</SectionTitle>
                  <div className="flex gap-2 mb-2">
                      <Select
                          aria-label="Data file"
                          placeholder="Select a data file..."
                          selectedKeys={formData.linkedCsvUrl ? new Set([formData.linkedCsvUrl]) : new Set()}
                          onSelectionChange={(keys) => {
                              const url = Array.from(keys)[0];
                              handleChange('linkedCsvUrl', url);
                              const file = availableFiles.find(f => f.storageUrl === url);
                              if (file) {
                                  handleProcessCsv(file);
                              }
                          }}
                          size="sm"
                          classNames={{ 
                            trigger: "bg-zinc-800 h-9 min-h-0",
                            value: "text-white group-data-[has-value=true]:text-white"
                          }}
                          popoverProps={{ 
                            classNames: { 
                                content: "bg-zinc-900 border border-zinc-800 max-h-60 overflow-y-auto" 
                            } 
                          }}
                          renderValue={(items) => {
                              return items.map((item) => (
                                  <div key={item.key} className="flex items-center gap-2 text-white">
                                      <FileText size={14} />
                                      <span>{item.data?.fileName || item.textValue}</span>
                                  </div>
                              ));
                          }}
                      >
                          {availableFiles.map((file) => (
                              <SelectItem 
                                key={file.storageUrl} 
                                textValue={file.fileName}
                                className="text-white data-[hover=true]:bg-zinc-800"
                              >
                                  <div className="flex flex-col">
                                      <span className="text-white font-medium">{file.fileName}</span>
                                      <span className="text-[10px] text-zinc-500">
                                          {file.uploadedAt?.seconds ? new Date(file.uploadedAt.seconds * 1000).toLocaleDateString() : 'Unknown Date'}
                                          {file.fileSize ? ` • ${(file.fileSize / 1024).toFixed(1)} KB` : ''}
                                      </span>
                                  </div>
                              </SelectItem>
                          ))}
                      </Select>
                      {processingCsv && <Loader2 className="animate-spin text-zinc-500" />}
                  </div>
                  {formData.metrics.laps.length > 0 && (
                      <div className="text-xs text-green-400 bg-green-900/20 p-2 rounded flex items-center gap-2">
                          <CheckCircle size={12} />
                          <span>Linked & Computed ({formData.metrics.laps.length} laps)</span>
                      </div>
                  )}
              </div>

              {/* Metrics Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                  <SectionTitle icon={CheckCircle}>Session Metrics</SectionTitle>
                  
                  <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Best Lap</span>
                          <span className="text-xl font-mono text-[#e8fe41] font-bold">
                              {formData.metrics.best_lap ? formData.metrics.best_lap.toFixed(3) : '--.---'}
                          </span>
                      </div>
                      <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Avg Lap</span>
                          <span className="text-xl font-mono text-white font-bold">
                              {formData.metrics.average_lap ? formData.metrics.average_lap.toFixed(3) : '--.---'}
                          </span>
                      </div>
                      <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Consistency</span>
                          <span className="text-xl font-mono text-blue-400 font-bold">
                              {formData.metrics.regularity ? formData.metrics.regularity.toFixed(3) : '--.---'}
                          </span>
                      </div>
                      <div className="bg-black/40 p-3 rounded-lg border border-zinc-800/50">
                          <span className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">Theoretical</span>
                          <span className="text-xl font-mono text-purple-400 font-bold">
                              {formData.metrics.theoretical_lap ? formData.metrics.theoretical_lap.toFixed(3) : '--.---'}
                          </span>
                      </div>
                  </div>

                  {/* Objectives */}
                  <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                      <div className="flex items-center justify-between">
                          <span className="text-sm text-zinc-400">No Off-Track</span>
                          <input 
                            type="checkbox" 
                            checked={formData.noOffTrack} 
                            onChange={e => handleChange('noOffTrack', e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 bg-zinc-800 text-[#e8fe41] focus:ring-[#e8fe41]"
                          />
                      </div>
                      <div className="flex items-center justify-between gap-4">
                          <span className="text-sm text-zinc-400 whitespace-nowrap">Target Reg.</span>
                          <Input 
                             size="sm" 
                             value={formData.regularityTarget} 
                             onChange={e => handleChange('regularityTarget', e.target.value)} 
                             classNames={{ input: "bg-zinc-800 text-right", inputWrapper: "bg-zinc-800 h-8 min-h-0 w-24" }}
                          />
                      </div>
                  </div>
              </div>
              
              {/* Laps List */}
              {formData.metrics.laps.length > 0 && (
                  <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 max-h-96 overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                          <SectionTitle icon={FileText} className="mb-0">Lap Times</SectionTitle>
                          <span className="text-[10px] text-zinc-500 uppercase">Click to select Best Lap</span>
                      </div>
                      <div className="space-y-2">
                          {formData.metrics.laps.map((lapTime, index) => {
                              const isBestLap = Math.abs(lapTime - formData.metrics.best_lap) < 0.001;
                              return (
                                  <div 
                                    key={index} 
                                    onClick={() => handleChange('metrics', { ...formData.metrics, best_lap: lapTime })}
                                    className={`
                                        flex justify-between items-center text-sm p-2 rounded cursor-pointer transition-all border-b border-zinc-800/30 last:border-0 group
                                        ${isBestLap ? 'bg-[#e8fe41]/10 border-[#e8fe41]/20' : 'hover:bg-zinc-800/50'}
                                    `}
                                  >
                                      <div className="flex items-center gap-2">
                                          <span className={`font-mono ${isBestLap ? 'text-[#e8fe41]' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                                              Lap {index + 1}
                                          </span>
                                          {isBestLap && <Star size={12} className="text-[#e8fe41] fill-[#e8fe41]" />}
                                      </div>
                                      <span className={`font-mono font-bold ${
                                          isBestLap 
                                              ? 'text-[#e8fe41]' 
                                              : 'text-white group-hover:text-[#e8fe41]/70'
                                      }`}>
                                          {lapTime.toFixed(3)}
                                      </span>
                                  </div>
                              );
                          })}
                      </div>
                  </div>
              )}
              
              {/* Quick Info / Metadata 2 */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
                   <div className="flex justify-between items-center text-sm text-zinc-500">
                       <span>Kart #</span>
                       <Input 
                           size="sm" 
                           value={formData.kartNumber} 
                           onChange={e => handleChange('kartNumber', e.target.value)}
                           classNames={{ input: "bg-zinc-800 text-right", inputWrapper: "bg-zinc-800 h-8 min-h-0 w-20" }}
                       />
                   </div>
                   <div className="flex justify-between items-center text-sm text-zinc-500 mt-2">
                       <span>Index</span>
                       <Input 
                           type="number"
                           size="sm" 
                           value={formData.sessionIndex} 
                           onChange={e => handleChange('sessionIndex', e.target.value)}
                           classNames={{ input: "bg-zinc-800 text-right", inputWrapper: "bg-zinc-800 h-8 min-h-0 w-20" }}
                       />
                   </div>
              </div>

          </div>
      </div>
      {/* Create Track Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="center" classNames={{ base: "bg-zinc-900 border border-zinc-800 text-white mx-auto" }}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1">Create New Track</ModalHeader>
              <ModalBody>
                <p className="text-sm text-zinc-400">Enter the name of the new track to add it to the list.</p>
                <Input
                  autoFocus
                  label="Track Name"
                  placeholder="e.g. Genk, Mariembourg..."
                  variant="bordered"
                  value={newTrackName}
                  onChange={(e) => setNewTrackName(e.target.value)}
                  classNames={{
                    input: "text-white",
                    inputWrapper: "border-zinc-700 hover:border-zinc-600 focus-within:!border-[#e8fe41]"
                  }}
                />
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={onClose}>
                  Cancel
                </Button>
                <Button color="primary" onPress={handleCreateTrack} isLoading={isCreatingTrack} className="bg-[#e8fe41] text-black font-bold">
                  Create Track
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

    </div>
  );
};

export default SessionForm;
