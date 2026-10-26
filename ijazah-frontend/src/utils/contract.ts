import { ethers } from "ethers";
import contractArtifact from "../constants/abi.json";

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x5f174C3759bAcba152A74b5B21F70b49994F5c06";

export const getContractInstance = (providerOrSigner: ethers.providers.Provider | ethers.Signer): ethers.Contract => {
    // 1. Validasi alamat kontrak
    if (!contractAddress || !ethers.utils.isAddress(contractAddress)) {
        throw new Error("Alamat smart contract tidak valid atau kosong di .env.local");
    }

    // 2. Ekstrak properti .abi jika berupa full artifact Hardhat,
    // jika file JSON-nya sudah berupa array murni, gunakan langsung variabelnya.
    const cleanAbi = (contractArtifact as any).abi ? (contractArtifact as any).abi : contractArtifact;

    // 3. Kembalikan instansiasi objek kontrak dengan ABI yang sudah bersih (berupa Array)
    return new ethers.Contract(contractAddress, cleanAbi, providerOrSigner);
};
