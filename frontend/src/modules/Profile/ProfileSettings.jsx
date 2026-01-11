import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Input, Button, Spacer } from "@heroui/react";
import { useAuth } from '../../contexts/AuthContext';
import { updatePassword, updateProfile } from 'firebase/auth';
import { Lock, User, Save, AlertCircle, CheckCircle } from 'lucide-react';
import SectionTitle from '../../components/SectionTitle';

const ProfileSettings = () => {
  const { currentUser } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', content: '' });

  useEffect(() => {
    document.title = "Profile Settings | Karting Analysis";
  }, []);

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
    </div>
  );
};

export default ProfileSettings;
