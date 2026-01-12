import React, { useState, useEffect } from 'react';
import BudgetChat from './BudgetChat';
import BudgetDashboard from './BudgetDashboard';
import { Button } from "@heroui/react";
import { useTeam } from '../../contexts/TeamContext';
import ConfirmationModal from '../../components/ConfirmationModal';
import { MessageSquare, X, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Budget = () => {
    const { currentTeam } = useTeam();
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [isChatOpen, setIsChatOpen] = useState(false);

    useEffect(() => {
        document.title = "Budget Monitoring | Karting Manager";
    }, []);

    useEffect(() => {
        if (!currentTeam) {
            setIsTeamModalOpen(true);
        } else {
            setIsTeamModalOpen(false);
        }
    }, [currentTeam]);

    return (
        <div className="h-[calc(100vh-140px)] min-h-[600px] flex flex-col relative">
            <div className="flex items-center gap-4 flex-shrink-0 mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-zinc-800 text-[#e8fe41]">
                        <DollarSign size={20} />
                    </div>
                    <h3 className="text-lg font-bold text-white">Budget Monitoring {currentTeam ? `- ${currentTeam.name}` : ''}</h3>
                </div>
                <div className="relative max-w-fit min-w-min inline-flex items-center justify-between box-border whitespace-nowrap px-1 h-6 text-tiny rounded-full bg-[#e8fe41] text-black font-bold border-none">
                    <span className="flex-1 text-inherit font-normal px-1">BETA</span>
                </div>
            </div>
            
            {/* Full Width Dashboard */}
            <div className="flex-1 min-w-0 h-full overflow-hidden">
                <BudgetDashboard />
            </div>

            {/* Floating Chat Toggle Button */}
            <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
                <AnimatePresence>
                    {isChatOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="w-[350px] h-[500px] max-h-[70vh] shadow-2xl rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                        >
                            <BudgetChat />
                        </motion.div>
                    )}
                </AnimatePresence>

                <Button
                    isIconOnly
                    className={`h-14 w-14 rounded-full shadow-lg z-50 transition-transform flex items-center justify-center p-0 ${isChatOpen ? 'bg-zinc-900 text-white dark:bg-white dark:text-black rotate-90' : 'bg-[#e8fe41] text-black hover:scale-105'}`}
                    onPress={() => setIsChatOpen(!isChatOpen)}
                >
                    {isChatOpen ? <X size={24} /> : <MessageSquare size={24} />}
                </Button>
            </div>

            <ConfirmationModal 
                isOpen={isTeamModalOpen}
                onClose={() => setIsTeamModalOpen(false)}
                onConfirm={() => setIsTeamModalOpen(false)}
                title="Team Selection Required"
                description="The Budget Monitoring tool requires an active Team workspace. Please select a team from the top-right menu to continue."
                confirmText="Got it"
                type="warning"
                cancelText="" 
            />
        </div>
    );
};

export default Budget;
