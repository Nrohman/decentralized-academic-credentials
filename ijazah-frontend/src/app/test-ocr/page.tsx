'use client';
import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { UploadCloud, CheckCircle, FileText, AlertCircle, Loader2 } from 'lucide-react';

// pdfjsLib di-import secara dinamis di dalam fungsi untuk mencegah error SSR DOMMatrix

export default function TestOCR() {
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState<{ status: string; pct: number }>({ status: '', pct: 0 });
    const [rawText, setRawText] = useState('');
    const [nativeText, setNativeText] = useState('');
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [extractedData, setExtractedData] = useState({
        ipk: '',
        noIjazah: ''
    });

    const processOCR = async (selectedFile: File) => {
        try {
            setLoading(true);
            setRawText('');
            setNativeText('');
            setExtractedData({ ipk: '', noIjazah: '' });
            setImagePreviews([]);
            setProgress({ status: "Inisialisasi PDF...", pct: 5 });

            const fileReader = new FileReader();
            fileReader.onload = async function() {
                try {
                    // DYNAMIC IMPORT UNTUK MENCEGAH SSR ERROR
                    const pdfjsLib = await import('pdfjs-dist');
                    if (typeof window !== 'undefined' && 'Worker' in window && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
                    }

                    const typedarray = new Uint8Array(this.result as ArrayBuffer);
                    const pdf = await pdfjsLib.getDocument({ data: typedarray }).promise;
                    const numPages = pdf.numPages;
                    const maxPages = Math.min(numPages, 3);
                    
                    let allOcrText = "";
                    let allNativeText = "";
                    let previews = [];

                    setProgress({ status: "Menyiapkan Tesseract Engine...", pct: 10 });
                    const worker = await Tesseract.createWorker('ind');

                    for (let i = 1; i <= maxPages; i++) {
                        setProgress({ status: `Memindai Halaman ${i} dari ${maxPages}...`, pct: 10 + ((i - 1) / maxPages) * 80 });
                        const page = await pdf.getPage(i);
                        
                        // 1. Ekstraksi Teks Asli (Native PDF) - Sangat Cepat & Akurat jika PDF digital
                        const textContent = await page.getTextContent();
                        const pageNativeText = textContent.items.map((item: any) => item.str).join(' ');
                        allNativeText += `\n--- HALAMAN ${i} ---\n` + pageNativeText;

                        // 2. OCR (Tesseract) - Untuk PDF hasil scan/foto
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
                        previews.push(dataUrl);
                        setImagePreviews([...previews]);

                        const { data: { text } } = await worker.recognize(dataUrl);
                        allOcrText += `\n--- HALAMAN ${i} ---\n` + text;
                    }

                    setProgress({ status: "Menganalisis data...", pct: 95 });
                    await worker.terminate();
                    setRawText(allOcrText);
                    setNativeText(allNativeText);

                    // Gabungkan teks asli dan teks OCR untuk pencarian
                    const combinedText = allNativeText + "\n" + allOcrText;

                    let foundIpk = '';
                    let foundNoIjazah = '';

                    // REGEX SUPER FLEKSIBEL (IPK)
                    // Cari kata kunci IPK / Prestasi / Kumulatif / Rata-rata di dekat angka desimal
                    const ipkMatch = combinedText.match(/(?:IPK|Prestasi|K[ou]mulatif|K[ou]mulative|Indeks).*?([0-4][.,]\d{1,2})/i);
                    if (ipkMatch) {
                        foundIpk = ipkMatch[1].replace(',', '.');
                    } else {
                        // Coba format SMK (Rata-rata: 80.50)
                        const rataRataMatch = combinedText.match(/(?:Rata|Semester).*?([0-9]{2}[.,][0-9]{2})/i);
                        if (rataRataMatch) foundIpk = rataRataMatch[1].replace(',', '.');
                    }

                    // REGEX SUPER FLEKSIBEL (Nomor Ijazah)
                    // Cari kata kunci Nomor / Ijazah / PIN, pastikan yang ditangkap bukan kata "Tahun"
                    const noIjazahMatch = combinedText.match(/(?:Nomor|No\.?|Ijazah|PIN)[\s:=-]+([A-Za-z0-9/\-]+)/i);
                    if (noIjazahMatch && noIjazahMatch[1].toLowerCase() !== 'tahun') {
                        foundNoIjazah = noIjazahMatch[1];
                    } else {
                        // Coba temukan format langsung tanpa label
                        const smkMatch = combinedText.match(/(M-[A-Za-z]+\/[A-Za-z0-9\-]+\/\s*\d+)/i);
                        if (smkMatch) foundNoIjazah = smkMatch[1];
                        else {
                            const dnMatch = combinedText.match(/(DN-\d+[\sA-Za-z0-9]+)/i);
                            if (dnMatch) foundNoIjazah = dnMatch[1];
                        }
                    }

                    setExtractedData({
                        ipk: foundIpk || 'Tidak terdeteksi',
                        noIjazah: foundNoIjazah || 'Tidak terdeteksi'
                    });

                    setProgress({ status: "Selesai!", pct: 100 });
                } catch (err: any) {
                    console.error("Error:", err);
                    setProgress({ status: "Error: " + (err.message || "Gagal proses PDF"), pct: 0 });
                } finally {
                    setLoading(false);
                }
            };
            fileReader.readAsArrayBuffer(selectedFile);

        } catch (err) {
            console.error(err);
            setProgress({ status: "Error reading file.", pct: 0 });
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null;
        setFile(selectedFile);
        if (selectedFile) {
            processOCR(selectedFile);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1c] text-slate-200 p-4 md:p-10 font-sans selection:bg-blue-500/30">
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full mix-blend-screen" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full mix-blend-screen" />
            </div>

            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                        Advanced OCR Diagnostics
                    </h1>
                    <p className="text-slate-400 text-lg max-w-2xl mx-auto">
                        Evaluasi dan uji coba pemindaian dokumen cerdas untuk Ijazah dan Transkrip Nilai (Otomatis memindai hingga 3 halaman).
                    </p>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl mb-10 transition-all hover:border-slate-700">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-blue-500/50 transition-colors rounded-2xl p-10 cursor-pointer relative overflow-hidden group">
                        <input 
                            type="file" 
                            accept=".pdf" 
                            onChange={handleFileChange} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            disabled={loading}
                        />
                        
                        <div className="flex flex-col items-center z-10 pointer-events-none group-hover:scale-105 transition-transform duration-300">
                            {loading ? (
                                <Loader2 className="w-16 h-16 text-blue-400 animate-spin mb-4" />
                            ) : (
                                <UploadCloud className="w-16 h-16 text-slate-500 group-hover:text-blue-400 transition-colors mb-4" />
                            )}
                            <h3 className="text-xl font-bold text-slate-200 mb-2">
                                {file ? file.name : "Unggah Dokumen PDF"}
                            </h3>
                            <p className="text-slate-500 text-sm">Klik atau seret file ke area ini (Maks 3 halaman pertama dipindai)</p>
                        </div>

                        {loading && (
                            <div className="absolute bottom-0 left-0 h-1.5 bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${progress.pct}%` }} />
                        )}
                    </div>

                    {progress.status && (
                        <div className="mt-6 flex items-center justify-center gap-2 text-sm font-medium">
                            <span className={progress.pct === 100 ? 'text-emerald-400' : 'text-blue-400'}>
                                {progress.pct === 100 ? <CheckCircle className="w-4 h-4 inline mr-2"/> : <Loader2 className="w-4 h-4 animate-spin inline mr-2"/>}
                                {progress.status}
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500" />
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <FileText className="text-emerald-400" /> Hasil Ekstraksi
                            </h2>
                            
                            <div className="space-y-6">
                                <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                        IPK / Rata-rata Nilai
                                    </label>
                                    <div className={`text-2xl font-mono ${extractedData.ipk === 'Tidak terdeteksi' ? 'text-slate-600' : 'text-white'}`}>
                                        {extractedData.ipk || '-'}
                                    </div>
                                </div>
                                
                                <div className="bg-slate-950/50 p-5 rounded-2xl border border-slate-800/50">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">
                                        Nomor Ijazah
                                    </label>
                                    <div className={`text-lg font-mono break-all ${extractedData.noIjazah === 'Tidak terdeteksi' ? 'text-slate-600' : 'text-white'}`}>
                                        {extractedData.noIjazah || '-'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {imagePreviews.length > 0 && (
                            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-3xl shadow-2xl">
                                <h2 className="text-lg font-bold mb-4 text-slate-300">Scan Halaman ({imagePreviews.length})</h2>
                                <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                    {imagePreviews.map((src, idx) => (
                                        <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-700">
                                            <div className="absolute top-2 left-2 bg-black/70 text-xs px-2 py-1 rounded-md backdrop-blur-md">
                                                Hal {idx + 1}
                                            </div>
                                            <img src={src} alt={`Page ${idx + 1}`} className="w-full h-auto opacity-80 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-8">
                        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl h-full flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    <AlertCircle className="text-blue-400" /> Log Ekstraksi Teks
                                </h2>
                            </div>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                Fitur baru: Sistem sekarang mengekstrak teks asli PDF (Digital) dan OCR (Scan). Keduanya digabungkan untuk memastikan akurasi 100%.
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-grow">
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 mb-2 uppercase">Native PDF Text (100% Akurat)</label>
                                    <div className="flex-grow bg-[#050810] rounded-2xl border border-slate-800 p-1 relative overflow-hidden h-[400px]">
                                        <textarea 
                                            value={nativeText} 
                                            readOnly 
                                            className="w-full h-full bg-transparent text-emerald-400/90 font-mono text-sm p-5 resize-none focus:outline-none custom-scrollbar"
                                            placeholder="Teks digital asli..."
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col">
                                    <label className="text-xs font-bold text-slate-500 mb-2 uppercase">Tesseract OCR Text (Utk Dokumen Scan)</label>
                                    <div className="flex-grow bg-[#050810] rounded-2xl border border-slate-800 p-1 relative overflow-hidden h-[400px]">
                                        <textarea 
                                            value={rawText} 
                                            readOnly 
                                            className="w-full h-full bg-transparent text-indigo-400/90 font-mono text-sm p-5 resize-none focus:outline-none custom-scrollbar"
                                            placeholder="Teks hasil scan OCR..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{__html: `
                .custom-scrollbar::-webkit-scrollbar { width: 8px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
            `}} />
        </div>
    );
}
