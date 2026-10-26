import React from 'react';

import { ProposalItem } from '@/types';

interface ProposalTableProps {
    filteredProposals: ProposalItem[];
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    filterTab: 'all' | 'pending' | 'approved' | 'revoked';
    setFilterTab: (val: 'all' | 'pending' | 'approved' | 'revoked') => void;
    onSelectProposal: (p: ProposalItem) => void;
    selectedProposalId: number | undefined;
    userRole: 'staf' | 'dekan' | 'rektor' | 'none';
}

export default function ProposalTable({
    filteredProposals,
    searchQuery,
    setSearchQuery,
    filterTab,
    setFilterTab,
    onSelectProposal,
    selectedProposalId,
    userRole
}: ProposalTableProps) {
    const tabs = [
        { id: 'all', label: 'Semua Data' },
        { id: 'pending', label: 'Perlu Tindakan' },
        { id: 'approved', label: 'Disahkan' },
        { id: 'revoked', label: 'Dicabut' },
    ] as const;

    return (
        <div className="lg:col-span-2 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                    Ledger Usulan Dokumen
                </h2>
                <div className="relative w-full sm:w-64">
                    <input
                        type="text"
                        placeholder="Cari nama, ID, hash..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-lg rounded-full pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                    <svg className="w-4 h-4 text-slate-700 dark:text-slate-300 absolute left-3.5 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
            </div>

            <div className="flex space-x-2 bg-white dark:bg-[#0f172a] p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto custom-scrollbar">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilterTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-base font-bold transition-all whitespace-nowrap ${filterTab === tab.id
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar pr-2">
                {filteredProposals.length === 0 ? (
                    <div className="bg-white dark:bg-[#0f172a]/50 border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl p-12 text-center text-slate-700 dark:text-slate-300">
                        Tidak ada usulan yang cocok dengan kriteria.
                    </div>
                ) : (
                    filteredProposals.map((p) => {
                        let dekanColor = "text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f19]";
                        let rektorColor = "text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f19]";

                        const isRejectedByRektor = p.approvedAt > 0 && !p.approvedByDekan;

                        let dekanText = "ACC Dekan";
                        let rektorText = "ACC Rektor";

                        if (p.approvedByDekan) {
                            dekanColor = "text-emerald-700 dark:text-emerald-400 border-emerald-500/50 bg-emerald-100 dark:bg-emerald-900/20 font-bold shadow-[0_0_10px_rgba(5,150,105,0.1)]";
                        }

                        if (p.isMinted) {
                            rektorColor = "text-emerald-700 dark:text-emerald-400 border-emerald-500/50 bg-emerald-100 dark:bg-emerald-900/20 font-bold shadow-[0_0_10px_rgba(5,150,105,0.1)]";
                        }

                        if (p.revokeProposed) {
                            dekanColor = "text-orange-700 dark:text-orange-400 border-orange-500/50 bg-orange-900/20 font-bold shadow-[0_0_10px_rgba(249,115,22,0.1)]";
                            dekanText = "Dekan (Sengketa)";
                        }
                        if (p.isRevoked) {
                            dekanColor = "text-red-700 dark:text-red-400 border-red-500/50 bg-red-900/20 font-bold shadow-[0_0_10px_rgba(220,38,38,0.1)]";
                            rektorColor = "text-red-700 dark:text-red-400 border-red-500/50 bg-red-900/20 font-bold shadow-[0_0_10px_rgba(220,38,38,0.1)]";
                            dekanText = "Dekan (Cabut)";
                            rektorText = "Rektor (Cabut)";
                        }

                        let contextTimeText = "";
                        let contextTimeValue = 0;

                        if (p.isRevoked) {
                            contextTimeText = "Dicabut Permanen";
                            contextTimeValue = p.revokedAt;
                        } else if (p.revokeProposed) {
                            contextTimeText = userRole === 'rektor' ? "Sengketa Masuk" : "Sengketa Diajukan";
                            contextTimeValue = p.revokeProposedAt;
                        } else if (p.isMinted) {
                            contextTimeText = "Selesai (NFT Terbit)";
                            contextTimeValue = p.mintedAt;
                        } else if (isRejectedByRektor) {
                            contextTimeText = "Ditolak Rektor";
                            contextTimeValue = p.approvedAt;
                        } else if (p.approvedByDekan) {
                            contextTimeText = "Di-ACC Dekan";
                            contextTimeValue = p.approvedAt;
                        } else {
                            contextTimeText = "Diajukan Staf";
                            contextTimeValue = p.proposedAt;
                        }

                        const timeDisplay = contextTimeValue
                            ? new Date(contextTimeValue * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                            : 'Waktu belum direkam (Kontrak Lama)';

                        return (
                            <div
                                key={p.id}
                                onClick={() => onSelectProposal(p)}
                                className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${selectedProposalId === p.id
                                    ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.15)]'
                                    : 'bg-white dark:bg-[#0f172a] border-slate-200 dark:border-slate-800 hover:border-slate-600 hover:bg-slate-200 dark:bg-[#1e293b]/50'
                                    }`}
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-base font-mono text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-[#1e293b] px-2 py-0.5 rounded">#{p.id}</span>
                                        <h3 className="font-bold text-slate-900 dark:text-white text-base">{p.docType}</h3>
                                    </div>
                                    <div className="text-base text-slate-600 dark:text-slate-400 font-mono">
                                        Wallet: {p.recipient.substring(0, 8)}...{p.recipient.substring(34)}
                                    </div>
                                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 mt-1.5">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <span className="text-sm">
                                            {isRejectedByRektor
                                                ? <span className="text-amber-600 dark:text-amber-500 font-bold">Ditolak Rektor (Perlu Validasi Ulang Dekan)</span>
                                                : <>{contextTimeText}: <span className="font-semibold text-slate-600 dark:text-slate-400">{timeDisplay}</span></>
                                            }
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-center">
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className={`px-2.5 py-1.5 rounded-md border transition-colors ${dekanColor}`}>
                                            {dekanText}
                                        </span>
                                        <span className={`px-2.5 py-1.5 rounded-md border transition-colors ${rektorColor}`}>
                                            {rektorText}
                                        </span>
                                    </div>
                                    <div className="text-blue-500 hover:text-blue-700 dark:text-blue-400 text-lg font-bold flex items-center gap-1 group">
                                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
