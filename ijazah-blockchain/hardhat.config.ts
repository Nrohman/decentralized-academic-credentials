import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import "hardhat-gas-reporter"; // <--- INI TAMBAHAN KE-1 (IMPORT PLUGIN)

dotenv.config();

// Pastikan private key wallet deployer (Staf) lu sudah aman di file .env
const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      evmVersion: "shanghai",
      viaIR: true,
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  // vvv INI TAMBAHAN KE-2 (KONFIGURASI GAS REPORTER) vvv
  gasReporter: {
    enabled: true,
    token: 'MATIC', // Token koin Polygon
    showTimeSpent: true,
  },
  // ^^^ SAMPAI SINI ^^^

  networks: {
    // BLOK AMOY DI DALAM NETWORKS
    amoy: {
      url: `https://polygon-amoy.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
      chainId: 80002,
      accounts: [PRIVATE_KEY],
    },
  },
  etherscan: {
    apiKey: {
      polygonAmoy: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "polygonAmoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com/"
        }
      }
    ]
  }
};

export default config;