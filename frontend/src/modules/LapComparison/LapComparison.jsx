import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardBody, CardHeader, Button, Select, SelectItem, Chip, Spinner } from "@heroui/react";
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';
import { ArrowRightLeft, FileText, AlertCircle, CheckCircle2, Cpu, Zap, Activity, Gauge, Wrench, Lightbulb, Trophy } from 'lucide-react';
import SectionTitle from '../../components/SectionTitle';
import { motion, AnimatePresence } from 'framer-motion';

const LoadingAnimation = () => (
    <div className="flex flex-col items-center justify-center py-20 space-y-8">
        <div className="relative w-24 h-24">
            <motion.div 
                className="absolute inset-0 rounded-full border-4 border-zinc-200 dark:border-zinc-800"
            />
            <motion.div 
                className="absolute inset-0 rounded-full border-4 border-t-[#e8fe41] border-r-[#e8fe41] border-b-transparent border-l-transparent"
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
            <motion.div 
                className="absolute inset-4 rounded-full border-4 border-t-zinc-900 dark:border-t-white border-r-transparent border-b-transparent border-l-transparent"
                animate={{ rotate: -360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
                <Cpu className="text-[#e8fe41]" size={32} />
            </div>
        </div>
        <div className="text-center space-y-2">
            <h3 className="text-xl font-bold">Analyzing Telemetry Data</h3>
            <p className="text-zinc-500 max-w-md">
                Extracting optimal lap data, comparing throttle traces, and identifying performance deltas...
            </p>
        </div>
    </div>
);

// Custom Markdown Components for consistent styling
const MarkdownComponents = {
    h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 text-zinc-900 dark:text-white" {...props} />,
    h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-4 text-zinc-900 dark:text-white flex items-center gap-2" {...props} />,
    h3: ({node, ...props}) => <h3 className="text-lg font-semibold mb-2 mt-3 text-zinc-800 dark:text-zinc-100" {...props} />,
    p: ({node, ...props}) => <p className="mb-4 text-zinc-600 dark:text-zinc-300 leading-relaxed" {...props} />,
    ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-1 text-zinc-600 dark:text-zinc-300" {...props} />,
    li: ({node, ...props}) => <li className="pl-1" {...props} />,
    strong: ({node, ...props}) => <strong className="font-semibold text-zinc-900 dark:text-white" {...props} />,
    table: ({node, ...props}) => (
        <div className="overflow-x-auto my-4 rounded-xl border border-zinc-200 dark:border-zinc-700 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#e8fe41] [&::-webkit-scrollbar-thumb]:rounded-full">
            <table className="w-full text-sm text-left" {...props} />
        </div>
    ),
    thead: ({node, ...props}) => <thead className="bg-zinc-50 dark:bg-zinc-800 text-xs uppercase font-bold text-zinc-500" {...props} />,
    th: ({node, ...props}) => <th className="px-6 py-3" {...props} />,
    td: ({node, ...props}) => <td className="px-6 py-4 border-t border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 whitespace-nowrap" {...props} />,
};

const AnalysisReport = ({ markdown }) => {
    // Parse the markdown into sections based on H2 headers (##)
    const sections = useMemo(() => {
        if (!markdown) return [];

        // Split by "\n## " to get sections
        const parts = markdown.split(/\n##\s/);
        
        return parts.map((part, index) => {
            if (index === 0 && part.startsWith('# ')) {
                // This is likely the main title block.
                // If it only contains the title (lines <= 2 to account for potential blank lines), skip it
                // because we already have a "Analysis Report" header.
                const lines = part.split('\n').filter(l => l.trim().length > 0);
                if (lines.length <= 1) return null;
                
                return { title: "Introduction", content: part };
            }

            // For subsequent parts, the first line is the title
            const firstLineEnd = part.indexOf('\n');
            if (firstLineEnd === -1) return { title: "Section", content: part };

            const title = part.substring(0, firstLineEnd).trim();
            const content = part.substring(firstLineEnd).trim();

            // Assign icons based on title keywords
            let icon = <FileText size={20} />;
            let color = "text-zinc-500";
            
            const t = title.toLowerCase();
            if (t.includes('overview') || t.includes('summary')) { icon = <Activity size={20} />; color = "text-blue-500"; }
            else if (t.includes('consistency') || t.includes('pace')) { icon = <Gauge size={20} />; color = "text-purple-500"; }
            else if (t.includes('telemetry') || t.includes('deep dive')) { icon = <Zap size={20} />; color = "text-[#e8fe41]"; }
            else if (t.includes('mechanical') || t.includes('health')) { icon = <Wrench size={20} />; color = "text-orange-500"; }
            else if (t.includes('questions') || t.includes('engineering')) { icon = <Lightbulb size={20} />; color = "text-yellow-500"; }
            else if (t.includes('recommendations') || t.includes('actionable')) { icon = <Trophy size={20} />; color = "text-green-500"; }

            return { title, content, icon, color };
        }).filter(s => s && s.content.trim().length > 0);
    }, [markdown]);

    // Separate sections for layout
    const { intro, overview, recommendations, others } = useMemo(() => {
        let intro = null;
        let overview = null;
        let recommendations = null;
        const others = [];

        sections.forEach(section => {
            const t = section.title.toLowerCase();
            if (section.title === 'Introduction') {
                intro = section;
            } else if (t.includes('overview') || t.includes('summary')) {
                overview = section;
            } else if (t.includes('recommendations') || t.includes('actionable')) {
                recommendations = section;
            } else {
                others.push(section);
            }
        });

        return { intro, overview, recommendations, others };
    }, [sections]);

    const SectionCard = ({ section, className = "" }) => (
        <Card className={`h-fit border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-3xl bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm ${className}`}>
            <CardHeader className="flex gap-3 px-6 pt-6 pb-2">
                <div className={`p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 ${section.color}`}>
                    {section.icon}
                </div>
                <div className="flex flex-col">
                    <p className="text-lg font-bold text-zinc-900 dark:text-white">{section.title}</p>
                </div>
            </CardHeader>
            <CardBody className="px-6 pb-6 pt-2">
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={MarkdownComponents}
                >
                    {section.content}
                </ReactMarkdown>
            </CardBody>
        </Card>
    );

    return (
        <div className="space-y-8">
             <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-2 bg-[#e8fe41] rounded-full" />
                    <h2 className="text-3xl font-bold">Analysis Report</h2>
                </div>
            </div>

            {/* Introduction / Overview */}
            <div className="space-y-6">
                {intro && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                        <SectionCard section={intro} />
                    </motion.div>
                )}
                {overview && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        <SectionCard section={overview} />
                    </motion.div>
                )}
            </div>

            {/* Detailed Grid */}
            <div className="columns-1 md:columns-2 gap-6 space-y-6">
                {others.map((section, idx) => (
                    <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + (idx * 0.1) }}
                        className="break-inside-avoid"
                    >
                        <SectionCard section={section} />
                    </motion.div>
                ))}
            </div>

            {/* Recommendations */}
            {recommendations && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ delay: 0.5 }}
                >
                    <SectionCard section={recommendations} />
                </motion.div>
            )}
        </div>
    );
};

