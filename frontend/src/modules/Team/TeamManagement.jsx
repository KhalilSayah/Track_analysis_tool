import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardBody, Button, Chip, Tabs, Tab, Switch } from "@heroui/react";
import { Users, Shield, ArrowLeft, AlertCircle } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { useConfig } from '../../contexts/ConfigContext';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';

const TeamManagement = () => {
    const { teamId } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const { userTeams, updateTeamInState } = useTeam();
    const { modules } = useConfig();

    const team = useMemo(
        () => userTeams.find(t => t.id === teamId),
        [userTeams, teamId]
    );

    const [selectedMemberId, setSelectedMemberId] = useState(null);
    const [localAdmins, setLocalAdmins] = useState([]);
    const [localPermissions, setLocalPermissions] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState(null);

    useEffect(() => {
        if (team) {
            const baseAdmins = Array.isArray(team.admins) && team.admins.length > 0 
                ? team.admins 
                : [team.createdBy];
            setLocalAdmins(baseAdmins);
            setLocalPermissions(team.permissions || {});
            if (!selectedMemberId && team.members && team.members.length > 0) {
                setSelectedMemberId(team.members[0]);
            }
        }
    }, [team, selectedMemberId]);

    const availableModules = useMemo(
        () => modules.filter(m => m.id !== 'home' && !m.locked),
        [modules]
    );

    if (!team) {
        return (
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                    <Button
                        isIconOnly
                        variant="light"
                        onPress={() => navigate(-1)}
                    >
                        <ArrowLeft size={18} />
                    </Button>
                    <h1 className="text-2xl font-bold text-white">Team not found</h1>
                </div>
                <div className="flex items-center gap-2 text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <AlertCircle size={18} />
                    <span>This team is not available or you are not a member.</span>
                </div>
            </div>
        );
    }

    const isOwner = team.createdBy === currentUser.uid;
    const isAdmin = isOwner || localAdmins.includes(currentUser.uid);
    const canEditRoles = isOwner;
    const canEditPermissions = isAdmin;

    const memberRoleLabel = (memberId) => {
        if (memberId === team.createdBy) return 'Owner';
        if (localAdmins.includes(memberId)) return 'Admin';
        return 'Member';
    };

    const memberIsAdmin = (memberId) => {
        if (memberId === team.createdBy) return true;
        return localAdmins.includes(memberId);
    };

    const handleToggleAdmin = (memberId) => {
        if (!canEditRoles) return;
        if (memberId === team.createdBy) return;
        setLocalAdmins(prev => {
            if (prev.includes(memberId)) {
                return prev.filter(id => id !== memberId);
            }
            return [...prev, memberId];
        });
        setLocalPermissions(prev => {
            const next = { ...prev };
            const isBecomingAdmin = !memberIsAdmin(memberId);
            if (isBecomingAdmin) {
                delete next[memberId];
            }
            return next;
        });
    };

    const memberHasAccessToModule = (memberId, moduleId) => {
        if (memberIsAdmin(memberId)) {
            return true;
        }
        const perms = localPermissions[memberId] || {};
        if (typeof perms[moduleId] === 'boolean') {
            return perms[moduleId];
        }
        return true;
    };

    const toggleMemberModuleAccess = (memberId, moduleId) => {
        if (!canEditPermissions) return;
        setLocalPermissions(prev => {
            const currentForUser = prev[memberId] || {};
            const currentValue = typeof currentForUser[moduleId] === 'boolean' ? currentForUser[moduleId] : true;
            const nextValue = !currentValue;
            return {
                ...prev,
                [memberId]: {
                    ...currentForUser,
                    [moduleId]: nextValue
                }
            };
        });
    };

    const handleSave = async () => {
        setIsSaving(true);
        setSaveMessage(null);
        try {
            const finalAdmins = Array.from(new Set([...localAdmins, team.createdBy]));
            const payload = {
                admins: finalAdmins,
                permissions: localPermissions
            };
            await updateDoc(doc(db, "teams", team.id), payload);
            updateTeamInState(team.id, payload);
            setSaveMessage({ type: 'success', text: 'Team roles and access updated.' });
        } catch (error) {
            console.error("Error updating team roles:", error);
            setSaveMessage({ type: 'error', text: 'Failed to save changes. Please try again.' });
        } finally {
            setIsSaving(false);
        }
    };

    const disabledNotice = !isAdmin ? (
        <div className="mb-4 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>You do not have admin rights in this team. Settings are read-only.</span>
        </div>
    ) : null;

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button
                        isIconOnly
                        variant="light"
                        onPress={() => navigate(-1)}
                    >
                        <ArrowLeft size={18} />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Manage Team</h1>
                        <p className="text-zinc-400 text-sm">
                            Configure roles and tool access for team members.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-black"
                        style={{ backgroundColor: team.color }}
                    >
                        {team.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold text-white text-sm">{team.name}</span>
                        <span className="text-xs text-zinc-500">
                            {team.members.length} people in this team
                        </span>
                    </div>
                </div>
            </div>

            {saveMessage && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                    saveMessage.type === 'success'
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                    <AlertCircle size={16} />
                    <span>{saveMessage.text}</span>
                </div>
            )}

            {disabledNotice}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="bg-zinc-900/70 border border-zinc-800 h-full">
                    <CardHeader className="flex gap-3 px-6 pt-6">
                        <div className="p-2 rounded-lg bg-[#e8fe41]/10 text-[#e8fe41]">
                            <Users size={22} />
                        </div>
                        <div className="flex flex-col">
                            <p className="text-md font-bold text-white">Team Members</p>
                            <p className="text-small text-zinc-500">Select a person to configure access</p>
                        </div>
                    </CardHeader>
                    <CardBody className="px-4 pb-4 pt-2 space-y-2 custom-scrollbar max-h-[420px] overflow-y-auto">
                        {team.members.map(memberId => {
                            const isCurrent = memberId === currentUser.uid;
                            const role = memberRoleLabel(memberId);
                            const isSelected = memberId === selectedMemberId;
                            return (
                                <button
                                    key={memberId}
                                    type="button"
                                    onClick={() => setSelectedMemberId(memberId)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-all ${
                                        isSelected
                                            ? 'border-[#e8fe41] bg-[#e8fe41]/10'
                                            : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-600'
                                    }`}
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-white">
                                            {isCurrent ? 'You' : memberId.slice(0, 6) + '...'}
                                        </span>
                                        <span className="text-[11px] text-zinc-500 break-all">
                                            {memberId}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <Chip
                                            size="sm"
                                            className={`h-5 px-2 text-[10px] font-bold ${
                                                role === 'Owner'
                                                    ? 'bg-[#e8fe41] text-black'
                                                    : role === 'Admin'
                                                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                                                    : 'bg-zinc-800 text-zinc-300'
                                            }`}
                                        >
                                            {role}
                                        </Chip>
                                    </div>
                                </button>
                            );
                        })}
                    </CardBody>
                </Card>

                <Card className="bg-zinc-900/70 border border-zinc-800 h-full lg:col-span-2">
                    <CardHeader className="flex gap-3 px-6 pt-6 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                <Shield size={22} />
                            </div>
                            <div className="flex flex-col">
                                <p className="text-md font-bold text-white">Roles & Access</p>
                                <p className="text-small text-zinc-500">
                                    Configure who can manage tools and access features in this team.
                                </p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardBody className="px-6 pb-6 pt-4 space-y-6">
                        {selectedMemberId && (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm text-zinc-400">Selected member</span>
                                        <span className="text-base font-semibold text-white">
                                            {selectedMemberId === currentUser.uid ? 'You' : selectedMemberId}
                                        </span>
                                    </div>
                                    <Chip
                                        size="sm"
                                        className="h-6 px-2 text-[11px] font-bold bg-zinc-800 text-zinc-200"
                                    >
                                        {memberRoleLabel(selectedMemberId)}
                                    </Chip>
                                </div>

                                <Tabs
                                    aria-label="Team access configuration"
                                    color="primary"
                                    variant="underlined"
                                    className="mb-2"
                                >
                                    <Tab key="roles" title="Roles">
                                        <div className="py-4 space-y-4">
                                            <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-white">Admin</span>
                                                    <span className="text-xs text-zinc-500">
                                                        Admins can activate or deactivate tools for people in this team.
                                                    </span>
                                                </div>
                                                <Switch
                                                    isSelected={memberIsAdmin(selectedMemberId)}
                                                    onChange={() => handleToggleAdmin(selectedMemberId)}
                                                    isDisabled={!canEditRoles || selectedMemberId === team.createdBy}
                                                    classNames={{
                                                        wrapper: "group-data-[selected=true]:bg-[#e8fe41]/40",
                                                        thumb: "group-data-[selected=true]:bg-[#e8fe41]"
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </Tab>
                                    <Tab key="tools" title="Tools and functionalities">
                                        <div className="py-4 space-y-3">
                                            <p className="text-xs text-zinc-500 mb-2">
                                                If a functionality is deactivated for this person in this team, the tool will not appear when they are using this team.
                                            </p>
                                            <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
                                                {availableModules.map(module => {
                                                    const hasAccess = memberHasAccessToModule(selectedMemberId, module.id);
                                                    return (
                                                        <div
                                                            key={module.id}
                                                            className="flex items-center justify-between p-3 rounded-xl bg-zinc-900 border border-zinc-800"
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-semibold text-white">
                                                                    {module.name}
                                                                </span>
                                                                <span className="text-xs text-zinc-500">
                                                                    {module.description}
                                                                </span>
                                                            </div>
                                                            <Switch
                                                                isSelected={hasAccess}
                                                                onChange={() => toggleMemberModuleAccess(selectedMemberId, module.id)}
                                                                isDisabled={!canEditPermissions || memberIsAdmin(selectedMemberId)}
                                                                classNames={{
                                                                    wrapper: "group-data-[selected=true]:bg-[#e8fe41]/40",
                                                                    thumb: "group-data-[selected=true]:bg-[#e8fe41]"
                                                                }}
                                                            />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </Tab>
                                </Tabs>
                            </>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                            <Button
                                variant="light"
                                onPress={() => navigate(-1)}
                                className="text-zinc-300"
                            >
                                Cancel
                            </Button>
                            <Button
                                className="bg-[#e8fe41] text-black font-bold"
                                onPress={handleSave}
                                isLoading={isSaving}
                                isDisabled={!isAdmin}
                            >
                                Save changes
                            </Button>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
};

export default TeamManagement;
