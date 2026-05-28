import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Mail, MessageSquare, Calendar, Paperclip,
    Smile, Eye, Clock, Send, ChevronDown, User,
    FileText, Zap, Search, Image as ImageIcon, Sparkles,
    Settings, Plus, Trash2, Edit2, ChevronLeft, Save, PenTool
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSignature } from '@/hooks/useSignature';
import { SignaturePopover } from './SignaturePopover';

// Default Templates to seed if text storage is empty
const DEFAULT_TEMPLATES = {
    email: [
        { id: 'newsletter', name: 'Monthly Newsletter', subject: 'Updates from OpsERP', content: "Hi {{First Name}},\n\nHere are the latest updates from OpsERP team.\n\n[Your Content Here]\n\nBest,\nTeam OpsERP" },
        { id: 'event', name: 'Webinar Invitation', subject: 'Join us for the Future of AI', content: "Hi {{First Name}},\n\nWe are hosting a webinar on the future of AI. Join us!\n\nLink: [Link]\n\nCheers!" },
        { id: 'followup', name: 'Meeting Follow-up', subject: 'Great speaking with you', content: "Hi {{First Name}},\n\nIt was great speaking with you earlier. Let's keep in touch.\n\nThanks." }
    ],
    whatsapp: [
        { id: 'promo', name: 'Flash Sale Alert', content: "⚡ Flash Sale! Get 50% off on all items for the next 24 hours. Don't miss out!" },
        { id: 'update', name: 'Product Update', content: "🚀 New features are live! Check out your dashboard to see what's new." }
    ]
};

