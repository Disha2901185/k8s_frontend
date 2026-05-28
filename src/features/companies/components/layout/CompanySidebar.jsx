import React, { useEffect, useState } from 'react';
import { MapPin, Globe, Edit2, AlertTriangle, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { INDIA_GST_STATE_OPTIONS, OVERSEAS_PLACE_OF_SUPPLY_CODE } from '@/lib/const';

const getDisplayValue = (value, fallback = 'Not available') => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' && value.trim() === '') return fallback;
    return value;
};

const getPlaceOfSupplyLabel = (code) => {
    if (!code) return 'Not available';
    if (code === OVERSEAS_PLACE_OF_SUPPLY_CODE) return 'Overseas';
    return INDIA_GST_STATE_OPTIONS.find((item) => item.value === code)?.label || code;
};

export const CompanySidebar = ({ company, onUpdateCompany }) => {
    return (
        <div className="space-y-6">
            <MasterInfoCard company={company} onUpdateCompany={onUpdateCompany} />
            <AddressCard company={company} onUpdateCompany={onUpdateCompany} />
            <FinancialEnrichmentCard company={company} onUpdateCompany={onUpdateCompany} />
        </div>
    );
};

const MasterInfoCard = ({ company, onUpdateCompany }) => {
    const handleFieldSave = (key, nextValue) => onUpdateCompany?.({ [key]: nextValue });

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-neutral-800 relative group/card">
            <h3 className="text-xs font-bold text-slate-500 dark:text-neutral-500 mb-4">Basic Info</h3>

            <div className="space-y-4">
                <EditableField
                    label="Industry"
                    value={company.industry}
                    type="select"
                    options={['IT Services', 'Manufacturing', 'Healthcare', 'Finance', 'Other']}
                    onSave={(value) => handleFieldSave('industry', value)}
                />

                <EditableField
                    label="Website"
                    value={company.website}
                    displayValue={getDisplayValue(company.website)}
                    isLink={Boolean(company.website)}
                    href={company.website ? (company.website.startsWith('http') ? company.website : `https://${company.website}`) : undefined}
                    onSave={(value) => handleFieldSave('website', value)}
                />

                <EditableField
                    label="Status"
                    value={company.status}
                    type="select"
                    options={['Prospect', 'Client']}
                    onSave={(value) => handleFieldSave('status', value)}
                />

                <PlaceOfSupplyField
                    value={company.placeOfSupply}
                    onSave={(value) => handleFieldSave('placeOfSupply', value)}
                />
            </div>
        </div>
    );
};

const PlaceOfSupplyField = ({ value, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [mode, setMode] = useState(value === OVERSEAS_PLACE_OF_SUPPLY_CODE ? 'overseas' : 'india');
    const [stateCode, setStateCode] = useState(value && value !== OVERSEAS_PLACE_OF_SUPPLY_CODE ? value : '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setMode(value === OVERSEAS_PLACE_OF_SUPPLY_CODE ? 'overseas' : 'india');
        setStateCode(value && value !== OVERSEAS_PLACE_OF_SUPPLY_CODE ? value : '');
    }, [value]);

    const handleSave = async () => {
        const nextValue = mode === 'overseas' ? OVERSEAS_PLACE_OF_SUPPLY_CODE : stateCode;
        setIsSaving(true);
        try {
            await onSave?.(nextValue || '');
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="group relative">
            <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500">Place of Supply</label>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 rounded"
                    >
                        <Edit2 className="w-3 h-3" />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="space-y-2">
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-700 dark:text-neutral-300">
                        <label className="inline-flex items-center gap-1.5">
                            <input
                                type="radio"
                                name="place-of-supply"
                                checked={mode === 'india'}
                                onChange={() => setMode('india')}
                                className="h-3.5 w-3.5"
                            />
                            India
                        </label>
                        <label className="inline-flex items-center gap-1.5">
                            <input
                                type="radio"
                                name="place-of-supply"
                                checked={mode === 'overseas'}
                                onChange={() => setMode('overseas')}
                                className="h-3.5 w-3.5"
                            />
                            Overseas
                        </label>
                    </div>

                    {mode === 'india' && (
                        <CustomSelect
                            value={stateCode}
                            onChange={(val) => setStateCode(val)}
                            placeholder="Select state / UT"
                            options={INDIA_GST_STATE_OPTIONS}
                            searchable
                            searchPlaceholder="Search state / UT"
                            className="h-8 py-1 text-xs w-full bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                        />
                    )}

                    <div className="flex gap-1 shrink-0">
                        <button onClick={() => {
                            setMode(value === OVERSEAS_PLACE_OF_SUPPLY_CODE ? 'overseas' : 'india');
                            setStateCode(value && value !== OVERSEAS_PLACE_OF_SUPPLY_CODE ? value : '');
                            setIsEditing(false);
                        }} className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
                            <span className="sr-only">Cancel</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                        <button onClick={handleSave} disabled={isSaving || (mode === 'india' && !stateCode)} className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-70">
                            <span className="sr-only">Save</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                    </div>
                </div>
            ) : (
                <span className="text-sm font-medium text-slate-900 dark:text-white">{getPlaceOfSupplyLabel(value)}</span>
            )}
        </div>
    );
};

