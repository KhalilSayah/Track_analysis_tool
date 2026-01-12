import React, { useState, useEffect } from 'react';
import { Card, CardBody, Input, Button, Tabs, Tab } from "@heroui/react";
import { Plus, Calendar as CalendarIcon, Flag, Activity, Globe, MapPin } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { format, isSameDay } from 'date-fns';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { motion, AnimatePresence } from 'framer-motion';

const AddSessionPanel = ({ selectedRange, onAddSession, onRangeChange, isLoading, events = [] }) => {
    const { currentTeam } = useTeam();
    const [selectedTab, setSelectedTab] = useState("join");
    const [officialEvents, setOfficialEvents] = useState([]);
    
    // Create Form State
    const [title, setTitle] = useState('');
    const [type, setType] = useState('test');

    // Fetch Official Events
    useEffect(() => {
        const q = query(
            collection(db, 'official_competitions'),
            orderBy('date', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate()
            }));
            // Filter only future events (or recent past)
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            setOfficialEvents(events.filter(e => e.date >= now));
        });

        return () => unsubscribe();
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        onAddSession({
            title,
            type,
            startDate: selectedRange.start,
            endDate: selectedRange.end
        });
        
        setTitle('');
        setType('test');
    };

    const handleJoinEvent = (event) => {
        onAddSession({
            title: event.title,
            type: 'race',
            startDate: event.date,
            endDate: event.date, // Assuming single day for now, or could imply weekend
            officialEventId: event.id
        });
    };

    const SESSION_TYPES = [
        { key: 'test', label: 'Testing', icon: <Activity size={18} /> },
        { key: 'race', label: 'Race Weekend', icon: <Flag size={18} /> },
    ];

    // Neo Yellow Theme
    const accentColor = '#e8fe41';
    const accentText = 'black';

    // Helper to format date for input (YYYY-MM-DD)
    const formatDateForInput = (date) => {
        if (!date) return '';
        return format(date, 'yyyy-MM-dd');
    };

    const handleStartDateChange = (e) => {
        const date = e.target.value ? new Date(e.target.value) : null;
        if (date) {
            onRangeChange({
                start: date,
                end: selectedRange.end && isSameDay(selectedRange.end, selectedRange.start) ? date : selectedRange.end
            });
        }
    };

    const handleEndDateChange = (e) => {
        const date = e.target.value ? new Date(e.target.value) : null;
        if (date) {
            onRangeChange({
                ...selectedRange,
                end: date
            });
        }
    };

    return (
        <Card className="bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 rounded-l-3xl shadow-2xl h-full">
            <CardBody className="p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-colors"
                        style={{ backgroundColor: accentColor, color: accentText }}
                    >
                        {selectedTab === "create" ? <Plus size={24} /> : <Globe size={24} />}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                            {selectedTab === "create" ? "Add Session" : "Official Events"}
                        </h2>
                        <p className="text-xs text-zinc-500">
                            {currentTeam ? `For ${currentTeam.name}` : 'Personal Workspace'}
                        </p>
                    </div>
                </div>

                <Tabs 
                    aria-label="Options" 
                    fullWidth 
                    size="md" 
                    radius="full"
                    className="mb-6"
                    selectedKey={selectedTab}
                    onSelectionChange={setSelectedTab}
                    classNames={{
                        cursor: "bg-[#e8fe41] shadow-sm",
                        tabContent: "group-data-[selected=true]:text-black font-bold",
                        tabList: "bg-zinc-100 dark:bg-zinc-800/50 p-1 border border-zinc-200 dark:border-zinc-700/50 rounded-full"
                    }}
                >
                    <Tab key="create" title="Create Custom" />
                    <Tab key="join" title="Join Official" />
                </Tabs>

                {selectedTab === "create" ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                Session Title
                            </label>
                            <Input
                                placeholder="e.g. Winter Cup Round 1"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                variant="bordered"
                                radius="lg"
                                classNames={{
                                    inputWrapper: "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 focus-within:!border-primary"
                                }}
                                startContent={<CalendarIcon size={18} className="text-zinc-400" />}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    Start Date
                                </label>
                                <Input
                                    type="date"
                                    value={formatDateForInput(selectedRange.start)}
                                    onChange={handleStartDateChange}
                                    variant="bordered"
                                    radius="lg"
                                    classNames={{
                                        inputWrapper: "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                    End Date
                                </label>
                                <Input
                                    type="date"
                                    value={formatDateForInput(selectedRange.end)}
                                    onChange={handleEndDateChange}
                                    variant="bordered"
                                    radius="lg"
                                    min={formatDateForInput(selectedRange.start)}
                                    classNames={{
                                        inputWrapper: "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700"
                                    }}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                                Session Type
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {SESSION_TYPES.map((t) => (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setType(t.key)}
                                        className={`
                                            p-3 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all
                                            ${type === t.key 
                                                ? `border-[${accentColor}] bg-[${accentColor}]/10 text-zinc-900 dark:text-white` 
                                                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                            }
                                        `}
                                        style={type === t.key ? { borderColor: accentColor } : {}}
                                    >
                                        <div style={type === t.key ? { color: accentColor } : {}}>
                                            {t.icon}
                                        </div>
                                        <span className="text-sm font-medium">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                fullWidth
                                radius="full"
                                isLoading={isLoading}
                                className="font-bold shadow-lg text-black"
                                style={{ backgroundColor: accentColor, color: accentText }}
                            >
                                Add to Calendar
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-250px)] pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-zinc-200 dark:[&::-webkit-scrollbar-thumb]:bg-zinc-800 hover:[&::-webkit-scrollbar-thumb]:bg-[#e8fe41] [&::-webkit-scrollbar-thumb]:rounded-full transition-colors">
                        {officialEvents.length === 0 ? (
                            <div className="text-center py-8 text-zinc-400">
                                <Globe size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">No upcoming official events found.</p>
                            </div>
                        ) : (
                            <AnimatePresence>
                                {officialEvents.map((event, index) => {
                                    const isJoined = events.some(userEvent => {
                                         if (userEvent.officialEventId === event.id) return true;
                                         if (userEvent.title === event.title) {
                                             const userDate = userEvent.startDate instanceof Date ? userEvent.startDate : new Date(userEvent.startDate);
                                             const officialDate = event.date instanceof Date ? event.date : new Date(event.date);
                                             return isSameDay(userDate, officialDate);
                                         }
                                         return false;
                                    });

                                    return (
                                    <motion.div 
                                        key={event.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`relative p-4 pl-5 rounded-2xl border transition-all shadow-sm overflow-hidden group ${
                                            isJoined 
                                            ? 'bg-zinc-50 dark:bg-zinc-900/50 border-zinc-100 dark:border-zinc-800/50 opacity-75' 
                                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md'
                                        }`}
                                    >
                                        {/* Neo Yellow Accent Bar */}
                                        <div 
                                            className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2 ${isJoined ? 'bg-zinc-200 dark:bg-zinc-800' : ''}`}
                                            style={!isJoined ? { backgroundColor: accentColor } : {}}
                                        />

                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className={`font-semibold text-sm ${isJoined ? 'text-zinc-500' : 'text-zinc-900 dark:text-white'}`}>
                                                {event.title}
                                            </h3>
                                            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                                                {format(event.date, 'MMM d')}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 text-xs text-zinc-500 mb-3">
                                            <MapPin size={14} className="text-zinc-400" />
                                            <span>{event.location}</span>
                                        </div>

                                        <div className="flex flex-wrap gap-1.5 mb-4">
                                            {event.categories?.slice(0, 3).map((cat, idx) => (
                                                <span key={idx} className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50">
                                                    {cat}
                                                </span>
                                            ))}
                                            {event.categories?.length > 3 && (
                                                <span className="text-[10px] px-2 py-0.5 text-zinc-400">
                                                    +{event.categories.length - 3}
                                                </span>
                                            )}
                                        </div>

                                        <Button
                                            size="sm"
                                            fullWidth
                                            radius="full"
                                            className={`font-bold shadow-sm ${isJoined ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-500 cursor-not-allowed' : ''}`}
                                            style={!isJoined ? { backgroundColor: accentColor, color: accentText } : {}}
                                            onPress={() => !isJoined && handleJoinEvent(event)}
                                            isLoading={isLoading}
                                            isDisabled={isJoined}
                                        >
                                            {isJoined ? "Already Joined" : "Join Event"}
                                        </Button>
                                    </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default AddSessionPanel;