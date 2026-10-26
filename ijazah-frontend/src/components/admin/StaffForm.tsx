import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { getContractInstance } from '@/utils/contract';
import { generateHash } from '@/utils/crypto';
import Tesseract from 'tesseract.js';
// pdfjsLib di-import secara dinamis di dalam fungsi untuk mencegah error SSR DOMMatrix

const parseIndonesianDate = (dateStr: string) => {
    const months: { [key: string]: string } = {
        'januari': '01', 'februari': '02', 'maret': '03', 'april': '04',
        'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08',
        'september': '09', 'oktober': '10', 'november': '11', 'desember': '12'
    };
    const parts = dateStr.toLowerCase().replace(/,/g, '').split(/\s+/);
    if (parts.length >= 3) {
        let day = parts[0];
        if (day.length === 1) day = '0' + day;
        const month = months[parts[1]] || '01';
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }
    return '';
};

interface Student {
    nim: string;
    nama: string;
    programStudi?: string;
    walletAddress?: string;
    password?: string;
}

interface CapaianSKPI {
    kegiatan: string;
    penyelenggara: string;
    tingkat: string;
    file: File | null;
    evidenceURI?: string;
}

import { ProposalItem } from '@/types';

interface StaffFormProps {
    proposalsList: ProposalItem[];
    getStudentByAddress: (addr: string) => Student | null;
    getStatusBadge: (p: ProposalItem) => any;
    loadAllBlockchainProposals: (contract: any) => Promise<void>;
}

