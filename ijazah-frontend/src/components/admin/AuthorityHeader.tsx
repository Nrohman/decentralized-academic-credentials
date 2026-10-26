import React from 'react';

interface AuthorityHeaderProps {
    userRole: 'staf' | 'dekan' | 'rektor' | 'none';
    userAddress: string;
    onLogout: () => void;
}

export default function AuthorityHeader({ userRole, userAddress, onLogout }: AuthorityHeaderProps) {
    const roleLabels = {
        staf: "Staf Akademik",
        dekan: "Dekan Fakultas",
        rektor: "Rektor Universitas",
        none: "Tidak Diketahui"
    };

    return (
        <div className="w-full max-w-6xl bg-white dark:bg-[#0f172a] p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden mb-8">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)]"></div>
            <div>
                <span className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-md flex items-center gap-2 w-max">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div> Sesi Aktif
                </span>
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">Portal {roleLabels[userRole]}</h1>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="text-sm uppercase tracking-widest font-bold text-slate-700 dark:text-slate-300">Connected Wallet:</span>
                    <span className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0b0f19] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 break-all">{userAddress}</span>
                </div>
            </div>
            <button
                onClick={onLogout}
                className="bg-slate-200 dark:bg-[#1e293b] hover:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-base px-6 py-3 rounded-xl transition-all active:scale-95 shadow-sm"
            >
                Keluar / Ganti Akun
            </button>
        </div>
    );
}