const FileSelector = ({ label, onSelect, selectedSession, tracks }) => {
    const [selectedTrackId, setSelectedTrackId] = useState("");
    const [sessions, setSessions] = useState([]);
    const [isLoadingSessions, setIsLoadingSessions] = useState(false);

    useEffect(() => {
        if (!selectedTrackId) {
            setSessions([]);
            return;
        }

        setIsLoadingSessions(true);
        const fetchSessions = async () => {
            try {
                const sessionsRef = collection(db, "tracks", selectedTrackId, "sessions");
                // Client-side sorting is often easier if indexes are missing, but let's try basic fetch
                const snapshot = await getDocs(sessionsRef);
                const sessionsData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                // Sort by date desc
                sessionsData.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
                setSessions(sessionsData);
            } catch (error) {
                console.error("Error fetching sessions:", error);
            } finally {
                setIsLoadingSessions(false);
            }
        };

        fetchSessions();
    }, [selectedTrackId]);

    const handleSessionChange = (e) => {
        const sessionId = e.target.value;
        const session = sessions.find(s => s.id === sessionId);
        onSelect(session);
    };

    return (
        <Card className="h-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl overflow-hidden">
            <CardBody className="p-8 flex flex-col gap-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                        <FileText size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl">{label}</h3>
                        <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">Select Source</p>
                    </div>
                    {selectedSession && <CheckCircle2 size={24} className="ml-auto text-[#e8fe41]" />}
                </div>

                <div className="space-y-4">
                    <Select 
                        label="Select Track" 
                        placeholder="Choose a track"
                        selectedKeys={selectedTrackId ? [selectedTrackId] : []}
                        onChange={(e) => {
                            setSelectedTrackId(e.target.value);
                            onSelect(null); // Reset session when track changes
                        }}
                        variant="flat"
                        classNames={{
                            trigger: "bg-zinc-100 dark:bg-zinc-800 rounded-xl h-14",
                            popoverContent: "bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800",
                            innerWrapper: "pt-4",
                            value: "text-zinc-900 dark:text-white"
                        }}
                    >
                        {tracks.map((track) => (
                            <SelectItem key={track.id} value={track.id} textValue={track.name} className="text-zinc-900 dark:text-white">
                                {track.name}
                            </SelectItem>
                        ))}
                    </Select>

                    <Select 
                        label="Select Session" 
                        placeholder="Choose a session"
                        selectedKeys={selectedSession ? [selectedSession.id] : []}
                        onChange={handleSessionChange}
                        isDisabled={!selectedTrackId || isLoadingSessions}
                        variant="flat"
                        isLoading={isLoadingSessions}
                        classNames={{
                            trigger: "bg-zinc-100 dark:bg-zinc-800 rounded-xl h-14",
                            popoverContent: "bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800",
                            innerWrapper: "pt-4",
                            value: "text-zinc-900 dark:text-white"
                        }}
                    >
                        {sessions.map((session) => (
                            <SelectItem key={session.id} value={session.id} textValue={session.fileName || session.id} className="text-zinc-900 dark:text-white">
                                <div className="flex flex-col">
                                    <span className="text-small font-bold text-zinc-900 dark:text-white">{session.fileName}</span>
                                    <span className="text-tiny text-default-400">
                                        {session.date ? new Date(session.date.seconds * 1000).toLocaleDateString() : "No date"}
                                    </span>
                                </div>
                            </SelectItem>
                        ))}
                    </Select>
                </div>

                {selectedSession && (
                    <div className="mt-auto pt-6 border-t border-zinc-100 dark:border-zinc-800">
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[10px] text-zinc-400 uppercase font-bold mb-1 tracking-wider">Selected File</p>
                                <p className="text-sm font-bold truncate max-w-[200px]">{selectedSession.fileName}</p>
                            </div>
                            <Chip size="sm" variant="flat" className="bg-[#e8fe41]/20 text-black dark:text-[#e8fe41]">
                                {selectedSession.date ? new Date(selectedSession.date.seconds * 1000).toLocaleDateString() : ""}
                            </Chip>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

const LapComparison = () => {
    const { currentUser } = useAuth();
    const { currentTeam } = useTeam();
    const [tracks, setTracks] = useState([]);
    
    const [session1, setSession1] = useState(null);
    const [session2, setSession2] = useState(null);
    
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [error, setError] = useState(null);

    // Fetch Tracks
    useEffect(() => {
        if (!currentUser) return;
        
        let q;
        if (currentTeam) {
            q = query(collection(db, "tracks"), where("teamId", "==", currentTeam.id));
        } else {
            q = query(collection(db, "tracks"), where("createdBy", "==", currentUser.uid));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let tracksData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            
            // Filter out team tracks if in personal mode
            if (!currentTeam) {
                tracksData = tracksData.filter(t => !t.teamId);
            }
            
            tracksData.sort((a, b) => a.name.localeCompare(b.name));
            setTracks(tracksData);
        });
        
        return () => unsubscribe();
    }, [currentUser, currentTeam]);

    const handleCompare = async () => {
        if (!session1 || !session2) return;
        
        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);

        try {
            const payload = {
                url1: session1.storageUrl,
                url2: session2.storageUrl,
                label1: session1.fileName || "Session 1",
                label2: session2.fileName || "Session 2",
                storage_path1: session1.storagePath,
                storage_path2: session2.storagePath
            };

            const response = await axios.post('http://localhost:8000/api/v1/analyze/lap-comparison', payload);
            
            if (response.data && response.data.analysis) {
                setAnalysisResult(response.data.analysis);
            } else if (response.data && response.data.error) {
                setError(response.data.error);
            } else {
                setError("Unexpected response from server.");
            }

        } catch (err) {
            console.error("Analysis failed:", err);
            setError(err.response?.data?.detail || "Failed to analyze sessions. Please check the files and try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-12 pb-24">
            {/* Header Section */}
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <SectionTitle title="Lap Comparison" />
                    <Chip className="bg-[#e8fe41] text-black font-bold border-none" size="sm">BETA</Chip>
                </div>
                <div className="max-w-3xl">
                    <h2 className="text-2xl md:text-3xl font-bold mb-4">AI-Powered Performance Analysis</h2>
                    <p className="text-zinc-500 text-base md:text-lg leading-relaxed">
                        This tool uses a hybrid analysis engine to compare two sessions. It extracts your <span className="text-black dark:text-white font-bold">Fastest Lap</span> in full resolution to analyze braking points, apex speeds, and throttle application at the limit, while also reviewing the <span className="text-black dark:text-white font-bold">Full Session</span> to evaluate consistency and tire management.
                    </p>
                </div>
            </div>

            {/* Selection Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <FileSelector 
                    label="Reference Session" 
                    tracks={tracks} 
                    onSelect={setSession1} 
                    selectedSession={session1} 
                />
                <FileSelector 
                    label="Target Session" 
                    tracks={tracks} 
                    onSelect={setSession2} 
                    selectedSession={session2} 
                />
            </div>

            {/* Action Area */}
            <AnimatePresence mode="wait">
                {isAnalyzing ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <LoadingAnimation />
                    </motion.div>
                ) : (
                    !analysisResult && (
                        <motion.div 
                            key="button"
                            className="flex justify-center pt-8"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Button
                                size="lg"
                                className="font-bold px-16 h-16 text-lg rounded-full bg-[#e8fe41] text-black shadow-xl shadow-[#e8fe41]/20 hover:scale-105 transition-transform"
                                startContent={<ArrowRightLeft size={24} />}
                                isDisabled={!session1 || !session2}
                                onPress={handleCompare}
                            >
                                Compare Sessions
                            </Button>
                        </motion.div>
                    )
                )}
            </AnimatePresence>

            {/* Error Message */}
            {error && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 flex items-center gap-4 max-w-2xl mx-auto"
                >
                    <div className="p-3 bg-red-100 dark:bg-red-800/30 rounded-full">
                        <AlertCircle size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold mb-1">Analysis Failed</h4>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </motion.div>
            )}

            {/* Results Section */}
            {analysisResult && !isAnalyzing && (
                <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="relative"
                >
                    <div className="absolute -right-4 top-0 hidden xl:block">
                        <Button 
                            variant="light" 
                            color="primary" 
                            onPress={() => setAnalysisResult(null)}
                            startContent={<ArrowRightLeft size={18} />}
                        >
                            New Comparison
                        </Button>
                    </div>

                    <AnalysisReport markdown={analysisResult} />
                    
                    <div className="flex justify-center mt-12 xl:hidden">
                        <Button 
                            variant="flat" 
                            className="bg-zinc-100 dark:bg-zinc-800"
                            onPress={() => setAnalysisResult(null)}
                            startContent={<ArrowRightLeft size={18} />}
                        >
                            Start New Comparison
                        </Button>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default LapComparison;
