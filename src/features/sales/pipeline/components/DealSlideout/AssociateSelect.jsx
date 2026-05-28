import React from 'react';
import { SmartSelect } from '@/components/ui/SmartSelect';
import { UserCircle2 } from 'lucide-react';

export const AssociateSelectWithOptions = ({ value, onChange, onAddNew, options, ...props }) => {
    // value is ID. SmartSelect expects a string value to display.
    // We need to find the name corresponding to the ID.
    const selectedOption = options.find(opt => opt.id === value);
    const displayValue = selectedOption ? selectedOption.name : '';

    return (
        <SmartSelect
            {...props}
            label="Associate Consultant"
            icon={UserCircle2}
            placeholder="Select or add associate..."
            options={options.map(o => o.name)}
            value={displayValue}
            onChange={(name) => {
                if (!name) {
                    onChange('');
                    return;
                }
                // Reverse lookup ID from Name
                const found = options.find(o => o.name === name);
                if (found) onChange(found.id);
            }}
            onAddNew={onAddNew}
        />
    );
};
