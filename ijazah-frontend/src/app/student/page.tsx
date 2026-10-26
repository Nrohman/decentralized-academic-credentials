'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { getContractInstance } from '@/utils/contract';

// Menggunakan Public RPC agar Mahasiswa tidak perlu menginstal MetaMask (Walletless)
const POLYGON_AMOY_RPC = "https://rpc-amoy.polygon.technology";

interface Student {
    nim: string;
    nama: string;
    programStudi?: string;
    password?: string;
    walletAddress?: string;
}

interface CredentialItem {
    id: number;
    docType: string;
    pdfHash: string;
    jsonURI: string;
    isMinted: boolean;
    isRevoked: boolean;
    revokeReason: string;
    evidenceURI?: string;
}

export default function StudentPortalPage() {
    const [mounted, setMounted] = useState<boolean>(false);
    
    useEffect(() => {
        setMounted(true);
    }, []);

    // UI Styling Constants untuk Dark Theme
    const inputBaseClass = "w-full bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-lg font-medium tracking-wide shadow-inner placeholder:text-slate-600";
    const labelClass = "block text-sm font-bold text-slate-600 dark:text-slate-400 mb-2 ml-1 uppercase tracking-widest";

    const [nim, setNim] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [studentInfo, setStudentInfo] = useState<any>(null);
    const [credentials, setCredentials] = useState<CredentialItem[]>([]);
    const [error, setError] = useState<string>('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        console.log("handleLogin: Mencoba masuk portal mahasiswa dengan NIM:", nim);

        try {
            const res = await fetch('/api/students');
            const data = await res.json();
            
            if (!data.success) {
                throw new Error("Gagal mengambil data dari server");
            }

            const mhs = data.data.find((item: any) => item.nim === nim);

            if (!mhs) {
                console.log("handleLogin: NIM tidak ditemukan di database server.");
                setError("NIM tidak terdaftar di database akademik.");
                setLoading(false);
                return;
            }

            if (mhs.password && mhs.password !== password) {
                console.log("handleLogin: Kombinasi NIM dan password salah.");
                setError("Kombinasi NIM dan Password salah.");
                setLoading(false);
                return;
            }

            console.log("handleLogin: Kredensial valid. Mendapatkan custodial wallet...");
            console.log("handleLogin: Wallet address mahasiswa:", mhs.walletAddress);

            setStudentInfo({
                nim: mhs.nim,
                nama: mhs.nama,
                programStudi: mhs.programStudi || 'Teknik Informatika',
                walletAddress: mhs.walletAddress
            });

            // Daftar RPC Amoy untuk fallback
            const rpcUrls = [
                process.env.NEXT_PUBLIC_AMOY_RPC_URL,
                "https://rpc-amoy.polygon.technology",
                "https://polygon-amoy.drpc.org",
                "https://rpc.ankr.com/polygon_amoy"
            ].filter((url): url is string => typeof url === 'string' && url !== "");

            let fetchedCredentials: CredentialItem[] = [];
            let connected = false;
            let lastError: any = null;

            for (const url of rpcUrls) {
                try {
                    console.log(`handleLogin: Menghubungkan ke RPC: ${url}`);
                    const provider = new ethers.providers.JsonRpcProvider({
                        url: url,
                        timeout: 5000 // timeout 5 detik per RPC
                    });
                    const contract = getContractInstance(provider);

                    console.log("handleLogin: Mengambil ID proposal dari blockchain...");
                    const studentProposalIds = await contract.getStudentProposalIds(mhs.walletAddress);
                    console.log(`handleLogin: Terdeteksi ${studentProposalIds.length} proposal untuk mahasiswa ini.`);
                    
                    fetchedCredentials = [];
                    // Loop hanya berputar sebanyak K (jumlah ijazah asli milik mhs itu sendiri)
                    for (let i = 0; i < studentProposalIds.length; i++) {
                        const id = studentProposalIds[i].toNumber();
                        try {
                            const proposal = await contract.proposals(id);
                            if (proposal.exists) {
                                let extractedEvidence = "";

                                // SINKRONISASI METHOD CALL: Menggunakan getEvidenceURIs dari DokumenAkademik.sol
                                if (proposal.isRevoked) {
                                    try {
                                        if (contract.getEvidenceURIs) {
                                            const arr = await contract.getEvidenceURIs(id);
                                            if (arr && arr.length > 0) extractedEvidence = arr[arr.length - 1];
                                        }
                                    } catch (e) {
                                        extractedEvidence = "";
                                    }
                                }

                                fetchedCredentials.push({
                                    id: id,
                                    docType: proposal.docType,
                                    pdfHash: proposal.pdfHash,
                                    jsonURI: proposal.jsonURI,
                                    isMinted: proposal.isMinted,
                                    isRevoked: proposal.isRevoked,
                                    revokeReason: proposal.revokeReason,
                                    evidenceURI: proposal.evidenceURI || extractedEvidence
                                });
                            }
                        } catch (colErr) {
                            console.warn(`Gagal memuat proposal ID ${id} pada RPC ${url}:`, colErr);
                            continue;
                        }
                    }

                    connected = true;
                    console.log(`handleLogin: Sukses sinkronisasi data dari RPC: ${url}`);
                    break; // Keluar dari loop jika koneksi dan kueri berhasil
                } catch (rpcErr: any) {
                    console.warn(`handleLogin: Gagal terhubung ke RPC: ${url}. Error:`, rpcErr.message || rpcErr);
                    lastError = rpcErr;
                }
            }

            if (!connected) {
                throw lastError || new Error("Gagal terhubung ke seluruh RPC Node Polygon Amoy.");
            }

            fetchedCredentials.reverse();
            setCredentials(fetchedCredentials);
            setIsLoggedIn(true);
            console.log("handleLogin: Login mahasiswa berhasil!");

        } catch (err: any) {
            console.error("handleLogin: ERROR LOGIN MAHASISWA:", err);
            alert("Gagal melakukan login mahasiswa: " + (err.reason || err.message || JSON.stringify(err)));
            setError(err.reason || err.message || "Gagal menghubungi jaringan blockchain.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        setIsLoggedIn(false);
        setStudentInfo(null);
        setCredentials([]);
        setNim('');
        setPassword('');
    };

    const handleViewDocument = async (uri: string) => {
        if (!uri) return;
        try {
            setLoading(true);
            const cid = uri.replace('ipfs://', '');
            const gateway = "https://peach-chemical-hoverfly-201.mypinata.cloud";
            const response = await fetch(`${gateway}/ipfs/${cid}`);
            if (!response.ok) throw new Error("Gagal mengunduh manifest jaringan.");

            const metadata = await response.json();
            if (metadata.document_url) {
                window.open(metadata.document_url, '_blank');
            } else if (metadata.image) {
                window.open(metadata.image.replace('ipfs://', `${gateway}/ipfs/`), '_blank');
            } else {
                alert("File fisik tidak ditemukan di dalam struktur metadata.");
            }
        } catch (error: any) {
            alert("Gagal memuat dokumen resmi: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // FLOATING BACK BUTTON
    const FloatingBackButton = () => (
        <Link
            href="/"
            className="fixed top-6 left-6 z-50 bg-white dark:bg-[#0f172a]/80 backdrop-blur-md border border-slate-300 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 shadow-md dark:shadow-[0_0_15px_rgba(0,0,0,0.5)] rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:bg-[#1e293b] hover:text-slate-900 dark:text-white hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300 group"
        >
            <span className="text-blue-500 font-extrabold text-lg leading-none mb-[1px] group-hover:-translate-x-1.5 transition-transform duration-300">←</span>
            Kembali ke Menu
        </Link>
    );

    // =========================================================================
    // VIEW 1: GERBANG LOGIN MAHASISWA (DARK THEME)
    // =========================================================================
    if (!isLoggedIn) {
        return (
            <main className="min-h-screen bg-white dark:bg-[#050511] flex flex-col items-center justify-center p-6 relative font-sans">
                <FloatingBackButton />

                {/* Glow Effect */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="w-full max-w-md bg-white dark:bg-[#0f172a]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] relative overflow-hidden text-center z-10">
                    <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none"></div>

                    <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-700 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 21l9-5-9-5-9 5 9 5z"></path></svg>
                    </div>

                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-1">Portal Mahasiswa</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-base mb-8 font-medium">Akses Kredensial Akademik Universitas</p>

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="text-left">
                            <label className={labelClass}>Nomor Induk Mahasiswa (NIM)</label>
                            <input
                                type="text"
                                required
                                value={nim}
                                onChange={(e) => setNim(e.target.value)}
                                className={inputBaseClass}
                                placeholder="Ketik NIM Anda"
                            />
                        </div>

                        <div className="text-left">
                            <label className={labelClass}>Password SIAKAD</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={inputBaseClass}
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading || !nim || !password}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl disabled:bg-slate-200 dark:bg-[#1e293b] disabled:text-slate-700 dark:text-slate-300 transition-all text-lg active:scale-[0.98] shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] disabled:shadow-none"
                            >
                                {loading ? 'Memuat Ledger...' : 'Masuk Portal Akademik'}
                            </button>
                        </div>
                    </form>

                    {error && <div className="mt-6 p-3 bg-red-100 dark:bg-red-900/30 border border-red-500/50 text-red-700 dark:text-red-400 text-base font-bold rounded-xl text-center">{error}</div>}
                </div>
            </main>
        );
    }

    // =========================================================================
    // VIEW 2: DASHBOARD PROFIL & DOKUMEN MAHASISWA (DARK THEME)
    // =========================================================================
    return (
        <main className="min-h-screen bg-white dark:bg-[#050511] p-6 sm:p-10 font-sans relative text-slate-800 dark:text-slate-200">

            <div className="max-w-5xl mx-auto space-y-8 mt-12 relative z-10">

                {/* Header Profil Mahasiswa */}
                <div className="bg-white dark:bg-[#0f172a] p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)]"></div>
                    <div>
                        <span className="text-sm font-bold text-blue-700 dark:text-blue-400 uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-md flex items-center gap-2 w-max">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div> Akun Mahasiswa Valid
                        </span>
                        <h1 className="text-3xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">{studentInfo.nama}</h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 font-medium mt-1">NIM: {studentInfo.nim} <span className="mx-2 text-slate-600">|</span> {studentInfo.programStudi}</p>
                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <span className="text-sm uppercase tracking-widest font-bold text-slate-700 dark:text-slate-300">Custodial Wallet:</span>
                            <span className="font-mono text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0b0f19] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 break-all">{studentInfo.walletAddress}</span>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-slate-200 dark:bg-[#1e293b] hover:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-slate-600 hover:text-white text-slate-700 dark:text-slate-300 font-bold text-base px-6 py-3 rounded-xl transition-all active:scale-95 shadow-sm"
                    >
                        Keluar Portal
                    </button>
                </div>

                {/* AREA RENDER KARTU INTERAKTIF */}
                <div className="space-y-5">
                    <h2 className="text-lg font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
                        Arsip Dokumen Terenkripsi
                    </h2>

                    {credentials.length === 0 ? (
                        <div className="bg-white dark:bg-[#0f172a]/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-700 dark:text-slate-300 text-lg border-dashed">
                            Belum ada rekam jejak ijazah, transkrip, atau SKPI yang diterbitkan di blockchain untuk akun ini.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {credentials.map((item) => {
                                let statusBadge = "";
                                let cardBorder = "border-slate-200 dark:border-slate-800";

                                if (item.isRevoked) {
                                    statusBadge = "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-500/50 shadow-[0_0_10px_rgba(220,38,38,0.2)]";
                                    cardBorder = "border-red-900/50 hover:border-red-500/50";
                                } else if (item.isMinted) {
                                    statusBadge = "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-500/50 shadow-[0_0_10px_rgba(5,150,105,0.2)]";
                                    cardBorder = "border-slate-200 dark:border-slate-800 hover:border-emerald-500/50";
                                } else {
                                    statusBadge = "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-500/50 shadow-[0_0_10px_rgba(217,119,6,0.2)]";
                                    cardBorder = "border-slate-200 dark:border-slate-800 hover:border-amber-500/50";
                                }

                                return (
                                    <div key={item.id} className={`bg-white dark:bg-[#0f172a] border ${cardBorder} rounded-2xl p-6 shadow-lg space-y-5 relative flex flex-col justify-between transition-all group`}>
                                        <div className="space-y-4">
                                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                                <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight uppercase group-hover:text-blue-700 dark:text-blue-400 transition-colors">{item.docType}</h3>
                                                <span className={`text-sm font-bold px-3 py-1.5 rounded-md border tracking-wider uppercase ${statusBadge}`}>
                                                    {item.isRevoked ? 'Dicabut Institusi' : item.isMinted ? 'Disahkan' : 'Pending Validasi'}
                                                </span>
                                            </div>

                                            <div className="space-y-3 bg-slate-50 dark:bg-[#0b0f19] p-4 rounded-xl border border-slate-200 dark:border-slate-800/80">
                                                <div>
                                                    <span className="block text-sm text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">SHA256 Fingerprint PDF</span>
                                                    <span className="font-mono text-base text-slate-700 dark:text-slate-300 block mt-1 break-all">{item.pdfHash}</span>
                                                </div>
                                                <div className="border-t border-slate-200 dark:border-slate-800/80 pt-2 mt-2">
                                                    <span className="block text-sm text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider">Token ID NFT</span>
                                                    <span className="font-mono text-blue-700 dark:text-blue-400 font-bold block mt-1">#{item.id}</span>
                                                </div>
                                            </div>

                                            {item.isRevoked && item.revokeReason && (
                                                <div className="p-4 bg-red-950/20 border border-red-500/30 rounded-xl text-base text-red-300">
                                                    <strong className="block font-bold uppercase tracking-wider mb-1 text-red-700 dark:text-red-400">Alasan Pencabutan:</strong>
                                                    <p className="italic font-mono">"{item.revokeReason}"</p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                            {!item.isMinted && !item.isRevoked && (
                                                <button disabled className="w-full bg-slate-200 dark:bg-[#1e293b] text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-base font-bold py-3.5 rounded-xl cursor-not-allowed text-center uppercase tracking-wide">
                                                    🔒 Menunggu Validasi Pimpinan
                                                </button>
                                            )}

                                            {item.isMinted && !item.isRevoked && (
                                                <button
                                                    onClick={() => handleViewDocument(item.jsonURI)}
                                                    disabled={loading}
                                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white text-base font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)] text-center flex items-center justify-center gap-2 uppercase tracking-wide"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                    {loading ? 'Mengunduh...' : 'Lihat Dokumen Resmi ↗'}
                                                </button>
                                            )}

                                            {item.isRevoked && (
                                                <button
                                                    onClick={() => {
                                                        if (item.evidenceURI) {
                                                            const cid = item.evidenceURI.replace('ipfs://', '');
                                                            const gateway = "https://peach-chemical-hoverfly-201.mypinata.cloud";
                                                            window.open(`${gateway}/ipfs/${cid}`, '_blank');
                                                        } else {
                                                            alert("Dokumen bukti SK pembatalan fisik sedang disinkronisasikan oleh sistem.");
                                                        }
                                                    }}
                                                    className="w-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-500/50 hover:bg-red-600 hover:text-white text-base font-bold py-3.5 rounded-xl transition-all active:scale-[0.98] text-center flex items-center justify-center gap-2 uppercase tracking-wide"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                                    <span>Lihat SK Pencabutan ↗</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}