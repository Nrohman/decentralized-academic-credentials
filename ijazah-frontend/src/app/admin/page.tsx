'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import Link from 'next/link';
import { getContractInstance } from '@/utils/contract';
// import { generateCustodialWallet } from '@/utils/crypto';
// import studentData from '@/app/data/student.json';

// Import Modular Components
import AuthorityHeader from '@/components/admin/AuthorityHeader';
import StaffForm from '@/components/admin/StaffForm';
import ProposalTable from '@/components/admin/ProposalTable';
import ProposalDetailsModal from '@/components/admin/ProposalDetailsModal';

interface Student {
    nim: string;
    nama: string;
    programStudi?: string;
    walletAddress?: string;
}

import { ProposalItem } from '@/types';
const FloatingBackButton = () => (
    <Link
        href="/"
        className="fixed top-6 left-6 z-50 bg-white dark:bg-[#0f172a]/80 backdrop-blur-md border border-slate-300 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 shadow-md dark:shadow-[0_0_15px_rgba(0,0,0,0.5)] rounded-full px-5 py-2.5 text-sm font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-slate-200 dark:bg-[#1e293b] hover:text-slate-900 dark:text-white hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all duration-300 group"
    >
        <span className="text-blue-500 font-extrabold text-lg leading-none mb-[1px] group-hover:-translate-x-1.5 transition-transform duration-300">
            ←
        </span>
        Kembali ke Menu
    </Link>
);

