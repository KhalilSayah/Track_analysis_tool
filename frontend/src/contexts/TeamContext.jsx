import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    updateDoc, 
    arrayUnion, 
    doc, 
    serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { useAuth } from './AuthContext';

const TeamContext = createContext();

export const useTeam = () => {
    return useContext(TeamContext);
};

export const TeamProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [currentTeam, setCurrentTeam] = useState(null); // null means "Personal Workspace"
    const [userTeams, setUserTeams] = useState([]);
    const [loading, setLoading] = useState(true);

    // Fetch user's teams
    useEffect(() => {
        const fetchTeams = async () => {
            if (!currentUser) {
                setUserTeams([]);
                setCurrentTeam(null);
                setLoading(false);
                return;
            }

            try {
                const q = query(
                    collection(db, "teams"),
                    where("members", "array-contains", currentUser.uid)
                );
                const querySnapshot = await getDocs(q);
                const teams = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setUserTeams(teams);
                
                // If previously selected team is still valid, keep it. Otherwise default to null (Personal)
                // We could persist selection in localStorage if desired.
                const savedTeamId = localStorage.getItem('selectedTeamId');
                if (savedTeamId) {
                    const foundTeam = teams.find(t => t.id === savedTeamId);
                    if (foundTeam) {
                        setCurrentTeam(foundTeam);
                    } else {
                        setCurrentTeam(null);
                        localStorage.removeItem('selectedTeamId');
                    }
                }
            } catch (error) {
                console.error("Error fetching teams:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchTeams();
    }, [currentUser]);

    const createTeam = async (name, color) => {
        if (!currentUser) return;
        if (userTeams.length >= 5) throw new Error("Maximum 5 teams allowed.");

        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const teamData = {
            name,
            color,
            code,
            createdBy: currentUser.uid,
            members: [currentUser.uid],
            createdAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, "teams"), teamData);
        const newTeam = { id: docRef.id, ...teamData };
        
        setUserTeams(prev => [...prev, newTeam]);
        // Switch to new team immediately? User preference. Let's not for now, or maybe yes.
        // Let's just return it.
        return newTeam;
    };

    const joinTeam = async (code) => {
        if (!currentUser) return;
        if (userTeams.length >= 5) throw new Error("Maximum 5 teams allowed.");

        const q = query(collection(db, "teams"), where("code", "==", code));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            throw new Error("Invalid team code.");
        }

        const teamDoc = querySnapshot.docs[0];
        const teamData = teamDoc.data();

        if (teamData.members.includes(currentUser.uid)) {
            throw new Error("You are already a member of this team.");
        }

        await updateDoc(doc(db, "teams", teamDoc.id), {
            members: arrayUnion(currentUser.uid)
        });

        const newTeam = { id: teamDoc.id, ...teamData, members: [...teamData.members, currentUser.uid] };
        setUserTeams(prev => [...prev, newTeam]);
        return newTeam;
    };

    const switchTeam = (team) => {
        setCurrentTeam(team);
        if (team) {
            localStorage.setItem('selectedTeamId', team.id);
        } else {
            localStorage.removeItem('selectedTeamId');
        }
    };

    const leaveTeam = async (teamId) => {
        if (!currentUser) return;
        
        // Find team
        const team = userTeams.find(t => t.id === teamId);
        if (!team) throw new Error("Team not found");

        // Remove user from members
        await updateDoc(doc(db, "teams", teamId), {
            members: team.members.filter(uid => uid !== currentUser.uid)
        });

        // Update local state
        setUserTeams(prev => prev.filter(t => t.id !== teamId));

        // If currently selected, switch to null
        if (currentTeam?.id === teamId) {
            switchTeam(null);
        }
    };

    const value = {
        currentTeam,
        userTeams,
        createTeam,
        joinTeam,
        switchTeam,
        leaveTeam,
        loading
    };

    return (
        <TeamContext.Provider value={value}>
            {children}
        </TeamContext.Provider>
    );
};
