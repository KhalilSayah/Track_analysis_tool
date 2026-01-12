import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, getDocs, writeBatch, limit } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import CalendarView from './CalendarView';
import AddSessionPanel from './AddSessionPanel';
import EventsList from './EventsList';
import ConfirmationModal from '../../components/ConfirmationModal';
import { parseISO, parse } from 'date-fns';
import { OFFICIAL_EVENTS } from './officialEventsData';

const Calendar = () => {
    const { currentUser } = useAuth();
    const { currentTeam } = useTeam();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedRange, setSelectedRange] = useState({ start: new Date(), end: new Date() });
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Delete Modal State
    const [eventToDelete, setEventToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Initial Data Upload (Official Events)
    useEffect(() => {
        const checkAndUploadOfficialEvents = async () => {
            try {
                const officialRef = collection(db, 'official_competitions');
                const snapshot = await getDocs(query(officialRef, limit(1)));
                
                if (snapshot.empty) {
                    console.log("Uploading official events...");
                    const batch = writeBatch(db);
                    
                    OFFICIAL_EVENTS.forEach((event) => {
                        const docRef = doc(officialRef);
                        // Parse DD/MM/YYYY
                        const dateParts = event.date.split('/');
                        // Create date object (Month is 0-indexed in JS Date)
                        const dateObj = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
                        
                        batch.set(docRef, {
                            ...event,
                            date: dateObj, // Store as Timestamp/Date
                            dateString: event.date, // Store original string just in case
                            createdAt: serverTimestamp()
                        });
                    });

                    await batch.commit();
                    console.log("Official events uploaded successfully!");
                }
            } catch (error) {
                console.error("Error checking/uploading official events:", error);
            }
        };

        checkAndUploadOfficialEvents();
    }, []);

    // Fetch Events
    useEffect(() => {
        if (!currentUser) return;

        const eventsRef = collection(db, 'calendar_events');
        let q;

        if (currentTeam) {
            // Team Mode: Show team events
            q = query(
                eventsRef, 
                where('teamId', '==', currentTeam.id)
            );
        } else {
            // Personal Mode: Show personal events (no teamId)
            q = query(
                eventsRef, 
                where('userId', '==', currentUser.uid),
                where('teamId', '==', null)
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedEvents = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Ensure date is usable
                    date: data.date?.toDate ? data.date.toDate() : new Date(data.date),
                    startDate: data.startDate ? (data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate)) : (data.date?.toDate ? data.date.toDate() : new Date(data.date)),
                    endDate: data.endDate ? (data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate)) : (data.date?.toDate ? data.date.toDate() : new Date(data.date))
                };
            });
            setEvents(fetchedEvents);
        });

        return () => unsubscribe();
    }, [currentUser, currentTeam]);

    const handleAddSession = async (sessionData) => {
        setIsLoading(true);
        try {
            await addDoc(collection(db, 'calendar_events'), {
                title: sessionData.title,
                type: sessionData.type,
                date: sessionData.startDate.toISOString(), // Keep for backward compatibility/sorting
                startDate: sessionData.startDate.toISOString(),
                endDate: sessionData.endDate.toISOString(),
                userId: currentUser.uid,
                teamId: currentTeam ? currentTeam.id : null,
                createdAt: serverTimestamp(),
                color: currentTeam ? currentTeam.color : '#e8fe41',
                textColor: currentTeam ? 'white' : 'black',
                officialEventId: sessionData.officialEventId || null
            });
            // Success notification could go here
        } catch (error) {
            console.error("Error adding session:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(db, 'calendar_events', eventToDelete.id));
            setEventToDelete(null);
        } catch (error) {
            console.error("Error deleting event:", error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-2">
            <div className="flex gap-6 items-start">
                <div className="flex-1">
                    <CalendarView 
                        currentDate={currentDate}
                        onDateChange={setCurrentDate}
                        events={events}
                        selectedRange={selectedRange}
                        onSelectRange={setSelectedRange}
                    />
                </div>
                <div className="w-96 flex-shrink-0 sticky top-6">
                    <AddSessionPanel 
                        selectedRange={selectedRange}
                        onAddSession={handleAddSession}
                        onRangeChange={setSelectedRange}
                        isLoading={isLoading}
                        events={events}
                    />
                </div>
            </div>

            <div className="flex-shrink-0">
                <EventsList 
                    events={events} 
                    onDeleteEvent={setEventToDelete} 
                />
            </div>

            <ConfirmationModal 
                isOpen={!!eventToDelete}
                onClose={() => setEventToDelete(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Event"
                description={`Are you sure you want to delete "${eventToDelete?.title}"? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                color="danger"
                isLoading={isDeleting}
            />
        </div>
    );
};

export default Calendar;