import abiData from './abi.json';

// Pastikan alamat deploy contract terbaru kamu dimasukkan di sini, memprioritaskan environment variable
export const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x815B381b5aD76fBea383546308473DcBD9b75f10";

// WAJIB Menggunakan abiData.abi agar Ethers membaca format array di dalamnya
export const CONTRACT_ABI = abiData.abi;