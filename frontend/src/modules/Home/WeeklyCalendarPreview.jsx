import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isToday } from 'date-fns';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const WeeklyCalendarPreview = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { currentTeam } = useTeam();
    const [events, setEvents] = useState([]);
    const [currentDate] = useState(new Date());

    // Get current week days (starting Monday)
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    useEffect(() => {
        if (!currentUser) return;

        const eventsRef = collection(db, 'calendar_events');
        let q;

        if (currentTeam) {
            q = query(eventsRef, where('teamId', '==', currentTeam.id));
        } else {
            q = query(eventsRef, where('userId', '==', currentUser.uid), where('teamId', '==', null));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => {
                const data = doc.data();
                // Helper to safely parse date
                const parseDate = (d) => d?.toDate ? d.toDate() : new Date(d);
                const baseDate = data.date ? parseDate(data.date) : new Date();

                return {
                    id: doc.id,
                    ...data,
                    startDate: data.startDate ? parseDate(data.startDate) : baseDate,
                    endDate: data.endDate ? parseDate(data.endDate) : baseDate
                };
            });
            setEvents(fetchedEvents);
        });

        return () => unsubscribe();
    }, [currentUser, currentTeam]);

    const getEventsForDay = (day) => {
        return events.filter(event => 
            isSameDay(day, event.startDate) || 
            (day > event.startDate && day <= event.endDate)
        );
    };

    return (
        <div className="w-full mb-8">
            <div className="flex justify-between items-end mb-4 px-1">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    This Week's Schedule
                </h3>
                <button 
                    onClick={() => navigate('/dashboard/calendar')}
                    className="text-sm text-zinc-500 hover:text-[#e8fe41] transition-colors flex items-center gap-1"
                >
                    Go to calendar <ArrowRight size={16} />
                </button>
            </div>
            
            <div className="grid grid-cols-7 gap-2 overflow-x-auto pb-2">
                {weekDays.map((day, index) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentDay = isToday(day);
                    
                    return (
                        <div 
                            key={index} 
                            className={`flex flex-col p-3 rounded-2xl border transition-all min-w-[100px] h-[120px] ${
                                isCurrentDay 
                                    ? 'bg-[#e8fe41]/10 border-[#e8fe41] shadow-[0_0_15px_rgba(232,254,65,0.2)]' 
                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
                            }`}
                        >
                            <div className="flex flex-col mb-2">
                                <span className={`text-xs font-medium uppercase ${isCurrentDay ? 'text-[#e8fe41]' : 'text-zinc-500'}`}>
                                    {format(day, 'EEE')}
                                </span>
                                <span className={`text-lg font-bold ${isCurrentDay ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="flex-1 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
                                {dayEvents.map((event, idx) => (
                                    <motion.div
                                        key={event.id}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="text-[10px] px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 truncate border-l-2 border-[#e8fe41]"
                                        title={event.title}
                                    >
                                        {event.title}
                                    </motion.div>
                                ))}
                                {dayEvents.length === 0 && (
                                    <div className="h-full flex items-center justify-center">
                                        <span className="text-[10px] text-zinc-400 italic">No events</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default WeeklyCalendarPreview;
