import { ethers } from "hardhat";

async function main() {
    const contractAddress = "0x9c1547cedc6CF8cf7678d0698575E3d9820b160b";
    const provider = ethers.provider;

    console.log("Checking contract code on Polygon Amoy...");
    try {
        const code = await provider.getCode(contractAddress);
        if (code === "0x") {
            console.log("CRITICAL ERROR: No contract code found at address", contractAddress, "on Polygon Amoy! It might not be deployed there or deployed on a different network.");
            return;
        }
        console.log("Contract code exists! Length:", code.length);

        // check roles
        const abi = [
            "function hasRole(bytes32 role, address account) public view returns (bool)",
            "function STAFF_ROLE() public view returns (bytes32)",
            "function DEKAN_ROLE() public view returns (bytes32)",
            "function REKTOR_ROLE() public view returns (bytes32)"
        ];
        const contract = await ethers.getContractAt("DokumenAkademik", contractAddress);

        const STAFF_HASH = ethers.utils.id("STAFF_ROLE");
        const DEKAN_HASH = ethers.utils.id("DEKAN_ROLE");
        const REKTOR_HASH = ethers.utils.id("REKTOR_ROLE");

        const stafAddr = "0x3E06A17E3aaAE81553Cd341c2879FE8a09e4398c";
        const dekanAddr = "0xc462c8a54cB405F4C607Be2A526C80Ec31533bAf";
        const rektorAddr = "0x2bF0AEF72745c30E96E06f2D0D91D0F12f1a0F2D";

        console.log("\nChecking role assignments on contract:");
        const hasStaff = await contract.hasRole(STAFF_HASH, stafAddr);
        const hasDekan = await contract.hasRole(DEKAN_HASH, dekanAddr);
        const hasRektor = await contract.hasRole(REKTOR_HASH, rektorAddr);

        console.log(`Address Staf   (${stafAddr}) has role STAFF_ROLE:`, hasStaff);
        console.log(`Address Dekan  (${dekanAddr}) has role DEKAN_ROLE:`, hasDekan);
        console.log(`Address Rektor (${rektorAddr}) has role REKTOR_ROLE:`, hasRektor);

    } catch (err) {
        console.error("Error connecting or querying:", err);
    }
}

main().catch(console.error);
