import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Eye, EyeOff, FileCode2, KeyRound, RefreshCw } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { getApiErrorMessage } from '@/features/access-control/api/accessControlApi';
import { getMyKeys } from '@/features/settings/api/myKeysApi';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

const API_BASE_URL = api.defaults.baseURL || import.meta.env.VITE_API_URL || '';
const ENDPOINT_URL = `${API_BASE_URL.replace(/\/$/, '')}/leads/intake`;
const LANGUAGE_OPTIONS = ['curl', 'nodejs', 'python', 'php', 'cpp'];

const SOURCE_CONFIG = [
  {
    key: 'WEB_FORM',
    label: 'Web Form',
    notes: ['Include at least one of `subject`, `message`, or `pageSource` inside `sourcePayload`.'],
    payload: {
      sourceType: 'WEB_FORM',
      externalSourceId: 'wf-1001',
      name: 'John Smith',
      email: 'john.smith@acmecorp.com',
      phone: '+91 9876543210',
      companyName: 'Acme Corp',
      subject: 'Enterprise Inquiry',
      messagePreview: 'Interested in cloud migration services for 500 servers.',
      capturedAt: '2026-04-01T12:00:00.000Z',
      sourcePayload: {
        subject: 'Enterprise Inquiry',
        message: 'Hi, we are interested in your cloud migration services for our enterprise division. We have about 500 servers to migrate.',
        pageSource: '/services/cloud-migration',
      },
    },
  },
  {
    key: 'AI_ASSISTANT',
    label: 'AI Assistant',
    notes: ['Include `chatLog`, `sessionDuration`, or `transcript` inside `sourcePayload`.'],
    payload: {
      sourceType: 'AI_ASSISTANT',
      externalSourceId: 'ai-session-2001',
      email: 'visitor.7482@anonymous.net',
      companyName: 'Unknown Company',
      messagePreview: 'Looking for cloud migration information.',
      capturedAt: '2026-04-01T12:05:00.000Z',
      sourcePayload: {
        sessionDuration: '12m 30s',
        chatLog: [
          {
            sender: 'Bot',
            time: '10:00 AM',
            text: 'Welcome to Lean QTC! How can I assist you with your IT needs today?',
          },
          {
            sender: 'User',
            time: '10:01 AM',
            text: 'I am looking for information on your cloud migration services.',
          },
        ],
      },
    },
  },
  {
    key: 'WHATSAPP',
    label: 'WhatsApp',
    notes: ['Include `chatHistory` or `lastMessage` inside `sourcePayload`.'],
    payload: {
      sourceType: 'WHATSAPP',
      externalSourceId: 'wa-chat-3001',
      name: 'David Ross',
      email: 'david.r@logistics.co',
      phone: '+1 555 0123',
      companyName: 'Unknown Company',
      messagePreview: 'Can someone call me about pricing?',
      capturedAt: '2026-04-01T12:10:00.000Z',
      sourcePayload: {
        lastMessage: 'Can someone call me about pricing?',
        chatHistory: [
          {
            direction: 'in',
            text: 'Hi, I saw your ad on LinkedIn.',
            time: 'Monday 2:00 PM',
          },
          {
            direction: 'out',
            text: 'Hello! Thanks for reaching out. How can we assist you?',
            time: 'Monday 2:05 PM',
          },
        ],
      },
    },
  },
  {
    key: 'RESOURCE_DOWNLOAD',
    label: 'Resource Download',
    notes: ['Include `contentTitle` or `contentType` inside `sourcePayload`.'],
    payload: {
      sourceType: 'RESOURCE_DOWNLOAD',
      externalSourceId: 'dl-4001',
      name: 'Emily Blunt',
      email: 'emily@creative.design',
      companyName: 'Creative Design',
      messagePreview: 'Downloaded 2024 UI/UX Trends Report.',
      capturedAt: '2026-04-01T12:15:00.000Z',
      sourcePayload: {
        contentTitle: '2024 UI/UX Trends Report',
        contentType: 'PDF Guide',
        downloadedAt: '2026-04-01T09:15:00.000Z',
      },
    },
  },
  {
    key: 'EVENT_REGISTRATION',
    label: 'Event Registration',
    notes: ['Include `webinarTitle` or `webinarDate` inside `sourcePayload`.'],
    payload: {
      sourceType: 'EVENT_REGISTRATION',
      externalSourceId: 'event-5001',
      name: 'Michael Chang',
      email: 'm.chang@startuplab.io',
      companyName: 'Startup Lab',
      subject: 'Webinar Registration',
      messagePreview: 'Registered for The Future of AI in DevOps.',
      capturedAt: '2026-04-01T12:20:00.000Z',
      sourcePayload: {
        webinarTitle: 'The Future of AI in DevOps',
        webinarDate: '2026-04-05T14:00:00.000Z',
        attended: true,
        questionsAsked: ['How does this integrate with Kubernetes?', 'Is there a free tier?'],
      },
    },
  },
  {
    key: 'EMAIL_INQUIRY',
    label: 'Email Inquiry',
    notes: ['Include `subject` or `message` inside `sourcePayload`.'],
    payload: {
      sourceType: 'EMAIL_INQUIRY',
      externalSourceId: 'mail-6001',
      name: 'Sarah Connor',
      email: 'sarah.c@techfin.com',
      companyName: 'TechFin Solutions',
      subject: 'Partnership Opportunity',
      messagePreview: 'Looking for a reliable implementation partner.',
      capturedAt: '2026-04-01T12:25:00.000Z',
      sourcePayload: {
        subject: 'Partnership Opportunity',
        message:
          'Hello Team, I am reaching out from TechFin Solutions. We are looking for a reliable implementation partner for our banking clients. Would you be open to a discovery call?',
        attachments: ['partnership_deck.pdf'],
      },
    },
  },
  {
    key: 'LINKEDIN',
    label: 'LinkedIn',
    notes: ['Include `profileUrl` or `message` inside `sourcePayload`.'],
    payload: {
      sourceType: 'LINKEDIN',
      externalSourceId: 'li-7001',
      name: 'James Cameron',
      email: 'james.cameron@visionary.com',
      companyName: 'Visionary Tech',
      messagePreview: 'Would love to connect and learn more.',
      capturedAt: '2026-04-01T12:30:00.000Z',
      sourcePayload: {
        profileUrl: 'linkedin.com/in/jamescameron',
        message: 'Saw your post about AI-driven analytics. Would love to connect and learn more.',
      },
    },
  },
];

