import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardBody, CardHeader, Input, Button, Spacer } from "@heroui/react";
import { useAuth } from '../../contexts/AuthContext';
import { useTeam } from '../../contexts/TeamContext';
import { updatePassword, updateProfile } from 'firebase/auth';
import { Lock, User, Save, AlertCircle, CheckCircle, Users, Plus, Hash, LogOut } from 'lucide-react';
import SectionTitle from '../../components/SectionTitle';
import ConfirmationModal from '../../components/ConfirmationModal';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { userTeams, createTeam, joinTeam, leaveTeam } = useTeam();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });

  // Team State
  const [teamName, setTeamName] = useState('');
  const [teamColor, setTeamColor] = useState('#e8fe41');
  const [joinCode, setJoinCode] = useState('');
  const [teamMessage, setTeamMessage] = useState({ type: '', content: '' });
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  
  // Leave Team Modal State
  const [teamToLeave, setTeamToLeave] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);

  const TEAM_COLORS = [
      '#e8fe41', // Neon Yellow (Default)
      '#3b82f6', // Blue
      '#ef4444', // Red
      '#10b981', // Green
      '#8b5cf6', // Purple
      '#f97316', // Orange
      '#ec4899', // Pink
      '#06b6d4', // Cyan
  ];

  useEffect(() => {
    document.title = "Profile Settings | Karting Analysis";
  }, []);

  const handleCreateTeam = async () => {
      if (!teamName.trim()) {
          setTeamMessage({ type: 'error', content: "Team name is required" });
          return;
      }
      setIsTeamLoading(true);
      setTeamMessage({ type: '', content: '' });
      try {
          await createTeam(teamName, teamColor);
          setTeamMessage({ type: 'success', content: "Team created successfully!" });
          setTeamName('');
      } catch (error) {
          setTeamMessage({ type: 'error', content: error.message });
      } finally {
          setIsTeamLoading(false);
      }
  };

  const handleJoinTeam = async () => {
      if (!joinCode.trim() || joinCode.length !== 6) {
          setTeamMessage({ type: 'error', content: "Please enter a valid 6-character code" });
          return;
      }
      setIsTeamLoading(true);
      setTeamMessage({ type: '', content: '' });
      try {
          await joinTeam(joinCode.toUpperCase());
          setTeamMessage({ type: 'success', content: "Joined team successfully!" });
          setJoinCode('');
      } catch (error) {
          setTeamMessage({ type: 'error', content: error.message });
      } finally {
          setIsTeamLoading(false);
      }
  };

  const handleConfirmLeave = async () => {
      if (!teamToLeave) return;
      setIsLeaving(true);
      try {
          await leaveTeam(teamToLeave.id);
          setTeamMessage({ type: 'success', content: `Left team ${teamToLeave.name} successfully` });
          setTeamToLeave(null);
      } catch (error) {
          setTeamMessage({ type: 'error', content: "Failed to leave team: " + error.message });
      } finally {
          setIsLeaving(false);
      }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage({ type: '', content: '' });

    try {
      if (displayName !== currentUser.displayName) {
        await updateProfile(currentUser, { displayName });
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
            throw new Error("Passwords do not match");
        }
        if (newPassword.length < 6) {
            throw new Error("Password must be at least 6 characters");
        }
        await updatePassword(currentUser, newPassword);
      }

      setMessage({ type: 'success', content: 'Profile updated successfully' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error("Error updating profile:", error);
      let errorMsg = "Failed to update profile";
      if (error.code === 'auth/requires-recent-login') {
        errorMsg = "For security, please log out and log back in before changing your password.";
      } else {
        errorMsg = error.message;
      }
      setMessage({ type: 'error', content: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-display mb-2 text-white">Profile Settings</h1>
        <p className="text-zinc-400">Manage your account information and security.</p>
      </div>

      <form onSubmit={handleUpdateProfile} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Info Card */}
            <Card className="bg-zinc-900/50 border border-zinc-800 h-full">
            <CardHeader className="flex gap-3 px-6 pt-6">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <User size={24} />
                </div>
                <div className="flex flex-col">
                <p className="text-md font-bold text-white">Account Information</p>
                <p className="text-small text-zinc-500">Update your personal details</p>
                </div>
            </CardHeader>
            <CardBody className="px-6 pb-6 gap-6 flex flex-col">
                <div className="flex flex-col gap-2">
                    <label className="text-zinc-400 text-sm">Email</label>
                    <Input
                        value={currentUser?.email}
                        isReadOnly
                        variant="bordered"
                        placeholder=" "
                        className="text-zinc-400"
                        startContent={<User size={16} />}
                        classNames={{
                            input: "text-white",
                        }}
                    />
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-zinc-400 text-sm">Display Name</label>
                    <Input
                        placeholder="Enter your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        variant="bordered"
                        classNames={{
                            input: "text-white",
                        }}
                    />
                </div>
            </CardBody>
            </Card>

            {/* Security Card */}
            <Card className="bg-zinc-900/50 border border-zinc-800 h-full">
                <CardHeader className="flex gap-3 px-6 pt-6">
                    <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                        <Lock size={24} />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-md font-bold text-white">Security</p>
                        <p className="text-small text-zinc-500">Change your password</p>
                    </div>
                </CardHeader>
                <CardBody className="px-6 pb-6 gap-6 flex flex-col">
                    <div className="flex flex-col gap-2">
                        <label className="text-zinc-400 text-sm">New Password</label>
                        <Input
                            type="password"
                            placeholder="Leave blank to keep current"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            variant="bordered"
                            classNames={{
                            input: "text-white",
                            }}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-zinc-400 text-sm">Confirm Password</label>
                        <Input
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            variant="bordered"
                            classNames={{
                            input: "text-white",
                            }}
                        />
                    </div>
                </CardBody>
            </Card>

            {/* Team Management Card */}
            <Card className="bg-zinc-900/50 border border-zinc-800 h-full lg:col-span-2">
                <CardHeader className="flex gap-3 px-6 pt-6">
                    <div className="p-2 rounded-lg bg-[#e8fe41]/10 text-[#e8fe41]">
                        <Users size={24} />
                    </div>
                    <div className="flex flex-col">
                        <p className="text-md font-bold text-white">Team Management</p>
                        <p className="text-small text-zinc-500">Create or join teams to collaborate</p>
                    </div>
                </CardHeader>
                <CardBody className="px-6 pb-6 gap-8">
                    {/* Feedback Message */}
                    {teamMessage.content && (
                        <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                            teamMessage.type === 'success' 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                            : 'bg-red-500/10 text-red-500 border border-red-500/20'
                        }`}>
                            {teamMessage.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {teamMessage.content}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Create Team */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Plus size={16} /> Create New Team
                            </h3>
                            <div className="space-y-4 p-4 rounded-2xl bg-black/20 border border-zinc-800">
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs">Team Name</label>
                                    <Input
                                        placeholder="Enter team name"
                                        value={teamName}
                                        onChange={(e) => setTeamName(e.target.value)}
                                        variant="bordered"
                                        classNames={{ input: "text-white" }}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs">Team Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {TEAM_COLORS.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${teamColor === color ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                                                style={{ backgroundColor: color }}
                                                onClick={() => setTeamColor(color)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <Button 
                                    className="w-full bg-white text-black font-bold"
                                    onPress={handleCreateTeam}
                                    isLoading={isTeamLoading}
                                >
                                    Create Team
                                </Button>
                            </div>
                        </div>

                        {/* Join Team */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <Hash size={16} /> Join Existing Team
                            </h3>
                            <div className="space-y-4 p-4 rounded-2xl bg-black/20 border border-zinc-800">
                                <div className="space-y-2">
                                    <label className="text-zinc-400 text-xs">Invitation Code</label>
                                    <Input
                                        placeholder="Enter 6-digit code"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        variant="bordered"
                                        maxLength={6}
                                        classNames={{ input: "text-white tracking-widest font-mono" }}
                                    />
                                </div>
                                <Button 
                                    className="w-full bg-zinc-800 text-white font-bold border border-zinc-700"
                                    onPress={handleJoinTeam}
                                    isLoading={isTeamLoading}
                                >
                                    Join Team
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* My Teams List */}
                    {userTeams.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                            <h3 className="text-sm font-bold text-white">My Teams</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {userTeams.map(team => {
                                    const isOwner = team.createdBy === currentUser.uid;
                                    const isAdmin = Array.isArray(team.admins) ? team.admins.includes(currentUser.uid) || isOwner : isOwner;
                                    return (
                                        <div key={team.id} className="p-4 rounded-xl bg-zinc-800/50 border border-zinc-700 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div 
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-black"
                                                    style={{ backgroundColor: team.color }}
                                                >
                                                    {team.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-white text-sm">{team.name}</p>
                                                    <p className="text-xs text-zinc-500 font-mono">Code: {team.code}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-xs text-zinc-500">
                                                    {team.members.length} members
                                                </div>
                                                {isAdmin && (
                                                    <Button
                                                        size="sm"
                                                        variant="light"
                                                        className="text-zinc-200 border border-zinc-600"
                                                        onPress={() => navigate(`/dashboard/teams/${team.id}/manage`)}
                                                    >
                                                        Manage
                                                    </Button>
                                                )}
                                                <Button
                                                    isIconOnly
                                                    size="sm"
                                                    variant="light"
                                                    color="danger"
                                                    onPress={() => setTeamToLeave(team)}
                                                    className="text-zinc-500 hover:text-red-500 dark:text-zinc-500 dark:hover:text-red-500"
                                                >
                                                    <LogOut size={16} />
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>

        {message.content && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                message.type === 'success' 
                ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
                {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {message.content}
            </div>
        )}

        <div className="flex justify-end pt-2">
            <Button 
                color="primary" 
                type="submit" 
                isLoading={isLoading}
                startContent={!isLoading && <Save size={18} />}
                className="bg-[#e8fe41] text-black font-bold"
            >
                Save Changes
            </Button>
        </div>
      </form>

      <ConfirmationModal 
          isOpen={!!teamToLeave}
          onClose={() => setTeamToLeave(null)}
          onConfirm={handleConfirmLeave}
          title="Leave Team"
          description={`Are you sure you want to leave "${teamToLeave?.name}"? You will lose access to all shared files and data.`}
          confirmText="Leave Team"
          cancelText="Cancel"
          icon={<LogOut size={24} className="text-red-500" />}
          color="danger"
          isLoading={isLeaving}
      />
    </div>
  );
};

export default ProfileSettings;
