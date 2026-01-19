import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { API_URL } from '../../api/config';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import { Card, CardHeader, CardBody, Button, Select, SelectItem, Chip, Spinner } from '@heroui/react';
import { Activity, Database, Map as MapIcon, SlidersHorizontal, Circle } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, Brush } from 'recharts';

const TrackMapInteractive = ({ laps, hoverPoint, selectionBounds, onSelectionChange }) => {
  const allPoints = Array.isArray(laps)
    ? laps.flatMap(lap => (lap.samples || []).filter(p => typeof p.x === 'number' && typeof p.y === 'number'))
    : [];

  const points = allPoints;

  const svgRef = useRef(null);
  const [dragStart, setDragStart] = useState(null);
  const [dragCurrent, setDragCurrent] = useState(null);

  if (!points || points.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
        <MapIcon size={32} className="opacity-20" />
        <span className="text-xs uppercase tracking-widest opacity-50">No Layout Data</span>
      </div>
    );
  }

  const xs = points.map(p => p.x);
  const ys = points.map(p => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const width = maxX - minX || 1;
  const height = maxY - minY || 1;

  const paddingX = width * 0.15;
  const paddingY = height * 0.15;

  const viewBoxX = minX - paddingX;
  const viewBoxY = minY - paddingY;
  const viewBoxWidth = width + paddingX * 2;
  const viewBoxHeight = height + paddingY * 2;

  const viewBox = `${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`;

  const strokeWidth = Math.max(width, height) * 0.015;
  const markerRadius = Math.max(width, height) * 0.025;

  const hover = hoverPoint && typeof hoverPoint.x === 'number' && typeof hoverPoint.y === 'number' ? hoverPoint : null;

  const getSvgPoint = event => {
    if (!svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const px = event.clientX - rect.left;
    const py = event.clientY - rect.top;
    if (rect.width === 0 || rect.height === 0) return null;
    const xRatio = px / rect.width;
    const yRatio = py / rect.height;
    const x = viewBoxX + xRatio * viewBoxWidth;
    const y = viewBoxY + yRatio * viewBoxHeight;
    return { x, y };
  };

  const handleMouseDown = event => {
    if (!onSelectionChange) return;
    const point = getSvgPoint(event);
    if (!point) return;
    setDragStart(point);
    setDragCurrent(point);
  };

  const handleMouseMove = event => {
    if (!dragStart) return;
    const point = getSvgPoint(event);
    if (!point) return;
    setDragCurrent(point);
  };

  const handleMouseUp = event => {
    if (!dragStart || !onSelectionChange) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    const endPoint = getSvgPoint(event) || dragCurrent;
    if (!endPoint) {
      setDragStart(null);
      setDragCurrent(null);
      return;
    }
    const minSelX = Math.min(dragStart.x, endPoint.x);
    const maxSelX = Math.max(dragStart.x, endPoint.x);
    const minSelY = Math.min(dragStart.y, endPoint.y);
    const maxSelY = Math.max(dragStart.y, endPoint.y);
    const minSize = Math.max(viewBoxWidth, viewBoxHeight) * 0.02;
    if (Math.abs(maxSelX - minSelX) < minSize && Math.abs(maxSelY - minSelY) < minSize) {
      onSelectionChange(null);
    } else {
      onSelectionChange({
        minX: minSelX,
        maxX: maxSelX,
        minY: minSelY,
        maxY: maxSelY,
      });
    }
    setDragStart(null);
    setDragCurrent(null);
  };

  const handleMouseLeave = () => {
    if (dragStart) {
      setDragStart(null);
      setDragCurrent(null);
    }
  };

  const dragSelection =
    dragStart && dragCurrent
      ? {
          minX: Math.min(dragStart.x, dragCurrent.x),
          maxX: Math.max(dragStart.x, dragCurrent.x),
          minY: Math.min(dragStart.y, dragCurrent.y),
          maxY: Math.max(dragStart.y, dragCurrent.y),
        }
      : null;

  const effectiveSelection = dragSelection || selectionBounds;

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <svg
        ref={svgRef}
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full overflow-visible drop-shadow-xl"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {Array.isArray(laps) &&
          laps.map(lap => {
            const lapPoints = (lap.samples || []).filter(p => typeof p.x === 'number' && typeof p.y === 'number');
            if (lapPoints.length < 2) return null;
            const pathData = lapPoints
              .map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`))
              .join(' ');
            const firstPoint = lapPoints[0];
            return (
              <g key={lap.id}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={lap.color}
                  strokeWidth={lap.isFocus ? strokeWidth * 1.2 : strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={lap.isFocus ? 1 : 0.55}
                />
                <circle
                  cx={firstPoint.x}
                  cy={firstPoint.y}
                  r={markerRadius}
                  fill="white"
                  stroke={lap.color}
                  strokeWidth={strokeWidth * 0.6}
                  opacity={lap.isFocus ? 1 : 0.8}
                />
              </g>
            );
          })}
        {effectiveSelection && (
          <rect
            x={effectiveSelection.minX}
            y={effectiveSelection.minY}
            width={effectiveSelection.maxX - effectiveSelection.minX}
            height={effectiveSelection.maxY - effectiveSelection.minY}
            fill="rgba(232, 254, 65, 0.15)"
            stroke="#e8fe41"
            strokeWidth={strokeWidth * 0.6}
            strokeDasharray="4 4"
          />
        )}
        {hover && (
          <circle
            cx={hover.x}
            cy={hover.y}
            r={markerRadius * 0.8}
            fill="#e8fe41"
            stroke="white"
            strokeWidth={strokeWidth * 0.5}
          />
        )}
      </svg>
    </div>
  );
};

const colorPalette = ['#e8fe41', '#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#14b8a6'];

const AnalysisHub = () => {
  const { currentUser } = useAuth();
  const { currentTeam } = useTeam();

  const [tracks, setTracks] = useState([]);
  const [selectedTrackId, setSelectedTrackId] = useState('');
  const [sessions, setSessions] = useState([]);

  const [sessionDetails, setSessionDetails] = useState({});
  const [activeLaps, setActiveLaps] = useState([]);
  const [focusLapId, setFocusLapId] = useState(null);

  const [selectedColumns, setSelectedColumns] = useState([]);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [selectionBounds, setSelectionBounds] = useState(null);
  const [distanceRange, setDistanceRange] = useState(null);
  const [selectionMode, setSelectionMode] = useState('exclusive');

  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingTelemetrySessionId, setLoadingTelemetrySessionId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    let q;
    if (currentTeam) {
      q = query(collection(db, 'tracks'), where('teamId', '==', currentTeam.id));
    } else {
      q = query(collection(db, 'tracks'), where('createdBy', '==', currentUser.uid));
    }

    const unsubscribe = onSnapshot(q, snapshot => {
      let tracksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      if (!currentTeam) {
        tracksData = tracksData.filter(t => !t.teamId);
      }

      tracksData.sort((a, b) => a.name.localeCompare(b.name));
      setTracks(tracksData);

      if (!selectedTrackId && tracksData.length > 0) {
        setSelectedTrackId(tracksData[0].id);
      }
    });

    return () => unsubscribe();
  }, [currentUser, currentTeam]);

  useEffect(() => {
    if (!selectedTrackId) {
      setSessions([]);
      return;
    }

    const fetchSessions = async () => {
      setLoadingSessions(true);
      try {
        const sessionsRef = collection(db, 'tracks', selectedTrackId, 'sessions');
        const snapshot = await getDocs(sessionsRef);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        data.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
        setSessions(data);
      } catch (e) {
        setError('Failed to load sessions for track.');
      } finally {
        setLoadingSessions(false);
      }
    };

    fetchSessions();
  }, [selectedTrackId]);

  const allAvailableColumns = useMemo(() => {
    const cols = new Set();
    Object.values(sessionDetails).forEach(s => {
      if (s.telemetry && Array.isArray(s.telemetry.columns)) {
        s.telemetry.columns.forEach(c => cols.add(c));
      }
    });
    return Array.from(cols);
  }, [sessionDetails]);

  useEffect(() => {
    if (selectedColumns.length === 0 && allAvailableColumns.length > 0) {
      const preferred = ['GPS Speed', 'RPM'];
      const chosen = preferred.filter(c => allAvailableColumns.includes(c));
      if (chosen.length > 0) {
        setSelectedColumns(chosen);
      } else {
        setSelectedColumns(allAvailableColumns.slice(0, 2));
      }
    }
  }, [allAvailableColumns, selectedColumns.length]);

  const ensureTelemetryLoaded = async session => {
    if (!session || !session.storageUrl) return;
    if (sessionDetails[session.id] && sessionDetails[session.id].telemetry) return;

    setLoadingTelemetrySessionId(session.id);
    setError('');

    try {
      const payload = {
        file_url: session.storageUrl,
        storage_path: session.storagePath,
      };
      const response = await axios.post(`${API_URL}/api/v1/sessions/telemetry`, payload);
      const data = response.data;

      setSessionDetails(prev => ({
        ...prev,
        [session.id]: {
          ...(prev[session.id] || {}),
          telemetry: data,
        },
      }));
    } catch (e) {
      setError('Failed to load telemetry for session. Check backend logs.');
    } finally {
      setLoadingTelemetrySessionId(null);
    }
  };

  const toggleLapActive = async (session, lapNumber) => {
    await ensureTelemetryLoaded(session);
    const telemetry = sessionDetails[session.id]?.telemetry;
    if (!telemetry) return;

    const existing = activeLaps.find(l => l.sessionId === session.id && l.lap === lapNumber);
    if (existing) {
      const updated = activeLaps.filter(l => !(l.sessionId === session.id && l.lap === lapNumber));
      setActiveLaps(updated);
      if (focusLapId === existing.id) {
        setFocusLapId(updated.length > 0 ? updated[0].id : null);
      }
      return;
    }

    const usedColors = activeLaps.map(l => l.color);
    const nextColor = colorPalette.find(c => !usedColors.includes(c)) || colorPalette[activeLaps.length % colorPalette.length];

    const id = `${session.id}-${lapNumber}`;
    const newLap = {
      id,
      sessionId: session.id,
      sessionName: session.fileName || session.id,
      lap: lapNumber,
      color: nextColor,
    };
    const updated = [...activeLaps, newLap];
    setActiveLaps(updated);
    if (!focusLapId) {
      setFocusLapId(id);
    }
  };

  const updateLapColor = (lapId, color) => {
    setActiveLaps(prev => prev.map(l => (l.id === lapId ? { ...l, color } : l)));
  };

  const focusLap = useMemo(() => {
    if (!activeLaps.length) return null;
    const found = activeLaps.find(l => l.id === focusLapId);
    return found || activeLaps[0];
  }, [activeLaps, focusLapId]);

  const focusTelemetry = useMemo(() => {
    if (!focusLap) return null;
    const details = sessionDetails[focusLap.sessionId];
    return details ? details.telemetry : null;
  }, [focusLap, sessionDetails]);

  const lapSamplesById = useMemo(() => {
    const result = {};
    activeLaps.forEach(lap => {
      const details = sessionDetails[lap.sessionId];
      const telemetry = details ? details.telemetry : null;
      if (!telemetry || !Array.isArray(telemetry.samples)) return;
      const samplesForLap = telemetry.samples.filter(s => s.lap === lap.lap);
      if (!samplesForLap.length) return;

      let filtered = samplesForLap;

      if (selectionBounds) {
        const { minX, maxX, minY, maxY } = selectionBounds;
        filtered = filtered.filter(
          s =>
            typeof s.x === 'number' &&
            typeof s.y === 'number' &&
            s.x >= minX &&
            s.x <= maxX &&
            s.y >= minY &&
            s.y <= maxY,
        );
      }

      if (distanceRange) {
        const { min, max } = distanceRange;
        filtered = filtered.filter(
          s =>
            typeof s.lap_distance === 'number' &&
            s.lap_distance >= min &&
            s.lap_distance <= max,
        );
      }

      result[lap.id] = filtered;
    });
    return result;
  }, [activeLaps, sessionDetails, selectionBounds, distanceRange]);

  const focusLapSamples = useMemo(() => {
    if (!focusLap) return [];
    return lapSamplesById[focusLap.id] || [];
  }, [focusLap, lapSamplesById]);

  const focusLapBaseSamples = useMemo(() => {
    if (!focusLap) return [];
    const details = sessionDetails[focusLap.sessionId];
    const telemetry = details ? details.telemetry : null;
    if (!telemetry || !Array.isArray(telemetry.samples)) return [];
    return telemetry.samples.filter(s => s.lap === focusLap.lap);
  }, [focusLap, sessionDetails]);

  const handleChartMouseMove = state => {
    if (!state || !state.activePayload || !state.activePayload.length) {
      return;
    }
    const payload = state.activePayload[0].payload;
    if (typeof payload.x === 'number' && typeof payload.y === 'number') {
      setHoverPoint({ x: payload.x, y: payload.y });
    } else {
      setHoverPoint(null);
    }
  };

  const handleChartMouseLeave = () => {
    setHoverPoint(null);
  };

  const selectedMetrics = selectedColumns.filter(col => focusTelemetry && focusTelemetry.columns.includes(col));

  const lapsForMap = useMemo(() => {
    return activeLaps
      .map(lap => ({
        id: lap.id,
        color: lap.color,
        isFocus: focusLap && focusLap.id === lap.id,
        samples: lapSamplesById[lap.id] || [],
      }))
      .filter(lap => lap.samples && lap.samples.length > 0);
  }, [activeLaps, focusLap, lapSamplesById]);

  return (
    <div className="max-w-7xl mx-auto pb-20 px-4 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-black text-[#e8fe41] flex items-center justify-center shadow-lg shadow-[#e8fe41]/30">
            <Activity size={22} />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-black dark:text-white">Analysis Hub</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Build custom multi-lap overlays and explore telemetry lap by lap.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400">
            <SlidersHorizontal size={16} />
            <span>Active laps</span>
            <Chip size="sm" variant="flat" className="bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200">
              {activeLaps.length}
            </Chip>
          </div>
          {focusLap && (
            <Chip
              size="sm"
              variant="flat"
              className="bg-black text-white dark:bg-white dark:text-black font-semibold"
              startContent={<Circle size={10} style={{ color: focusLap.color }} />}
            >
              Focus Lap: {focusLap.sessionName} L{focusLap.lap}
            </Chip>
          )}
        </div>
      </header>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-2xl text-sm flex items-center gap-2">
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl h-[620px] flex flex-col">
          <CardHeader className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Database className="text-primary" />
              <div>
                <p className="text-sm font-bold text-black dark:text-white">Sessions & Laps</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Choose laps from any stored session.</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="px-6 pb-6 pt-2 flex-1 overflow-hidden flex flex-col gap-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-gray-400 ml-1">
                Track
              </p>
              <Select
                aria-label="Select Track"
                placeholder="Choose a track..."
                selectedKeys={selectedTrackId ? [selectedTrackId] : []}
                onChange={e => setSelectedTrackId(e.target.value)}
                className="w-full"
                classNames={{
                  trigger:
                    'bg-gray-50 dark:bg-zinc-800 hover:bg-white dark:hover:bg-zinc-700 border-2 border-transparent hover:border-gray-200 dark:hover:border-zinc-600 shadow-sm h-12 rounded-2xl',
                  value: 'text-sm font-semibold text-black dark:text-white',
                  placeholder: 'text-gray-400 text-sm',
                  popoverContent:
                    'bg-white dark:bg-zinc-900 p-2 rounded-2xl shadow-xl border border-gray-100 dark:border-zinc-700 min-w-[260px]',
                }}
              >
                {tracks.map(t => (
                  <SelectItem key={t.id} value={t.id} textValue={t.name}>
                    <span className="text-sm font-medium text-black dark:text-white">{t.name}</span>
                  </SelectItem>
                ))}
              </Select>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
              {loadingSessions && (
                <div className="flex items-center justify-center py-10 text-gray-400 gap-2">
                  <Spinner size="sm" />
                  <span className="text-xs uppercase tracking-widest">Loading sessions</span>
                </div>
              )}

              {!loadingSessions && sessions.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 text-sm py-10">
                  No sessions for this track yet.
                </div>
              )}

              {sessions.map(session => {
                const details = sessionDetails[session.id];
                const lapSummary = details?.telemetry?.lap_summary || [];
                const hasTelemetry = !!details?.telemetry;

                return (
                  <div
                    key={session.id}
                    className="border border-gray-100 dark:border-zinc-800 rounded-2xl bg-gray-50/60 dark:bg-zinc-900/60 p-3 flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-black dark:text-white truncate max-w-[160px]">
                          {session.fileName}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {session.uploadedAt ? new Date(session.uploadedAt.seconds * 1000).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="flat"
                        className="text-xs font-semibold rounded-full"
                        onPress={() => ensureTelemetryLoaded(session)}
                        isLoading={loadingTelemetrySessionId === session.id}
                      >
                        {hasTelemetry ? 'Reload' : 'Load laps'}
                      </Button>
                    </div>

                    {hasTelemetry && lapSummary.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-400">
                          Laps
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {lapSummary.map(lap => {
                            const lapId = `${session.id}-${lap.lap}`;
                            const active = !!activeLaps.find(l => l.id === lapId);
                            return (
                              <Button
                                key={lapId}
                                size="sm"
                                variant={active ? 'solid' : 'flat'}
                                className={`text-[11px] rounded-full px-3 py-1 h-7 ${
                                  active
                                    ? 'bg-black text-white dark:bg-white dark:text-black'
                                    : 'bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200'
                                }`}
                                onPress={() => toggleLapActive(session, lap.lap)}
                              >
                                L{lap.lap} • {lap.time.toFixed(3)}s
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl">
            <CardHeader className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity className="text-primary" />
                <div>
                  <p className="text-sm font-bold text-black dark:text-white">Active Laps</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Toggle focus and adjust colors for each lap.
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody className="px-6 pb-4 pt-2 space-y-3">
              {activeLaps.length === 0 && (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
                  Select a session and load laps on the left, then activate laps to start analyzing.
                </div>
              )}

              {activeLaps.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {activeLaps.map(lap => (
                    <div
                      key={lap.id}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full border text-xs ${
                        focusLap && focusLap.id === lap.id
                          ? 'border-black dark:border-white bg-black text-white dark:bg-white dark:text-black'
                          : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setFocusLapId(lap.id)}
                        className="flex items-center gap-2"
                      >
                        <span
                          className="w-3 h-3 rounded-full border border-gray-700 dark:border-gray-200"
                          style={{ backgroundColor: lap.color }}
                        />
                        <span className="font-semibold">
                          {lap.sessionName} L{lap.lap}
                        </span>
                      </button>
                      <input
                        type="color"
                        value={lap.color}
                        onChange={e => updateLapColor(lap.id, e.target.value)}
                        className="w-6 h-6 rounded-full border-none bg-transparent cursor-pointer"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl h-[360px]">
              <CardHeader className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MapIcon className="text-gray-500 dark:text-gray-300" />
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white">Track Layout</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Hover telemetry to see position on track. Drag to select a segment.
                    </p>
                  </div>
                </div>
                {(selectionBounds || distanceRange) && (
                  <Button
                    size="sm"
                    variant="light"
                    className="text-xs font-semibold text-gray-600 dark:text-gray-300"
                    onPress={() => {
                      setSelectionBounds(null);
                      setDistanceRange(null);
                    }}
                  >
                    Reset selection
                  </Button>
                )}
              </CardHeader>
              <CardBody className="px-6 pb-6 pt-2 h-[290px]">
                {lapsForMap.length > 0 ? (
                  <TrackMapInteractive
                    laps={lapsForMap}
                    hoverPoint={hoverPoint}
                    selectionBounds={selectionBounds}
                    onSelectionChange={bounds => {
                      setDistanceRange(null);
                      setSelectionBounds(bounds);
                    }}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2 text-xs">
                    <MapIcon size={28} className="opacity-20" />
                    <span>Select at least one lap to see the track layout.</span>
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl h-[360px]">
              <CardHeader className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="text-primary" />
                  <div>
                    <p className="text-sm font-bold text-black dark:text-white">Telemetry Channels</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Pick which metrics to visualize for active laps.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardBody className="px-6 pb-6 pt-2 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {allAvailableColumns.map(col => {
                    const selected = selectedColumns.includes(col);
                    return (
                      <Button
                        key={col}
                        size="sm"
                        variant={selected ? 'solid' : 'flat'}
                        className={`text-[11px] rounded-full px-3 py-1 h-7 ${
                          selected
                            ? 'bg-black text-white dark:bg-white dark:text-black'
                            : 'bg-gray-50 dark:bg-zinc-800 text-gray-700 dark:text-gray-200'
                        }`}
                        onPress={() => {
                          if (selected) {
                            setSelectedColumns(selectedColumns.filter(c => c !== col));
                          } else {
                            setSelectedColumns([...selectedColumns, col]);
                          }
                        }}
                      >
                        {col}
                      </Button>
                    );
                  })}
                  {allAvailableColumns.length === 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Load telemetry for at least one session to see available channels.
                    </span>
                  )}
                </div>
              </CardBody>
            </Card>
          </div>

          <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl">
            <CardHeader className="px-6 pt-6 pb-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Activity className="text-primary" />
                <div>
                  <p className="text-sm font-bold text-black dark:text-white">Telemetry Timeline</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Inspect all active laps along distance; hover to synchronize with the map.
                  </p>
                </div>
              </div>
              {distanceRange && (
                <div className="text-[11px] font-mono text-gray-600 dark:text-gray-300">
                  {distanceRange.min.toFixed(1)} m → {distanceRange.max.toFixed(1)} m (
                  {(distanceRange.max - distanceRange.min).toFixed(1)} m)
                </div>
              )}
            </CardHeader>
            <CardBody className="px-6 pb-6 pt-2 space-y-4">
              {!activeLaps.length || Object.keys(lapSamplesById).length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-8">
                  Activate at least one lap with telemetry to see charts.
                </div>
              ) : selectedMetrics.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400 py-8">
                  Select at least one telemetry channel above to plot.
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedMetrics.map(metric => (
                    <div key={metric} className="h-52">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 ml-1">
                        {metric}
                      </p>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={focusLapBaseSamples}
                          onMouseMove={handleChartMouseMove}
                          onMouseLeave={handleChartMouseLeave}
                        >
                          <XAxis
                            dataKey="lap_distance"
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <YAxis
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickLine={false}
                            axisLine={{ stroke: '#e5e7eb' }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#020617',
                              borderRadius: 12,
                              border: 'none',
                              padding: '8px 10px',
                            }}
                            labelStyle={{ color: '#9ca3af', fontSize: 11 }}
                            itemStyle={{ color: '#e5e7eb', fontSize: 11 }}
                            formatter={(value, name) => [value, `${metric}`]}
                            labelFormatter={label => `Distance: ${label.toFixed(1)} m`}
                          />
                          {focusLapBaseSamples.length > 0 && (
                            <Brush
                              dataKey="lap_distance"
                              height={16}
                              stroke="#e8fe41"
                              travellerWidth={8}
                              onChange={range => {
                                if (
                                  !range ||
                                  range.startIndex == null ||
                                  range.endIndex == null ||
                                  !focusLapBaseSamples.length
                                ) {
                                  setDistanceRange(null);
                                  return;
                                }
                                const total = focusLapBaseSamples.length;
                                const startIndex = Math.max(0, Math.min(range.startIndex, total - 1));
                                const endIndex = Math.max(0, Math.min(range.endIndex, total - 1));
                                const minIdx = Math.min(startIndex, endIndex);
                                const maxIdx = Math.max(startIndex, endIndex);
                                if (minIdx === 0 && maxIdx === total - 1) {
                                  setDistanceRange(null);
                                  return;
                                }
                                const minDist = focusLapBaseSamples[minIdx].lap_distance;
                                const maxDist = focusLapBaseSamples[maxIdx].lap_distance;
                                if (selectionMode === 'exclusive') setSelectionBounds(null);
                                setDistanceRange({
                                  min: minDist,
                                  max: maxDist,
                                });
                              }}
                            />
                          )}
                          <Legend
                            wrapperStyle={{ fontSize: 10 }}
                            iconType="circle"
                          />
                          {activeLaps.map(lap => {
                            const samples = lapSamplesById[lap.id] || [];
                            if (!samples.length) return null;
                            const isFocus = focusLap && focusLap.id === lap.id;
                            return (
                              <Line
                                key={lap.id}
                                type="monotone"
                                data={samples}
                                dataKey={metric}
                                stroke={lap.color}
                                strokeWidth={isFocus ? 2.5 : 1.5}
                                dot={false}
                                activeDot={{ r: isFocus ? 4 : 3, strokeWidth: 0 }}
                                name={`${lap.sessionName} L${lap.lap}`}
                              />
                            );
                          })}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AnalysisHub;
