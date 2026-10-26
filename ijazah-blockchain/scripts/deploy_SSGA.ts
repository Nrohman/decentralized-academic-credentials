import { ethers } from "hardhat";

async function main() {
    // Akun pertama (Index 0) otomatis menjadi Staf Akademik (Deployer)
    const [stafSigner] = await ethers.getSigners();
    console.log("----------------------------------------------");
    console.log("Deploying kontrak menggunakan dompet Staf Akademik:", stafSigner.address);

    const stafAddr = stafSigner.address;

    // Salin alamat dompet simulasi MetaMask lu di sini saat pengujian jaringan
    const dekanAddr = "0xc462c8a54cB405F4C607Be2A526C80Ec31533bAf";
    const rektorAddr = "0x2bF0AEF72745c30E96E06f2D0D91D0F12f1a0F2D";

    // Memanggil nama Blueprint kontrak yang baru
    const DokumenFactory = await ethers.getContractFactory("DokumenAkademik");

    console.log("Proses deployment sedang disiarkan ke jaringan...");

    // Mengirimkan 3 alamat pimpinan sesuai urutan Constructor Solidity terbaru
    const dokumen = await DokumenFactory.deploy(stafAddr, dekanAddr, rektorAddr);

    // Menunggu transaksi sukses di Hardhat/Ethers v5
    await dokumen.deployed();

    console.log("----------------------------------------------");
    console.log("DEPLOIMENT BERHASIL!");
    console.log("Alamat Kontrak Baru —", dokumen.address);
    console.log("----------------------------------------------");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});