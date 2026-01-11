import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, orderBy, deleteDoc, doc, where } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Button, Input } from "@heroui/react";

const SessionDashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [filterDriver, setFilterDriver] = useState('');
  const [filterTrack, setFilterTrack] = useState('');
  
  // Stats
  const totalSessions = sessions.length;
  const uniqueTracks = new Set(sessions.map(s => s.track)).size;
  const totalLaps = sessions.reduce((acc, s) => acc + (s.metrics?.laps?.length || 0), 0);

  useEffect(() => {
    document.title = "Session Logging | Karting Analysis";
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Use where clause to filter by user
    // Note: Removed orderBy from query to avoid composite index requirement for now
    // We sort client-side instead
    const q = query(
      collection(db, "log_sessions"), 
      where("userId", "==", currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Client-side sort
      data.sort((a, b) => {
        const dateA = new Date(a.startAt || 0);
        const dateB = new Date(b.startAt || 0);
        return dateB - dateA;
      });
      
      setSessions(data);
    });
    return unsubscribe;
  }, [currentUser]);

  const handleDelete = async (id) => {
      if(window.confirm("Are you sure you want to delete this session?")) {
          await deleteDoc(doc(db, "log_sessions", id));
      }
  }

  const filteredSessions = sessions.filter(s => {
      return (
          (s.driver?.toLowerCase() || '').includes(filterDriver.toLowerCase()) &&
          (s.track?.toLowerCase() || '').includes(filterTrack.toLowerCase())
      );
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Session Logging</h1>
        <Button color="primary" onPress={() => navigate('new')} startContent={<Plus size={20} />}>
          New Session
        </Button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
             <h3 className="text-zinc-400 text-sm">Total Sessions</h3>
             <p className="text-3xl font-bold text-white mt-2">{totalSessions}</p>
         </div>
         <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
             <h3 className="text-zinc-400 text-sm">Unique Tracks</h3>
             <p className="text-3xl font-bold text-white mt-2">{uniqueTracks}</p>
         </div>
         <div className="bg-zinc-900 p-6 rounded-xl border border-zinc-800">
             <h3 className="text-zinc-400 text-sm">Total Laps Logged</h3>
             <p className="text-3xl font-bold text-white mt-2">{totalLaps}</p>
         </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 bg-zinc-900 p-4 rounded-xl border border-zinc-800">
          <Input 
            placeholder="Filter by Driver" 
            value={filterDriver} 
            onChange={(e) => setFilterDriver(e.target.value)}
            className="max-w-xs"
          />
          <Input 
            placeholder="Filter by Track" 
            value={filterTrack} 
            onChange={(e) => setFilterTrack(e.target.value)}
            className="max-w-xs"
          />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900 text-zinc-200 uppercase font-semibold">
                <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Driver</th>
                    <th className="p-4">Track</th>
                    <th className="p-4">Session Type</th>
                    <th className="p-4">Best Lap</th>
                    <th className="p-4">Laps</th>
                    <th className="p-4 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 bg-black">
                {filteredSessions.map(session => (
                    <tr key={session.id} className="hover:bg-zinc-900/50 transition-colors">
                        <td className="p-4 text-white font-medium">{session.date}</td>
                        <td className="p-4">{session.driver}</td>
                        <td className="p-4">{session.track}</td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                session.sessionType === 'Race' ? 'bg-red-500/20 text-red-500' :
                                session.sessionType === 'Practice' ? 'bg-blue-500/20 text-blue-500' :
                                'bg-green-500/20 text-green-500'
                            }`}>
                                {session.sessionType}
                            </span>
                        </td>
                        <td className="p-4 text-white">
                            {session.metrics?.best_lap ? session.metrics.best_lap.toFixed(3) : '-'}
                        </td>
                        <td className="p-4">
                            {session.metrics?.laps ? session.metrics.laps.length : 0}
                        </td>
                        <td className="p-4 text-right space-x-2">
                            <button onClick={() => navigate(`edit/${session.id}`)} className="text-blue-400 hover:text-blue-300">
                                <Edit size={18} />
                            </button>
                            <button onClick={() => handleDelete(session.id)} className="text-red-400 hover:text-red-300">
                                <Trash2 size={18} />
                            </button>
                        </td>
                    </tr>
                ))}
                {filteredSessions.length === 0 && (
                    <tr>
                        <td colSpan="7" className="p-8 text-center text-zinc-500">
                            No sessions found. Create one to get started.
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>
    </div>
  );
};

export default SessionDashboard;