const Notice = ({ tone = 'info', children }) => {
  const toneMap = {
    error:
      'border-rose-200 bg-rose-50/80 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
    info:
      'border-slate-200 bg-slate-50/80 text-slate-700 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300',
  };

  return <div className={cn('rounded-2xl border px-4 py-3 text-sm leading-6', toneMap[tone] || toneMap.info)}>{children}</div>;
};

const EmptyState = ({ message, onRetry }) => (
  <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center dark:border-neutral-700 dark:bg-neutral-900/60">
    <div className="mx-auto inline-flex rounded-2xl bg-slate-200 p-3 text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">
      <FileCode2 className="h-6 w-6" />
    </div>
    <h2 className="mt-4 text-xl font-semibold text-slate-950 dark:text-white">Unable to load integration credentials</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">{message}</p>
    <button
      type="button"
      onClick={onRetry}
      className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
    >
      <RefreshCw className="h-4 w-4" />
      Retry
    </button>
  </div>
);

const CodeBlock = ({
  language,
  code,
  onCopy,
  copyBusy = false,
  maxHeightClass = 'max-h-[560px]',
  minHeightClass = 'min-h-0',
}) => (
  <div className="w-full min-w-0 overflow-hidden rounded-[26px] border border-slate-200 bg-slate-950 shadow-sm dark:border-neutral-800">
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">{language}</span>
      <button
        type="button"
        onClick={onCopy}
        disabled={copyBusy}
        className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Copy className="h-3.5 w-3.5" />
        Copy
      </button>
    </div>
    <pre
      className={cn(
        'overflow-auto whitespace-pre-wrap break-words p-4 text-sm leading-6 text-slate-100',
        minHeightClass,
        maxHeightClass,
      )}
    >
      <code>{code}</code>
    </pre>
  </div>
);

