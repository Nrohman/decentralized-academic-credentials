import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "File bukti diperlukan" }, { status: 400 });
        }

        const apiKey = process.env.API_KEY_PINATA;
        const apiSecret = process.env.API_SECRET_PINATA;

        if (!apiKey || !apiSecret) {
            return NextResponse.json({ error: "Kunci API Pinata belum dipasang di .env.local" }, { status: 500 });
        }

        const pinataHeaders = {
            "pinata_api_key": apiKey,
            "pinata_secret_api_key": apiSecret,
        };

        const arrayBuffer = await file.arrayBuffer();
        const blob = new Blob([arrayBuffer], { type: file.type });

        const fileFormData = new FormData();
        fileFormData.append('file', blob, file.name || "bukti_revoke.pdf");

        const fileRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: pinataHeaders,
            body: fileFormData,
        });

        if (!fileRes.ok) {
            const errorText = await fileRes.text();
            throw new Error(`(Upload Bukti Gagal): ${errorText}`);
        }

        const fileData = await fileRes.json();

        // Mengembalikan URI murni berformat pointer IPFS file PDF
        return NextResponse.json({
            success: true,
            evidenceURI: `ipfs://${fileData.IpfsHash}`
        });

    } catch (error: any) {
        console.error("API Upload Evidence Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
