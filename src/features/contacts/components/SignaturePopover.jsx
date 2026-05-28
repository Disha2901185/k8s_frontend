import React from 'react';
import { useSignature } from '@/hooks/useSignature';
import { Edit3, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SignaturePopover = ({ onClose }) => {
    const { signature, updateSignature } = useSignature();
    const [localContent, setLocalContent] = React.useState(signature.content);

    const handleSave = () => {
        updateSignature({ content: localContent });
        if (onClose) onClose();
    };

    return (
        <div className="flex flex-col gap-3 p-1">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-2 mb-1">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Email Signature</span>
                <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-[10px] text-slate-500 font-medium">Auto-append</span>
                    <input
                        type="checkbox"
                        checked={signature.enabled}
                        onChange={(e) => updateSignature({ enabled: e.target.checked })}
                        className="w-3.5 h-3.5 accent-blue-600 rounded cursor-pointer"
                    />
                </label>
            </div>

            <textarea
                value={localContent}
                onChange={(e) => setLocalContent(e.target.value)}
                placeholder="Type your signature..."
                className="w-full h-32 text-xs p-2 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg resize-none focus:ring-1 focus:ring-blue-500 outline-none dark:text-neutral-200"
            />

            <div className="flex justify-end gap-2">
                <button
                    onClick={handleSave}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                    <Check className="w-3 h-3" /> Save
                </button>
            </div>
        </div>
    );
};
