import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Sparkles, RefreshCw, ChevronRight, PenTool, Paperclip, Smile } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSignature } from '@/hooks/useSignature';
import { SignaturePopover } from './SignaturePopover';

export const UserMessageModal = ({ isOpen, onClose, contact, initialChannel = 'email' }) => {
    const [channel, setChannel] = useState(initialChannel);
    const [message, setMessage] = useState('');
    const [subject, setSubject] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState([]);
    const [customPrompt, setCustomPrompt] = useState('');
    const { signature } = useSignature();
    const [showSignature, setShowSignature] = useState(false);

    // Attachments & Emoji
    const [attachments, setAttachments] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const fileInputRef = React.useRef(null);
    const commonEmojis = ['😊', '👍', '🎉', '🚀', '🔥', '❤️', '👏', '✨', '✅', '💡', '📅', '👋', '🙏', '💯', '📣', '🤝', '⭐', '⌚', '📢', '💬'];

    useEffect(() => {
        setChannel(initialChannel);
    }, [initialChannel]);

    // Mock AI Analysis on open
    useEffect(() => {
        if (isOpen && contact) {
            // Reset and simulate AI analyzing past convos
            setAiSuggestions([]);
            setSubject('');
            // Don't clear message entirely if signature is enabled?
            // But we generate suggestions.
            setMessage('');
            generateSuggestions();
        }
    }, [isOpen, contact]);

    // Append signature helper
    const appendSignature = (text) => {
        if (channel === 'email' && signature.enabled && !text.includes(signature.content.trim())) {
            return text + '\n' + signature.content;
        }
        return text;
    };

    const generateSuggestions = async () => {
        setIsGenerating(true);
        // Mock delay for "AI Analysis"
        await new Promise(r => setTimeout(r, 1200));

        // Mock suggestions based on context (Q4 targets, Client meeting)
        const suggestions = [
            {
                title: "Follow up on Q4 Targets",
                text: `Hi ${contact.name.split(' ')[0]},\n\nJust following up on our discussion regarding the Q4 sales targets. I've reviewed the numbers - do you have time for a quick sync?`
            },
            {
                title: "Confirm tomorrow's meeting",
                text: `Hi ${contact.name.split(' ')[0]},\n\nYes, confirming our meeting for tomorrow. Looking forward to it!`
            },
            {
                title: "Share Sales Deck",
                text: appendSignature(`Hi ${contact.name.split(' ')[0]},\n\nI'm attaching the updated sales deck we discussed. Let me know if you need any changes before the client meeting.`)
            }
        ];
        // Apply signature to all suggestions?
        // Actually, let's just apply it when setting state.
        const suggestionsWithSig = suggestions.map(s => ({ ...s, text: appendSignature(s.text) }));
        setAiSuggestions(suggestionsWithSig);
        setIsGenerating(false);
    };

    const handleGenerateCustom = async () => {
        if (!customPrompt.trim()) return;
        setIsGenerating(true);
        await new Promise(r => setTimeout(r, 1500));
        await new Promise(r => setTimeout(r, 1500));
        let draft = `[AI Draft based on "${customPrompt}"]\n\nHi ${contact.name.split(' ')[0]},\n\n${customPrompt}...\n\nBest,`;
        setMessage(appendSignature(draft));
        setIsGenerating(false);
        setCustomPrompt('');
        setCustomPrompt('');
    }

    const handleAttachClick = () => fileInputRef.current?.click();
    const handleFileChange = (e) => {
        if (e.target.files && e.target.files.length > 0) {
            setAttachments(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };
    const removeAttachment = (index) => setAttachments(prev => prev.filter((_, i) => i !== index));
    const handleEmojiClick = (emoji) => {
        setMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    if (!contact) return null;

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden relative z-10 border border-slate-200 dark:border-neutral-800 flex flex-col max-h-[90vh]"
                    >
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-neutral-800 flex justify-between items-center bg-slate-50/50 dark:bg-neutral-900/50">
                            <div>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Message</h2>
                                <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                    <span>To: <span className="font-semibold text-slate-900 dark:text-white">{contact.name}</span></span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-neutral-600" />
                                    <span className="capitalize text-slate-400 dark:text-neutral-500">{channel}</span>
                                </div>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-neutral-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* AI Section - Contextual Suggestions */}
                            <div className="mb-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>AI suggestions</span>
                                    </div>
                                    <button
                                        onClick={generateSuggestions}
                                        disabled={isGenerating}
                                        className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400 transition-colors"
                                        title="Regenerate suggestions"
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5", isGenerating && "animate-spin")} />
                                    </button>
                                </div>

                                {isGenerating && aiSuggestions.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-indigo-100 dark:border-indigo-900/30 rounded-xl bg-indigo-50/30 dark:bg-indigo-900/10">
                                        <Sparkles className="w-6 h-6 text-indigo-300 mx-auto mb-2 animate-pulse" />
                                        <p className="text-xs text-indigo-400 font-medium">Analyzing past conversations...</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-2">
                                        {aiSuggestions.map((s, i) => (
                                            <button
                                                key={i}
                                                onClick={() => { setMessage(s.text); setSubject(s.title); }}
                                                className="text-left p-3 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50 hover:border-indigo-200 hover:bg-indigo-50/50 dark:bg-neutral-800/50 dark:hover:border-indigo-900/50 dark:hover:bg-indigo-900/10 transition-all group"
                                            >
                                                <p className="text-xs font-bold text-slate-700 dark:text-neutral-300 mb-1 group-hover:text-indigo-700 dark:group-hover:text-indigo-400">{s.title}</p>
                                                <p className="text-xs text-slate-500 dark:text-neutral-500 line-clamp-1">{s.text}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Custom Input */}
                                <div className="relative mt-2">
                                    <input
                                        value={customPrompt}
                                        onChange={e => setCustomPrompt(e.target.value)}
                                        placeholder="Or tell AI what to write..."
                                        className="w-full text-sm px-4 py-2.5 bg-white dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-indigo-500/20 outline-none shadow-sm pr-10 transition-all dark:text-white"
                                        onKeyDown={e => e.key === 'Enter' && handleGenerateCustom()}
                                    />
                                    <button
                                        onClick={handleGenerateCustom}
                                        disabled={!customPrompt.trim()}
                                        className="absolute right-2 top-1.5 p-1 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="w-full h-px bg-slate-100 dark:bg-neutral-800 mb-6" />

                            {/* Composer */}
                            <div className="space-y-4">
                                {channel === 'email' && (
                                    <input
                                        value={subject}
                                        onChange={e => setSubject(e.target.value)}
                                        placeholder="Subject"
                                        className="w-full text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-neutral-600 outline-none bg-transparent"
                                    />
                                )}

                                <div className="relative">
                                    <textarea
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        placeholder={`Type your ${channel} message here...`}
                                        className="w-full h-32 resize-none text-sm text-slate-600 dark:text-neutral-300 placeholder:text-slate-300 dark:placeholder:text-neutral-600 outline-none bg-transparent leading-relaxed"
                                    />
                                    {/* Attachment Pills */}
                                    {attachments.length > 0 && (
                                        <div className="flex flex-wrap gap-2 pt-2 px-1">
                                            {attachments.map((file, i) => (
                                                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-300 rounded text-xs select-none">
                                                    <Paperclip className="w-3 h-3" />
                                                    <span className="max-w-[100px] truncate">{file.name}</span>
                                                    <button onClick={() => removeAttachment(i)} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Toolbar */}
                                    <div className="flex items-center gap-1 mt-2 border-t border-slate-100 dark:border-slate-800/50 pt-2">
                                        <button onClick={handleAttachClick} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-neutral-800 dark:text-neutral-500 dark:hover:text-neutral-300 rounded-lg transition-colors" title="Attach File">
                                            <Paperclip className="w-4 h-4" />
                                        </button>

                                        {/* Emoji Trigger */}
                                        <div className="relative">
                                            <button
                                                onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowSignature(false); }}
                                                className={cn("p-2 rounded-lg transition-colors", showEmojiPicker ? "bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-300" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:bg-neutral-800")}
                                            >
                                                <Smile className="w-4 h-4" />
                                            </button>
                                            {showEmojiPicker && (
                                                <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xl w-64 grid grid-cols-5 gap-1 z-50">
                                                    {commonEmojis.map(emoji => (
                                                        <button key={emoji} onClick={() => handleEmojiClick(emoji)} className="text-lg w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-neutral-800 rounded transition-colors">{emoji}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Signature Trigger */}
                                        {channel === 'email' && (
                                            <div className="relative">
                                                <button
                                                    onClick={() => { setShowSignature(!showSignature); setShowEmojiPicker(false); }}
                                                    className={cn("p-2 rounded-lg transition-colors", showSignature ? "bg-slate-100 text-indigo-600 dark:bg-neutral-800 dark:text-indigo-400" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:text-neutral-500 dark:hover:text-neutral-300 dark:hover:bg-neutral-800")}
                                                    title="Email Signature"
                                                >
                                                    <PenTool className="w-4 h-4" />
                                                </button>
                                                {showSignature && (
                                                    <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 p-2">
                                                        <SignaturePopover onClose={() => setShowSignature(false)} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* Backdrop */}
                                        {(showEmojiPicker || showSignature) && <div className="fixed inset-0 z-40" onClick={() => { setShowEmojiPicker(false); setShowSignature(false); }} />}
                                    </div>
                                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-100 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50 flex justify-end gap-3">
                            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-700 dark:hover:text-neutral-200 transition-colors">Cancel</button>
                            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                                <Send className="w-4 h-4" /> Send Message
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
};
