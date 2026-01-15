import React, { useState, useRef, useEffect } from 'react';
import { Card, CardBody, Button, Input, Chip, Spinner } from "@heroui/react";
import { Send, Bot, User, CheckCircle2, AlertCircle, Banknote } from 'lucide-react';
import { useTeam } from '../../contexts/TeamContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

const BudgetChat = () => {
    const { currentTeam } = useTeam();
    const { currentUser } = useAuth();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I'm your Budget Assistant. I can help you track expenses, manage your budget, and analyze costs. Try saying 'Add 300 EUR for tires at Valencia'."
        }
    ]);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            // Send history to backend
            const payload = {
                messages: [...messages, userMsg],
                api_key: null // Backend handles fallback
            };

            const response = await axios.post(`${API_URL}/api/v1/budget/chat`, payload);
            const data = response.data;

            if (data.type === 'action') {
                // Handle Action
                const action = data.payload;
                if (action.action === 'ADD_COST') {
                    await handleAddCost(action.data);
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `✅ **Success!** I've added **${action.data.amount} ${action.data.currency}** for **${action.data.category}** (${action.data.description}) to the budget.`
                    }]);
                } else if (action.action === 'QUERY_BUDGET') {
                     setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: "I understand you want to query the budget. This feature is currently limited to viewing the dashboard on the left."
                    }]);
                } else {
                     setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: `I prepared an action (${action.action}) but I don't know how to execute it yet.`
                    }]);
                }
            } else {
                // Normal text response
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.content
                }]);
            }

        } catch (error) {
            console.error("Chat Error:", error);
            if (error.message === "No team selected") {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "⚠️ **Action Failed:** You need to select a team workspace to save budget items. Please select a team from the top-right menu."
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: "❌ Sorry, I encountered an error communicating with the server."
                }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddCost = async (data) => {
        if (!currentTeam) {
            throw new Error("No team selected");
        }

        const costData = {
            ...data,
            teamId: currentTeam.id,
            createdBy: currentUser.uid,
            createdAt: serverTimestamp(),
            // Ensure date is a string or timestamp. Prompt returns "YYYY-MM-DD"
            date: data.date 
        };

        await addDoc(collection(db, "teams", currentTeam.id, "budget_items"), costData);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <Card className="h-full border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl bg-white dark:bg-zinc-900 flex flex-col">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/50">
                <div className="p-2 bg-[#e8fe41]/20 rounded-xl text-black dark:text-[#e8fe41]">
                    <Banknote size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-sm">Budget Assistant</h3>
                    <p className="text-xs text-zinc-500">AI-powered financial tracking</p>
                </div>
            </div>

            <div className="flex-1 p-4 space-y-4 overflow-y-auto custom-scrollbar" ref={scrollRef}>
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                            <div className="w-8 h-8 rounded-full bg-[#e8fe41] flex items-center justify-center flex-shrink-0 mt-1">
                                <Bot size={16} className="text-black" />
                            </div>
                        )}
                        <div className={`
                            max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed
                            ${msg.role === 'user' 
                                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-tr-none' 
                                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none'}
                        `}>
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.role === 'user' && (
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 mt-1">
                                <User size={16} className="text-zinc-500 dark:text-zinc-400" />
                            </div>
                        )}
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-3 justify-start">
                         <div className="w-8 h-8 rounded-full bg-[#e8fe41] flex items-center justify-center flex-shrink-0 mt-1">
                            <Bot size={16} className="text-black" />
                        </div>
                        <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-none flex items-center gap-2">
                            <Spinner size="sm" color="default" />
                            <span className="text-xs text-zinc-500">Thinking...</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
                <Input
                    placeholder="Type a message..."
                    value={input}
                    onValueChange={setInput}
                    onKeyDown={handleKeyDown}
                    className="flex-1"
                    classNames={{
                        input: "text-sm",
                        inputWrapper: "bg-zinc-100 dark:bg-zinc-800 shadow-none hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors h-12"
                    }}
                />
                <Button 
                    isIconOnly 
                    className="bg-[#e8fe41] text-black h-12 w-12 rounded-xl flex items-center justify-center p-0"
                    onPress={handleSend}
                    isDisabled={!input.trim() || isLoading}
                >
                    <Send size={20} />
                </Button>
            </div>
        </Card>
    );
};

export default BudgetChat;