const buildSuccessResponse = (payload) =>
  JSON.stringify(
    {
      id: 'lead_01hxyzabc123',
      sourceType: payload.sourceType,
      sourceLabel: SOURCE_CONFIG.find((item) => item.key === payload.sourceType)?.label || payload.sourceType,
      status: 'NEW',
      statusLabel: 'New',
      name: payload.name || null,
      email: payload.email || null,
      phone: payload.phone || null,
      company: payload.companyName || null,
      subject: payload.subject || null,
      messagePreview: payload.messagePreview || null,
      externalSourceId: payload.externalSourceId,
      capturedAt: payload.capturedAt,
      details: payload.sourcePayload,
      createdAt: '2026-04-01T12:00:02.000Z',
      updatedAt: '2026-04-01T12:00:02.000Z',
    },
    null,
    2,
  );

const buildErrorResponse = (status) =>
  JSON.stringify(
    status === 401
      ? {
          statusCode: 401,
          message: 'Invalid lead intake credentials',
          error: 'Unauthorized',
        }
      : {
          statusCode: 400,
          message: 'sourcePayload is missing the expected fields for the selected sourceType',
          error: 'Bad Request',
        },
    null,
    2,
  );

const toPhpBody = (value, indent = 0) => {
  const pad = ' '.repeat(indent);
  const nextPad = ' '.repeat(indent + 4);

  if (Array.isArray(value)) {
    const items = value.map((item) => `${nextPad}${toPhpBody(item, indent + 4)},`);
    return `[\n${items.join('\n')}\n${pad}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value).map(
      ([key, item]) => `${nextPad}'${key}' => ${toPhpBody(item, indent + 4)},`,
    );
    return `[\n${entries.join('\n')}\n${pad}]`;
  }

  return JSON.stringify(value);
};

const toCppString = (value) => JSON.stringify(JSON.stringify(value)).slice(1, -1);

const buildSnippet = ({ language, payload, clientId, clientSecret }) => {
  const body = JSON.stringify(payload, null, 2);

  switch (language) {
    case 'curl':
      return `curl -X POST "${ENDPOINT_URL}" \\
  -H "Content-Type: application/json" \\
  -H "x-lead-client-id: ${clientId}" \\
  -H "x-lead-client-secret: ${clientSecret}" \\
  -d '${body}'`;
    case 'nodejs':
      return `const response = await fetch('${ENDPOINT_URL}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-lead-client-id': '${clientId}',
    'x-lead-client-secret': '${clientSecret}',
  },
  body: JSON.stringify(${body}),
});

const data = await response.json();
console.log(data);`;
    case 'python':
      return `import requests

payload = ${body}

response = requests.post(
    '${ENDPOINT_URL}',
    headers={
        'Content-Type': 'application/json',
        'x-lead-client-id': '${clientId}',
        'x-lead-client-secret': '${clientSecret}',
    },
    json=payload,
)

print(response.status_code)
print(response.json())`;
    case 'php':
      return `<?php
$payload = ${toPhpBody(payload)};

$ch = curl_init('${ENDPOINT_URL}');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-lead-client-id: ${clientId}',
        'x-lead-client-secret: ${clientSecret}',
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
]);

$response = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo $status . PHP_EOL;
echo $response;`;
    case 'cpp':
      return `#include <curl/curl.h>
#include <string>