const FinancialEnrichmentCard = ({ company, onUpdateCompany }) => {
    const handleFieldSave = (key, nextValue) => onUpdateCompany?.({ [key]: nextValue });

    return (
        <div className={cn(
            "bg-white dark:bg-neutral-900 rounded-xl p-4 shadow-sm border relative overflow-hidden",
            !company.gstIn ? "border-amber-400 dark:border-amber-600/50" : "border-slate-200 dark:border-neutral-800"
        )}>
            {!company.gstIn && (
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
            )}

            <h3 className="text-xs font-bold text-slate-500 dark:text-neutral-500 mb-4 flex items-center justify-between">
                Financial Details
                {!company.gstIn && <AlertTriangle className="w-3 h-3 text-amber-500" />}
            </h3>

            <div className="space-y-4">
                <EditableField
                    label="GST / Tax ID"
                    value={company.gstIn}
                    displayValue={getDisplayValue(company.gstIn)}
                    type="text"
                    onSave={(value) => handleFieldSave('taxId', value)}
                />

                <div className="grid grid-cols-2 gap-4">
                    <EditableField
                        label="Payment Terms"
                        value={company.paymentTerms}
                        displayValue={getDisplayValue(company.paymentTerms)}
                        type="select"
                        options={['Net 15', 'Net 30', 'Net 45', 'Net 60', 'Due on Receipt']}
                        onSave={(value) => handleFieldSave('paymentTerms', value)}
                    />
                    <EditableField
                        label="Currency"
                        value={company.currency}
                        displayValue={getDisplayValue(company.currency)}
                        type="select"
                        options={['INR', 'USD', 'EUR', 'GBP']}
                        onSave={(value) => handleFieldSave('currency', value)}
                    />
                </div>
            </div>
        </div>
    );
};

