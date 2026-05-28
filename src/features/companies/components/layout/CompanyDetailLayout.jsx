import React from 'react';
import { CompanyCommandBar } from './CompanyCommandBar';
import { CompanySidebar } from './CompanySidebar';
import { CompanyWorkspace } from './CompanyWorkspace';
export const CompanyDetailLayout = ({ company, onAction, onUpdateCompany }) => {
    return (
        <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-black">

            {/* 1. The Command Bar (Header) */}
            <div className="shrink-0">
                <CompanyCommandBar company={company} onAction={onAction} />
            </div>

            <div className="flex-1 flex flex-col lg:flex-row min-h-0 max-w-[1920px] mx-auto w-full">

                {/* 2. The Contextual Sidebar (Left) */}
                <div className="w-[320px] xl:w-[400px] shrink-0 p-6 pr-0">
                    <CompanySidebar company={company} onUpdateCompany={onUpdateCompany} />
                </div>

                {/* 3. The Main Workspace (Right) */}
                <div className="flex-1 min-w-0 p-6">
                    <CompanyWorkspace company={company} onAction={onAction} />
                </div>

            </div>
        </div>
    );
};
