import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardBody, CardHeader, Chip, Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, getKeyValue, Spinner, Button, Tooltip as HeroTooltip, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Select, SelectItem } from "@heroui/react";
import { useTeam } from '../../contexts/TeamContext';
import { db } from '../../firebase';
import { collection, query, orderBy, onSnapshot, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { TrendingDown, TrendingUp, DollarSign, Calendar, Tag, MoreVertical, Trash2, Edit2, AlertTriangle } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import ConfirmationModal from '../../components/ConfirmationModal';

const COLORS = ['#e8fe41', '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const CATEGORIES = ["Tires", "Engines", "Travel", "Staff", "Consumables", "Other"];

const BudgetDashboard = () => {
    const { currentTeam } = useTeam();
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Delete State
    const [deleteId, setDeleteId] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Edit State
    const [editItem, setEditItem] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!currentTeam) return;

        const q = query(
            collection(db, "teams", currentTeam.id, "budget_items")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Client-side sort to avoid index issues
            data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setItems(data);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [currentTeam]);

    // --- Data Processing for KPIs & Charts ---

    const totalSpent = useMemo(() => {
        return items.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    }, [items]);

    const categoryData = useMemo(() => {
        const cats = {};
        items.forEach(item => {
            const cat = item.category || 'Uncategorized';
            cats[cat] = (cats[cat] || 0) + (parseFloat(item.amount) || 0);
        });
        return Object.entries(cats)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [items]);

    const eventData = useMemo(() => {
        const events = {};
        items.forEach(item => {
            // Prefer scope, fallback to a generic bucket if missing
            const scope = item.scope || 'General';
            events[scope] = (events[scope] || 0) + (parseFloat(item.amount) || 0);
        });
        return Object.entries(events)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10); // Top 10 events
    }, [items]);

    const trendData = useMemo(() => {
        // Clone and reverse to have oldest first for cumulative calc
        const sorted = [...items].sort((a, b) => new Date(a.date) - new Date(b.date));
        let cumulative = 0;
        const data = [];
        
        // Group by date to avoid too many points if multiple txns on same day
        const byDate = {};
        sorted.forEach(item => {
            const date = item.date;
            byDate[date] = (byDate[date] || 0) + (parseFloat(item.amount) || 0);
        });

        Object.keys(byDate).sort().forEach(date => {
            cumulative += byDate[date];
            data.push({ date, total: cumulative, daily: byDate[date] });
        });

        return data;
    }, [items]);

    const recentHighCosts = useMemo(() => {
        return [...items]
            .sort((a, b) => parseFloat(b.amount) - parseFloat(a.amount))
            .slice(0, 3);
    }, [items]);

    const costPerEvent = useMemo(() => {
        const uniqueEvents = new Set(items.map(i => i.scope).filter(Boolean)).size;
        return uniqueEvents > 0 ? totalSpent / uniqueEvents : 0;
    }, [totalSpent, items]);


    // --- Actions ---

    const handleDelete = async () => {
        if (!deleteId || !currentTeam) return;
        try {
            await deleteDoc(doc(db, "teams", currentTeam.id, "budget_items", deleteId));
            setIsDeleteModalOpen(false);
            setDeleteId(null);
        } catch (error) {
            console.error("Error deleting document: ", error);
        }
    };

    const confirmDelete = (id) => {
        setDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const openEditModal = (item) => {
        setEditItem({ ...item }); // Clone to avoid direct mutation
        setIsEditModalOpen(true);
    };

    const handleUpdate = async () => {
        if (!editItem || !currentTeam) return;
        setIsUpdating(true);
        try {
            const docRef = doc(db, "teams", currentTeam.id, "budget_items", editItem.id);
            // Remove id field from update payload
            const { id, ...updateData } = editItem;
            // Ensure amount is number
            updateData.amount = parseFloat(updateData.amount);
            
            await updateDoc(docRef, updateData);
            setIsEditModalOpen(false);
            setEditItem(null);
        } catch (error) {
            console.error("Error updating document: ", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const formatCurrency = (amount, currency = 'EUR') => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
    };

    const columns = [
        { key: "date", label: "DATE" },
        { key: "description", label: "DESCRIPTION" },
        { key: "category", label: "CATEGORY" },
        { key: "scope", label: "SCOPE" },
        { key: "amount", label: "AMOUNT" },
        { key: "actions", label: "ACTIONS" },
    ];

    if (isLoading) {
        return <div className="h-full flex items-center justify-center"><Spinner size="lg" color="warning" /></div>;
    }

    if (!currentTeam) {
        return <div className="p-8 text-center text-zinc-500">Please select a team to view budget.</div>;
    }

    return (
        <div className="space-y-6 h-full flex flex-col overflow-y-auto pr-2 custom-scrollbar">
            
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
                {/* Total Spent */}
                <Card className="bg-zinc-900 text-white border-none shadow-lg rounded-3xl">
                    <CardBody className="p-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider mb-1">Total Spent</p>
                                <h2 className="text-3xl font-bold text-[#e8fe41]">{formatCurrency(totalSpent)}</h2>
                            </div>
                            <div className="p-2 bg-[#e8fe41]/20 rounded-lg text-[#e8fe41]">
                                <DollarSign size={20} />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs text-zinc-400">
                            <span className="bg-zinc-800 px-2 py-1 rounded text-white font-medium">{items.length} entries</span>
                            <span>recorded so far</span>
                        </div>
                    </CardBody>
                </Card>

                {/* Cost Per Event */}
                <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl">
                    <CardBody className="p-5">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider mb-1">Avg Cost / Event</p>
                                <h2 className="text-2xl font-bold">{formatCurrency(costPerEvent)}</h2>
                            </div>
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                                <Tag size={20} />
                            </div>
                        </div>
                         <div className="mt-4 text-xs text-zinc-500">
                            Based on {new Set(items.map(i => i.scope).filter(Boolean)).size} unique scopes
                        </div>
                    </CardBody>
                </Card>

                 {/* Recent High Cost */}
                 <Card className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm md:col-span-2 rounded-3xl">
                    <CardBody className="p-5">
                        <div className="flex justify-between items-center mb-3">
                             <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">Top Expenses</p>
                             <AlertTriangle size={16} className="text-amber-500" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {recentHighCosts.map((item, idx) => (
                                <div key={idx} className="bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold">{formatCurrency(item.amount)}</span>
                                        <span className="text-[10px] text-zinc-500">{item.date}</span>
                                    </div>
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400 truncate" title={item.description}>{item.description}</p>
                                </div>
                            ))}
                            {recentHighCosts.length === 0 && <p className="text-sm text-zinc-400">No high costs recorded.</p>}
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[300px] flex-shrink-0">
                {/* Category Distribution */}
                <Card className="h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl">
                    <CardHeader className="pb-0 pt-4 px-4 flex-col items-start">
                        <h4 className="font-bold text-small">Spend by Category</h4>
                    </CardHeader>
                    <CardBody className="overflow-hidden pb-2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{fontSize: '10px'}} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardBody>
                </Card>

                {/* Event Spend */}
                <Card className="h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
                     <CardHeader className="pb-0 pt-4 px-4 flex-col items-start">
                        <h4 className="font-bold text-small">Spend by Event/Scope</h4>
                    </CardHeader>
                    <CardBody className="overflow-hidden pb-2 h-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={eventData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#3f3f46" opacity={0.2} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 10}} />
                                <Tooltip 
                                    cursor={{fill: '#3f3f46', opacity: 0.1}}
                                    contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                    formatter={(value) => formatCurrency(value)}
                                />
                                <Bar dataKey="value" fill="#e8fe41" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardBody>
                </Card>

                 {/* Trend Line */}
                 <Card className="h-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm rounded-3xl">
                     <CardHeader className="pb-0 pt-4 px-4 flex-col items-start">
                        <h4 className="font-bold text-small">Spending Trend (Cumulative)</h4>
                    </CardHeader>
                    <CardBody className="overflow-hidden pb-2 h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                                <XAxis dataKey="date" tick={{fontSize: 10}} minTickGap={30} />
                                <YAxis tick={{fontSize: 10}} tickFormatter={(val) => `€${val/1000}k`} />
                                <Tooltip 
                                     contentStyle={{ backgroundColor: '#18181b', border: 'none', borderRadius: '8px', color: '#fff' }}
                                     formatter={(value) => formatCurrency(value)}
                                />
                                <Line type="monotone" dataKey="total" stroke="#0088FE" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardBody>
                </Card>
            </div>

            {/* Recent Expenses Feed */}
            <Card className="flex-1 min-h-[400px] border border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900 rounded-3xl">
                <CardHeader className="px-6 pt-6 pb-2 flex justify-between items-center">
                    <h3 className="text-lg font-bold">Recent Expenses</h3>
                </CardHeader>
                <CardBody className="px-2 overflow-y-auto custom-scrollbar max-h-[600px]">
                    <Table 
                        aria-label="Budget Transactions" 
                        removeWrapper 
                        classNames={{
                            th: "bg-zinc-50 dark:bg-zinc-800 text-zinc-500 font-medium",
                            td: "py-3 border-b border-zinc-100 dark:border-zinc-800/50"
                        }}
                    >
                        <TableHeader columns={columns}>
                            {(column) => <TableColumn key={column.key} align={column.key === "actions" ? "end" : "start"}>{column.label}</TableColumn>}
                        </TableHeader>
                        <TableBody items={items} emptyContent={"No transactions recorded yet."}>
                            {(item) => (
                                <TableRow key={item.id}>
                                    {(columnKey) => (
                                        <TableCell>
                                            {columnKey === "amount" ? (
                                                <span className="font-bold text-zinc-900 dark:text-white">
                                                    {formatCurrency(item.amount, item.currency)}
                                                </span>
                                            ) : columnKey === "category" ? (
                                                <Chip size="sm" variant="flat" className="capitalize bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                                                    {item[columnKey]}
                                                </Chip>
                                            ) : columnKey === "scope" ? (
                                                <span className="text-xs text-zinc-500 uppercase font-semibold">{item[columnKey]}</span>
                                            ) : columnKey === "actions" ? (
                                                <div className="flex justify-end gap-2">
                                                    <HeroTooltip content="Edit transaction" classNames={{content: "bg-black text-white dark:bg-white dark:text-black"}} closeDelay={0}>
                                                        <span className="text-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer active:opacity-50 transition-colors" onClick={() => openEditModal(item)}>
                                                            <Edit2 size={16} />
                                                        </span>
                                                    </HeroTooltip>
                                                    <HeroTooltip content="Delete transaction" classNames={{content: "bg-red-500 text-white"}} closeDelay={0}>
                                                        <span className="text-lg text-danger hover:text-red-600 dark:hover:text-red-400 cursor-pointer active:opacity-50 transition-colors" onClick={() => confirmDelete(item.id)}>
                                                            <Trash2 size={16} />
                                                        </span>
                                                    </HeroTooltip>
                                                </div>
                                            ) : (
                                                getKeyValue(item, columnKey)
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardBody>
            </Card>

            {/* Edit Modal */}
            <Modal 
                isOpen={isEditModalOpen} 
                onClose={() => setIsEditModalOpen(false)}
                classNames={{
                    base: "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
                }}
            >
                <ModalContent>
                    {(onClose) => (
                        <>
                            <ModalHeader className="flex flex-col gap-1">Edit Transaction</ModalHeader>
                            <ModalBody>
                                {editItem && (
                                    <div className="flex flex-col gap-4">
                                        <div className="flex gap-2">
                                            <Input 
                                                label="Amount" 
                                                type="number" 
                                                value={editItem.amount} 
                                                onValueChange={(val) => setEditItem({...editItem, amount: val})}
                                                className="flex-1"
                                            />
                                            <Input 
                                                label="Currency" 
                                                value={editItem.currency || 'EUR'} 
                                                onValueChange={(val) => setEditItem({...editItem, currency: val})}
                                                className="w-24"
                                            />
                                        </div>
                                        <Input 
                                            label="Description" 
                                            value={editItem.description} 
                                            onValueChange={(val) => setEditItem({...editItem, description: val})}
                                        />
                                        <Select 
                                            label="Category" 
                                            defaultSelectedKeys={editItem.category ? [editItem.category] : []}
                                            onChange={(e) => setEditItem({...editItem, category: e.target.value})}
                                        >
                                            {CATEGORIES.map((cat) => (
                                                <SelectItem key={cat} value={cat} textValue={cat}>
                                                    {cat}
                                                </SelectItem>
                                            ))}
                                        </Select>
                                        <Input 
                                            label="Scope (Event/Session)" 
                                            value={editItem.scope} 
                                            onValueChange={(val) => setEditItem({...editItem, scope: val})}
                                        />
                                        <Input 
                                            label="Date" 
                                            type="date"
                                            value={editItem.date} 
                                            onValueChange={(val) => setEditItem({...editItem, date: val})}
                                        />
                                    </div>
                                )}
                            </ModalBody>
                            <ModalFooter>
                                <Button color="danger" variant="light" onPress={onClose}>
                                    Cancel
                                </Button>
                                <Button color="primary" onPress={handleUpdate} isLoading={isUpdating}>
                                    Save Changes
                                </Button>
                            </ModalFooter>
                        </>
                    )}
                </ModalContent>
            </Modal>

            <ConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDelete}
                title="Delete Transaction"
                description="Are you sure you want to delete this budget entry? This action cannot be undone."
                confirmText="Delete"
                cancelText="Cancel"
                type="danger"
            />
        </div>
    );
};

export default BudgetDashboard;
