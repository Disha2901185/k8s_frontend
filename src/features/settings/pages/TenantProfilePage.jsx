import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Building2, Loader2, Upload, X } from 'lucide-react';
import { CheckCircle2, ShieldAlert } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/features/auth/context/AuthContext';
import { tenantApi, fileApi, countriesNowApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { INDIA_GST_STATE_OPTIONS } from '@/lib/const';
import { CustomSelect } from '@/components/ui/CustomSelect';

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white';
const normalizeProfileForm = (value) => ({
  legalName: value?.legalName || '',
  taxId: value?.taxId || '',
  logoUrl: value?.logoUrl || '',
  billingStreet: value?.billingStreet || '',
  billingCity: value?.billingCity || '',
  billingState: value?.billingState || '',
  billingStateCode: value?.billingStateCode || '',
  billingCountry: value?.billingCountry || 'India',
  billingZip: value?.billingZip || '',
});
const resolveAssetUrl = (url) => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:3000/v1').replace(/\/+$/, '');
  const origin = apiBase.replace(/\/v\d+$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
};
const LOGO_ASPECT_OPTIONS = [
  { label: '3:1 (Recommended)', value: 3 / 1 },
  { label: '2:1', value: 2 / 1 },
  { label: '1:1', value: 1 / 1 },
];

export const TenantProfilePage = () => {
  const { user } = useAuth();
  const tenantId = user?.tenantId;
  const canWriteTenantProfile = user?.permissions?.includes('write:system.tenant-profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const [countries, setCountries] = useState([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const cityCacheRef = useRef(new Map());
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingLogoUrl, setPendingLogoUrl] = useState('');
  const [pendingLogoFileName, setPendingLogoFileName] = useState('');
  const [cropAspect, setCropAspect] = useState(3 / 1);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(0);
  const [cropY, setCropY] = useState(0);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState(() =>
    normalizeProfileForm({
      billingCountry: 'India',
    }),
  );
  const toastTimerRef = useRef(null);
  const imageRef = useRef(null);
  const [form, setForm] = useState({
    legalName: '',
    taxId: '',
    logoUrl: '',
    billingStreet: '',
    billingCity: '',
    billingState: '',
    billingStateCode: '',
    billingCountry: 'India',
    billingZip: '',
  });

  const stateOptions = useMemo(
    () => INDIA_GST_STATE_OPTIONS.map((s) => {
      const name = s.label.replace(/^\d{2}\s+/, '').trim();
      return { code: s.value, name };
    }),
    []
  );

  const isIndia = (form.billingCountry || '').trim().toLowerCase() === 'india';
  const selectedStateName = useMemo(() => {
    if (!isIndia) return form.billingState || '';
    const byCode = stateOptions.find((s) => s.code === form.billingStateCode)?.name;
    return byCode || form.billingState || '';
  }, [form.billingState, form.billingStateCode, isIndia, stateOptions]);
  const countryOptions = useMemo(() => countries.map((country) => ({ value: country, label: country })), [countries]);
  const indiaStateSelectOptions = useMemo(
    () => stateOptions.map((s) => ({ value: s.code, label: `${s.name} (${s.code})` })),
    [stateOptions],
  );
  const citySelectOptions = useMemo(() => {
    const options = cityOptions.map((city) => ({ value: city, label: city }));
    if (form.billingCity && !options.some((o) => o.value === form.billingCity)) {
      options.unshift({ value: form.billingCity, label: form.billingCity });
    }
    return options;
  }, [cityOptions, form.billingCity]);
  const isDirty = useMemo(() => {
    return JSON.stringify(normalizeProfileForm(form)) !== JSON.stringify(initialFormSnapshot);
  }, [form, initialFormSnapshot]);

  const showToast = (message, type = 'success') => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ show: true, message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
      toastTimerRef.current = null;
    }, type === 'error' ? 5000 : 3000);
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!tenantId) return;
      setLoading(true);
      setError('');
      try {
        const data = await callApi(tenantApi.getById, tenantId);
        if (!mounted) return;
        const nextForm = normalizeProfileForm({
          legalName: data?.legalName || data?.name || '',
          taxId: data?.taxId || '',
          logoUrl: data?.logoUrl || '',
          billingStreet: data?.billingStreet || '',
          billingCity: data?.billingCity || '',
          billingState: data?.billingState || '',
          billingStateCode: data?.billingStateCode || '',
          billingCountry: data?.billingCountry || 'India',
          billingZip: data?.billingZip || '',
        });
        setForm(nextForm);
        setInitialFormSnapshot(nextForm);
      } catch (e) {
        if (mounted) {
          const message = e?.message || 'Failed to load tenant profile';
          setError(message);
          showToast(message, 'error');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadCountries = async () => {
      setCountriesLoading(true);
      try {
        const payload = await callApi(countriesNowApi.getCountries);
        if (!mounted) return;
        const names = (payload?.data || [])
          .map((entry) => entry?.country)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b));
        setCountries(names);
      } catch (e) {
        if (mounted) {
          setCountries(['India']);
        }
      } finally {
        if (mounted) setCountriesLoading(false);
      }
    };
    loadCountries();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadCities = async () => {
      if (!isIndia || !selectedStateName) {
        setCityOptions([]);
        return;
      }
      const cacheKey = `India::${selectedStateName}`;
      const cached = cityCacheRef.current.get(cacheKey);
      if (cached?.length) {
        setCityOptions(cached);
        return;
      }
      setCitiesLoading(true);
      try {
        const payload = await callApi(countriesNowApi.getCitiesInState, 'India', selectedStateName);
        if (!mounted) return;
        const options = (payload?.data || []).filter(Boolean);
        cityCacheRef.current.set(cacheKey, options);
        setCityOptions(options);
      } catch (e) {
        if (mounted) setCityOptions([]);
      } finally {
        if (mounted) setCitiesLoading(false);
      }
    };
    loadCities();
    return () => {
      mounted = false;
    };
  }, [isIndia, selectedStateName]);

  const onUploadLogo = async (event) => {
    if (!canWriteTenantProfile) return;
    const file = event.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setPendingLogoUrl(localUrl);
    setPendingLogoFileName(file.name || 'logo.png');
    setCropAspect(3 / 1);
    setCropZoom(1);
    setCropX(0);
    setCropY(0);
    setCropModalOpen(true);
    event.target.value = '';
  };

  const closeCropModal = () => {
    if (pendingLogoUrl) {
      URL.revokeObjectURL(pendingLogoUrl);
    }
    setPendingLogoUrl('');
    setPendingLogoFileName('');
    setCropModalOpen(false);
  };

  const applyLogoCrop = async () => {
    if (!pendingLogoUrl) return;
    setUploadingLogo(true);
    setError('');
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = pendingLogoUrl;
      });

      const outWidth = 900;
      const outHeight = Math.round(outWidth / cropAspect);
      const canvas = document.createElement('canvas');
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Failed to initialize crop canvas');

      const imgW = image.naturalWidth;
      const imgH = image.naturalHeight;
      const baseScale = Math.max(outWidth / imgW, outHeight / imgH);
      const scale = baseScale * cropZoom;
      const drawW = imgW * scale;
      const drawH = imgH * scale;
      const maxShiftX = Math.max(0, (drawW - outWidth) / 2);
      const maxShiftY = Math.max(0, (drawH - outHeight) / 2);
      const shiftX = (cropX / 100) * maxShiftX;
      const shiftY = (cropY / 100) * maxShiftY;
      const dx = ((outWidth - drawW) / 2) - shiftX;
      const dy = ((outHeight - drawH) / 2) - shiftY;

      ctx.clearRect(0, 0, outWidth, outHeight);
      ctx.drawImage(image, dx, dy, drawW, drawH);

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => (value ? resolve(value) : reject(new Error('Failed to create cropped image'))), 'image/png', 0.92);
      });
      const croppedFile = new File([blob], pendingLogoFileName.replace(/\.[^.]+$/, '') + '.png', { type: 'image/png' });
      const uploaded = await callApi(fileApi.uploadTenantLogo, croppedFile);
      const url = uploaded?.url || uploaded?.fileUrl || uploaded?.location || '';
      if (!url) throw new Error('Upload response missing URL');
      setForm((prev) => ({ ...prev, logoUrl: url }));
      closeCropModal();
    } catch (e) {
      const message = e?.message || 'Logo crop/upload failed';
      setError(message);
      showToast(message, 'error');
    } finally {
      setUploadingLogo(false);
    }
  };

  const onSave = async () => {
    if (!canWriteTenantProfile) return;
    if (!tenantId) return;
    if (!isDirty) return;
    setSaving(true);
    setError('');
    try {
      await callApi(tenantApi.updateProfile, tenantId, form);
      setInitialFormSnapshot(normalizeProfileForm(form));
      showToast('Tenant profile saved', 'success');
    } catch (e) {
      const message = e?.message || 'Failed to save tenant profile';
      setError(message);
      showToast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-slate-500 dark:text-neutral-400 inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Loading tenant profile...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-3xl font-semibold text-slate-950 dark:text-white">Tenant Profile</h1>
      </div>

      {!canWriteTenantProfile ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
          You have read-only access to Tenant Profile. Ask an admin with <code>write:system.tenant-profile</code> permission to make changes.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Branding</h2>
          <div className="relative mb-4 flex h-24 w-52 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white/95 p-2 dark:border-neutral-700 dark:bg-neutral-950">
            {form.logoUrl ? (
              <img
                src={resolveAssetUrl(form.logoUrl)}
                alt="Tenant logo"
                className="block h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Building2 className="h-8 w-8 text-slate-400" />
              </div>
            )}
            {form.logoUrl ? (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, logoUrl: '' }))}
                disabled={!canWriteTenantProfile}
                title={!canWriteTenantProfile ? 'You do not have write permission for Tenant Profile.' : 'Remove logo'}
                className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black disabled:opacity-60"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
            {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Upload Logo
            <input type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={onUploadLogo} disabled={!canWriteTenantProfile} />
          </label>
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600 dark:border-neutral-700 dark:bg-neutral-900/40 dark:text-neutral-400">
            Best for invoice PDF (white background): use a dark logo (black/navy), preferably transparent <strong>PNG</strong> or high-quality <strong>JPG</strong>.
            Recommended size: wide logo around <strong>300x100 px</strong> (3:1). Avoid white/light logos and busy backgrounds.
          </div>
          <div className="mt-4 space-y-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-neutral-400">Legal Name</label>
            <input className={inputCls} value={form.legalName} onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">Address & Tax</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">Address Line</label>
              <input className={inputCls} value={form.billingStreet} onChange={(e) => setForm((p) => ({ ...p, billingStreet: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">Country</label>
              <CustomSelect
                options={countryOptions}
                value={form.billingCountry}
                onChange={(nextCountry) => {
                  setForm((p) => ({
                    ...p,
                    billingCountry: nextCountry,
                    billingCity: '',
                    billingState: nextCountry.trim().toLowerCase() === 'india' ? p.billingState : '',
                    billingStateCode: nextCountry.trim().toLowerCase() === 'india' ? p.billingStateCode : '',
                  }));
                }}
                placeholder={countriesLoading ? 'Loading countries...' : 'Select country'}
                className={inputCls}
                searchable
                searchPlaceholder="Search country"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">State / UT</label>
              {isIndia ? (
                <CustomSelect
                  options={indiaStateSelectOptions}
                  value={form.billingStateCode}
                  onChange={(code) => {
                    const selected = stateOptions.find((s) => s.code === code);
                    setForm((p) => ({ ...p, billingStateCode: code, billingState: selected?.name || '', billingCity: '' }));
                  }}
                  placeholder="Select state"
                  className={inputCls}
                  searchable
                  searchPlaceholder="Search state / UT"
                />
              ) : (
                <input className={inputCls} value={form.billingState} onChange={(e) => setForm((p) => ({ ...p, billingState: e.target.value, billingStateCode: '' }))} />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">City</label>
              {isIndia ? (
                <CustomSelect
                  options={selectedStateName ? citySelectOptions : []}
                  value={form.billingCity}
                  onChange={(value) => setForm((p) => ({ ...p, billingCity: value }))}
                  placeholder={!selectedStateName ? 'Select state first' : 'Select city'}
                  className={inputCls}
                  searchable
                  searchPlaceholder="Search city"
                />
              ) : (
                <input className={inputCls} value={form.billingCity} onChange={(e) => setForm((p) => ({ ...p, billingCity: e.target.value }))} />
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">Pincode</label>
              <input className={inputCls} value={form.billingZip} onChange={(e) => setForm((p) => ({ ...p, billingZip: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">GSTIN</label>
              <input className={inputCls} value={form.taxId} onChange={(e) => setForm((p) => ({ ...p, taxId: e.target.value }))} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onSave}
          disabled={saving || uploadingLogo || !canWriteTenantProfile || !isDirty}
          title={!canWriteTenantProfile ? 'You do not have write permission for Tenant Profile.' : undefined}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Save Profile
        </button>
      </div>

      <AnimatePresence>
        {toast.show ? (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className={`fixed bottom-8 left-1/2 z-[2000] text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 min-w-[280px] ${
              toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}
          >
            {toast.type === 'error' ? <ShieldAlert className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {cropModalOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Crop Logo</h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-neutral-400">Adjust aspect ratio, zoom, and position. Cropped logo will be saved.</p>

              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="mx-auto" style={{ width: 'min(100%, 640px)' }}>
                  <div
                    className="relative mx-auto overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-neutral-700 dark:bg-black"
                    style={{ width: '100%', aspectRatio: `${cropAspect}` }}
                  >
                    {pendingLogoUrl ? (
                      <img
                        ref={imageRef}
                        src={pendingLogoUrl}
                        alt="Crop source"
                        className="absolute left-1/2 top-1/2 select-none pointer-events-none"
                        style={{
                          transform: `translate(-50%, -50%) translate(${cropX}px, ${cropY}px) scale(${cropZoom})`,
                          maxWidth: 'none',
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">Aspect Ratio</label>
                  <select
                    className={inputCls}
                    value={cropAspect}
                    onChange={(e) => setCropAspect(Number(e.target.value))}
                  >
                    {LOGO_ASPECT_OPTIONS.map((opt) => <option key={opt.label} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">Zoom</label>
                  <input type="range" min="1" max="3" step="0.01" value={cropZoom} onChange={(e) => setCropZoom(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">Horizontal</label>
                  <input type="range" min={-120} max={120} step="1" value={cropX} onChange={(e) => setCropX(Number(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-500 dark:text-neutral-400">Vertical</label>
                  <input type="range" min={-120} max={120} step="1" value={cropY} onChange={(e) => setCropY(Number(e.target.value))} className="w-full" />
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-3">
                <button onClick={closeCropModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">Cancel</button>
                <button onClick={applyLogoCrop} disabled={uploadingLogo} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-70">
                  {uploadingLogo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Apply Crop
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default TenantProfilePage;
