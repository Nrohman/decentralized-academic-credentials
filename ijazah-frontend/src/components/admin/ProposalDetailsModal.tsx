import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance } from '@/utils/contract';

import { ProposalItem } from '@/types';

interface HistoryLog {
    eventName: string;
    timestamp: number;
    transactionHash: string;
    details?: string;
}

interface ProposalDetailsModalProps {
    selectedProposal: ProposalItem | null;
    userRole: 'staf' | 'dekan' | 'rektor' | 'none';
    metadataMap: Record<number, any>;
    getStudentByAddress: (addr: string) => any;
    localEvidenceMap: Record<number, string>;
    setLocalEvidenceMap: (val: any) => void;
    loadAllBlockchainProposals: (contract: any) => Promise<void>;
    setSelectedProposal: (p: ProposalItem | null) => void;
}

export default function ProposalDetailsModal({
    selectedProposal,
    userRole,
    metadataMap,
    getStudentByAddress,
    localEvidenceMap,
    setLocalEvidenceMap,
    loadAllBlockchainProposals,
    setSelectedProposal
}: ProposalDetailsModalProps) {
    const [actionLoading, setActionLoading] = useState(false);
    const [viewLoading, setViewLoading] = useState(false);
    const [revokeReasonInput, setRevokeReasonInput] = useState('');
    const [revokeFileInput, setRevokeFileInput] = useState<File | null>(null);
    const [showRevokeForm, setShowRevokeForm] = useState(false);
    const [historyLogs, setHistoryLogs] = useState<HistoryLog[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    useEffect(() => {
        if (selectedProposal) {
            fetchHistory(selectedProposal.id);
        } else {
            setHistoryLogs([]);
        }
    }, [selectedProposal?.id]);

    const fetchHistory = async (proposalId: number) => {
        try {
            setLoadingHistory(true);
            // Menggunakan Alchemy Provider untuk menghindari Rate Limit dari MetaMask
            const readOnlyProvider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_AMOY_RPC_URL);
            const contract = getContractInstance(readOnlyProvider);

            // OPTIMISASI PERMANEN: Mengambil history langsung dari smart contract!
            // Bebas limit API, 100% On-Chain, dan dijamin anti-error.
            const historyData = await contract.getProposalHistory(proposalId);

            const logs: HistoryLog[] = [];

            for (let i = 0; i < historyData.length; i++) {
                const item = historyData[i];
                logs.push({
                    eventName: item.actionName,
                    timestamp: item.timestamp.toNumber(),
                    transactionHash: `on-chain-log-${i}`,
                    details: item.details
                });
            }

            setHistoryLogs(logs);
        } catch (error) {
            console.error("Failed to fetch history events:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleViewDocument = async (uri: string) => {
        if (!uri) return;
        if (uri.includes('QmFake')) {
            window.open('https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', '_blank');
            return;
        }

        try {
            setViewLoading(true);
            const cid = uri.replace('ipfs://', '');
            const gateway = "https://peach-chemical-hoverfly-201.mypinata.cloud";
            const response = await fetch(`${gateway}/ipfs/${cid}`);
            if (!response.ok) throw new Error("Gagal membaca metadata dari IPFS.");

            const metadata = await response.json();
            if (metadata.document_url) {
                window.open(metadata.document_url, '_blank');
            } else if (metadata.image) {
                window.open(metadata.image.replace('ipfs://', `${gateway}/ipfs/`), '_blank');
            } else {
                alert("File fisik tidak ditemukan di dalam struktur metadata.");
            }
        } catch (error: any) {
            alert("Gagal memuat dokumen: " + error.message);
        } finally {
            setViewLoading(false);
        }
    };

    if (!selectedProposal) {
        return (
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg p-10 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                <svg className="w-16 h-16 text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400">Pilih Data Proposal</h3>
                <p className="text-slate-700 dark:text-slate-300 text-lg mt-2">Pilih salah satu dokumen dari tabel di sebelah kiri untuk melihat detail on-chain dan mengambil tindakan otoritatif.</p>
            </div>
        );
    }

    const p = selectedProposal;
    const student = getStudentByAddress(p.recipient);
    const meta = metadataMap[p.id];

    const runAction = async (action: (contract: any) => Promise<any>) => {
        try {
            setActionLoading(true);
            const provider = new ethers.providers.Web3Provider((window as any).ethereum);
            const signer = provider.getSigner();
            const contract = getContractInstance(signer);

            const tx = await action(contract);
            await tx.wait();

            await loadAllBlockchainProposals(contract);
            setSelectedProposal(null);
            setShowRevokeForm(false);
            setRevokeReasonInput('');
            setRevokeFileInput(null);
            alert("Aksi berhasil diproses ke blockchain!");
        } catch (err: any) {
            console.error(err);
            alert("Error: " + (err.reason || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    const gasOverrides = {
        maxPriorityFeePerGas: ethers.utils.parseUnits("35", "gwei"),
        maxFeePerGas: ethers.utils.parseUnits("60", "gwei")
    };

    const handleDekanApprove = () => runAction(c => c.dekanApprove(p.id, gasOverrides));
    const handleRektorMint = () => runAction(c => c.rektorApproveAndMint(p.id, gasOverrides));
    const handleRektorReject = () => runAction(c => c.rektorRejectMint(p.id, gasOverrides));
    const handleRektorConfirmRevoke = () => runAction(c => c.confirmRevoke(p.id, gasOverrides));
    const handleRektorRejectRevoke = () => runAction(c => c.rejectRevoke(p.id, gasOverrides));

    const handleDekanProposeRevoke = async () => {
        if (!revokeReasonInput || !revokeFileInput) {
            alert("Harap masukkan alasan dan upload file SK pencabutan.");
            return;
        }
        try {
            setActionLoading(true);

            // Upload SK to Pinata via uploadEvidence API route (direct PDF upload)
            const formData = new FormData();
            formData.append('file', revokeFileInput);

            const res = await fetch('/api/uploadEvidence', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Gagal upload bukti SK");
            }
            const { evidenceURI } = await res.json();

            // set local map
            setLocalEvidenceMap({ ...localEvidenceMap, [p.id]: evidenceURI });

            const provider = new ethers.providers.Web3Provider((window as any).ethereum);
            const signer = provider.getSigner();
            const contract = getContractInstance(signer);

            const tx = await contract.proposeRevoke(p.id, revokeReasonInput, [evidenceURI], gasOverrides);
            await tx.wait();

            await loadAllBlockchainProposals(contract);
            setSelectedProposal(null);
            setShowRevokeForm(false);
            alert("Sengketa pembatalan berhasil diajukan!");
        } catch (err: any) {
            console.error(err);
            alert("Error: " + (err.reason || err.message));
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0b0f19] flex justify-between items-center sticky top-0 z-10">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Panel Inspeksi Detail
                </h3>
                <button onClick={() => setSelectedProposal(null)} className="text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:text-white">✕</button>
            </div>

            <div className="p-6 flex-1 space-y-6">
                <div>
                    <span className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-md">
                        {p.docType}
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-4">{student?.nama || 'Unknown'}</h2>
                    <p className="text-lg text-slate-600 dark:text-slate-400 mt-1">NIM: {student?.nim || '-'} <span className="mx-2">|</span> {student?.programStudi || '-'}</p>
                </div>

                {/* BUTTONS UNTUK PREVIEW FILE */}
                <div className="space-y-3">
                    <button
                        onClick={() => handleViewDocument(p.jsonURI)}
                        disabled={viewLoading}
                        className="w-full bg-slate-200 dark:bg-[#1e293b] text-blue-700 dark:text-blue-400 border border-blue-500/30 text-base font-bold py-3 rounded-xl hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                        {viewLoading ? 'Mengunduh Dokumen...' : p.isRevoked ? 'Arsip Berkas Mati' : `Berkas ${p.docType} Asli`}
                    </button>

                    {/* Jika ada sengketa berjalan (revokeProposed) atau sudah di-revoke, tampilkan tombol lihat SK Pencabutan */}
                    {(p.revokeProposed || p.isRevoked) && (
                        <button
                            onClick={() => {
                                const targetEvidence = p.evidenceURI || localEvidenceMap[p.id];
                                if (targetEvidence) {
                                    const cid = targetEvidence.replace('ipfs://', '');
                                    const gateway = "https://peach-chemical-hoverfly-201.mypinata.cloud";
                                    window.open(`${gateway}/ipfs/${cid}`, '_blank');
                                } else {
                                    alert("File bukti fisik SK tidak ditemukan atau sedang disinkronisasikan.");
                                }
                            }}
                            className="w-full bg-red-100 dark:bg-red-900/30 border border-red-500/50 text-red-700 dark:text-red-400 text-base font-bold py-3 rounded-xl hover:bg-red-600 hover:text-white hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            Cek SK Pencabutan (PDF)
                        </button>
                    )}
                </div>

                <div className="bg-slate-50 dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3">
                    <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">ID Proposal On-Chain</div>
                        <div className="text-lg font-mono text-slate-900 dark:text-white">#{p.id}</div>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">Alamat Dompet Pemilik</div>
                        <div className="text-base font-mono text-slate-700 dark:text-slate-300 break-all">{p.recipient}</div>
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-1">SHA-256 PDF Hash</div>
                        <div className="text-base font-mono text-slate-700 dark:text-slate-300 break-all">{p.pdfHash}</div>
                    </div>
                </div>

                {/* TIMELINE RIWAYAT WAKTU */}
                <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-700/50 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest mb-4">Riwayat Waktu Proses</h4>

                    {loadingHistory ? (
                        <div className="flex justify-center items-center py-6 text-slate-500">
                            <svg className="animate-spin h-6 w-6 mr-3 border-4 border-blue-500 border-t-transparent rounded-full" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="text-sm font-bold animate-pulse">Memuat Jejak Historis Blockchain...</span>
                        </div>
                    ) : historyLogs.length === 0 ? (
                        <div className="text-slate-500 italic py-4">Belum ada riwayat aktivitas.</div>
                    ) : (
                        <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-3 space-y-6">
                            {historyLogs.map((log, idx) => {
                                let dotColor = "bg-blue-500";
                                let titleText = log.eventName;
                                let titleColor = "text-slate-900 dark:text-white";

                                if (log.eventName === "DocumentProposed") {
                                    titleText = "Diajukan oleh Staf";
                                    dotColor = "bg-blue-500";
                                } else if (log.eventName === "DocumentApprovedByDekan") {
                                    titleText = "Divalidasi Dekan";
                                    dotColor = "bg-indigo-500";
                                } else if (log.eventName === "MintProposalRejected") {
                                    titleText = "Ditolak oleh Rektor";
                                    dotColor = "bg-amber-500";
                                    titleColor = "text-amber-600 dark:text-amber-500";
                                } else if (log.eventName === "DocumentMinted") {
                                    titleText = "Diterbitkan Rektor (Mint)";
                                    dotColor = "bg-emerald-500";
                                } else if (log.eventName === "RevocationProposed") {
                                    titleText = "Sengketa Diajukan Dekan";
                                    dotColor = "bg-orange-500";
                                } else if (log.eventName === "RevocationVetoed") {
                                    titleText = "Sengketa Ditolak Rektor (Veto)";
                                    dotColor = "bg-slate-400";
                                } else if (log.eventName === "DocumentRevoked") {
                                    titleText = "Dicabut Permanen (Revoked)";
                                    dotColor = "bg-red-500";
                                    titleColor = "text-red-600 dark:text-red-500";
                                }

                                return (
                                    <div key={`${log.transactionHash}-${idx}`} className="relative pl-6">
                                        <span className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full ${dotColor} border-4 border-white dark:border-[#0f172a]`}></span>
                                        <h5 className={`font-bold ${titleColor}`}>{titleText}</h5>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                            {new Date(log.timestamp * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </p>
                                        {log.details && (
                                            <div className="mt-2 text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded-md border border-slate-200 dark:border-slate-700 font-mono text-slate-700 dark:text-slate-300">
                                                {log.details}
                                            </div>
                                        )}
                                        <div className="text-xs text-blue-600 dark:text-blue-400 mt-1.5 inline-block font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-100 dark:border-blue-800/50">
                                            ✓ Permanen On-Chain
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Tambahan status menunggu dinamis di akhir timeline */}
                            {!p.isMinted && !p.isRevoked && (
                                <div className="relative pl-6 pt-4 mt-6 border-t border-slate-200 dark:border-slate-800/50 border-dashed">
                                    <span className="absolute -left-[9px] top-5 w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-600 border-4 border-white dark:border-[#0f172a]"></span>
                                    <h5 className="font-bold text-slate-500 dark:text-slate-400 italic">
                                        {p.approvedByDekan ? 'Menunggu Pengesahan Rektor...' : 'Menunggu Validasi Dekan...'}
                                    </h5>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* AREA AKSI BERDASARKAN ROLE & STATE */}
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <h4 className="text-base font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest mb-4">Tindakan Otoritatif</h4>

                    {/* Jika dokumen belum disetujui dekan dan belum di mint */}
                    {!p.approvedByDekan && !p.isMinted && !p.isRevoked && (
                        userRole === 'dekan' ? (
                            <button onClick={handleDekanApprove} disabled={actionLoading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 text-lg">
                                {actionLoading ? 'Memproses...' : 'Validasi Dokumen (ACC Dekan)'}
                            </button>
                        ) : (
                            <div className="text-lg text-slate-700 dark:text-slate-300 italic">Menunggu validasi Dekan Fakultas.</div>
                        )
                    )}

                    {/* Jika dokumen sudah disetujui dekan tetapi belum di mint */}
                    {p.approvedByDekan && !p.isMinted && !p.isRevoked && (
                        userRole === 'rektor' ? (
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button onClick={handleRektorMint} disabled={actionLoading} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl disabled:opacity-50 text-lg transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)]">
                                    {actionLoading ? 'Memproses...' : 'Sahkan & Mint'}
                                </button>
                                <button onClick={handleRektorReject} disabled={actionLoading} className="flex-1 bg-white dark:bg-[#1e293b] hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold py-3.5 rounded-xl disabled:opacity-50 text-lg border border-red-200 dark:border-red-500/30 transition-all shadow-sm hover:shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                                    Tolak Usulan
                                </button>
                            </div>
                        ) : (
                            <div className="text-lg text-slate-700 dark:text-slate-300 italic">Menunggu pengesahan Rektor.</div>
                        )
                    )}



                    {/* Jika dokumen sudah terbit (Minted) dan belum dicabut, bisa ajukan revoke oleh Dekan */}
                    {p.isMinted && !p.isRevoked && !p.revokeProposed && (
                        userRole === 'dekan' ? (
                            <div className="space-y-4 bg-red-50 dark:bg-red-950/20 p-5 rounded-xl border border-red-200 dark:border-red-500/30 shadow-inner">
                                <h4 className="text-base font-bold text-red-800 dark:text-red-400 uppercase tracking-widest border-b border-red-200 dark:border-red-500/20 pb-2">Panel Sengketa Dokumen</h4>
                                <div>
                                    <label className="block text-sm text-red-900/70 dark:text-red-400/80 font-bold mb-2 uppercase tracking-wide">Surat Keputusan (PDF)</label>
                                    <input type="file" accept=".pdf" onChange={e => setRevokeFileInput(e.target.files?.[0] || null)} className="w-full text-base text-slate-700 dark:text-slate-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border file:border-red-200 dark:file:border-red-900/50 file:bg-white dark:file:bg-[#1e293b] file:text-red-700 dark:file:text-red-400 hover:file:bg-red-50 dark:hover:file:bg-slate-800 cursor-pointer transition-all" />
                                </div>
                                <div>
                                    <label className="block text-sm text-red-900/70 dark:text-red-400/80 font-bold mb-2 uppercase tracking-wide">Keterangan / Alasan Hukum</label>
                                    <textarea placeholder="Rincian pelanggaran akademik..." value={revokeReasonInput} onChange={e => setRevokeReasonInput(e.target.value)} className="w-full bg-white dark:bg-[#0f172a] border border-red-200 dark:border-red-900/50 text-slate-800 dark:text-slate-200 rounded-lg px-4 py-2.5 text-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-sm placeholder:text-slate-400" rows={3} />
                                </div>
                                <button onClick={handleDekanProposeRevoke} disabled={actionLoading} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-lg transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)]">
                                    {actionLoading ? 'Memproses...' : 'Ajukan Pencabutan'}
                                </button>
                            </div>
                        ) : (
                            <div className="text-lg text-emerald-500 font-bold border border-emerald-500/30 bg-emerald-100 dark:bg-emerald-900/20 p-3 rounded-xl text-center">
                                Dokumen Aktif & Sah
                            </div>
                        )
                    )}

                    {/* Jika ada sengketa berjalan (revokeProposed) */}
                    {p.revokeProposed && !p.isRevoked && (
                        <div className="space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-400 dark:border-amber-500/50 p-5 rounded-xl shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                                <h5 className="text-lg font-extrabold text-amber-700 dark:text-amber-400 uppercase mb-2 flex items-center gap-2">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    SENGKETA PENCABUTAN AKTIF
                                </h5>
                                <p className="text-lg font-bold text-amber-900 dark:text-amber-100">Alasan: {p.revokeReason}</p>
                            </div>

                            {userRole === 'rektor' ? (
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button onClick={handleRektorConfirmRevoke} disabled={actionLoading} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 rounded-xl text-lg transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)] hover:shadow-[0_0_25px_rgba(220,38,38,0.5)]">
                                        Setujui Cabut
                                    </button>
                                    <button onClick={handleRektorRejectRevoke} disabled={actionLoading} className="flex-1 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold py-3.5 rounded-xl text-lg transition-all shadow-sm hover:shadow-[0_0_15px_rgba(100,116,139,0.3)]">
                                        Tolak Cabut (Veto)
                                    </button>
                                </div>
                            ) : (
                                <div className="text-lg text-slate-700 dark:text-slate-300 italic text-center">Menunggu keputusan Rektor atas sengketa ini.</div>
                            )}
                        </div>
                    )}

                    {/* Jika dokumen sudah dicabut */}
                    {p.isRevoked && (
                        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl text-center">
                            <div className="text-red-500 font-bold mb-1">DOKUMEN TELAH DICABUT</div>
                            {p.revokeReason && <p className="text-base text-red-700 dark:text-red-400 italic">"{p.revokeReason}"</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
