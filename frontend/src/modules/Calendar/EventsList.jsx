import React from 'react';
import { Card, CardHeader, CardBody, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Trash2, Calendar as CalendarIcon, Flag, Activity, Download } from 'lucide-react';
import { format, isSameDay, addDays } from 'date-fns';

const EventsList = ({ events, onDeleteEvent }) => {
    
    // Sort events by date (newest first)
    const sortedEvents = [...events].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

    const generateICSContent = (eventList) => {
        const eventsContent = eventList.map(event => {
            const startDate = new Date(event.startDate || event.date);
            const endDate = new Date(event.endDate || event.date);
            const nextDay = addDays(endDate, 1);
            const startStr = format(startDate, 'yyyyMMdd');
            const endStr = format(nextDay, 'yyyyMMdd');
            
            return [
                "BEGIN:VEVENT",
                `UID:${event.id || Date.now()}@kartinganalysis.com`,
                `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
                `DTSTART;VALUE=DATE:${startStr}`,
                `DTEND;VALUE=DATE:${endStr}`,
                `SUMMARY:${event.title}`,
                `DESCRIPTION:${event.type ? event.type.toUpperCase() : 'EVENT'} - ${event.location || 'No Location'}`,
                `LOCATION:${event.location || ''}`,
                "END:VEVENT"
            ].join("\r\n");
        }).join("\r\n");

        return [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//Karting Analysis//NONSGML v1.0//EN",
            eventsContent,
            "END:VCALENDAR"
        ].join("\r\n");
    };

    const downloadICS = (event) => {
        const icsContent = generateICSContent([event]);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const downloadAllICS = () => {
        if (events.length === 0) return;
        const icsContent = generateICSContent(events);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `full_calendar_export.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const formatDateRange = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        
        if (isSameDay(startDate, endDate)) {
            return format(startDate, 'MMM d, yyyy');
        }
        return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`;
    };

    const getIcon = (type) => {
        return type === 'race' ? <Flag size={16} /> : <Activity size={16} />;
    };

    return (
        <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm mt-6">
            <CardHeader className="flex justify-between items-center px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Upcoming Events</h3>
                <Button 
                    size="sm" 
                    variant="flat" 
                    className="bg-[#e8fe41]/20 text-black dark:text-[#e8fe41] font-semibold"
                    startContent={<Download size={16} />}
                    onPress={downloadAllICS}
                    isDisabled={events.length === 0}
                >
                    Export Calendar
                </Button>
            </CardHeader>
            <CardBody className="p-0">
                <Table 
                    aria-label="Events table"
                    shadow="none"
                    classNames={{
                        base: "overflow-visible",
                        table: "min-h-[100px]",
                        th: "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-medium",
                        td: "py-3 border-b border-zinc-100 dark:border-zinc-800/50"
                    }}
                >
                    <TableHeader>
                        <TableColumn>EVENT</TableColumn>
                        <TableColumn>TYPE</TableColumn>
                        <TableColumn>DATE</TableColumn>
                        <TableColumn align="end">ACTIONS</TableColumn>
                    </TableHeader>
                    <TableBody emptyContent="No upcoming events scheduled.">
                        {sortedEvents.map((event) => (
                            <TableRow key={event.id}>
                                <TableCell>
                                    <span className="font-semibold text-zinc-900 dark:text-white">
                                        {event.title}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1.5 rounded-md ${event.type === 'race' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {getIcon(event.type)}
                                        </div>
                                        <span className="capitalize text-sm text-zinc-600 dark:text-zinc-400">
                                            {event.type === 'test' ? 'Testing' : 'Race'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2 text-zinc-500">
                                        <CalendarIcon size={14} />
                                        <span className="text-sm">
                                            {formatDateRange(event.startDate, event.endDate)}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            onPress={() => downloadICS(event)}
                                            className="text-zinc-400 hover:text-[#e8fe41] dark:hover:text-[#e8fe41]"
                                        >
                                            <Download size={18} />
                                        </Button>
                                        <Button
                                            isIconOnly
                                            size="sm"
                                            variant="light"
                                            color="danger"
                                            onPress={() => onDeleteEvent(event)}
                                            className="text-zinc-400 hover:text-red-500"
                                        >
                                            <Trash2 size={18} />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardBody>
        </Card>
    );
};

export default EventsList;