int main() {
    CURL* curl = curl_easy_init();
    if (!curl) return 1;

    std::string payload = "${toCppString(payload)}";
    struct curl_slist* headers = nullptr;
    headers = curl_slist_append(headers, "Content-Type: application/json");
    headers = curl_slist_append(headers, "x-lead-client-id: ${clientId}");
    headers = curl_slist_append(headers, "x-lead-client-secret: ${clientSecret}");

    curl_easy_setopt(curl, CURLOPT_URL, "${ENDPOINT_URL}");
    curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
    curl_easy_perform(curl);

    curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return 0;
}`;
    default:
      return body;
  }
};

export const MyKeysPage = () => {
  const [keysState, setKeysState] = useState({ loading: true, error: '', data: null });
  const [feedback, setFeedback] = useState({ tone: '', message: '' });
  const [toast, setToast] = useState({ show: false, message: '' });
  const [copyingField, setCopyingField] = useState('');
  const [selectedSource, setSelectedSource] = useState(SOURCE_CONFIG[0].key);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGE_OPTIONS[0]);
  const [secretVisible, setSecretVisible] = useState(false);

  const loadKeys = async () => {
    setKeysState((current) => ({ ...current, loading: true, error: '' }));

    try {
      const data = await getMyKeys();
      setKeysState({ loading: false, error: '', data });
    } catch (error) {
      setKeysState({
        loading: false,
        error: getApiErrorMessage(error, 'Unable to load tenant keys.'),
        data: null,
      });
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  useEffect(() => {
    if (!toast.show) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const handleCopy = async (field, value) => {
    if (!value) {
      setFeedback({ tone: 'error', message: `${field} is unavailable.` });
      return;
    }

    setCopyingField(field);
    try {
      await navigator.clipboard.writeText(value);
      setFeedback({ tone: '', message: '' });
      setToast({ show: true, message: `${field} copied to clipboard.` });
    } catch {
      setFeedback({ tone: 'error', message: `Unable to copy ${field.toLowerCase()}.` });
    } finally {
      setCopyingField('');
    }
  };

  const selectedConfig = SOURCE_CONFIG.find((item) => item.key === selectedSource) || SOURCE_CONFIG[0];
  const clientId = keysState.data?.clientId || 'YOUR_CLIENT_ID';
  const clientSecret = secretVisible && keysState.data?.clientSecret ? keysState.data.clientSecret : 'YOUR_CLIENT_SECRET';
  const requestCode = buildSnippet({
    language: selectedLanguage,
    payload: selectedConfig.payload,
    clientId,
    clientSecret,
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_34%),linear-gradient(135deg,_rgba(248,250,252,0.96),_rgba(255,255,255,0.92))] px-8 py-8 dark:bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_34%),linear-gradient(135deg,_rgba(10,10,10,0.96),_rgba(23,23,23,0.88))]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-sky-600 dark:text-sky-400">Lead Intake API</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">My Keys</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
            Use these tenant credentials to configure lead intake integrations and send leads from your website, assistant, or external connectors.
          </p>
        </div>
      </div>

      {feedback.tone === 'error' && feedback.message ? (
        <Notice tone={feedback.tone}>
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{feedback.message}</span>
          </div>
        </Notice>
      ) : null}

      {keysState.loading ? (
        <div className="rounded-[26px] border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500 dark:border-neutral-700 dark:bg-neutral-900/60 dark:text-neutral-400">
          Loading integration credentials...
        </div>
      ) : null}

      {!keysState.loading && keysState.error ? <EmptyState message={keysState.error} onRetry={loadKeys} /> : null}

      {!keysState.loading && !keysState.error ? (
        <>
          <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-400">Endpoint</p>
                  <code className="mt-3 block break-all rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 dark:bg-neutral-950 dark:text-white">
                    POST {ENDPOINT_URL}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('Endpoint URL', ENDPOINT_URL)}
                  disabled={copyingField === 'Endpoint URL'}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                >
                  <Copy className="h-4 w-4" />
                  Copy URL
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-400">Client ID</p>
                  <code className="mt-3 block break-all text-sm font-medium text-slate-950 dark:text-white">
                    {keysState.data?.clientId || 'Unavailable'}
                  </code>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-400">Client Secret</p>
                    <button
                      type="button"
                      onClick={() => setSecretVisible((current) => !current)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-950 dark:text-neutral-400 dark:hover:text-white"
                    >
                      {secretVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      {secretVisible ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                  <code className="mt-3 block break-all text-sm font-medium text-slate-950 dark:text-white">
                    {secretVisible ? keysState.data?.clientSecret || 'Unavailable' : '****************'}
                  </code>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Integration Flow</h2>
              <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                <li>1. Store the tenant Client ID and Client Secret securely on your server or integration layer.</li>
                <li>2. Send lead events to the intake endpoint with both headers and a JSON request body.</li>
                <li>3. Reuse the same `externalSourceId` if you retry the same source event.</li>
                <li>4. Keep `sourcePayload` structured so the ERP can render source-specific details correctly.</li>
              </ol>
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="border-b border-slate-200 px-6 py-5 dark:border-neutral-800">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Request Body</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                      Select a lead source to preview the exact JSON payload expected by the intake API.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('Request Body', JSON.stringify(selectedConfig.payload, null, 2))}
                    disabled={copyingField === 'Request Body'}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  >
                    <Copy className="h-4 w-4" />
                    Copy JSON
                  </button>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  {SOURCE_CONFIG.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setSelectedSource(item.key)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition',
                        item.key === selectedSource
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-0 lg:grid-cols-[220px_minmax(0,1fr)]">
                <div className="border-b border-slate-200 bg-slate-50/80 p-6 dark:border-neutral-800 dark:bg-neutral-950/70 lg:border-b-0 lg:border-r">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-neutral-400">
                    Source Notes
                  </p>
                  <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700 dark:text-neutral-300">
                    {selectedConfig.notes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </div>
                <div className="min-w-0 p-6">
                  <CodeBlock
                    language="application/json"
                    code={JSON.stringify(selectedConfig.payload, null, 2)}
                    onCopy={() => handleCopy('Request Body', JSON.stringify(selectedConfig.payload, null, 2))}
                    copyBusy={copyingField === 'Request Body'}
                    minHeightClass="min-h-[520px]"
                    maxHeightClass="max-h-[520px]"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="border-b border-slate-200 px-6 py-5 dark:border-neutral-800">
                <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Code Samples</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                  Generated with this tenant&apos;s credentials. Reveal the Client Secret above to inject it into the examples.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  {LANGUAGE_OPTIONS.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => setSelectedLanguage(language)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition',
                        language === selectedLanguage
                          ? 'border-sky-600 bg-sky-600 text-white'
                          : 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800',
                      )}
                    >
                      {language === 'nodejs' ? 'Node.js' : language === 'cpp' ? 'C++' : language}
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6">
                <CodeBlock
                  language={selectedLanguage === 'nodejs' ? 'Node.js' : selectedLanguage === 'cpp' ? 'C++' : selectedLanguage}
                  code={requestCode}
                  onCopy={() => handleCopy('Code Sample', requestCode)}
                  copyBusy={copyingField === 'Code Sample'}
                  maxHeightClass="max-h-[520px]"
                />
              </div>
            </div>

            <div className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Response Examples</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">
                The API returns the created or updated lead record. Validation and credential failures return standard error payloads.
              </p>
              <div className="mt-5 space-y-5">
                <CodeBlock
                  language="200 OK"
                  code={buildSuccessResponse(selectedConfig.payload)}
                  onCopy={() => handleCopy('Success Response', buildSuccessResponse(selectedConfig.payload))}
                  copyBusy={copyingField === 'Success Response'}
                  minHeightClass="min-h-[420px]"
                  maxHeightClass="max-h-[420px]"
                />
                <CodeBlock
                  language="401 Unauthorized"
                  code={buildErrorResponse(401)}
                  onCopy={() => handleCopy('401 Response', buildErrorResponse(401))}
                  copyBusy={copyingField === '401 Response'}
                  minHeightClass="min-h-[180px]"
                  maxHeightClass="max-h-[240px]"
                />
                <CodeBlock
                  language="400 Bad Request"
                  code={buildErrorResponse(400)}
                  onCopy={() => handleCopy('400 Response', buildErrorResponse(400))}
                  copyBusy={copyingField === '400 Response'}
                  minHeightClass="min-h-[180px]"
                  maxHeightClass="max-h-[240px]"
                />
              </div>
            </div>
          </div>
        </>
      ) : null}

      <AnimatePresence>
        {toast.show ? (
          <motion.div
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-8 left-1/2 z-[200] flex items-center gap-3 rounded-full bg-emerald-600 px-6 py-3 text-white shadow-2xl"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="text-sm font-semibold tracking-wide">{toast.message}</span>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default MyKeysPage;
