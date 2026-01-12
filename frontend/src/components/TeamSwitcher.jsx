import React, { useState } from 'react';
import { useTeam } from '../contexts/TeamContext';
import { 
    Dropdown, 
    DropdownTrigger, 
    DropdownMenu, 
    DropdownItem, 
    Button
} from "@heroui/react";
import { ChevronDown, Users, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from './ConfirmationModal';

const TeamSwitcher = () => {
    const { currentTeam, userTeams, switchTeam } = useTeam();
    const navigate = useNavigate();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pendingTeam, setPendingTeam] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleSwitchRequest = (team) => {
        // If clicking same team, do nothing
        if (currentTeam?.id === team?.id && team !== null) return;
        if (currentTeam === null && team === null) return;

        setPendingTeam(team);
        setIsModalOpen(true);
    };

    const handleConfirmSwitch = async () => {
        setIsLoading(true);
        try {
            await switchTeam(pendingTeam);
        } catch (error) {
            console.error("Failed to switch team:", error);
        } finally {
            setIsLoading(false);
            setIsModalOpen(false);
            setPendingTeam(null);
        }
    };

    return (
        <>
            <div className="absolute top-4 right-4 md:top-6 md:right-8 z-50">
                <Dropdown>
                    <DropdownTrigger>
                        <Button 
                            variant="flat" 
                            className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 h-12 pl-3 pr-4 rounded-xl gap-3 min-w-[200px] justify-between"
                        >
                            <div className="flex items-center gap-3">
                                {currentTeam ? (
                                    <div 
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-lg"
                                        style={{ backgroundColor: currentTeam.color || '#3b82f6' }}
                                    >
                                        {currentTeam.name.substring(0, 2).toUpperCase()}
                                    </div>
                                ) : (
                                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                        <UserIcon size={16} />
                                    </div>
                                )}
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white leading-tight">
                                        {currentTeam ? currentTeam.name : 'Personal Workspace'}
                                    </span>
                                    <span className="text-[10px] text-zinc-500 font-medium">
                                        {currentTeam ? 'Team Account' : 'No Team Selected'}
                                    </span>
                                </div>
                            </div>
                            <ChevronDown size={16} className="text-zinc-400" />
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu 
                        aria-label="Team Actions"
                        className="w-[260px] bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl"
                        itemClasses={{
                            base: "gap-4 data-[hover=true]:bg-zinc-100 dark:data-[hover=true]:bg-zinc-800/50 rounded-lg transition-colors text-zinc-900 dark:text-white",
                            description: "text-zinc-500 dark:text-zinc-400",
                        }}
                    >
                        <DropdownItem key="title" className="h-10 gap-2 opacity-100" isReadOnly>
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Switch Account</span>
                        </DropdownItem>

                        <DropdownItem 
                            key="personal"
                            startContent={
                                <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                                    <UserIcon size={16} />
                                </div>
                            }
                            description="Access your personal files"
                            className={!currentTeam ? "bg-zinc-100 dark:bg-zinc-800/50" : ""}
                            onPress={() => handleSwitchRequest(null)}
                        >
                            Personal Workspace
                        </DropdownItem>

                        {userTeams.map(team => (
                            <DropdownItem 
                                key={team.id}
                                startContent={
                                    <div 
                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-sm"
                                        style={{ backgroundColor: team.color || '#3b82f6' }}
                                    >
                                        {team.name.substring(0, 2).toUpperCase()}
                                    </div>
                                }
                                description={`Code: ${team.code}`}
                                className={currentTeam?.id === team.id ? "bg-zinc-100 dark:bg-zinc-800/50" : ""}
                                onPress={() => handleSwitchRequest(team)}
                            >
                                {team.name}
                            </DropdownItem>
                        ))}

                        <DropdownItem key="divider" className="h-px bg-zinc-200 dark:bg-zinc-800 my-2 p-0" isReadOnly />

                        <DropdownItem 
                            key="manage"
                            startContent={<Users size={18} />}
                            onPress={() => navigate('/dashboard/profile')}
                        >
                            Manage Teams
                        </DropdownItem>
                    </DropdownMenu>
                </Dropdown>
            </div>

            <ConfirmationModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={handleConfirmSwitch}
                title="Switch Workspace?"
                description={
                    pendingTeam 
                    ? `You are about to switch to "${pendingTeam.name}". The dashboard will reload with this team's data.`
                    : "You are about to switch to your Personal Workspace. The dashboard will reload with your personal data."
                }
                confirmText="Switch Team"
                type="info"
                isLoading={isLoading}
            />
        </>
    );
};

export default TeamSwitcher;
