import Link from 'next/link';

export default function Home() {
    return (
        <main className="min-h-screen bg-slate-50 dark:bg-[#070710] flex flex-col items-center justify-between p-6 relative font-sans overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/10 dark:bg-[#2a2a6a]/10 blur-[150px] rounded-full pointer-events-none"></div>
            <div className="absolute top-1/2 right-1/4 translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 dark:bg-[#1e4634]/10 blur-[150px] rounded-full pointer-events-none"></div>

            <div className="flex-1 flex flex-col items-center justify-center z-10 w-full max-w-6xl mt-10">
                <div className="text-center mb-16">
                    <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-6">
                        <span className="text-slate-900 dark:text-white">UNI </span>
                        <span className="text-[#818cf8]">D-CERT</span>
                    </h1>
                    <p className="text-slate-600 dark:text-[#94a3b8] text-lg sm:text-base max-w-xl mx-auto leading-relaxed">
                        Sistem Verifikasi Dokumen Akademik Digital Terdesentralisasi<br />
                        Menggunakan Arsitektur 4-Tier & Sequential State-Gated
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                    {/* Admin Portal Card */}
                    <Link href="/admin" className="group bg-white dark:bg-[#0a0b16] border border-indigo-100 dark:border-[#1e1b4b]/80 p-10 rounded-2xl hover:border-[#4f46e5]/50 transition-all duration-300 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-[#1e1b4b] rounded-2xl flex items-center justify-center text-[#818cf8] mb-8 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(79,70,229,0.2)]">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                        </div>
                        <h2 className="text-lg font-bold text-[#818cf8] mb-4">Portal Otoritas</h2>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 dark:text-[#64748b] leading-relaxed mb-8 flex-1">
                            Khusus Admin, Dekan, dan Rektor untuk proses penerbitan dan tanda tangan digital dokumen akademik (Multi-Sig).
                        </p>
                        <div className="text-[#818cf8] text-base font-bold transition-all">
                            Masuk Sebagai Otoritas <span className="ml-1 inline-block group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </Link>

                    {/* Student Portal Card */}
                    <Link href="/student" className="group bg-white dark:bg-[#0a0b16] border border-blue-100 dark:border-[#1e3a5f]/80 p-10 rounded-2xl hover:border-[#3b82f6]/50 transition-all duration-300 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-[#1e3a5f] rounded-2xl flex items-center justify-center text-[#60a5fa] mb-8 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222"></path></svg>
                        </div>
                        <h2 className="text-lg font-bold text-[#60a5fa] mb-4">Mahasiswa</h2>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 dark:text-[#64748b] leading-relaxed mb-8 flex-1">
                            Mahasiswa dapat melihat, membagikan, dan mengunduh dokumen akademik digital yang telah terdaftar di Blockchain.
                        </p>
                        <div className="text-[#60a5fa] text-base font-bold transition-all">
                            Masuk Sebagai Mahasiswa <span className="ml-1 inline-block group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </Link>

                    {/* Verifier Portal Card */}
                    <Link href="/verify" className="group bg-white dark:bg-[#0a0b16] border border-emerald-100 dark:border-[#064e3b]/80 p-10 rounded-2xl hover:border-[#10b981]/50 transition-all duration-300 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-[#064e3b] rounded-2xl flex items-center justify-center text-[#34d399] mb-8 group-hover:scale-110 transition-transform duration-300 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </div>
                        <h2 className="text-lg font-bold text-[#34d399] mb-4">Cek Keaslian</h2>
                        <p className="text-[13px] text-slate-700 dark:text-slate-300 dark:text-[#64748b] leading-relaxed mb-8 flex-1">
                            Pihak perusahaan/HRD dapat melakukan validasi keaslian file dokumen akademik digital secara instan.
                        </p>
                        <div className="text-[#34d399] text-base font-bold transition-all">
                            Verifikasi File <span className="ml-1 inline-block group-hover:translate-x-1 transition-transform">→</span>
                        </div>
                    </Link>
                </div>
            </div>

            <footer className="w-full text-center pb-8 mt-16 z-10">
                <p className="text-sm text-slate-600 dark:text-slate-400 dark:text-[#475569] font-bold tracking-[0.2em] uppercase">
                    POLYGON AMOY TESTNET ACTIVE <span className="mx-2">•</span> SECURED BY IPFS
                </p>
            </footer>
        </main>
    );
}
