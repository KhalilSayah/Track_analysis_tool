import React from 'react';
import { Card, CardBody, Button, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";
import { Trash2, Calendar as CalendarIcon, Flag, Activity } from 'lucide-react';
import { format, isSameDay } from 'date-fns';

const EventsList = ({ events, onDeleteEvent }) => {
    
    // Sort events by date (newest first)
    const sortedEvents = [...events].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

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
                                    <div className="flex justify-end">
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