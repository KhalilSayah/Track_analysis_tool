import React from 'react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  isWithinInterval,
  isBefore,
  isAfter
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@heroui/react";

const CalendarView = ({ 
    currentDate, 
    onDateChange, 
    events = [], 
    selectedRange, 
    onSelectRange 
}) => {
    
    const nextMonth = () => {
        onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const today = () => {
        const now = new Date();
        onDateChange(now);
        onSelectRange({ start: now, end: now });
    };

    // Generate Calendar Grid
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Helper to get events for a specific day
    const getEventsForDay = (day) => {
        return events.filter(event => {
            const eventStart = new Date(event.startDate || event.date);
            const eventEnd = new Date(event.endDate || event.date);
            
            // Normalize dates to remove time component for accurate comparison
            const dayStr = format(day, 'yyyy-MM-dd');
            const startStr = format(eventStart, 'yyyy-MM-dd');
            const endStr = format(eventEnd, 'yyyy-MM-dd');
            
            return dayStr >= startStr && dayStr <= endStr;
        });
    };

    const handleDateClick = (day) => {
        if (!selectedRange.start || (selectedRange.start && selectedRange.end && selectedRange.start !== selectedRange.end)) {
            // Start new selection
            onSelectRange({ start: day, end: day });
        } else {
            // Complete selection
            if (isBefore(day, selectedRange.start)) {
                onSelectRange({ start: day, end: selectedRange.start });
            } else {
                onSelectRange({ ...selectedRange, end: day });
            }
        }
    };

    return (
        <div className="flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-white capitalize">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
                        <Button isIconOnly size="sm" variant="light" onPress={prevMonth}>
                            <ChevronLeft size={18} />
                        </Button>
                        <Button size="sm" variant="light" onPress={today} className="text-xs font-medium px-2">
                            Today
                        </Button>
                        <Button isIconOnly size="sm" variant="light" onPress={nextMonth}>
                            <ChevronRight size={18} />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800">
                {WEEKDAYS.map(day => (
                    <div key={day} className="py-3 text-center text-xs font-medium text-zinc-400 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 auto-rows-fr bg-zinc-100 dark:bg-zinc-800 gap-px border-b border-zinc-100 dark:border-zinc-800">
                {calendarDays.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, monthStart);
                    const isDayToday = isToday(day);

                    // Selection Logic
                    const isSelectedStart = selectedRange.start && isSameDay(day, selectedRange.start);
                    const isSelectedEnd = selectedRange.end && isSameDay(day, selectedRange.end);
                    const isInRange = selectedRange.start && selectedRange.end && 
                        isWithinInterval(day, { start: selectedRange.start, end: selectedRange.end });
                    
                    const isSelected = isSelectedStart || isSelectedEnd || isInRange;

                    return (
                        <div 
                            key={idx}
                            onClick={() => handleDateClick(day)}
                            className={`
                                relative min-h-[120px] p-2 cursor-pointer transition-colors
                                ${!isCurrentMonth ? 'bg-zinc-50/50 dark:bg-zinc-900/30 text-zinc-400' : 'bg-white dark:bg-zinc-900'}
                                ${isInRange ? 'bg-blue-50/30 dark:bg-blue-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}
                            `}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className={`
                                    w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-all
                                    ${isDayToday ? 'border-2 border-[#e8fe41] text-zinc-900 dark:text-white' : ''}
                                    ${isDayToday && !isSelected ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}
                                    ${isSelectedStart || isSelectedEnd ? 'bg-blue-500 text-white shadow-md !border-0' : ''}
                                    ${isInRange && !isSelectedStart && !isSelectedEnd ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}
                                `}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            <div className="space-y-1">
                                {dayEvents.map((event) => (
                                    <div 
                                        key={event.id}
                                        className="text-[10px] px-2 py-1 rounded-md truncate font-medium shadow-sm border border-black/5"
                                        style={{ 
                                            backgroundColor: event.color || '#e8fe41',
                                            color: event.textColor || 'black'
                                        }}
                                        title={event.title}
                                    >
                                        {event.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;