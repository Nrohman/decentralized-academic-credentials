import { NextResponse } from 'next/server';
import pinataSDK from '@pinata/sdk';
import { Readable } from 'stream';

// Inisialisasi Pinata SDK
const pinata = new pinataSDK(
    process.env.API_KEY_PINATA,
    process.env.API_SECRET_PINATA
);

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const metadataString = formData.get('metadata') as string;

        if (!file || !metadataString) {
            return NextResponse.json({ error: "File PDF dan metadata tidak ditemukan." }, { status: 400 });
        }

        // =========================================================
        // FASE 1: Upload File PDF ke IPFS
        // =========================================================
        console.log("Mencoba upload PDF ke Pinata via SDK...");

        // Konversi File ke stream agar bisa dibaca SDK
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const stream = Readable.from(buffer);

        const fileOptions = {
            pinataMetadata: {
                name: file.name || "dokumen.pdf"
            }
        };

        const fileResult = await pinata.pinFileToIPFS(stream, fileOptions);
        const pdfCID = fileResult.IpfsHash;
        console.log("PDF Berhasil di-pin! CID:", pdfCID);

        // =========================================================
        // FASE 2: Merakit Metadata (Include CID PDF)
        // =========================================================
        const metadata = JSON.parse(metadataString);

        // Pastikan gateway sesuai env atau fallback ke pinata default
        let gateway = process.env.PINATA_GATEWAY || "https://peach-chemical-hoverfly-201.mypinata.cloud";
        if (!gateway.startsWith("http")) gateway = `https://${gateway}`;

        metadata.image = `ipfs://${pdfCID}`;
        metadata.document_url = `${gateway}/ipfs/${pdfCID}`;

        // =========================================================
        // FASE 3: Upload JSON Metadata ke IPFS
        // =========================================================
        console.log("Mencoba upload JSON ke Pinata via SDK...");

        const jsonResult = await pinata.pinJSONToIPFS(metadata, {
            pinataMetadata: { name: `Meta_${file.name}.json` }
        });
        const jsonCID = jsonResult.IpfsHash;
        console.log("JSON Berhasil di-pin! CID:", jsonCID);

        return NextResponse.json({
            success: true,
            jsonURI: `ipfs://${jsonCID}`,
            pdfURI: `ipfs://${pdfCID}`
        });

    } catch (error: any) {
        console.error("API Upload Fatal Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}