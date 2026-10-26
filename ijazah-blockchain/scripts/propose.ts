import { ethers } from "hardhat";

async function main() {
    // Mengambil akun pertama (Index 0) sebagai STAF AKADEMIK
    const [staf] = await ethers.getSigners();

    // Mengambil alamat kontrak dari environment variable (.env)
    const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x5f174C3759bAcba152A74b5B21F70b49994F5c06";

    // Hubungkan ke nama kontrak yang bener: "DokumenAkademik"
    const dokumenContract = await ethers.getContractAt("DokumenAkademik", contractAddress);

    const mhsAddress = "0x4Aa4F042898237418EdF9836D0fb545e68FDAb43";
    const pdfHash = "6F90E53CFF33A5C7007A567E071444604D2729D7946437A1533458B81A2925C7";
    const jsonURI = "ipfs://bafkreiflgoeondwq3rfp4725fsryoa5f55rcgdif4tyr422tw2p6nptnbu";

    console.log("-----------------------------------------------");
    console.log("Aksi — STAF AKADEMIK melakukan inisiasi draf proposal berkas...");
    console.log("Wallet Staf —", staf.address);

    // Memanggil fungsi proposeDokumen dengan parameter tipe dokumen di bagian akhir
    const tx = await dokumenContract.connect(staf).proposeDokumen(
        mhsAddress,
        pdfHash,
        jsonURI,
        "Ijazah"
    );

    const receipt = await tx.wait();

    console.log("HASIL — Proposal draf dokumen berhasil dijangkarkan ke blockchain!");
    if (receipt && receipt.logs) {
        console.log("Transaksi sukses terkonfirmasi pada block —", receipt.blockNumber);
        console.log("Status dokumen saat ini — Pending Dekan");
    }
    console.log("-----------------------------------------------");
}

main().catch(console.error);