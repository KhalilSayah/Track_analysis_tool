import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  collection, 
  addDoc, 
  query, 
  onSnapshot, 
  serverTimestamp,
  where 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from '../../firebase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Upload, FileText, Database, Loader2 } from 'lucide-react';
import { Card, CardBody, CardHeader, Button, Input, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell } from "@heroui/react";

const SessionLibrary = () => {
  const { currentUser } = useAuth();
  const [tracks, setTracks] = useState([]);
  const [sessions, setSessions] = useState([]);
  
  // UI States
  const [showAddTrack, setShowAddTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  
  useEffect(() => {
    document.title = "Session Library | Karting Analysis";
  }, []);

  const [selectedTrackId, setSelectedTrackId] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch Tracks
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(
      collection(db, "tracks"), 
      where("createdBy", "==", currentUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tracksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      tracksData.sort((a, b) => a.name.localeCompare(b.name));
      setTracks(tracksData);
      if (tracksData.length > 0 && !selectedTrackId) {
        setSelectedTrackId(tracksData[0].id);
      }
    });
    return unsubscribe;
  }, []);

  // Fetch Sessions for Selected Track
  useEffect(() => {
    if (!selectedTrackId) return;
    
    // Subcollection query: tracks/{trackId}/sessions
    const sessionsRef = collection(db, "tracks", selectedTrackId, "sessions");
    const q = query(sessionsRef); // Client-side sort is safer for now
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sessionsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort by uploadedAt desc client-side
      sessionsData.sort((a, b) => (b.uploadedAt?.seconds || 0) - (a.uploadedAt?.seconds || 0));
      setSessions(sessionsData);
    });
    return unsubscribe;
  }, [selectedTrackId]);

  const handleAddTrack = async (e) => {
    e.preventDefault();
    if (!newTrackName.trim()) return;

    try {
      await addDoc(collection(db, "tracks"), {
        name: newTrackName.trim(),
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid
      });
      setNewTrackName('');
      setShowAddTrack(false);
    } catch (error) {
      console.error("Error adding track: ", error);
      alert("Error adding track");
    }
  };

  const handleUploadSession = async () => {
    if (!uploadFile || !selectedTrackId) return;

    setIsUploading(true);
    
    try {
      // Use Backend GCS Endpoint
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('track_id', selectedTrackId);
      formData.append('user_id', currentUser.uid);

      // Upload via Backend
      const response = await axios.post('http://localhost:8000/api/v1/upload-session-gcs', formData);
      const data = response.data;
      
      // Save Metadata to Firestore Subcollection
      await addDoc(collection(db, "tracks", selectedTrackId, "sessions"), {
        trackId: selectedTrackId,
        fileName: uploadFile.name,
        storagePath: data.name,
        storageUrl: data.url, // Signed URL from Backend
        uploadedAt: serverTimestamp(),
        userId: currentUser.uid,
        fileSize: uploadFile.size
      });

      setUploadFile(null);
      const fileInput = document.getElementById('session-upload');
      if (fileInput) fileInput.value = '';
    } catch (error) {
      console.error("Error uploading session: ", error);
      alert("Upload failed. Check backend logs.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
      <header>
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2 text-black dark:text-white">
          <Database className="text-primary" />
          Session Library
        </h1>
        <p className="text-gray-600 dark:text-gray-400">Manage tracks and upload telemetry sessions.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Panel: Tracks List */}
        <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl h-[600px]">
          <CardHeader className="flex justify-between items-center px-6 pt-6 pb-2">
            <h2 className="text-xl font-bold text-black dark:text-white">Tracks</h2>
            <Button 
              isIconOnly
              size="sm"
              variant="light"
              onPress={() => setShowAddTrack(!showAddTrack)}
              className="text-black dark:text-white"
            >
              <Plus size={20} />
            </Button>
          </CardHeader>

          <CardBody className="px-6 py-2 overflow-hidden flex flex-col">
            {showAddTrack && (
              <form onSubmit={handleAddTrack} className="mb-4 flex gap-2">
                <Input
                  size="sm"
                  value={newTrackName}
                  onChange={(e) => setNewTrackName(e.target.value)}
                  placeholder="Track Name"
                  className="flex-1"
                  autoFocus
                />
                <Button 
                  type="submit"
                  size="sm"
                  color="primary"
                  className="font-bold text-black"
                >
                  Add
                </Button>
              </form>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {tracks.map(track => (
                <button
                  key={track.id}
                  onClick={() => setSelectedTrackId(track.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                    selectedTrackId === track.id 
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-lg shadow-neon/20 font-bold' 
                      : 'text-gray-500 dark:text-gray-400 hover:bg-[#e8fe41] hover:text-black'
                  }`}
                >
                  <div className="font-medium">{track.name}</div>
                </button>
              ))}
              {tracks.length === 0 && (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No tracks yet. Add one!
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* Right Panel: Sessions & Upload */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Upload Area */}
          <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl">
            <CardBody className="p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-black dark:text-white">
                <Upload size={20} className="text-gray-400" />
                Upload Session
              </h2>
              
              {!selectedTrackId ? (
                <div className="text-gray-500 dark:text-gray-400 italic">Select a track to upload files.</div>
              ) : (
                <div className="flex gap-4 items-center">
                  <input
                    type="file"
                    id="session-upload"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                  />
                  <label 
                    htmlFor="session-upload"
                    className="flex-1 border-2 border-dashed border-gray-200 dark:border-zinc-700 hover:border-black dark:hover:border-white rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors"
                  >
                    {uploadFile ? (
                      <div className="flex items-center gap-2 text-primary-600 font-bold">
                        <FileText />
                        <span className="font-mono text-black dark:text-white">{uploadFile.name}</span>
                      </div>
                    ) : (
                      <div className="text-gray-400 flex flex-col items-center">
                        <span className="text-sm">Click to select CSV file</span>
                      </div>
                    )}
                  </label>
                  
                  <Button
                    onPress={handleUploadSession}
                    isDisabled={!uploadFile || isUploading}
                    color="primary"
                    variant="shadow"
                    className="h-full px-8 font-bold text-black min-w-[120px]"
                    isLoading={isUploading}
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </div>
              )}
              
              {isUploading && (
                <div className="mt-4 h-2 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Sessions List */}
          <Card className="bg-white dark:bg-zinc-900 shadow-md border-none rounded-2xl min-h-[300px]">
             <CardHeader className="px-6 pt-6 pb-2">
                <h2 className="text-lg font-bold text-black dark:text-white">Sessions for {tracks.find(t => t.id === selectedTrackId)?.name || '...'}</h2>
             </CardHeader>
             <CardBody className="px-6 pb-6">
               <Table aria-label="Sessions table" shadow="none" removeWrapper className="dark:bg-zinc-900">
                 <TableHeader>
                   <TableColumn className="bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-gray-400">FILE NAME</TableColumn>
                   <TableColumn className="bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-gray-400">DATE UPLOADED</TableColumn>
                   <TableColumn className="bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-gray-400">SIZE</TableColumn>
                 </TableHeader>
                 <TableBody emptyContent={<div className="text-gray-500 dark:text-gray-400">No sessions found for this track.</div>}>
                   {sessions.map(session => (
                     <TableRow key={session.id} className="border-b border-gray-100 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                       <TableCell className="flex items-center gap-2 font-medium text-black dark:text-white">
                         <FileText size={16} className="text-gray-400" />
                         {session.fileName}
                       </TableCell>
                       <TableCell className="text-gray-500 dark:text-gray-400">
                         {session.uploadedAt?.toDate().toLocaleDateString()}
                       </TableCell>
                       <TableCell className="font-mono text-gray-500 dark:text-gray-400">
                         {(session.fileSize / 1024).toFixed(1)} KB
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </CardBody>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default SessionLibrary;
