import { useState, useEffect } from 'react';

const STORAGE_KEY = 'opserp_email_signature';

const DEFAULT_SIGNATURE = {
    enabled: true,
    content: "\n\nBest regards,\n\n[Your Name]\n[Your Company]"
};

export const useSignature = () => {
    const [signature, setSignature] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : DEFAULT_SIGNATURE;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(signature));
    }, [signature]);

    const updateSignature = (updates) => {
        setSignature(prev => ({ ...prev, ...updates }));
    };

    return { signature, updateSignature };
};
