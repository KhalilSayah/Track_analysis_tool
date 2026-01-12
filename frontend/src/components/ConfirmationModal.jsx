import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, CheckCircle, HelpCircle, X } from 'lucide-react';
import { Button } from "@heroui/react";

const ConfirmationModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    description, 
    confirmText = "Confirm", 
    cancelText = "Cancel", 
    type = "info", // warning, info, success, danger
    isLoading = false
}) => {
    
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const getIcon = () => {
        switch(type) {
            case 'danger':
                return <AlertTriangle className="text-red-500" size={28} />;
            case 'warning':
                return <AlertTriangle className="text-amber-500" size={28} />;
            case 'success':
                return <CheckCircle className="text-green-500" size={28} />;
            case 'info':
            default:
                return <HelpCircle className="text-blue-500" size={28} />;
        }
    };

    const getColor = () => {
        switch(type) {
            case 'danger': return "danger";
            case 'success': return "success";
            case 'warning': return "warning";
            case 'info': return "primary";
            default: return "primary";
        }
    };

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div 
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        transition={{ type: "spring", duration: 0.3 }}
                        className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
                    >
                        {/* Header */}
                        <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl bg-${getColor()}/10`}>
                                    {getIcon()}
                                </div>
                                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
                                    {title}
                                </h2>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-6 py-6">
                            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                {description}
                            </p>
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
                            {cancelText && (
                                <Button 
                                    variant="light" 
                                    onPress={onClose} 
                                    isDisabled={isLoading}
                                    className="font-medium text-zinc-700 dark:text-zinc-300"
                                >
                                    {cancelText}
                                </Button>
                            )}
                            <Button 
                                color={getColor()} 
                                onPress={onConfirm}
                                isLoading={isLoading}
                                className="font-bold text-white shadow-lg"
                            >
                                {confirmText}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default ConfirmationModal;