export default function StaffForm({ proposalsList, getStudentByAddress, getStatusBadge, loadAllBlockchainProposals }: StaffFormProps) {
    // 🎨 UI Styling Constants untuk Dark Theme
    const inputBaseClass = "w-full bg-white dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-4 py-2.5 text-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner disabled:bg-slate-50 dark:bg-[#0b0f19] disabled:text-slate-700 dark:text-slate-300 disabled:border-slate-200 dark:border-slate-800 disabled:cursor-not-allowed";
    const labelClass = "block font-bold text-slate-600 dark:text-slate-400 mb-1.5 text-sm uppercase tracking-wider";

    // State Form Staf
    const [docType, setDocType] = useState<string>('');
    const [nim, setNim] = useState<string>('');
    const [nama, setNama] = useState<string>('');
    const [programStudi, setProgramStudi] = useState<string>('');
    const [recipientWallet, setRecipientWallet] = useState<string>('');
    const [file, setFile] = useState<File | null>(null);

    const [noIjazah, setNoIjazah] = useState<string>('');
    const [predikat, setPredikat] = useState<string>('');
    const [tglLulus, setTglLulus] = useState<string>('');
    const [ipk, setIpk] = useState<string>('');
    const [totalSks, setTotalSks] = useState<string>('');
    const [tglCetak, setTglCetak] = useState<string>('');

    // Fitur Search Staf
    const [stafSearchQuery, setStafSearchQuery] = useState<string>('');

    const [capaianList, setCapaianList] = useState<CapaianSKPI[]>([
        { kegiatan: '', penyelenggara: '', tingkat: 'Nasional', file: null }
    ]);

    const [loading, setLoading] = useState<boolean>(false);
    const [statusMessage, setStatusMessage] = useState<{ success: boolean; text: string } | null>(null);

    const addCapaianRow = () => setCapaianList([...capaianList, { kegiatan: '', penyelenggara: '', tingkat: 'Nasional', file: null }]);

    const removeCapaianRow = (index: number) => {
        if (capaianList.length > 1) {
            setCapaianList(capaianList.filter((_, i) => i !== index));
        }
    };

    const handleCapaianChange = (index: number, field: keyof CapaianSKPI, value: any) => {
        const updated = [...capaianList];
        updated[index] = { ...updated[index], [field]: value };
        setCapaianList(updated);
    };

    // Auto-Lock & Populate Student Details
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

    useEffect(() => {
        if (!nim) {
            setRecipientWallet('');
            return;
        }
        const kueriMahasiswa = studentsData.find((mhs) => mhs.nim === nim);
        if (kueriMahasiswa) {
            setRecipientWallet(kueriMahasiswa.walletAddress || '');
        } else {
            setRecipientWallet('');
        }
    }, [nim, studentsData]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);

        if (!selectedFile) return;
        if (selectedFile.type !== 'application/pdf') return;

        // Reset semua state agar tidak tercampur dengan sisa file sebelumnya
        setDocType('');
        setNim('');
        setNama('');
        setProgramStudi('');
        setNoIjazah('');
        setPredikat('');
        setTglLulus('');
        setIpk('');
        setTotalSks('');
        setTglCetak('');

        try {
            setLoading(true);
            setStatusMessage({ success: true, text: "Memindai dokumen dengan OCR..." });

            const fileReader = new FileReader();
            fileReader.onload = async function () {
                try {
                    // DYNAMIC IMPORT UNTUK MENCEGAH SSR ERROR
                    const pdfjsLib = await import('pdfjs-dist');
                    if (typeof window !== 'undefined' && 'Worker' in window && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
                    }

                    const typedarray = new Uint8Array(this.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                    const maxPages = Math.min(pdf.numPages, 3);

                    let allOcrText = "";
                    let allNativeText = "";

                    const worker = await Tesseract.createWorker('ind');
                    // PSM 11 (Sparse text) atau PSM 6/4 sering kali lebih baik untuk membaca tabel dengan garis tepi 
                    // yang sering membuat Tesseract default (PSM 3) kebingungan dan melewati baris.
                    await worker.setParameters({
                        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
                    });

                    for (let i = 1; i <= maxPages; i++) {
                        const page = await pdf.getPage(i);

                        const textContent = await page.getTextContent();
                        const pageNativeText = textContent.items.map((item: any) => item.str).join('\n');
                        allNativeText += `\n` + pageNativeText;

                        const viewport = page.getViewport({ scale: 2.0 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;

                        await page.render({
                            canvasContext: context!,
                            viewport: viewport
                        } as any).promise;

                        const dataUrl = canvas.toDataURL('image/png');
                        const { data: { text } } = await worker.recognize(dataUrl);
                        allOcrText += `\n` + text;
                    }

                    await worker.terminate();

                    const combinedText = allNativeText + "\n" + allOcrText;
                    console.log("Combined Text:", combinedText);

                    // Kirim ke API debug (Hanya sementara untuk investigasi OCR)
                    try {
                        fetch('/api/students?debug=true', { method: 'POST', body: combinedText });
                    } catch (e) {}

                    // Deteksi DocType
                    let detectedDocType = docType; // default to current state
                    if (combinedText.match(/TRANSKRIP NILAI/i)) {
                        detectedDocType = 'Transkrip Nilai';
                        setDocType('Transkrip Nilai');
                    } else if (combinedText.match(/IJAZAH|SARJANA KOMPUTER/i)) {
                        detectedDocType = 'Ijazah';
                        setDocType('Ijazah');
                    }

                    // NIM
                    const nimMatch = combinedText.match(/NIM[\s:\-]+([0-9]{8,15})/i);
                    if (nimMatch) setNim(nimMatch[1]);


                    // NAMA
                    let extractedNama = "";

                    // 1. Coba pola Native PDF: Kolom terpisah. "Nama" selalu tepat di atas nilai "NIM" yang berupa angka 10 digit.
                    // Mendukung adanya enter kosong di antara titik dua dan nama.
                    const namaNativeMatch = combinedText.match(/\n\s*:\s*\n?\s*([A-Za-z\s]{3,50}?)\s*\n\s*:\s*\n?\s*\d{8,15}/i);
                    if (namaNativeMatch && namaNativeMatch[1]) {
                        extractedNama = namaNativeMatch[1].trim();
                    }

                    // 2. Jika gagal, coba pola OCR (termasuk Sparse Text): "Nama Mahasiswa [:] NUROHMAN \n NIM"
                    if (!extractedNama) {
                        const namaOcrMatch = combinedText.match(/Nama\s*Mahasiswa[\s:=]*([A-Za-z\s]{3,50}?)\s*(?:NIM|Tempat)/i);
                        if (namaOcrMatch && namaOcrMatch[1]) {
                            let temp = namaOcrMatch[1].trim();
                            // Pastikan tidak menangkap label "NIM" akibat salah baca kolom Native
                            if (!/^(NIM|Tempat|TGL|TANGGAL)/i.test(temp)) {
                                extractedNama = temp;
                            }
                        }
                    }

                    if (!extractedNama && detectedDocType === 'Ijazah') {
                        // Strategi Global: Cari semua baris di seluruh teks yang merupakan huruf KAPITAL PENUH
                        // Karena OCR dan Native PDF bisa mengacak urutan baris, kita abaikan urutan!
                        const lines = combinedText.split('\n');
                        let potentialNames = [];

                        for (let i = 0; i < lines.length; i++) {
                            const lineStr = lines[i].trim();
                            // Syarat 1: Lebih dari 3 huruf
                            // Syarat 2: KAPITAL SEMUA
                            // Syarat 3: Tidak mengandung angka (kecuali gelar khusus, tapi nama jarang pakai angka)
                            if (lineStr.length > 3 && lineStr === lineStr.toUpperCase() && !/\d/.test(lineStr)) {
                                // Syarat 4: Bukan merupakan kata-kata paten Ijazah
                                if (!/NIM|PROF|DR\.|MEMBERIKAN|UNIVERSITAS|KEMENTERIAN|PROGRAM\s*STUDI|SARJANA|DEKAN|REKTOR|FAKULTAS/i.test(lineStr)) {
                                    potentialNames.push(lineStr);
                                }
                            }
                        }

                        // Ambil nama pertama yang ditemukan setelah "MEMBERIKAN KEPADA" jika memungkinkan, 
                        // atau ambil yang paling valid (biasanya nama adalah baris kapital terpanjang atau pertama).
                        if (potentialNames.length > 0) {
                            extractedNama = potentialNames[0];
                        }
                    }
                    if (extractedNama) setNama(extractedNama);

                    // PRODI
                    let extractedProdi = "";
                    const prodiMatch = combinedText.match(/Program\s*Studi[\s:\-=]+([A-Za-z1-9\s]+?)(?:,|\sFakultas|\n|\sDinyatakan|\sLulus|\sBerdasarkan)/i);
                    if (prodiMatch && prodiMatch[1]) {
                        let tempProdi = prodiMatch[1].trim();
                        // Jika salah tangkap label di bawahnya karena kolom Native PDF
                        if (!/^(Tanggal|Nomor|Tahun|No\.)/i.test(tempProdi)) {
                            extractedProdi = tempProdi;
                        }
                    }

                    // Jika gagal, cari pola nama jurusan umum secara langsung
                    if (!extractedProdi) {
                        const prodiExplicit = combinedText.match(/(TEKNIK\s+INFORMATIKA|SISTEM\s+INFORMASI|ILMU\s+KOMPUTER|TEKNIK\s+KOMPUTER|MANAJEMEN\s+INFORMATIKA)/i);
                        if (prodiExplicit) extractedProdi = prodiExplicit[1];
                    }

                    if (extractedProdi) {
                        // Standarisasi: Hapus awalan 'S1', 'SI', 'Sl' agar seragam menjadi "Teknik Informatika"
                        extractedProdi = extractedProdi.replace(/^(S[1Il]\s+)/i, '').trim();
                        setProgramStudi(extractedProdi);
                    }

                    // IPK
                    // Regex ini kebal terhadap titik dua (:) yang salah terbaca sebagai angka (1) oleh OCR (cth: "13.87" = ": 3.87")
                    const ipkMatch = combinedText.match(/(?:IPK|INDEKS\s*PRESTASI\s*KUMULATIF|INDEKS\s*PRESTASI\s*KOMULATIF|K[ou]mulatif)[\s\S]{1,150}?(?:[:=1]\s*)?([0-4][.,]\d{1,2})\b/i);
                    if (ipkMatch) {
                        setIpk(ipkMatch[1].replace(',', '.'));
                    } else {
                        const rataRataMatch = combinedText.match(/(?:Rata|Semester)[\s\S]{1,150}?(?:[:=1]\s*)?([0-4][.,]\d{1,2})\b/i);
                        if (rataRataMatch) setIpk(rataRataMatch[1].replace(',', '.'));
                    }

                    // NOMOR IJAZAH
                    const noIjazahMatch = combinedText.match(/(?:Nomor|No\.?|Ijazah|PIN)[\s:=-]+([A-Za-z0-9/.\-]+)/i);
                    if (noIjazahMatch && noIjazahMatch[1].toLowerCase() !== 'tahun') {
                        setNoIjazah(noIjazahMatch[1]);
                    } else {
                        const smkMatch = combinedText.match(/(M-[A-Za-z]+\/[A-Za-z0-9\-]+\/\s*\d+)/i);
                        if (smkMatch) setNoIjazah(smkMatch[1]);
                        else {
                            const dnMatch = combinedText.match(/(DN-\d+[\sA-Za-z0-9]+)/i);
                            if (dnMatch) setNoIjazah(dnMatch[1]);
                        }
                    }

                    // PREDIKAT
                    const predikatMatch = combinedText.match(/PREDIKAT\s*KELULUSAN\s*[:\-]\s*([A-Za-z\s]+?)(?:\n|JUDUL)/i) || combinedText.match(/Lulus.*?(?:Dengan\s*Pujian|Sangat\s*Memuaskan|Memuaskan)/i);
                    if (predikatMatch) {
                        const textPredikat = predikatMatch[0].toLowerCase();
                        if (textPredikat.includes("dengan pujian")) setPredikat("Dengan Pujian");
                        else if (textPredikat.includes("sangat memuaskan")) setPredikat("Sangat Memuaskan");
                        else if (textPredikat.includes("memuaskan")) setPredikat("Memuaskan");
                        else if (predikatMatch[1]) setPredikat(predikatMatch[1].trim());
                    }

                    // TANGGAL LULUS
                    const tglLulusMatch = combinedText.match(/Tanggal\s*Kelulusan\s*[:\-]\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i) || combinedText.match(/Pada\s*Tanggal\s*[:\-]?\s*([0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})/i);
                    if (tglLulusMatch && tglLulusMatch[1]) {
                        const parsedDate = parseIndonesianDate(tglLulusMatch[1].trim());
                        if (parsedDate) setTglLulus(parsedDate);
                    }

                    // TOTAL SKS
                    // Mendukung urutan terbalik di Sparse Text (144 muncul sebelum JUMLAH) dan mencegah desimal nyasar (seperti 87 dari 13.87)
                    const sksMatch = combinedText.match(/(?:JUMLAH[\s\S]{1,150}?(?:^|[^\d.])([1-9]\d{1,2})\b(?!\s*[.,])|\b([1-9]\d{1,2})\b\s*(?:\d{2,4}(?:\.\d{1,2})?)?\s*JUMLAH)/i);
                    if (sksMatch) setTotalSks(sksMatch[1] || sksMatch[2]);

                    // TANGGAL CETAK
                    const tglCetakMatch = combinedText.match(/JAKARTA\s*TIMUR,\s*([0-9]{1,2}\s*[A-Za-z]+\s*[0-9]{4})/i);
                    if (tglCetakMatch && tglCetakMatch[1]) {
                        const parsedDate = parseIndonesianDate(tglCetakMatch[1].trim());
                        if (parsedDate) setTglCetak(parsedDate);
                    }

                    setStatusMessage({ success: true, text: "Data berhasil diekstrak otomatis dari dokumen!" });
                    setTimeout(() => setStatusMessage(null), 3500);
                } catch (ocrErr) {
                    console.error("OCR Error:", ocrErr);
                    setStatusMessage({ success: false, text: "Gagal mengekstrak dokumen." });
                } finally {
                    setLoading(false);
                }
            };
            fileReader.readAsArrayBuffer(selectedFile);
        } catch (err) {
            console.error(err);
            setLoading(false);
            setStatusMessage({ success: false, text: "Gagal membaca file PDF." });
        }
    };

    // Handle Form Submit
    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !nim || !recipientWallet) return alert("Mohon lengkapi form dan unggah file PDF.");

        try {
            setLoading(true);

            let finalFileToUpload: File = file;
            let uppercaseHash = "";
            let attributes: any[] = [];
            let desc = "";

            if (docType === 'SKPI') {
                setStatusMessage({ success: true, text: "Memproses penggabungan dokumen SKPI secara lokal..." });
                const { PDFDocument } = await import('pdf-lib');
                
                // Load the main document
                const mainPdfBytes = await file.arrayBuffer();
                const mergedPdf = await PDFDocument.load(mainPdfBytes);

                const processedCapaian = [];
                for (let i = 0; i < capaianList.length; i++) {
                    const item = capaianList[i];
                    if (item.file) {
                        setStatusMessage({ success: true, text: `Menggabungkan sertifikat baris ke-${i + 1} [${item.kegiatan}]...` });
                        const attachmentBytes = await item.file.arrayBuffer();
                        const attachmentPdf = await PDFDocument.load(attachmentBytes);
                        
                        const copiedPages = await mergedPdf.copyPages(attachmentPdf, attachmentPdf.getPageIndices());
                        copiedPages.forEach((page) => mergedPdf.addPage(page));
                    }
                    processedCapaian.push({
                        kegiatan: item.kegiatan,
                        penyelenggara: item.penyelenggara,
                        tingkat: item.tingkat,
                        // evidenceURI dihilangkan karena file sudah tergabung ke dalam PDF utama
                    });
                }
                
                const mergedPdfBytes = await mergedPdf.save();
                finalFileToUpload = new File([mergedPdfBytes as any], `Merged_SKPI_${nim}.pdf`, { type: 'application/pdf' });
                
                setStatusMessage({ success: true, text: "Menghitung Kriptografi Hash dari dokumen gabungan..." });
                const pdfHash = await generateHash(finalFileToUpload);
                uppercaseHash = pdfHash.toUpperCase();

                desc = "Surat Keterangan Pendamping Ijazah Terverifikasi Blockchain.";
                attributes = [
                    { trait_type: "Kategori Dokumen", value: "SKPI" },
                    { trait_type: "NIM", value: nim },
                    { trait_type: "Detail Capaian", value: processedCapaian },
                    { trait_type: "SHA256_Hash", value: uppercaseHash }
                ];

            } else {
                setStatusMessage({ success: true, text: "Menghitung Kriptografi Hash dokumen..." });
                const pdfHash = await generateHash(file);
                uppercaseHash = pdfHash.toUpperCase();

                if (docType === 'Ijazah') {
                    desc = "Ijazah Sarjana Terverifikasi Blockchain.";
                    attributes = [
                        { trait_type: "NIM", value: nim },
                        { trait_type: "Nama Lengkap", value: nama },
                        { trait_type: "Program Studi", value: programStudi },
                        { trait_type: "No. Ijazah Nasional", value: noIjazah },
                        { trait_type: "Predikat Kelulusan", value: predikat },
                        { trait_type: "Tanggal Lulus", value: tglLulus },
                        { trait_type: "SHA256_Hash", value: uppercaseHash }
                    ];
                } else if (docType === 'Transkrip Nilai') {
                    desc = "Transkrip Nilai Akademik Terverifikasi Blockchain.";
                    attributes = [
                        { trait_type: "NIM", value: nim },
                        { trait_type: "Nama Lengkap", value: nama },
                        { trait_type: "Program Studi", value: programStudi },
                        { trait_type: "IPK Kumulatif", value: ipk },
                        { trait_type: "Total SKS Kumulatif", value: totalSks },
                        { trait_type: "Tanggal Cetak", value: tglCetak },
                        { trait_type: "SHA256_Hash", value: uppercaseHash }
                    ];
                }
            }

            const metadataJSON = {
                name: `${docType} Digital - ${nama}`,
                description: desc,
                attributes: attributes
            };

            setStatusMessage({ success: true, text: "Mendaftarkan manifes metadata akhir dokumen ke IPFS..." });
            const formData = new FormData();
            formData.append("file", finalFileToUpload);
            formData.append("metadata", JSON.stringify(metadataJSON));

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Gagal mengunggah ke IPFS Pinata");

            const realJsonURI = data.jsonURI;

            setStatusMessage({ success: true, text: "Menunggu tanda tangan otorisasi kontrak pintar pimpinan..." });

            const gasOverrides = {
                maxPriorityFeePerGas: ethers.utils.parseUnits("35", "gwei"),
                maxFeePerGas: ethers.utils.parseUnits("60", "gwei")
            };

            const provider = new ethers.providers.Web3Provider((window as any).ethereum);
            const contract = getContractInstance(provider.getSigner());
            const tx = await contract.proposeDokumen(recipientWallet, uppercaseHash, realJsonURI, docType, gasOverrides);
            await tx.wait();

            setStatusMessage({ success: true, text: `Usulan dokumen ${docType} berhasil didaftarkan ke jaringan.` });
            setFile(null);
            setNim('');
            setNoIjazah('');
            setTglLulus('');
            setIpk('');
            setTotalSks('');
            setTglCetak('');
            setCapaianList([{ kegiatan: '', penyelenggara: '', tingkat: 'Nasional', file: null }]);

            // Reload table
            await loadAllBlockchainProposals(contract);
        } catch (err: any) {
            console.error("Error Detail:", err);
            
            // Ekstrak pesan error dari berbagai kemungkinan format MetaMask/Ethers
            let errorMsg = err.reason || err.message;
            if (err.info && err.info.error && err.info.error.message) {
                errorMsg = err.info.error.message; // Ethers v5 kadangkala menyimpan di sini
            } else if (err.error && err.error.message) {
                errorMsg = err.error.message;
            } else if (err.data && err.data.message) {
                errorMsg = err.data.message;
            }

            // Tangkap Custom Error dari Smart Contract
            const errString = String(errorMsg) + " " + JSON.stringify(err);
            if (errString.includes("HashAlreadyRegistered") || errString.includes("0x12a0f8e1")) { // 0x12a0f8e1 adalah selector dari HashAlreadyRegistered()
                errorMsg = "Dokumen PDF ini SUDAH PERNAH didaftarkan (Duplikat Hash Kriptografi). Harap gunakan dokumen baru.";
            }

            setStatusMessage({ success: false, text: errorMsg || "Transaksi dibatalkan atau gagal." });
            alert("Gagal Mengajukan Dokumen:\n\n" + (errorMsg || JSON.stringify(err)));
        } finally {
            setLoading(false);
        }
    };

    // Filter khusus pelacakan usulan untuk Staf Akademik
    const stafFilteredProposals = proposalsList.filter(item => {
        const student = getStudentByAddress(item.recipient);
        const searchStr = `${item.recipient} ${student?.nim || ''} ${item.docType}`.toLowerCase();
        return searchStr.includes(stafSearchQuery.toLowerCase());
    });

    return (
        <div className="w-full max-w-4xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl relative">
            <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-5">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Formulir Pengajuan Berkas</h2>
                <p className="text-slate-600 dark:text-slate-400 text-base mt-1">Registrasi metadata dan sinkronisasi Hash PDF ke IPFS</p>
            </div>

            {statusMessage && (
                <div className={`mb-6 p-4 rounded-lg text-lg border ${statusMessage.success ? 'bg-emerald-100 dark:bg-emerald-900/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-400' : 'bg-red-900/20 border-red-500/50 text-red-700 dark:text-red-400'}`}>
                    {statusMessage.text}
                </div>
            )}

            <form className="space-y-6" onSubmit={handleStaffSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Kategori Dokumen</label>
                        <select value={docType} onChange={(e) => setDocType(e.target.value)} className={inputBaseClass} required>
                            <option value="" disabled>-- Pilih Kategori --</option>
                            <option value="Ijazah">Ijazah Sarjana</option>
                            <option value="Transkrip Nilai">Transkrip Nilai</option>
                            <option value="SKPI">SKPI</option>
                        </select>
                    </div>
                    <div>
                        <label className={labelClass}>NIM Mahasiswa</label>
                        <input type="text" required value={nim} onChange={(e) => setNim(e.target.value)} className={inputBaseClass} placeholder="Ketik NIM..." />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className={labelClass}>Nama Lengkap (Otomatis dari PDF)</label>
                        <input type="text" required value={nama} onChange={(e) => setNama(e.target.value)} className={inputBaseClass} />
                    </div>
                    <div>
                        <label className={labelClass}>Program Studi (Otomatis dari PDF)</label>
                        <input type="text" required value={programStudi} onChange={(e) => setProgramStudi(e.target.value)} className={inputBaseClass} />
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Alamat Dompet Penerima (Wallet Address)</label>
                    <input type="text" disabled value={recipientWallet} className={inputBaseClass + " font-mono text-base opacity-75"} />
                </div>

                {/* FORMS: IJAZAH */}
                {docType === 'Ijazah' && (
                    <div className="p-5 bg-slate-100 dark:bg-[#111827] border border-slate-300 dark:border-slate-700/50 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className={labelClass}>No. Ijazah Nasional</label>
                            <input type="text" placeholder="Contoh: 12312/uni/2026" required value={noIjazah} onChange={(e) => setNoIjazah(e.target.value)} className={inputBaseClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Predikat Kelulusan</label>
                            <select value={predikat} onChange={(e) => setPredikat(e.target.value)} className={inputBaseClass} required>
                                <option value="" disabled>-- Pilih --</option>
                                <option value="Dengan Pujian">Dengan Pujian</option>
                                <option value="Sangat Memuaskan">Sangat Memuaskan</option>
                                <option value="Memuaskan">Memuaskan</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Tanggal Lulus</label>
                            <input type="date" required value={tglLulus} onChange={(e) => setTglLulus(e.target.value)} className={inputBaseClass} />
                        </div>
                    </div>
                )}

                {/* FORMS: TRANSKRIP NILAI */}
                {docType === 'Transkrip Nilai' && (
                    <div className="p-5 bg-slate-100 dark:bg-[#111827] border border-slate-300 dark:border-slate-700/50 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-5">
                        <div>
                            <label className={labelClass}>IPK Kumulatif</label>
                            <input type="number" step="0.01" min="0.00" max="4.00" placeholder="Contoh: 3.86" required value={ipk} onChange={(e) => setIpk(e.target.value)} className={inputBaseClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Total SKS Kumulatif</label>
                            <input type="number" placeholder="Contoh: 144" required value={totalSks} onChange={(e) => setTotalSks(e.target.value)} className={inputBaseClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Tanggal Cetak</label>
                            <input type="date" required value={tglCetak} onChange={(e) => setTglCetak(e.target.value)} className={inputBaseClass} />
                        </div>
                    </div>
                )}

                {/* FORMS: SKPI */}
                {docType === 'SKPI' && (
                    <div className="p-5 bg-slate-100 dark:bg-[#111827] border border-slate-300 dark:border-slate-700/50 rounded-xl space-y-5">
                        <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
                            <label className="block font-bold text-slate-700 dark:text-slate-300 text-base uppercase tracking-wider">Rekam Capaian Prestasi</label>
                            <button type="button" onClick={addCapaianRow} className="text-base bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-600 border border-blue-500/50 text-blue-700 dark:text-blue-400 hover:text-white font-semibold px-4 py-2 rounded-lg transition-all shadow-sm">
                                + Tambah Kegiatan
                            </button>
                        </div>
                        <div className="space-y-4">
                            {capaianList.map((row, idx) => (
                                <div key={idx} className="bg-slate-200 dark:bg-[#1e293b]/50 p-5 rounded-xl border border-slate-300 dark:border-slate-700 relative space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-700/50 pb-2">
                                        <span className="text-base font-bold text-slate-600 dark:text-slate-400">Kegiatan #{idx + 1}</span>
                                        {capaianList.length > 1 && (
                                            <button type="button" onClick={() => removeCapaianRow(idx)} className="text-sm font-bold text-red-700 dark:text-red-400 hover:text-white bg-red-100 dark:bg-red-900/30 hover:bg-red-600 border border-red-500/30 px-3 py-1 rounded transition-colors">
                                                ✕ Hapus Baris
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wide font-bold mb-1.5">Nama Kegiatan</label>
                                            <input type="text" placeholder="Contoh — Magang UI/UX" value={row.kegiatan} onChange={(e) => handleCapaianChange(idx, 'kegiatan', e.target.value)} className={inputBaseClass} required />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wide font-bold mb-1.5">Penyelenggara</label>
                                            <input type="text" placeholder="Contoh — Startup Campus" value={row.penyelenggara} onChange={(e) => handleCapaianChange(idx, 'penyelenggara', e.target.value)} className={inputBaseClass} required />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wide font-bold mb-1.5">Tingkat</label>
                                            <select value={row.tingkat} onChange={(e) => handleCapaianChange(idx, 'tingkat', e.target.value)} className={inputBaseClass}>
                                                <option value="Lokal">Lokal / Kampus</option>
                                                <option value="Nasional">Nasional</option>
                                                <option value="Internasional">Internasional</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-[#0f172a] p-3 rounded-lg border border-dashed border-slate-600">
                                        <label className="block text-sm text-slate-600 dark:text-slate-400 uppercase tracking-wide font-bold mb-2">File Bukti Sertifikat (PDF)</label>
                                        <input type="file" accept=".pdf" required={!row.evidenceURI} onChange={(e) => handleCapaianChange(idx, 'file', e.target.files?.[0] || null)} className="w-full text-base text-slate-700 dark:text-slate-300 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-base file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-500 transition-all cursor-pointer" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div>
                    <label className={labelClass}>File Dokumen Fisik Utama (PDF)</label>
                    <div className="bg-slate-100 dark:bg-[#111827] border border-slate-300 dark:border-slate-700/50 p-4 rounded-xl">
                        <input type="file" accept=".pdf" required onChange={handleFileChange} className="w-full text-lg text-slate-700 dark:text-slate-300 file:mr-4 file:py-2 file:px-5 file:rounded-lg file:border-0 file:text-lg file:font-bold file:bg-slate-200 dark:bg-[#1e293b] file:text-slate-800 dark:text-slate-200 hover:file:bg-slate-700 transition-all cursor-pointer" />
                    </div>
                </div>

                <button type="submit" disabled={loading} className="w-full mt-4 bg-blue-600 text-white font-bold py-3.5 rounded-xl text-lg transition-all hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] active:scale-[0.99] disabled:bg-slate-700 disabled:shadow-none disabled:text-slate-600 dark:text-slate-400">
                    {loading ? 'Memproses Kriptografi...' : `Ajukan Penerbitan ${docType}`}
                </button>
            </form>

            {/* TABEL MONITORING STAF AKADEMIK */}
            <div className="mt-16 border-t border-slate-200 dark:border-slate-800 pt-10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight mb-2">Pelacakan Status Usulan Saya</h2>
                <p className="text-slate-600 dark:text-slate-400 text-base mb-6">Pantau transisi persetujuan dokumen akademik yang telah diajukan.</p>

                <input
                    type="text"
                    placeholder="Cari NIM atau Wallet Mahasiswa..."
                    value={stafSearchQuery}
                    onChange={(e) => setStafSearchQuery(e.target.value)}
                    className={inputBaseClass + " mb-6"}
                />

                <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                    {stafFilteredProposals.length > 0 ? stafFilteredProposals.map((item) => {
                        const student = getStudentByAddress(item.recipient);
                        return (
                            <div key={item.id} className="bg-slate-100 dark:bg-[#111827] p-5 rounded-xl border border-slate-300 dark:border-slate-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-base font-mono text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-[#1e293b] px-2 py-0.5 rounded">#{item.id}</span>
                                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{item.docType}</h3>
                                    </div>
                                    <p className="text-base text-slate-600 dark:text-slate-400 font-mono mt-1">{student ? `${student.nim} - ${student.nama}` : `${item.recipient.substring(0, 16)}...`}</p>
                                </div>
                                <div className="text-base px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-[#0b0f19]">
                                    {getStatusBadge(item)}
                                </div>
                            </div>
                        )
                    }) : (
                        <div className="text-center py-8 text-slate-700 dark:text-slate-300 text-lg">Tidak ada usulan yang ditemukan.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