const AddressCard = ({ company, onUpdateCompany }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAddress, setCurrentAddress] = useState(company.address || {});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setCurrentAddress(company.address || {});
    }, [company.address]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onUpdateCompany?.({
                billingStreet: currentAddress.line1 || '',
                billingCity: currentAddress.city || '',
                billingState: currentAddress.state || '',
                billingCountry: currentAddress.country || '',
                billingZip: currentAddress.pincode || '',
            });
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800 overflow-hidden">
            <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-neutral-800/50 transition-colors">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="flex items-center gap-2 flex-1"
                >
                    <MapPin className="w-4 h-4 text-slate-400 dark:text-neutral-500" />
                    <span className="text-xs font-bold text-slate-500 dark:text-neutral-500">Address Info</span>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
                <button
                    onClick={() => {
                        setIsExpanded(true);
                        setIsEditing(!isEditing);
                    }}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                >
                    <Edit2 className="w-3 h-3" />
                </button>
            </div>

            {isExpanded && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    <div className="pl-6 space-y-3 border-l-2 border-slate-100 dark:border-neutral-800 ml-2">
                        {isEditing ? (
                            <div className="space-y-3">
                                <label className="block">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 mb-1 block">Address Line</span>
                                    <input
                                        value={currentAddress.line1 || ''}
                                        onChange={(e) => setCurrentAddress({ ...currentAddress, line1: e.target.value })}
                                        className="w-full text-sm px-3 py-2 border rounded-lg bg-slate-50 border-slate-200 dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                        placeholder="Address Line 1"
                                    />
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 mb-1 block">City</span>
                                        <input
                                            value={currentAddress.city || ''}
                                            onChange={(e) => setCurrentAddress({ ...currentAddress, city: e.target.value })}
                                            className="w-full text-sm px-3 py-2 border rounded-lg bg-slate-50 border-slate-200 dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                            placeholder="City"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 mb-1 block">State</span>
                                        <input
                                            value={currentAddress.state || ''}
                                            onChange={(e) => setCurrentAddress({ ...currentAddress, state: e.target.value })}
                                            className="w-full text-sm px-3 py-2 border rounded-lg bg-slate-50 border-slate-200 dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                            placeholder="State"
                                        />
                                    </label>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 mb-1 block">Pincode</span>
                                        <input
                                            value={currentAddress.pincode || ''}
                                            onChange={(e) => setCurrentAddress({ ...currentAddress, pincode: e.target.value })}
                                            className="w-full text-sm px-3 py-2 border rounded-lg bg-slate-50 border-slate-200 dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                            placeholder="Pincode"
                                        />
                                    </label>
                                    <label className="block">
                                        <span className="text-[10px] font-bold text-slate-400 dark:text-neutral-500 mb-1 block">Country</span>
                                        <input
                                            value={currentAddress.country || ''}
                                            onChange={(e) => setCurrentAddress({ ...currentAddress, country: e.target.value })}
                                            className="w-full text-sm px-3 py-2 border rounded-lg bg-slate-50 border-slate-200 dark:bg-neutral-800 dark:border-neutral-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                                            placeholder="Country"
                                        />
                                    </label>
                                </div>
                                <div className="flex justify-end gap-3 pt-2 mt-2">
                                    <button
                                        onClick={() => {
                                            setCurrentAddress(company.address || {});
                                            setIsEditing(false);
                                        }}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-70"
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500">HQ Address</label>
                                    <p className="text-sm text-slate-700 dark:text-neutral-300 mt-0.5 leading-relaxed">
                                        {currentAddress?.line1 ? (
                                            <>
                                                {currentAddress.line1}<br />
                                                {[currentAddress?.city, currentAddress?.state, currentAddress?.pincode].filter(Boolean).join(', ') || 'Not available'}<br />
                                                {currentAddress?.country || 'Not available'}
                                            </>
                                        ) : (
                                            'Address not available'
                                        )}
                                    </p>
                                </div>
                                {currentAddress?.line1 || currentAddress?.city ? (
                                    <a
                                        href={`https://maps.google.com/?q=${encodeURIComponent([currentAddress?.line1, currentAddress?.city, currentAddress?.state, currentAddress?.country].filter(Boolean).join(', '))}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline mt-2"
                                    >
                                        Open in Maps <ExternalLink className="w-3 h-3" />
                                    </a>
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const EditableField = ({ label, value, displayValue, type = 'text', options = [], isLink, href, onSave }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(value || '');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setCurrentValue(value || '');
    }, [value]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave?.(currentValue);
            setIsEditing(false);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="group relative">
            <div className="flex justify-between items-center mb-0.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-neutral-500">{label}</label>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-blue-600 rounded"
                    >
                        <Edit2 className="w-3 h-3" />
                    </button>
                )}
            </div>

            {isEditing ? (
                <div className="flex items-center gap-2 animate-in fade-in zoom-in-95 duration-100 w-full">
                    {type === 'select' ? (
                        <div className="flex-1">
                            <CustomSelect
                                value={currentValue}
                                onChange={(val) => setCurrentValue(val)}
                                options={options.map(opt => ({ label: opt, value: opt }))}
                                className="h-8 py-1 text-xs w-full bg-slate-50 dark:bg-neutral-800 border-slate-200 dark:border-neutral-700"
                            />
                        </div>
                    ) : (
                        <input
                            value={currentValue}
                            onChange={(e) => setCurrentValue(e.target.value)}
                            className="w-full text-sm p-1 border border-blue-300 rounded focus:ring-2 focus:ring-blue-100 outline-none bg-white dark:bg-neutral-800 dark:text-white"
                            autoFocus
                        />
                    )}

                    <div className="flex gap-1 shrink-0">
                        <button onClick={() => {
                            setCurrentValue(value || '');
                            setIsEditing(false);
                        }} className="p-1.5 rounded-md bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors">
                            <span className="sr-only">Cancel</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="p-1.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-70">
                            <span className="sr-only">Save</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between">
                    {isLink ? (
                        <a href={href} target="_blank" rel="noreferrer" className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1">
                            <Globe className="w-3 h-3" /> {displayValue ?? getDisplayValue(value)}
                        </a>
                    ) : (
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{displayValue ?? getDisplayValue(value)}</span>
                    )}
                </div>
            )}
        </div>
    );
};
