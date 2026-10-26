import { ethers } from "hardhat";

async function main() {
    // Mengambil akun ketiga (Index 2) dari konfigurasi local/testnet sebagai REKTOR
    const [, , rektor] = await ethers.getSigners();

    // Mengambil alamat kontrak dari environment variable (.env)
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x5f174C3759bAcba152A74b5B21F70b49994F5c06";

    // Hubungkan ke nama kontrak yang bener: "DokumenAkademik"
    const dokumenContract = await ethers.getContractAt("DokumenAkademik", contractAddress);

    // Tentukan ID Proposal yang mau dieksekusi cetak nft
    const proposalId = 1;

    console.log("-----------------------------------------------");
    console.log("Aksi — REKTOR UNIVERSITAS sedang memverifikasi dan mencetak dokumen...");
    console.log("Wallet Rektor —", rektor.address);

    // Memanggil nama fungsi cetak baru: rektorApproveAndMint
    const tx = await dokumenContract.connect(rektor).rektorApproveAndMint(proposalId);

    console.log("Menunggu validasi Rektor masuk ke konsensus blok...");
    await tx.wait();

    console.log("MANTAP! Dokumen akademik resmi disahkan dan dicetak (Minted) secara permanen.");
    console.log("Silakan lakukan inspeksi drag-and-drop file PDF asli pada portal publik!");
    console.log("-----------------------------------------------");
}

main().catch(console.error);