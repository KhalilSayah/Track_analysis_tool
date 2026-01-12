import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Select, SelectItem, Spinner, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Zap, Play, Search, AlertTriangle, Info } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import axios from 'axios';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const BindingAnalysis = () => {
    const { currentUser } = useAuth();
    const { currentTeam } = useTeam();
    const [tracks, setTracks] = useState([]);
    const [sessions, setSessions] = useState([]);
    
    const [selectedTrackId, setSelectedTrackId] = useState("");
    const [selectedSession, setSelectedSession] = useState(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [baselineData, setBaselineData] = useState(null);
    const [cornerAnalysis, setCornerAnalysis] = useState(null);
    const [isAnalyzingCorner, setIsAnalyzingCorner] = useState(false);

    // Reference Analysis State
    const [selectedRefSession, setSelectedRefSession] = useState(null);
    const [refAnalysisResult, setRefAnalysisResult] = useState(null);
    const [isAnalyzingRef, setIsAnalyzingRef] = useState(false);

    // AI Analysis State
    const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
    const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
    const [selectedPoint, setSelectedPoint] = useState(null);

    useEffect(() => {
        document.title = "Binding Analysis | Karting Analysis";
    }, []);

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
            
            if (!currentTeam) {
                tracksData = tracksData.filter(t => !t.teamId);
            }

            tracksData.sort((a, b) => a.name.localeCompare(b.name));
            setTracks(tracksData);
        });
        return unsubscribe;
    }, [currentUser, currentTeam]);

    // Fetch Sessions for Selected Track
    useEffect(() => {
        if (!selectedTrackId) {
            setSessions([]);
            return;
        }
        
        const sessionsRef = collection(db, "tracks", selectedTrackId, "sessions");
        const q = query(sessionsRef); 
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessionsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by uploadedAt desc
            sessionsData.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
            setSessions(sessionsData);
        });
        return unsubscribe;
    }, [selectedTrackId]);

    const handleAnalyzeInit = async () => {
        if (!selectedSession) return;
        
        setIsLoading(true);
        setBaselineData(null);
        setCornerAnalysis(null);
        
        try {
            const response = await axios.post('http://localhost:8000/api/v1/analyze/binding/init', {
                file_url: selectedSession.storageUrl,
                storage_path: selectedSession.storagePath
            });
            setBaselineData(response.data);
        } catch (error) {
            console.error("Error initializing analysis:", error);
            alert("Failed to analyze session. Check console.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleChartClick = async (e) => {
        console.log("Chart clicked event:", e);
        let clickX, clickY;

        if (e && e.payload) {
            // Click on a scatter point
            clickX = e.payload.x;
            clickY = e.payload.y;
            console.log("Extracted from payload:", clickX, clickY);
        } else if (e && e.xValue !== undefined && e.yValue !== undefined) {
            // Fallback for chart click if supported
            clickX = e.xValue;
            clickY = e.yValue;
            console.log("Extracted from xValue/yValue:", clickX, clickY);
        } else {
            console.log("Could not extract coordinates from event");
            return;
        }
        
        if (!baselineData || !selectedSession) {
            console.log("Missing baseline or session");
            return;
        }
        
        setSelectedPoint({ x: clickX, y: clickY });
        setAiAnalysisResult(null); // Reset AI result on new selection

        setIsAnalyzingCorner(true);
        try {
            console.log("Sending request to backend...");
            const response = await axios.post('http://localhost:8000/api/v1/analyze/binding/corner', {
                file_url: selectedSession.storageUrl,
                storage_path: selectedSession.storagePath,
                baseline: baselineData,
                click_x: clickX,
                click_y: clickY,
                search_radius: 30.0
            });
            console.log("Backend response:", response.data);
            setCornerAnalysis(response.data);
        } catch (error) {
            console.error("Error analyzing corner:", error);
            alert("Failed to analyze corner.");
        } finally {
            setIsAnalyzingCorner(false);
        }
    };

    const handleRefAnalyze = async () => {
        if (!selectedRefSession) return;
        
        setIsAnalyzingRef(true);
        setRefAnalysisResult(null);
        setAiAnalysisResult(null); // Reset AI result on new reference
        
        try {
            const response = await axios.post('http://localhost:8000/api/v1/analyze/reference', {
                file_url: selectedRefSession.storageUrl,
                storage_path: selectedRefSession.storagePath
            });
            setRefAnalysisResult(response.data);
        } catch (error) {
            console.error("Error analyzing reference:", error);
            alert("Failed to analyze reference session.");
        } finally {
            setIsAnalyzingRef(false);
        }
    };

    const handleAIAnalyze = async () => {
        if (!cornerAnalysis || !refAnalysisResult || !selectedPoint) return;
        
        setIsAnalyzingAI(true);
        setAiAnalysisResult(null);
        
        try {
            const response = await axios.post('http://localhost:8000/api/v1/analyze/binding/ai', {
                target_corner_data: cornerAnalysis,
                reference_corners: refAnalysisResult.corners,
                click_x: selectedPoint.x,
                click_y: selectedPoint.y
            });
            setAiAnalysisResult(response.data);
        } catch (error) {
            console.error("Error analyzing AI:", error);
            alert("Failed to run AI analysis. Check console.");
        } finally {
            setIsAnalyzingAI(false);
        }
    };

    // Prepare chart data
    const chartData = baselineData ? baselineData.x.map((x, i) => ({
        x: x,
        y: baselineData.y[i],
        isCorner: baselineData.is_corner[i]
    })) : [];

    return (
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-20">
            <header>
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-black dark:text-white">
                    <Zap className="text-[#e8fe41] fill-[#e8fe41]" />
                    Binding Analysis
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                    Analyze binding risk and corner performance from GCS files.
                </p>
            </header>

            {/* Selection Panel */}
            <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-[32px]">
                <CardBody className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <Select 
                            aria-label="Select Track"
                            placeholder="Select Track"
                            radius="lg"
                            selectedKeys={selectedTrackId ? [selectedTrackId] : []}
                            onChange={(e) => {
                                setSelectedTrackId(e.target.value);
                                setSelectedSession(null);
                            }}
                            className="max-w-full"
                            classNames={{
                                popoverContent: "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xl",
                                value: `font-medium text-center ${selectedTrackId ? 'text-black dark:text-black' : 'text-black dark:text-white'}`,
                                trigger: `h-14 rounded-2xl justify-center ${selectedTrackId ? 'bg-[#e8fe41] text-black' : 'bg-gray-100 dark:bg-zinc-800 data-[hover=true]:bg-gray-200 dark:data-[hover=true]:bg-zinc-700'}`,
                            }}
                        >
                            {tracks.map((track) => (
                                <SelectItem key={track.id} value={track.id} className="text-black dark:text-white">
                                    {track.name}
                                </SelectItem>
                            ))}
                        </Select>

                        <Select 
                            aria-label="Select Session"
                            placeholder="Select Session"
                            radius="lg"
                            isDisabled={!selectedTrackId}
                            selectedKeys={selectedSession ? [selectedSession.id] : []}
                            onChange={(e) => {
                                const session = sessions.find(s => s.id === e.target.value);
                                setSelectedSession(session);
                            }}
                            className="max-w-full"
                            classNames={{
                                popoverContent: "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xl",
                                value: `font-medium text-center ${selectedSession ? 'text-black dark:text-black' : 'text-black dark:text-white'}`,
                                trigger: `h-14 rounded-2xl justify-center ${selectedSession ? 'bg-[#e8fe41] text-black' : 'bg-gray-100 dark:bg-zinc-800 data-[hover=true]:bg-gray-200 dark:data-[hover=true]:bg-zinc-700'}`,
                            }}
                        >
                            {sessions.map((session) => (
                                <SelectItem key={session.id} value={session.id} textValue={session.fileName} className="text-black dark:text-white">
                                    <div className="flex flex-col">
                                        <span className="font-bold">{session.fileName}</span>
                                        <span className="text-xs text-gray-500">
                                            {session.uploadedAt?.toDate().toLocaleDateString()}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </Select>

                        <div className="">
                            <Button 
                                onPress={handleAnalyzeInit}
                                isDisabled={!selectedSession || isLoading}
                                isLoading={isLoading}
                                className="w-full h-14 font-bold text-lg bg-zinc-900 text-white dark:bg-white dark:text-black shadow-lg hover:bg-[#e8fe41] hover:text-black dark:hover:bg-[#e8fe41] dark:hover:text-black transition-all transform hover:scale-[1.02] rounded-2xl"
                                startContent={!isLoading && <Play size={20} />}
                            >
                                Analyze Session
                            </Button>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Track Map */}
                <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-[32px] min-h-[400px]">
                    <CardHeader className="px-6 pt-6">
                        <h2 className="text-xl font-bold text-black dark:text-white">Track Map</h2>
                    </CardHeader>
                    <CardBody className="px-6 pb-6">
                        {baselineData ? (
                            <div className="h-[400px] w-full" style={{ height: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <ScatterChart
                                        margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                        onClick={handleChartClick}
                                    >
                                        <XAxis type="number" dataKey="x" hide domain={['auto', 'auto']} />
                                        <YAxis type="number" dataKey="y" hide domain={['auto', 'auto']} />
                                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                        <Scatter 
                                            name="Track" 
                                            data={chartData} 
                                            fill="#8884d8"
                                            onClick={handleChartClick}
                                            cursor="pointer"
                                        >
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.isCorner ? "#ff0000" : "#00ff00"} />
                                            ))}
                                        </Scatter>
                                    </ScatterChart>
                                </ResponsiveContainer>
                                <p className="text-center text-sm text-gray-500 mt-2">
                                    Click on the track to analyze specific corner
                                </p>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 italic">
                                Run analysis to view track map
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Corner Analysis Results */}
                <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-[32px] min-h-[400px]">
                    <CardHeader className="px-6 pt-6">
                        <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                            <Search size={20} />
                            Corner Analysis
                        </h2>
                    </CardHeader>
                    <CardBody className="px-6 pb-6">
                        {isAnalyzingCorner ? (
                            <div className="h-full flex items-center justify-center">
                                <Spinner size="lg" />
                            </div>
                        ) : cornerAnalysis ? (
                            <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                                <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl">
                                    <h3 className="font-bold text-lg mb-2">Summary</h3>
                                    <p>Laps Analyzed: <span className="font-mono">{cornerAnalysis.length}</span></p>
                                    <p>Avg Apex Speed: <span className="font-mono">
                                        {(cornerAnalysis.reduce((acc, curr) => acc + curr.apex_speed, 0) / (cornerAnalysis.length || 1)).toFixed(2)} km/h
                                    </span></p>
                                    {cornerAnalysis[0] && (
                                        <p>Selected Point: X={cornerAnalysis[0].apex_x.toFixed(1)}, Y={cornerAnalysis[0].apex_y.toFixed(1)}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    {cornerAnalysis.map((lap, idx) => (
                                        <div key={idx} className="p-3 border border-gray-100 dark:border-zinc-800 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-bold">Lap {lap.lap}</span>
                                                <span className={`text-xs px-2 py-1 rounded-full ${lap.rpm_anomaly ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                                    {lap.rpm_anomaly ? 'Anomaly' : 'Normal'}
                                                </span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                <div>Apex Speed: {lap.apex_speed.toFixed(1)}</div>
                                                <div>RPM Slope: {lap.rpm_slope.toFixed(1)}</div>
                                                <div>Speed Gain: {lap.speed_gain.toFixed(1)}</div>
                                                <div>Efficiency: {lap.long_efficiency.toFixed(3)}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-400 italic">
                                Select a point on the track map to view analysis
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* Detailed Data Table */}
                {cornerAnalysis && (
                    <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-[32px] lg:col-span-2">
                        <CardHeader className="px-6 pt-6">
                            <h2 className="text-xl font-bold text-black dark:text-white">Detailed Analysis Data</h2>
                        </CardHeader>
                        <CardBody className="px-6 pb-6">
                            <Table aria-label="Corner Analysis Table" striped>
                                <TableHeader>
                                    <TableColumn>Lap</TableColumn>
                                    <TableColumn>Apex Speed</TableColumn>
                                    <TableColumn>RPM Slope</TableColumn>
                                    <TableColumn>Speed Gain</TableColumn>
                                    <TableColumn>RPM-Speed Corr</TableColumn>
                                    <TableColumn>Lat G Decay</TableColumn>
                                    <TableColumn>Long Eff</TableColumn>
                                    <TableColumn>RPM Anomaly</TableColumn>
                                </TableHeader>
                                <TableBody>
                                    {cornerAnalysis.map((row) => (
                                        <TableRow key={row.lap}>
                                            <TableCell>{row.lap}</TableCell>
                                            <TableCell>{row.apex_speed.toFixed(1)}</TableCell>
                                            <TableCell>{row.rpm_slope.toFixed(0)}</TableCell>
                                            <TableCell>{row.speed_gain.toFixed(1)}</TableCell>
                                            <TableCell>{row.rpm_speed_corr.toFixed(2)}</TableCell>
                                            <TableCell>{row.lat_g_decay ? row.lat_g_decay.toFixed(2) : 'N/A'}</TableCell>
                                            <TableCell>{row.long_efficiency.toFixed(3)}</TableCell>
                                            <TableCell>
                                                <span className={row.rpm_anomaly ? "text-red-500 font-bold" : "text-green-500"}>
                                                    {row.rpm_anomaly ? "YES" : "No"}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardBody>
                    </Card>
                )}

                {/* Reference Analysis Section */}
                <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-[32px] lg:col-span-2">
                    <CardHeader className="px-6 pt-6 flex flex-col items-start gap-2">
                        <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                            <Info size={20} />
                            Reference Analysis
                        </h2>
                        <p className="text-sm text-gray-500">
                            Select another file to analyze its fastest lap and corner features.
                        </p>
                    </CardHeader>
                    <CardBody className="px-6 pb-6 space-y-6">
                        <div className="flex gap-4 items-center">
                            <Select 
                                aria-label="Select Reference Session"
                                placeholder="Select Reference Session"
                                radius="lg"
                                isDisabled={!selectedTrackId}
                                selectedKeys={selectedRefSession ? [selectedRefSession.id] : []}
                                onChange={(e) => {
                                    const session = sessions.find(s => s.id === e.target.value);
                                    setSelectedRefSession(session);
                                }}
                                className="max-w-md flex-1"
                                classNames={{
                                    popoverContent: "bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-xl",
                                    value: `font-medium text-center ${selectedRefSession ? 'text-black dark:text-black' : 'text-black dark:text-white'}`,
                                    trigger: `h-14 rounded-2xl justify-center ${selectedRefSession ? 'bg-[#e8fe41] text-black' : 'bg-gray-100 dark:bg-zinc-800 data-[hover=true]:bg-gray-200 dark:data-[hover=true]:bg-zinc-700'}`,
                                }}
                            >
                                {sessions.map((session) => (
                                    <SelectItem key={session.id} value={session.id} textValue={session.fileName} className="text-black dark:text-white">
                                        <div className="flex flex-col">
                                            <span className="font-bold">{session.fileName}</span>
                                            <span className="text-xs text-gray-500">
                                                {session.uploadedAt?.toDate().toLocaleDateString()}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </Select>

                            <Button 
                                onPress={handleRefAnalyze}
                                isDisabled={!selectedRefSession || isAnalyzingRef}
                                isLoading={isAnalyzingRef}
                                className="h-14 px-8 font-bold text-lg bg-zinc-900 text-white dark:bg-white dark:text-black shadow-lg hover:bg-[#e8fe41] hover:text-black dark:hover:bg-[#e8fe41] dark:hover:text-black transition-all transform hover:scale-[1.02] rounded-2xl"
                            >
                                Analyze Reference
                            </Button>
                        </div>

                        {refAnalysisResult && (
                            <div className="space-y-4 animate-fade-in">
                                <div className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl flex gap-6 items-center">
                                    <div>
                                        <p className="text-sm text-gray-500">Fastest Lap</p>
                                        <p className="text-2xl font-bold text-black dark:text-white">{refAnalysisResult.lap}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Lap Time</p>
                                        <p className="text-2xl font-bold text-black dark:text-white">{refAnalysisResult.lap_time ? refAnalysisResult.lap_time.toFixed(3) : 'N/A'}s</p>
                                    </div>
                                    {refAnalysisResult.error && (
                                         <div className="text-red-500 font-bold">Error: {refAnalysisResult.error}</div>
                                    )}
                                </div>

                                {refAnalysisResult.corners && refAnalysisResult.corners.length > 0 && (
                                    <Table aria-label="Reference Corner Analysis Table" striped>
                                        <TableHeader>
                                            <TableColumn>Corner</TableColumn>
                                            <TableColumn>Apex Speed</TableColumn>
                                            <TableColumn>RPM Slope</TableColumn>
                                            <TableColumn>Speed Gain</TableColumn>
                                            <TableColumn>RPM-Speed Corr</TableColumn>
                                            <TableColumn>Lat G Decay</TableColumn>
                                            <TableColumn>Long Eff</TableColumn>
                                            <TableColumn>RPM Anomaly</TableColumn>
                                        </TableHeader>
                                        <TableBody>
                                            {refAnalysisResult.corners.map((row) => (
                                                <TableRow key={row.corner_index}>
                                                    <TableCell>{row.corner_index}</TableCell>
                                                    <TableCell>{row.apex_speed.toFixed(1)}</TableCell>
                                                    <TableCell>{row.rpm_slope.toFixed(0)}</TableCell>
                                                    <TableCell>{row.speed_gain.toFixed(1)}</TableCell>
                                                    <TableCell>{row.rpm_speed_corr ? row.rpm_speed_corr.toFixed(2) : '0.00'}</TableCell>
                                                    <TableCell>{row.lat_g_decay ? row.lat_g_decay.toFixed(2) : 'N/A'}</TableCell>
                                                    <TableCell>{row.long_efficiency.toFixed(3)}</TableCell>
                                                    <TableCell>
                                                        <span className={row.rpm_anomaly ? "text-red-500 font-bold" : "text-green-500"}>
                                                            {row.rpm_anomaly ? "YES" : "No"}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        )}
                    </CardBody>
                </Card>

                {/* AI Analysis Section */}
                {cornerAnalysis && refAnalysisResult && (
                    <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-[32px] lg:col-span-2">
                        <CardHeader className="px-6 pt-6 flex flex-col items-start gap-2">
                            <h2 className="text-xl font-bold text-black dark:text-white flex items-center gap-2">
                                <Zap size={20} className="text-[#e8fe41] fill-[#e8fe41]" />
                                AI Interpretation
                            </h2>
                            <p className="text-sm text-gray-500">
                                Detect binding using Mistral AI by comparing selected corner with reference.
                            </p>
                        </CardHeader>
                        <CardBody className="px-6 pb-6 space-y-6">
                            <Button 
                                onPress={handleAIAnalyze}
                                isDisabled={isAnalyzingAI}
                                isLoading={isAnalyzingAI}
                                className="w-full h-14 font-bold text-lg bg-zinc-900 text-white dark:bg-white dark:text-black shadow-lg hover:bg-[#e8fe41] hover:text-black dark:hover:bg-[#e8fe41] dark:hover:text-black transition-all transform hover:scale-[1.01] rounded-2xl"
                            >
                                Run AI Diagnosis
                            </Button>

                            {aiAnalysisResult && (
                                <div className="space-y-6 animate-fade-in">
                                    {aiAnalysisResult.error ? (
                                        <div className="p-4 bg-red-50 text-red-600 rounded-xl font-bold">
                                            {aiAnalysisResult.error}
                                        </div>
                                    ) : (
                                        <>
                                            <div className={`p-6 rounded-2xl border-l-8 ${aiAnalysisResult.binding_present ? 'bg-red-50 border-red-500 dark:bg-red-900/20' : 'bg-green-50 border-green-500 dark:bg-green-900/20'}`}>
                                                <h3 className="text-2xl font-bold mb-2 text-black dark:text-white">
                                                    {aiAnalysisResult.binding_present ? "BINDING DETECTED" : "NO BINDING DETECTED"}
                                                </h3>
                                                <p className="text-lg text-gray-800 dark:text-gray-200">
                                                    {typeof aiAnalysisResult.session_conclusion === 'object' 
                                                        ? JSON.stringify(aiAnalysisResult.session_conclusion) 
                                                        : aiAnalysisResult.session_conclusion}
                                                </p>
                                            </div>

                                            {aiAnalysisResult.suspected_corners && aiAnalysisResult.suspected_corners.length > 0 && (
                                                <div className="space-y-4">
                                                    <h4 className="font-bold text-lg text-black dark:text-white">Detailed Analysis</h4>
                                                    {aiAnalysisResult.suspected_corners.map((corner, idx) => (
                                                        <div key={idx} className="p-4 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="font-bold text-lg">Corner {corner.Corner_ID}</span>
                                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                                    corner.Confidence_level === 'HIGH' ? 'bg-red-100 text-red-700' :
                                                                    corner.Confidence_level === 'MEDIUM' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-yellow-100 text-yellow-700'
                                                                }`}>
                                                                    {corner.Confidence_level} CONFIDENCE
                                                                </span>
                                                            </div>
                                                            <p className="text-gray-700 dark:text-gray-300 mb-4">
                                                                {typeof corner.Physical_explanation === 'object'
                                                                    ? JSON.stringify(corner.Physical_explanation)
                                                                    : corner.Physical_explanation}
                                                            </p>
                                                            
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                {Object.entries(corner.Degraded_features || {}).map(([key, value]) => (
                                                                    <div key={key} className="bg-white dark:bg-zinc-900 p-2 rounded-lg text-sm text-center border border-gray-200 dark:border-zinc-700">
                                                                        <span className="block text-gray-500 text-xs mb-1">{key}</span>
                                                                        <span className="font-mono font-bold text-red-500">
                                                                            {typeof value === 'object' ? JSON.stringify(value) : value}
                                                                        </span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="mt-4 text-xs text-gray-400">
                                                                Affected Laps: {Array.isArray(corner.Laps_affected) ? corner.Laps_affected.join(", ") : corner.Laps_affected}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default BindingAnalysis;
