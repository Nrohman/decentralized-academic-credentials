import { ethers } from 'ethers';
import { sha256 } from 'js-sha256';

/**
 * Mengubah biner file PDF menjadi hash SHA-256 unik (Kondisi Awal Kamu)
 */
export const generateHash = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (e.target?.result) {
                const hash = sha256(e.target.result as ArrayBuffer);
                resolve(hash);
            }
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * GENERATOR OTOMATIS: Menurunkan kunci dompet secara matematika berdasarkan NIM
 * Tanpa perlu disimpan ke database mana pun (Stateless Custodial Wallet)
 */
export const generateCustodialWallet = (nim: string) => {
    if (!nim) return { address: "" };

    // Kunci pengaman internal kampus (Salt) - sekarang diamankan via process.env
    const MASTER_SECRET_CAMPUS = process.env.MASTER_SECRET_CAMPUS || "UNKRIS_ACADEMIC_BLOCKCHAIN_SECRET_PEPPER_2026";

    // Melakukan hashing campuran antara Master Secret dan NIM mahasiswa
    const derivedPrivateKey = ethers.utils.solidityKeccak256(
        ["string", "string"],
        [MASTER_SECRET_CAMPUS, nim]
    );

    // Instansiasi objek wallet di memori RAM browser
    const custodialWallet = new ethers.Wallet(derivedPrivateKey);

    return {
        address: custodialWallet.address,
    };
};