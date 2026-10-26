import { ethers } from "hardhat";

async function main() {
    const [stafSigner] = await ethers.getSigners();
    const creatorAddress = stafSigner.address;
    console.log("Deployer (Staf) Address:", creatorAddress);

    // Dekan dan Rektor dari deploy_SSGA.ts
    const dekanAddress = "0xc462c8a54cB405F4C607Be2A526C80Ec31533bAf";
    const rektorAddress = "0x2bF0AEF72745c30E96E06f2D0D91D0F12f1a0F2D";

    console.log("Dekan Address:", dekanAddress);
    console.log("Rektor Address:", rektorAddress);

    // Melakukan ABI-encoding
    const abiCoder = new ethers.utils.AbiCoder();
    const encoded = abiCoder.encode(
        ["address", "address", "address"],
        [creatorAddress, dekanAddress, rektorAddress]
    );

    // Hapus prefix '0x' jika ada
    const cleanEncoded = encoded.startsWith("0x") ? encoded.slice(2) : encoded;

    console.log("\n=====================================================================");
    console.log("CONSTRUCTOR ARGUMENTS (ABI-ENCODED):");
    console.log("=====================================================================");
    console.log(cleanEncoded);
    console.log("=====================================================================\n");
}

main().catch(console.error);
