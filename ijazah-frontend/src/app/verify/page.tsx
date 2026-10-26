'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { getContractInstance } from '@/utils/contract';
import { generateHash } from '@/utils/crypto';

const POLYGON_AMOY_RPC = "https://rpc-amoy.polygon.technology";

interface Student {
    nim: string;
    nama: string;
    programStudi?: string;
    walletAddress?: string;
}

const FloatingBackButton = () => (
    <Link
        href="/"
        className="fixed top-6 left-6 z-50 bg-white dark:bg-[#0f172a]/80 backdrop-blur-md border border-slate-300 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 shadow-md dark:shadow-[0_0_15px_rgba(0,0,0,0.5)] rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:bg-[#1e293b] hover:text-slate-900 dark:text-white hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300 group"
    >
        <span className="text-blue-500 font-extrabold text-lg leading-none mb-[1px] group-hover:-translate-x-1.5 transition-transform duration-300">←</span>
        Kembali ke Menu
    </Link>
);

export default function VerifyPage() {
    const [verifyMode, setVerifyMode] = useState<'file' | 'manual'>('file');
    const [file, setFile] = useState<File | null>(null);
    const [manualHash, setManualHash] = useState<string>('');

    const [loading, setLoading] = useState<boolean>(false);
    const [hashResult, setHashResult] = useState<string>('');
    const [verificationStatus, setVerificationStatus] = useState<any>(null);
    const [error, setError] = useState<string>('');

    // State untuk mendeteksi aksi Drag and Drop
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const [studentsData, setStudentsData] = useState<Student[]>([]);

    useEffect(() => {
        const fetchStudents = async () => {
            try {
                const res = await fetch('/api/students');
                const data = await res.json();
                if (data.success) {
                    setStudentsData(data.data);
                }
            } catch (err) {
                console.error("Gagal load students:", err);
            }
        };
        fetchStudents();
    }, []);

    const getStudentByAddress = (address: string): Student | null => {
        for (const mhs of studentsData) {
            if (mhs.walletAddress && mhs.walletAddress.toLowerCase() === address.toLowerCase()) {
                return mhs;
            }
        }
        return null;
    };

    // Fungsi inti untuk memproses file (Dipanggil oleh onClick maupun onDrop)
    const processFile = async (selectedFile: File) => {
        if (selectedFile.type !== 'application/pdf' && !selectedFile.name.toLowerCase().endsWith('.pdf')) {
            setError("Format tidak didukung. Mohon unggah dokumen dalam format PDF.");
            return;
        }

        setFile(selectedFile);
        setError('');
        setVerificationStatus(null);

        try {
            setLoading(true);
            const hash = await generateHash(selectedFile);
            setHashResult(hash.toUpperCase());
        } catch (err) {
            setError('Gagal menghitung hash dokumen luring.');
        } finally {
            setLoading(false);
        }
    };

    // Handler untuk klik manual (Native File Picker)
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    // --- EVENT HANDLERS DRAG AND DROP ---
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            processFile(e.dataTransfer.files[0]);
            e.dataTransfer.clearData();
        }
    };
    // ------------------------------------

    // =========================================================================
    // OPTIMASI O(1): MENGGUNAKAN HASH-MAP REVERSE LOOKUP LANGSUNG DARI CONTRACT
    // =========================================================================
    const handleVerify = async () => {
        const targetHash = verifyMode === 'file' ? hashResult : manualHash.trim();

        if (!targetHash) {
            setError("Silakan masukkan berkas PDF atau teks hash terlebih dahulu.");
            return;
        }

        try {
            setLoading(true);
            setError('');
            setVerificationStatus(null);

            const rpcUrl = process.env.NEXT_PUBLIC_AMOY_RPC_URL || POLYGON_AMOY_RPC;
            const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
            const contract = getContractInstance(provider);

            // Tembak langsung mapping on-chain untuk mengambil ID Proposal secara O(1)
            const proposalIdCall = await contract.getProposalIdByHash(targetHash.toUpperCase());
            const id = proposalIdCall.toNumber();

            // Jika ID mengembalikan nilai 0, berarti sidik jari hash PDF palsu / tidak terdaftar
            if (id === 0) {
                setVerificationStatus({
                    isValid: false,
                    message: "DOKUMEN PALSU / TERINDIKASI MANIPULASI! Data hash tidak terdaftar di dalam Ledger Blockchain."
                });
                return;
            }

            // Ambil data manifes proposal langsung ke slot indeks array tanpa looping (O(1))
            const foundProposal = await contract.proposals(id);

            const [
                recipient, pdfHash, jsonURI, docType, approvedByDekan, exists, isMinted, isRevoked, revokeProposed, revokeReason
            ] = foundProposal;

            const studentInfo = getStudentByAddress(recipient);

            if (isRevoked) {
                setVerificationStatus({
                    isValid: false,
                    isRevoked: true,
                    docType,
                    recipient,
                    studentInfo,
                    message: `DOKUMEN VALID TAPI TELAH DICABUT INSTITUSI! Alasan: "${revokeReason}"`
                });
            } else if (isMinted) {
                setVerificationStatus({
                    isValid: true,
                    docType,
                    recipient,
                    studentInfo,
                    message: `DOKUMEN ASLI & TERVERIFIKASI RESMI DI BLOCKCHAIN`
                });
            } else {
                setVerificationStatus({
                    isValid: false,
                    message: "Dokumen terdaftar di sistem, tetapi status penerbitan masih Pending persetujuan pimpinan (Belum Sah)."
                });
            }

        } catch (err: any) {
            setError("Terjadi kesalahan sistem saat menghubungi jaringan Polygon Amoy.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setHashResult('');
        setManualHash('');
        setVerificationStatus(null);
        setError('');
    };



    return (
        <div className="min-h-screen bg-white dark:bg-[#050511] flex flex-col items-center justify-center p-6 relative font-sans text-slate-800 dark:text-slate-200">
            <FloatingBackButton />

            {/* Glow Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>

            <div className="bg-white dark:bg-[#0f172a]/90 backdrop-blur-md p-8 sm:p-12 rounded-3xl shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-slate-800 max-w-xl w-full relative z-10 overflow-hidden">
                <div className="absolute inset-0 border border-white/5 rounded-3xl pointer-events-none"></div>

                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl mx-auto mb-5 flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-700 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Portal Verifikasi Publik</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-base font-medium uppercase tracking-widest">Validasi Kredensial Blockchain</p>
                </div>

                {/* Tab Switcher */}
                <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 bg-slate-50 dark:bg-[#0b0f19] mb-8">
                    <button
                        onClick={() => { setVerifyMode('file'); resetForm(); }}
                        className={`flex-1 py-2.5 text-base font-bold rounded-lg transition-all uppercase tracking-wider ${verifyMode === 'file' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-300'}`}
                    >
                        Pindai PDF
                    </button>
                    <button
                        onClick={() => { setVerifyMode('manual'); resetForm(); }}
                        className={`flex-1 py-2.5 text-base font-bold rounded-lg transition-all uppercase tracking-wider ${verifyMode === 'manual' ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]' : 'text-slate-700 dark:text-slate-300 hover:text-slate-700 dark:text-slate-300'}`}
                    >
                        Hash Manual
                    </button>
                </div>

                {/* Area Input Dinamis */}
                {verifyMode === 'file' ? (
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center transition-all duration-300 group ${isDragging ? 'bg-blue-900/30 border-blue-500 scale-[1.02] shadow-[0_0_30px_rgba(37,99,235,0.2)]' : 'bg-slate-100 dark:bg-[#111827] border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:bg-[#1e293b] hover:border-blue-500/50'}`}
                    >
                        <input type="file" accept=".pdf" onChange={handleFileChange} className="hidden" id="pdf-input" />
                        <label htmlFor="pdf-input" className="cursor-pointer text-center w-full flex flex-col items-center">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-600 group-hover:text-white'}`}>
                                <svg className={`w-6 h-6 ${isDragging ? 'animate-bounce' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                            </div>
                            <span className={`font-bold block mb-1.5 text-lg transition-colors ${isDragging ? 'text-blue-700 dark:text-blue-400' : 'text-slate-900 dark:text-white group-hover:text-blue-700 dark:text-blue-400'}`}>
                                {isDragging ? 'Lepaskan Berkas di Sini...' : 'Pilih / Tarik File PDF ke Sini'}
                            </span>
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Ijazah, Transkrip, atau SKPI</span>
                        </label>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">Masukkan SHA-256 Hash</label>
                        <textarea
                            value={manualHash}
                            onChange={(e) => setManualHash(e.target.value)}
                            placeholder="Contoh: 63537FD365F4299CA1959C79BE110BB8DAB1D..."
                            className="w-full p-4 bg-slate-50 dark:bg-[#0b0f19] border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 text-lg font-mono focus:ring-2 focus:ring-blue-500/50 outline-none transition-all resize-none shadow-inner placeholder:text-slate-600"
                            rows={3}
                        />
                    </div>
                )}

                {/* Tampilan Hash Lokal untuk Mode File */}
                {verifyMode === 'file' && file && (
                    <div className="mt-5 p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-xl text-lg break-all shadow-inner">
                        <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300"><span className="text-sm font-bold uppercase tracking-widest text-slate-700 dark:text-slate-300">File:</span> <span className="font-medium">{file.name}</span></p>
                        {hashResult && <p className="mt-3 flex flex-col gap-1"><span className="text-sm font-bold uppercase tracking-widest text-blue-800 dark:text-blue-400">SHA256 Fingerprint:</span> <span className="font-mono text-base font-bold text-blue-900 dark:text-blue-300 bg-blue-200/50 dark:bg-blue-900/40 p-2 rounded border border-blue-300 dark:border-blue-500/20">{hashResult}</span></p>}
                    </div>
                )}

                {/* Tombol Aksi Verifikasi */}
                <button
                    onClick={handleVerify}
                    disabled={loading || (verifyMode === 'file' && !file) || (verifyMode === 'manual' && !manualHash)}
                    className="w-full mt-8 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-500 disabled:bg-slate-200 dark:bg-[#1e293b] disabled:text-slate-700 dark:text-slate-300 transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] active:scale-[0.98] disabled:shadow-none uppercase tracking-wide text-lg"
                >
                    {loading ? 'Memindai Ledger Blockchain...' : 'Verifikasi Keaslian Dokumen'}
                </button>

                {error && <div className="mt-6 text-center text-base font-bold text-red-700 dark:text-red-400 p-4 bg-red-100 dark:bg-red-900/30 border border-red-500/50 rounded-xl">{error}</div>}

                {/* Panel Detail Hasil Validasi */}
                {verificationStatus && (
                    <div className={`mt-8 p-6 rounded-2xl border relative overflow-hidden ${verificationStatus.isValid ? 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-500/50 shadow-[0_0_30px_rgba(5,150,105,0.15)]' : 'bg-red-900/20 border-red-500/50 shadow-[0_0_30px_rgba(220,38,38,0.15)]'}`}>
                        <div className={`absolute top-0 left-0 w-1 h-full ${verificationStatus.isValid ? 'bg-emerald-500 shadow-[0_0_15px_rgba(5,150,105,1)]' : 'bg-red-500 shadow-[0_0_15px_rgba(220,38,38,1)]'}`}></div>

                        <div className="text-center mb-6 relative z-10">
                            <h2 className={`text-xl font-black mb-2 tracking-widest ${verificationStatus.isValid ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                                {verificationStatus.isValid ? '✓ VALIDATION SUCCESS' : '⚠ VALIDATION FAILED'}
                            </h2>
                            <p className={`text-base font-extrabold ${verificationStatus.isValid ? 'text-emerald-900 dark:text-emerald-300' : 'text-red-900 dark:text-red-300'}`}>{verificationStatus.message}</p>
                        </div>

                        {/* Rincian Manifes */}
                        {verificationStatus.recipient && (
                            <div className={`text-base border-t pt-5 space-y-4 relative z-10 ${verificationStatus.isValid ? 'border-emerald-500/20' : 'border-red-500/20'}`}>
                                <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0b0f19]/50 p-2.5 rounded-lg">
                                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-sm">Kategori Berkas</span>
                                    <span className="font-black text-slate-900 dark:text-white">{verificationStatus.docType}</span>
                                </div>

                                {verificationStatus.studentInfo && (
                                    <>
                                        <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0b0f19]/50 p-2.5 rounded-lg">
                                            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-sm">Pemilik Sah</span>
                                            <span className="font-bold text-slate-900 dark:text-white uppercase">{verificationStatus.studentInfo.nama}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0b0f19]/50 p-2.5 rounded-lg">
                                            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-sm">NIM</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{verificationStatus.studentInfo.nim}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50 dark:bg-[#0b0f19]/50 p-2.5 rounded-lg">
                                            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-sm">Program Studi</span>
                                            <span className="font-bold text-slate-900 dark:text-white">{verificationStatus.studentInfo.programStudi || 'Teknik Informatika'}</span>
                                        </div>
                                    </>
                                )}

                                <div className="mt-2">
                                    <span className="block font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest text-sm mb-1.5 ml-1">Wallet Kredensial Penerima</span>
                                    <span className="block font-mono text-sm break-all bg-slate-50 dark:bg-[#0b0f19] p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">{verificationStatus.recipient}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
}