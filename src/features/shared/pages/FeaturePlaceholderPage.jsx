import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const FeaturePlaceholderPage = ({
  title,
  description,
  actionLabel,
  actionTo,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(37,99,235,0.18),_transparent_45%),linear-gradient(135deg,_rgba(248,250,252,0.95),_rgba(241,245,249,0.7))] px-8 py-10 dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_42%),linear-gradient(135deg,_rgba(10,10,10,0.95),_rgba(23,23,23,0.82))]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-600 dark:text-blue-400">
            Workspace
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950 dark:text-white">
            {title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
            {description}
          </p>
          {actionLabel && actionTo ? (
            <Link
              to={actionTo}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
            >
              {actionLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FeaturePlaceholderPage;
