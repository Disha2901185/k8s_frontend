import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, FileSpreadsheet, Loader2, Search } from 'lucide-react';
import { financeOpsApi } from '@/lib/api';
import { callApi } from '@/lib/apiService';
import { formatCurrency, normalizeApiError } from '@/features/finance/financeApiHelpers';
import { CustomSelect } from '@/components/ui/CustomSelect';

const getMonthValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const buildMonthOptions = (count = 25) => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1);
    return {
      value: getMonthValue(date),
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    };
  });
};

const formatScheduleDate = (value) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
};

export const CollectionProjectionPage = () => {
  const monthOptions = useMemo(() => buildMonthOptions(25), []);
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || getMonthValue(new Date()));
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalAmount, setTotalAmount] = useState(0);
  const [ratesLastFetchedAt, setRatesLastFetchedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [monthlyTotals, setMonthlyTotals] = useState({});

  useEffect(() => {
    let active = true;
    const fetchAllTotals = async () => {
      try {
        const promises = monthOptions.map(async (option) => {
          try {
            const res = await callApi(financeOpsApi.listCollectionProjection, { month: option.value });
            return { month: option.value, total: Number(res.totalAmount || 0) };
          } catch {
            return { month: option.value, total: 0 };
          }
        });
        const results = await Promise.all(promises);
        if (!active) return;
        const mapping = {};
        results.forEach(({ month, total }) => {
          mapping[month] = total;
        });
        setMonthlyTotals(mapping);
      } catch (err) {
        console.error('Failed to load monthly totals for dropdown', err);
      }
    };

    fetchAllTotals();
    return () => {
      active = false;
    };
  }, [monthOptions]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await callApi(financeOpsApi.listCollectionProjection, { month: selectedMonth });
        setRows(response.items || []);
        const total = Number(response.totalAmount || 0);
        setTotalAmount(total);
        setRatesLastFetchedAt(response.ratesLastFetchedAt || '');
        setMonthlyTotals((prev) => ({
          ...prev,
          [selectedMonth]: total,
        }));
      } catch (err) {
        setRows([]);
        setTotalAmount(0);
        setRatesLastFetchedAt('');
        setError(normalizeApiError(err, 'Failed to load collection projection'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  const filteredRows = rows.filter((row) => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return true;
    return (
      String(row.scheduleDate || '').toLowerCase().includes(query) ||
      String(row.customerName || '').toLowerCase().includes(query) ||
      String(row.projectName || '').toLowerCase().includes(query) ||
      String(row.amount || '').toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = filteredRows.slice(startIndex, startIndex + itemsPerPage);
  const handleExport = () => {
    const headers = ['Schedule Date', 'Customer/Client Name', 'Project Name', 'Amount'];
    const exportRows = rows.map((row) => [
      formatScheduleDate(row.scheduleDate),
      row.customerName || '',
      row.projectName || '',
      `${(row.currency || 'INR').toUpperCase()} ${Number(row.amount || 0).toFixed(2)}`,
    ]);
    exportRows.push(['', '', 'Total (INR)', `INR ${Number(totalAmount || 0).toFixed(2)}`]);
    const csvContent = [headers, ...exportRows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const link = document.createElement('a');
    const bom = '\uFEFF';
    link.setAttribute('href', `data:text/csv;charset=utf-8,${encodeURIComponent(bom + csvContent)}`);
    link.setAttribute('download', `collection_projection_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Collection Projection</h1>
          <div className="inline-flex items-baseline gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900">
            <span className="text-[11px] uppercase tracking-wide text-slate-500 dark:text-neutral-400">Total</span>
            <span className="text-base font-semibold text-slate-900 dark:text-white">
              {formatCurrency(totalAmount, 'INR', 2, 2)}
            </span>
          </div>
          {ratesLastFetchedAt ? (
            <span className="text-[11px] text-slate-500 dark:text-neutral-400">
              INR converted total • rates at {new Date(ratesLastFetchedAt).toLocaleString('en-IN')}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search collection..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-neutral-800 rounded-lg bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:text-white"
            />
          </div>

          <div className="w-full sm:w-[180px]">
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
              title="Upcoming Month"
            >
              {monthOptions.map((option) => {
                const total = monthlyTotals[option.value];
                const totalLabel = total !== undefined ? ` (${(total / 100000).toFixed(2)} lac)` : '';
                return (
                  <option key={option.value} value={option.value}>
                    {option.label}{totalLabel}
                  </option>
                );
              })}
            </select>
          </div>

          <button
            onClick={handleExport}
            className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 rounded-lg transition-colors border border-emerald-200 dark:border-emerald-800"
            title="Export Excel"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-neutral-800 dark:bg-neutral-900">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-neutral-900/50 text-slate-500 dark:text-neutral-500 font-medium border-b border-slate-200 dark:border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-medium">Schedule Date</th>
                <th className="px-6 py-4 font-medium">Customer/Client Name</th>
                <th className="px-6 py-4 font-medium">Project Name</th>
                <th className="px-6 py-4 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </span>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-rose-600 dark:text-rose-400">
                    {error}
                  </td>
                </tr>
              ) : rows.length ? (
                paginatedRows.map((row, index) => (
                  <tr key={`${row.scheduleDate}-${row.projectName}-${index}`} className="hover:bg-slate-50 dark:hover:bg-neutral-800/50">
                    <td className="px-6 py-4 text-slate-700 dark:text-neutral-300">{formatScheduleDate(row.scheduleDate)}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-neutral-300">{row.customerName || '-'}</td>
                    <td className="px-6 py-4 text-slate-700 dark:text-neutral-300">{row.projectName || '-'}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900 dark:text-white">
                      {formatCurrency(row.amount, row.currency || 'INR', 2, 2)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-slate-500 dark:text-neutral-400">
                    No collection projections found for the selected month.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && !error ? (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/30 text-xs text-slate-500 dark:text-neutral-400 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span>
                Showing {filteredRows.length === 0 ? 0 : startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredRows.length)} of {filteredRows.length} records
              </span>
              <div className="flex items-center gap-2 border-l border-slate-200 dark:border-neutral-800 pl-4">
                <span>Rows per page:</span>
                <div className="w-[70px]">
                  <CustomSelect
                    value={itemsPerPage}
                    onChange={(val) => {
                      setItemsPerPage(Number(val));
                      setCurrentPage(1);
                    }}
                    options={[10, 25, 50, 100].map((size) => ({ value: size, label: size.toString() }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 flex items-center justify-center rounded text-xs transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white font-medium'
                      : 'hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-600 dark:text-neutral-400'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || filteredRows.length === 0}
                className="p-1.5 border border-slate-200 dark:border-neutral-800 rounded bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
