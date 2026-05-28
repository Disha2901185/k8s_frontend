import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, X, Check, File } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PROJECT_TYPES } from '@/lib/const';

export const DocumentsTab = ({ documents = [] }) => {
    const [files, setFiles] = useState(documents);
    const [poNumber, setPoNumber] = useState('');
    const [poDate, setPoDate] = useState('');
    const [projectType, setProjectType] = useState('');

    const onDrop = useCallback((acceptedFiles) => {
        const newFiles = acceptedFiles.map(file => Object.assign(file, {
            preview: URL.createObjectURL(file)
        }));
        setFiles([...files, ...newFiles]);
    }, [files]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

    return (
        <div className="p-6 space-y-8">
            {/* Purchase Order Details Form */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-5 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Purchase Order Details
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">PO Number</label>
                        <input
                            value={poNumber}
                            onChange={(e) => setPoNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="e.g. PO-2024-001"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">PO Date</label>
                        <input
                            type="date"
                            value={poDate}
                            onChange={(e) => setPoDate(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Project Category</label>
                        <select
                            value={projectType}
                            onChange={(e) => setProjectType(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        >
                            <option value="">Select Type...</option>
                            {PROJECT_TYPES.map((type) => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Drag & Drop Zone */}
            <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Attachments</h3>
                <div
                    {...getRootProps()}
                    className={cn(
                        "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 bg-slate-50/50 dark:bg-slate-900/50",
                        isDragActive
                            ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                            : "border-slate-300 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-4">
                        <UploadCloud className="w-6 h-6 text-blue-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {isDragActive ? "Drop files here..." : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">PDF, DOCX, JPG (Max 10MB)</p>
                </div>

                {/* File List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <AnimatePresence>
                        {files.map((file, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="flex items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg group hover:shadow-md transition-shadow"
                            >
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 mr-3">
                                    <File className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{file.name || file.filename}</p>
                                    <p className="text-xs text-slate-500">{file.size ? (file.size / 1024).toFixed(0) + ' KB' : 'Existing Doc'}</p>
                                </div>
                                <button
                                    onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};