export const BroadcastModal = ({ isOpen, onClose, recipientCount = 0, recipientSamples = [] }) => {
    const { signature } = useSignature();
    const [channel, setChannel] = useState('email'); // 'email' | 'whatsapp'

    // --- Template Management State ---
    const [templates, setTemplates] = useState(() => {
        const saved = localStorage.getItem('opserp_broadcast_templates');
        return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
    });

    // Save to local storage whenever templates change
    React.useEffect(() => {
        localStorage.setItem('opserp_broadcast_templates', JSON.stringify(templates));
    }, [templates]);

    const [view, setView] = useState('compose'); // 'compose' | 'manage' | 'edit'
    const [editingTemplate, setEditingTemplate] = useState(null); // Template being edited/created

    // Compose State
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [scheduledDate, setScheduledDate] = useState('');

    // Attachments & Extras
    const [attachments, setAttachments] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showAIPanel, setShowAIPanel] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Pops
    const [showTemplates, setShowTemplates] = useState(false);
    const [showVariables, setShowVariables] = useState(false);
    const [showScheduling, setShowScheduling] = useState(false);
    const [showSignature, setShowSignature] = useState(false);

    // Auto-append signature on open if empty
    React.useEffect(() => {
        if (isOpen && channel === 'email' && signature.enabled && !message.trim()) {
            setMessage(signature.content);
        }
    }, [isOpen, channel, signature.enabled]);

    const fileInputRef = React.useRef(null);

    if (!isOpen) return null;

    const commonEmojis = ['😊', '👍', '🎉', '🚀', '🔥', '❤️', '👏', '✨', '✅', '💡', '📅', '👋', '🙏', '💯', '📣', '🤝', '⭐', '⌚', '📢', '💬'];

    // --- Template Actions ---
    const handleTemplateSelect = (t) => {
        if (!t) {
            // Clear
            setSubject('');
            setMessage(channel === 'email' && signature.enabled ? signature.content : '');
        } else {
            if (channel === 'email' && t.subject) setSubject(t.subject);
            let content = t.content || '';
            // Optional: decides if we append signature to templates. 
            // Usually templates might already have sign-offs. 
            // For now, let's append if it doesn't look like it has one, or just trust the user.
            // A safer bet is: if template is selected, we assume it's the full message. 
            // BUT, if the user explicitly enabled "Auto-append", they might expect it.
            // Let's NOT append to templates automatically to avoid duplication, user can click "Signature" to insert if needed?
            // Actually, let's append it for consistency if it's not already there.
            if (channel === 'email' && signature.enabled && !content.includes(signature.content.trim())) {
                content += '\n' + signature.content;
            }
            setMessage(content);
        }
        setShowTemplates(false);
    };

    const handleCreateTemplate = () => {
        setEditingTemplate({
            id: Date.now().toString(),
            name: '',
            subject: '',
            content: '',
            channel: channel
        });
        setView('edit');
        setShowTemplates(false);
    };

    const handleEditTemplate = (t) => {
        setEditingTemplate({ ...t });
        setView('edit');
    };

    const handleDeleteTemplate = (id) => {
        if (window.confirm('Delete this template?')) {
            setTemplates(prev => ({
                ...prev,
                [channel]: prev[channel].filter(t => t.id !== id)
            }));
        }
    };

    const handleSaveTemplate = () => {
        if (!editingTemplate.name || !editingTemplate.content) return; // Basic validation

        setTemplates(prev => {
            const list = prev[channel] || [];
            const index = list.findIndex(t => t.id === editingTemplate.id);
            let newList;
            if (index >= 0) {
                // Update
                newList = [...list];
                newList[index] = editingTemplate;
            } else {
                // create
                newList = [...list, editingTemplate];
            }
            return { ...prev, [channel]: newList };
        });
        setView('manage');
    };

    // --- Editor Helpers ---
    const insertVariable = (variable) => {
        setMessage(prev => prev + ` {{${variable}}}`);
        setShowVariables(false);
    };

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

    const handleAIGenerate = async () => {
        if (!aiPrompt.trim()) return;
        setIsGenerating(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        if (channel === 'email') setSubject(`Regarding: ${aiPrompt.substring(0, 30)}...`);
        setMessage(`Here is a draft based on "${aiPrompt}":\n\nDear Team,\n\nI wanted to reach out regarding the upcoming changes. We believe this will significantly improve efficiency.\n\nBest regards,`);
        setIsGenerating(false);
        setAiPrompt('');
    };

    // --- Renderers ---

    const renderCompose = () => (
        <>
            {/* Recipient Line */}
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 pb-2 border-b border-slate-50 dark:border-slate-800/50 mb-4">
                <span className="text-slate-400">To:</span>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full">
                    <span className="font-semibold text-slate-900 dark:text-white text-xs">{recipientCount} recipients</span>
                </div>
            </div>

            {/* AI Panel */}
            <AnimatePresence>
                {showAIPanel && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/50 via-purple-50/50 to-pink-50/50 dark:from-indigo-950/30 dark:to-purple-950/30 mb-4"
                    >
                        <div className="p-3 flex gap-2">
                            <input
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="Tell AI what to write..."
                                className="flex-1 bg-white dark:bg-slate-950 border-0 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                            />
                            <button
                                onClick={handleAIGenerate}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className="px-4 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 text-white text-xs font-bold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isGenerating ? '...' : 'Generate'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Editor Area */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl focus-within:ring-2 focus-within:ring-slate-400/20 transition-all shadow-sm flex flex-col min-h-[300px]">
                <div className="p-4 space-y-3 flex-1">
                    {channel === 'email' && (
                        <input
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Subject"
                            className="w-full text-base font-bold bg-transparent border-none outline-none placeholder:text-slate-300"
                        />
                    )}
                    {channel === 'email' && <div className="w-full h-px bg-slate-100 dark:bg-slate-800" />}
                    <textarea
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="w-full h-full bg-transparent border-none outline-none resize-none text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[150px]"
                    />

                    {/* Attachment Pills */}
                    {attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2">
                            {attachments.map((file, i) => (
                                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded text-xs">
                                    <Paperclip className="w-3 h-3" />
                                    <span className="max-w-[100px] truncate">{file.name}</span>
                                    <button onClick={() => removeAttachment(i)} className="hover:text-rose-500"><X className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* TOOLBAR */}
                <div className="flex items-center gap-2 p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl relative">
                    <button onClick={handleAttachClick} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Attach File">
                        <Paperclip className="w-4 h-4" />
                    </button>

                    {/* Signature Trigger */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowSignature(!showSignature); setShowEmojiPicker(false); setShowVariables(false); setShowTemplates(false); }}
                            className={cn("p-2 rounded-lg transition-colors", showSignature ? "bg-slate-200/50 text-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50")}
                            title="Signature Settings"
                        >
                            <PenTool className="w-4 h-4" />
                        </button>
                        {showSignature && (
                            <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 p-2">
                                <SignaturePopover onClose={() => setShowSignature(false)} />
                            </div>
                        )}
                    </div>

                    {/* Emoji Trigger */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowVariables(false); setShowTemplates(false); setShowSignature(false); }}
                            className={cn("p-2 rounded-lg transition-colors", showEmojiPicker ? "bg-slate-200/50 text-slate-700" : "text-slate-400 hover:text-slate-600 hover:bg-slate-200/50")}
                        >
                            <Smile className="w-4 h-4" />
                        </button>
                        {showEmojiPicker && (
                            <div className="absolute bottom-full left-0 mb-2 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-64 grid grid-cols-5 gap-1 z-30">
                                {commonEmojis.map(emoji => (
                                    <button key={emoji} onClick={() => handleEmojiClick(emoji)} className="text-lg w-8 h-8 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">{emoji}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

                    {/* Variables Trigger */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowVariables(!showVariables); setShowEmojiPicker(false); setShowTemplates(false); setShowSignature(false); }}
                            className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors", showVariables ? "bg-slate-200/50 text-slate-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50")}
                        >
                            <User className="w-3.5 h-3.5" />
                            <span>Variables</span>
                        </button>
                        {showVariables && (
                            <div className="absolute bottom-full left-0 mb-2 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1 z-30">
                                {['First Name', 'Company', 'Role'].map(v => (
                                    <button key={v} onClick={() => insertVariable(v)} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300">{v}</button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Templates Trigger */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowTemplates(!showTemplates); setShowEmojiPicker(false); setShowVariables(false); setShowSignature(false); }}
                            className={cn("flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors", showTemplates ? "bg-slate-200/50 text-slate-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50")}
                        >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Templates</span>
                        </button>
                        {showTemplates && (
                            <div className="absolute bottom-full left-0 mb-2 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg py-1 z-30 flex flex-col">
                                <button
                                    onClick={() => handleTemplateSelect(null)}
                                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium border-b border-slate-100 dark:border-slate-800/50"
                                >
                                    Start from scratch
                                </button>
                                <div className="max-h-48 overflow-y-auto">
                                    {(templates[channel] || []).map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => handleTemplateSelect(t)}
                                            className="w-full text-left px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                                        >
                                            {t.name}
                                        </button>
                                    ))}
                                    {(templates[channel] || []).length === 0 && (
                                        <div className="p-3 text-center text-xs text-slate-400">No templates found</div>
                                    )}
                                </div>
                                <div className="border-t border-slate-100 dark:border-slate-800/50 p-1 mt-1">
                                    <button
                                        onClick={() => { setView('manage'); setShowTemplates(false); }}
                                        className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 text-blue-600 font-medium rounded transition-colors"
                                    >
                                        <Settings className="w-3 h-3" /> Manage Templates
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex-1" />

                    <button
                        onClick={() => setShowAIPanel(!showAIPanel)}
                        className={cn(
                            "flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm",
                            showAIPanel ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white shadow-purple-500/25" : "text-slate-500 bg-slate-100 dark:bg-slate-800 hover:from-blue-500 hover:via-purple-500 hover:to-pink-500 hover:text-white hover:bg-gradient-to-r"
                        )}
                    >
                        <Sparkles className={cn("w-3.5 h-3.5", showAIPanel ? "fill-white/30 text-white" : "")} />
                        {showAIPanel ? 'AI Active' : 'Write with AI'}
                    </button>

                    {/* Backdrop */}
                    {(showEmojiPicker || showVariables || showTemplates || showSignature) && (
                        <div className="fixed inset-0 z-10" onClick={() => { setShowEmojiPicker(false); setShowVariables(false); setShowTemplates(false); setShowSignature(false); }} />
                    )}
                </div>
            </div>
        </>
    );

    const renderManage = () => (
        <div className="flex flex-col h-full min-h-0 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setView('compose')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Manage Templates</h3>
                <span className="ml-auto px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 capitalize">{channel}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-50 dark:[&::-webkit-scrollbar-track]:bg-slate-900 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-slate-700 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 dark:hover:[&::-webkit-scrollbar-thumb]:bg-slate-600">
                {(templates[channel] || []).map(t => (
                    <div key={t.id} className="group p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-blue-300 dark:hover:border-blue-700 transition-all shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</h4>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                                <button onClick={() => handleEditTemplate(t)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                                <button onClick={() => handleDeleteTemplate(t.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                        {t.subject && <p className="text-xs text-slate-500 mb-2 font-medium">Sub: {t.subject}</p>}
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">{t.content}</p>
                    </div>
                ))}
                {(templates[channel] || []).length === 0 && (
                    <div className="text-center py-10 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">
                        <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">No templates yet.</p>
                    </div>
                )}
            </div>


        </div>
    );

    const renderEdit = () => (
        <div className="flex flex-col h-full min-h-0 animate-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-2 mb-6">
                <button onClick={() => setView('manage')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <ChevronLeft className="w-5 h-5 text-slate-500" />
                </button>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{editingTemplate.id && (templates[channel] || []).find(t => t.id === editingTemplate.id) ? 'Edit Template' : 'New Template'}</h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Template Name</label>
                    <input
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="e.g. Monthly Newsletter"
                        value={editingTemplate.name}
                        onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    />
                </div>

                {channel === 'email' && (
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject Line</label>
                        <input
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="Email subject..."
                            value={editingTemplate.subject}
                            onChange={e => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                        />
                    </div>
                )}

                <div className="space-y-1.5 flex-1 flex flex-col">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message Content</label>
                    <div className="relative flex-1">
                        <textarea
                            className="w-full h-48 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                            placeholder="Type your template content here..."
                            value={editingTemplate.content}
                            onChange={e => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                        />
                        <div className="absolute bottom-3 right-3 flex gap-2">
                            <button
                                onClick={() => setEditingTemplate(prev => ({ ...prev, content: prev.content + ' {{First Name}}' }))}
                                className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors shadow-sm"
                            >
                                + Name
                            </button>
                            <button
                                onClick={() => setEditingTemplate(prev => ({ ...prev, content: prev.content + ' {{Company}}' }))}
                                className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-[10px] font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 transition-colors shadow-sm"
                            >
                                + Company
                            </button>
                        </div>
                    </div>
                </div>
            </div>


        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-xl bg-white dark:bg-slate-950 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[90vh] min-h-[500px]"
            >
                {/* Minimal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">New Broadcast</h2>
                    {view === 'compose' && (
                        <div className="flex bg-slate-100 dark:bg-slate-900 rounded-lg p-0.5">
                            <button
                                onClick={() => setChannel('email')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                                    channel === 'email' ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                Email
                            </button>
                            <button
                                onClick={() => setChannel('whatsapp')}
                                className={cn(
                                    "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                                    channel === 'whatsapp' ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm" : "text-slate-500 hover:text-slate-700"
                                )}
                            >
                                WhatsApp
                            </button>
                        </div>
                    )}
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 overflow-hidden flex flex-col">
                    {view === 'compose' && renderCompose()}
                    {view === 'manage' && renderManage()}
                    {view === 'edit' && renderEdit()}

                    {/* Hidden Inputs */}
                    <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                </div>

                {/* Unified Footer */}
                <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    {view === 'compose' && (
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="relative">
                                    <button
                                        onClick={() => setShowScheduling(!showScheduling)}
                                        className={cn("p-2 rounded-lg transition-colors border flex items-center gap-2", scheduledDate || showScheduling ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50")}
                                    >
                                        <Clock className="w-4 h-4" />
                                        <span className="text-xs font-bold">{scheduledDate ? 'Scheduled' : 'Schedule'}</span>
                                    </button>
                                    {/* Schedule Popover */}
                                    {showScheduling && (
                                        <div className="absolute bottom-full left-0 mb-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-72 z-40">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="text-xs font-bold text-slate-900 dark:text-white">Pick a time</label>
                                                <button onClick={() => { setScheduledDate(''); setShowScheduling(false); }} className="text-[10px] text-slate-400 hover:text-rose-500">Clear</button>
                                            </div>
                                            <input
                                                type="datetime-local"
                                                value={scheduledDate}
                                                onChange={(e) => setScheduledDate(e.target.value)}
                                                className="w-full text-sm p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                                            />
                                            <div className="mt-2 flex justify-end">
                                                <button
                                                    onClick={() => setShowScheduling(false)}
                                                    className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg"
                                                >
                                                    Done
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    {/* Backdrop for Schedule */}
                                    {showScheduling && <div className="fixed inset-0 z-30" onClick={() => setShowScheduling(false)} />}
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <button onClick={onClose} className="text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
                                    Cancel
                                </button>
                                <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2">
                                    <Send className="w-3.5 h-3.5" />
                                    {scheduledDate ? 'Confirm Schedule' : 'Send Broadcast'}
                                </button>
                            </div>
                        </div>
                    )}

                    {view === 'manage' && (
                        <button
                            onClick={handleCreateTemplate}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" /> Create New Template
                        </button>
                    )}

                    {view === 'edit' && (
                        <div className="flex gap-3">
                            <button
                                onClick={() => setView('manage')}
                                className="flex-1 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveTemplate}
                                disabled={!editingTemplate.name || !editingTemplate.content}
                                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-4 h-4" /> Save Template
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>,
        document.body
    );
};
