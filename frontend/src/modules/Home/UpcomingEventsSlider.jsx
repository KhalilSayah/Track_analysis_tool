import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { collection, query, orderBy, onSnapshot, limit, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { format } from 'date-fns';
import { MapPin, Calendar as CalendarIcon } from 'lucide-react';

const UpcomingEventsSlider = () => {
    const [events, setEvents] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const constraintsRef = useRef(null);

    useEffect(() => {
        // Fetch upcoming events
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, 'official_competitions'),
            orderBy('date', 'asc'),
            limit(50) // Limit to 50 upcoming events to allow for better client-side filtering
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate()
            })).filter(e => e.date >= now);
            
            setEvents(fetchedEvents);
        });

        return () => unsubscribe();
    }, []);

    // Extract unique categories
    const uniqueCategories = [...new Set(events.flatMap(event => event.categories || []))].sort();
    const categories = ['All', ...uniqueCategories];

    // Filter events based on selection
    const filteredEvents = selectedCategory === 'All' 
        ? events 
        : events.filter(event => event.categories?.includes(selectedCategory));

    if (events.length === 0) return null;

    return (
        <div className="w-full mb-8">
            <div className="flex flex-col gap-4 mb-4 px-1">
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white">
                    Upcoming Official Events
                </h3>
                
                {/* Category Filter */}
                <div className="flex gap-2 flex-wrap pb-2">
                    {categories.map(category => (
                        <button
                            key={category}
                            onClick={() => setSelectedCategory(category)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                                selectedCategory === category
                                    ? 'bg-[#e8fe41] text-black shadow-lg shadow-[#e8fe41]/20'
                                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                            }`}
                        >
                            {category}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="overflow-hidden" ref={constraintsRef}>
                {filteredEvents.length > 0 ? (
                    <motion.div
                        className="flex gap-4 cursor-grab active:cursor-grabbing pb-4"
                        drag="x"
                        // Calculate constraints based on content width vs container width
                        // For simplicity, we can just allow free drag with some bounds or use a ref
                        // A simple way is to use a very large negative constraint for right scrolling
                        dragConstraints={{ right: 0, left: -((filteredEvents.length * 296) - 100) }} 
                        whileTap={{ cursor: "grabbing" }}
                    >
                        {filteredEvents.map((event, index) => (
                            <motion.div 
                                key={`${event.id}-${index}`}
                                className="flex-shrink-0 w-[280px] p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col justify-between group hover:border-[#e8fe41] transition-all hover:shadow-md"
                                whileHover={{ y: -5 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-[#e8fe41]/10 text-zinc-900 dark:text-white border border-[#e8fe41]/20">
                                            {format(event.date, 'MMM d, yyyy')}
                                        </span>
                                        {event.categories?.[0] && (
                                            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                                                {event.categories[0]}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="font-bold text-zinc-900 dark:text-white truncate" title={event.title}>
                                        {event.title}
                                    </h3>
                                </div>
                                
                                <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
                                    <MapPin size={12} />
                                    <span className="truncate">{event.location}</span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <div className="text-center py-8 text-zinc-500 dark:text-zinc-400 text-sm">
                        No events found for {selectedCategory}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UpcomingEventsSlider;