export default function UnifiedAuthorityPortal() {
    const [mounted, setMounted] = useState<boolean>(false);
    const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
    const [userAddress, setUserAddress] = useState<string>('');
    const [userRole, setUserRole] = useState<'staf' | 'dekan' | 'rektor' | 'none'>('none');

    const [proposalsList, setProposalsList] = useState<ProposalItem[]>([]);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'approved' | 'revoked'>('all');
    const [selectedProposal, setSelectedProposal] = useState<ProposalItem | null>(null);

    const [loading, setLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);
    const [metadataMap, setMetadataMap] = useState<Record<number, any>>({});
    const [localEvidenceMap, setLocalEvidenceMap] = useState<Record<number, string>>({});

    const [studentsData, setStudentsData] = useState<Student[]>([]);

    useEffect(() => {
        setMounted(true);
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

    useEffect(() => {
        const fetchAllMetadata = async () => {
            const newMap: Record<number, any> = {};
            for (const p of proposalsList) {
                try {
                    if (p.jsonURI.includes('QmFake')) continue;
                    const cid = p.jsonURI.replace('ipfs://', '');
                    const gateway = "https://peach-chemical-hoverfly-201.mypinata.cloud";
                    const res = await fetch(`${gateway}/ipfs/${cid}`);
                    if (res.ok) {
                        newMap[p.id] = await res.json();
                    }
                    // Jeda 100ms untuk menghindari Rate Limit (429) dari Gateway IPFS Pinata
                    await new Promise(r => setTimeout(r, 100));
                } catch (e) {
                    console.error("Gagal load metadata ID:", p.id);
                }
            }
            setMetadataMap(newMap);
        };

        if (proposalsList.length > 0) {
            fetchAllMetadata();
        }
    }, [proposalsList]);

    const getStudentByAddress = (address: string): Student | null => {
        for (const mhs of studentsData) {
            if (mhs.walletAddress && mhs.walletAddress.toLowerCase() === address.toLowerCase()) {
                return mhs;
            }
        }
        return null;
    };

    const handleWalletLogin = async () => {
        console.log("handleWalletLogin: LOGIN BUTTON CLICKED");
        try {
            console.log("handleWalletLogin: window.ethereum =", typeof (window as any) !== 'undefined' ? (window as any).ethereum : 'undefined');
            setLoading(true);
            setStatusMessage(null);

            if (!(window as any).ethereum) throw new Error("Akses ditolak. Web3 Provider (MetaMask) tidak ditemukan.");

            const provider = new ethers.providers.Web3Provider((window as any).ethereum);

            console.log("handleWalletLogin: Fetching network...");
            const { chainId } = await provider.getNetwork();
            console.log("handleWalletLogin: Connected to network Chain ID:", chainId);
            if (chainId !== 80002) {
                try {
                    console.log("handleWalletLogin: Requesting network switch to Amoy (0x13882)...");
                    await (window as any).ethereum.request({
                        method: 'wallet_switchEthereumChain',
                        params: [{ chainId: '0x13882' }],
                    });
                } catch (switchError: any) {
                    if (switchError.code === 4902) {
                        console.log("handleWalletLogin: Amoy network not found in MetaMask. Adding it...");
                        await (window as any).ethereum.request({
                            method: 'wallet_addEthereumChain',
                            params: [{
                                chainId: '0x13882',
                                chainName: 'Polygon Amoy Testnet',
                                nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
                                rpcUrls: ['https://rpc-amoy.polygon.technology/'],
                                blockExplorerUrls: ['https://amoy.polygonscan.com/']
                            }]
                        });
                    } else {
                        throw new Error("Mohon pindahkan jaringan MetaMask Anda ke Polygon Amoy Testnet.");
                    }
                }
            }

            const cleanProvider = new ethers.providers.Web3Provider((window as any).ethereum);
            console.log("handleWalletLogin: Requesting account address...");
            await cleanProvider.send("eth_requestAccounts", []);
            const signer = cleanProvider.getSigner();
            const walletConnected = await signer.getAddress();
            console.log("handleWalletLogin: Connected address:", walletConnected);

            const contract = getContractInstance(signer);
            console.log("handleWalletLogin: Contract address configured:", contract.address);

            const STAFF_HASH = ethers.utils.id("STAFF_ROLE");
            const DEKAN_HASH = ethers.utils.id("DEKAN_ROLE");
            const REKTOR_HASH = ethers.utils.id("REKTOR_ROLE");

            // Buat instance kontrak read-only menggunakan Alchemy RPC untuk menghindari Rate Limit MetaMask
            const readOnlyProvider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_AMOY_RPC_URL);
            const readOnlyContract = getContractInstance(readOnlyProvider);

            console.log("handleWalletLogin: Checking roles on-chain...");
            const isStaff = await readOnlyContract.hasRole(STAFF_HASH, walletConnected);
            const isDekan = await readOnlyContract.hasRole(DEKAN_HASH, walletConnected);
            const isRektor = await readOnlyContract.hasRole(REKTOR_HASH, walletConnected);

            console.log("handleWalletLogin: roles checked - isStaff:", isStaff, "isDekan:", isDekan, "isRektor:", isRektor);

            setUserAddress(walletConnected);

            if (isStaff) {
                console.log("handleWalletLogin: Logging in as Staf");
                setUserRole('staf');
                await loadAllBlockchainProposals();
            } else if (isDekan || isRektor) {
                console.log("handleWalletLogin: Logging in as Dekan/Rektor - isDekan:", isDekan);
                setUserRole(isDekan ? 'dekan' : 'rektor');
                await loadAllBlockchainProposals();
            } else {
                console.log("handleWalletLogin: No authorized roles found for connected account.");
                setUserRole('none');
                throw new Error("Kredensial tidak valid. Akun Anda tidak memiliki otoritas di sistem ini.");
            }
            setIsLoggedIn(true);
            console.log("handleWalletLogin: Login successful!");
        } catch (err: any) {
            console.error("handleWalletLogin: ERROR DURING LOGIN:", err);
            alert("Gagal melakukan otentikasi: " + (err.reason || err.message || JSON.stringify(err)));
            setStatusMessage({ success: false, text: err.reason || err.message || "Gagal melakukan otentikasi." });
        } finally {
            setLoading(false);
        }
    };

    const loadAllBlockchainProposals = async () => {
        try {
            // Selalu gunakan Alchemy Provider untuk load data agar cepat dan tidak kena Rate Limit MetaMask
            const readOnlyProvider = new ethers.providers.JsonRpcProvider(process.env.NEXT_PUBLIC_AMOY_RPC_URL);
            const readOnlyContract = getContractInstance(readOnlyProvider);

            const nextProposalId = await readOnlyContract.nextProposalId();
            const total = nextProposalId.toNumber();
            const tempArray: ProposalItem[] = [];

            for (let i = 1; i < total; i++) {
                try {
                    // Jeda 50ms untuk menghindari Rate Limit (429) dari provider Alchemy / MetaMask
                    await new Promise(r => setTimeout(r, 50));
                    const p = await readOnlyContract.proposals(i);
                    if (p.exists) {
                        let extractedEvidence = "";
                        try {
                            if (readOnlyContract.getEvidenceURIs) {
                                const arr = await readOnlyContract.getEvidenceURIs(i);
                                if (arr && arr.length > 0) extractedEvidence = arr[arr.length - 1];
                            }
                        } catch (e) {
                            extractedEvidence = "";
                        }

                        tempArray.push({
                            id: i,
                            recipient: p.recipient,
                            pdfHash: p.pdfHash,
                            jsonURI: p.jsonURI,
                            docType: p.docType,
                            approvedByDekan: p.approvedByDekan,
                            exists: p.exists,
                            isMinted: p.isMinted,
                            isRevoked: p.isRevoked,
                            revokeProposed: p.revokeProposed,
                            revokeReason: p.revokeReason,
                            evidenceURI: p.evidenceURI || extractedEvidence || localEvidenceMap[i] || "",
                            proposedAt: p.proposedAt ? p.proposedAt.toNumber() : 0,
                            approvedAt: p.approvedAt ? p.approvedAt.toNumber() : 0,
                            mintedAt: p.mintedAt ? p.mintedAt.toNumber() : 0,
                            revokeProposedAt: p.revokeProposedAt ? p.revokeProposedAt.toNumber() : 0,
                            revokedAt: p.revokedAt ? p.revokedAt.toNumber() : 0
                        });
                    }
                } catch (e: any) {
                    // Tangani error jika diblokir oleh RPC
                    if (e.message && e.message.includes("rate limited") || e.code === "CALL_EXCEPTION") {
                        console.warn(`[Rate Limit] Berhenti sinkronisasi di ID ${i}. Sisa dokumen gagal dimuat.`);
                        break;
                    } else {
                        console.error(`Error loading proposal ${i}:`, e);
                    }
                }
            }
            tempArray.reverse();
            setProposalsList(tempArray);
        } catch (err) {
            console.error("Gagal sinkronisasi data ledger:", err);
        }
    };

    const getStatusBadge = (p: ProposalItem) => {
        if (p.isRevoked) return <span className="text-red-500 font-bold">Dicabut Permanen</span>;
        if (p.revokeProposed) return <span className="text-amber-500 font-bold">Sengketa (Sidang)</span>;
        if (p.isMinted) return <span className="text-emerald-500 font-bold">Selesai (NFT Terbit)</span>;
        if (p.approvedByDekan) return <span className="text-blue-500 font-bold">Menunggu Rektor</span>;
        if (p.approvedAt > 0 && !p.approvedByDekan) return <span className="text-red-500 font-bold">Ditolak Rektor</span>;
        return <span className="text-slate-600 dark:text-slate-400 font-bold">Menunggu Dekan</span>;
    };

    const filteredProposals = proposalsList.filter((item) => {
        const meta = metadataMap[item.id];
        const searchString = `${item.id} ${item.recipient} ${item.docType} ${meta ? JSON.stringify(meta.attributes).toLowerCase() : ''}`.toLowerCase();
        const matchSearch = searchString.includes(searchQuery.toLowerCase());

        if (filterTab === 'pending') {
            if (userRole === 'dekan') {
                return matchSearch && !item.approvedByDekan && !item.isMinted && !item.isRevoked;
            }
            if (userRole === 'rektor') {
                return matchSearch && ((item.approvedByDekan && !item.isMinted && !item.isRevoked) || (item.revokeProposed && !item.isRevoked));
            }
        }
        if (filterTab === 'approved') {
            return matchSearch && item.isMinted && !item.isRevoked && !item.revokeProposed;
        }
        if (filterTab === 'revoked') {
            return matchSearch && item.isRevoked;
        }
        return matchSearch;
    });



    if (!isLoggedIn) {
        return (
            <main className="min-h-screen bg-white dark:bg-[#050511] flex flex-col items-center justify-center p-6 relative font-sans">
                <FloatingBackButton />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="w-full max-w-md bg-white dark:bg-[#0f172a]/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-10 shadow-2xl dark:shadow-[0_0_40px_rgba(0,0,0,0.5)] z-10 text-center relative overflow-hidden">
                    <div className="absolute inset-0 border border-white/5 rounded-2xl pointer-events-none"></div>
                    <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/30 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-700 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Portal Otoritas</h1>
                    <p className="text-slate-600 dark:text-slate-400 text-lg mt-2 mb-8">Protokol Otorisasi Kredensial Terdesentralisasi</p>

                    {statusMessage && (
                        <div className="mb-6 p-3 rounded-lg text-lg bg-red-100 dark:bg-red-900/30 border border-red-500/50 text-red-700 dark:text-red-400">
                            {statusMessage.text}
                        </div>
                    )}

                    <button onClick={handleWalletLogin} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl text-lg transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)] disabled:opacity-50 disabled:shadow-none">
                        {loading ? 'Memverifikasi Akses...' : 'Hubungkan Kredensial Dompet'}
                    </button>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-white dark:bg-[#050511] text-slate-800 dark:text-slate-200 flex flex-col items-center py-8 px-4 sm:px-6 font-sans relative">

            <div className="w-full flex flex-col items-center mt-12 z-10">
                {/* Header Panel Otoritas */}
                <AuthorityHeader
                    userRole={userRole}
                    userAddress={userAddress}
                    onLogout={() => { setIsLoggedIn(false); setSelectedProposal(null); }}
                />

                {/* PANEL UTAMA STAF AKADEMIK */}
                {userRole === 'staf' && (
                    <StaffForm
                        proposalsList={proposalsList}
                        getStudentByAddress={getStudentByAddress}
                        getStatusBadge={getStatusBadge}
                        loadAllBlockchainProposals={loadAllBlockchainProposals}
                    />
                )}

                {/* VIEW PANEL PIMPINAN (DEKAN & REKTOR) */}
                {(userRole === 'dekan' || userRole === 'rektor') && (
                    <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* LIST DATA KIRI */}
                        <ProposalTable
                            filteredProposals={filteredProposals}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            filterTab={filterTab}
                            setFilterTab={setFilterTab}
                            onSelectProposal={setSelectedProposal}
                            selectedProposalId={selectedProposal?.id}
                            userRole={userRole}
                        />

                        {/* COLUMN INSPEKSI KANAN */}
                        <ProposalDetailsModal
                            selectedProposal={selectedProposal}
                            userRole={userRole}
                            metadataMap={metadataMap}
                            getStudentByAddress={getStudentByAddress}
                            localEvidenceMap={localEvidenceMap}
                            setLocalEvidenceMap={setLocalEvidenceMap}
                            loadAllBlockchainProposals={loadAllBlockchainProposals}
                            setSelectedProposal={setSelectedProposal}
                        />
                    </div>
                )}
            </div>
        </main>
    );
}