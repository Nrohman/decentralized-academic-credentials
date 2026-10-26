# 🎓 UNI D-CERT: Decentralized Academic Credentials & Verification DApp

[![Solidity](https://img.shields.io/badge/Solidity-v0.8.20-363636?logo=solidity&logoColor=white)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-v16.2.4-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.9.3-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Network](https://img.shields.io/badge/Network-Polygon_Amoy_(80002)-8247E5?logo=polygon&logoColor=white)](https://amoy.polygonscan.com/)
[![Storage](https://img.shields.io/badge/Storage-IPFS_Pinata-E11D48?logo=ipfs&logoColor=white)](https://pinata.cloud/)
[![Testing](https://img.shields.io/badge/Unit_Tests-100%25_Passing_(12/12)-success)](https://hardhat.org/)

> **A Production-Grade, Zero-Trust Web3 Application for Academic Credential Issuance, Verification, and Lifecycle Governance using Soulbound Tokens (SBT) and Polygon Layer-2.**

---

## 📌 Executive Summary

Conventional academic archiving systems rely on centralized databases (MySQL/PostgreSQL) and static PDF files, exposing institutions to three critical vulnerabilities:
1. **Single Point of Failure (SPOF)**: Server hardware failures or ransomware attacks risk permanent loss of credential records.
2. **Server-Side Tampering & MitM**: Transmission of raw files to central servers exposes documents to in-transit modification.
3. **Insider Threats**: Centralized database administrators can manipulate diploma databases without an immutable audit trail.

**UNI D-CERT** resolves these issues by introducing a **hybrid decentralized architecture** combining client-side cryptographic isolation, off-chain IPFS storage, deterministic wallet derivation, and an on-chain **Sequential State-Gated** smart contract.

---

## 🏛️ System Architecture & Innovations

```
[ In-Browser Client (Next.js) ]
  ├── 1. Upload PDF Diploma
  ├── 2. Client-Side Rendering (pdfjs-dist & HTML5 Canvas)
  ├── 3. WebAssembly OCR (Tesseract.js) -> Extracts NIM, Name, Major
  ├── 4. Client-Side Cryptographic Hashing (js-sha256) -> Generates SHA-256 in RAM
  └── 5. Deterministic Wallet Derivation via Keccak-256 (NIM + Campus Salt)
                │
                ├── [ Off-Chain Storage (IPFS / Pinata) ]
                │     ├── Encapsulates Metadata JSON & PDF
                │     └── Returns Content Identifier (CID: Qm...)
                │
                └── [ On-Chain Layer-2 (Polygon Amoy Testnet) ]
                      └── DokumenAkademik.sol (ERC-721 Soulbound Token)
                            ├── Sequential RBAC (Staff -> Dean -> Rector)
                            ├── State-Gating (Proposed -> Approved -> Minted -> Revoked)
                            └── Dispute Protocol & Rector Veto Mechanism
```

### 🔑 Key Engineering Highlights

1. **Zero-Trust Client-Side Hashing & WebAssembly OCR**:
   * Uses `pdfjs-dist` to render PDF pages into memory canvas objects and runs `Tesseract.js` via Web Workers.
   * Computes the SHA-256 fingerprint entirely inside browser RAM using `js-sha256` before any payload leaves the client. Raw credentials are never exposed in transit.

2. **Sequential State-Gated Role-Based Access Control (RBAC)**:
   * **Staff (Inisiator)**: Registers draft document hashes (`proposeDokumen`).
   * **Dean (Validator)**: Reviews and validates academic merit (`dekanApprove`) or initiates revocation disputes (`proposeRevoke`).
   * **Rector (Supreme Authority)**: Executes final minting (`rektorApproveAndMint`), vetoes invalid drafts (`rektorRejectMint`), or resolves disputes (`confirmRevoke` / `rejectRevoke`).

3. **ERC-721 Soulbound Token (SBT) Paradigm**:
   * Adopts the non-transferable philosophy of **EIP-5192** by explicitly injecting `revert` statements into `transferFrom`, `safeTransferFrom`, and `approve`.
   * Credentials permanently bind to the graduate's wallet, eliminating credential reselling and account proxy attacks.

4. **Stateless Deterministic Wallet Generation**:
   * Eliminates the risk of leaking student private keys from a database by deriving student custodial addresses dynamically via `ethers.utils.solidityKeccak256([SALT, NIM])`.

5. **Dispute & Revocation Forensics**:
   * Revocation does not burn (`_burn`) the token; instead, it sets an immutable `isRevoked` flag accompanied by an IPFS link to the formal Revocation Decree (`evidenceURIs`) and stated reasons (`revokeReason`), preserving an auditable forensic history.

---

## 🔬 Empirical Research & Benchmark Metrics

| Evaluation Metric | Test Scenario | Measured Result | Standard / Benchmark |
| :--- | :--- | :---: | :---: |
| **Avalanche Effect (SAC)** | Visual Text Mutation (IPK edit) | **54.30%** | Strict Avalanche Criterion (~50%) |
| **Avalanche Effect (SAC)** | PDF Metadata Tampering (Author edit) | **48.83%** | Strict Avalanche Criterion (~50%) |
| **Avalanche Effect (SAC)** | EOF Append (Hidden script injection) | **46.09%** | Strict Avalanche Criterion (~50%) |
| **Unit Test Coverage** | Hardhat / Mocha / Chai Test Suites | **12 / 12 (100% Passing)** | Zero Regression Tolerance |
| **Smart Contract Gas (Deploy)** | Solc v0.8.20 (Shanghai, runs: 200) | **2,678,452 gas** | ~0.0803 POL (Rp 110,-) |
| **Issuance Pipeline Gas** | Staff Propose + Dean Approve + Rector Mint | **~729,579 gas** | **Rp 30.07 (~$0.002)** |
| **Public Verification Cost** | Wallet-less Read Call (`eth_call`) | **0 Gas (Free)** | O(1) Instant Verification |

---

## 📂 Monorepo Structure

```bash
decentralized-academic-credentials/
├── ijazah-blockchain/               # Smart Contract Infrastructure (Hardhat)
│   ├── contracts/
│   │   └── DokumenAkademik.sol      # Core SBT & Sequential RBAC Smart Contract
│   ├── scripts/
│   │   ├── deploy_SSGA.ts           # Automated Deployment Script (Amoy Testnet)
│   │   └── approve.ts, propose.ts   # Administrative CLI interaction scripts
│   ├── test/
│   │   └── DokumenAkademik.test.ts  # White-box penetration & RBAC test suites
│   ├── hardhat.config.ts            # EVM Shanghai, Optimizer (runs: 200), Gas Reporter
│   └── .env.example                 # Environment variables blueprint
│
├── ijazah-frontend/                 # Web3 DApp Client (Next.js & React)
│   ├── src/
│   │   ├── app/                     # Next.js App Router (Admin, Dean, Rector, Verify)
│   │   ├── components/              # Modular UI components & timeline visualizers
│   │   └── lib/                     # Ethers.js helpers, IPFS Pinata integration, OCR
│   ├── next.config.ts               # Next.js Turbopack configuration
│   └── .env.example                 # Frontend API credentials template
│
├── .gitignore                       # Master git ignore file (protects all secrets)
└── README.md                        # Portfolio documentation
```

---

## ⚡ Quickstart & Installation

### 1. Prerequisites
* **Node.js** (v18.x or v20.x recommended)
* **MetaMask** wallet browser extension configured to **Polygon Amoy Testnet**

### 2. Smart Contract Setup & Testing
```bash
# Navigate to blockchain directory
cd ijazah-blockchain

# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run full White-Box Unit Tests (12 test cases)
npx hardhat test
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd ../ijazah-frontend

# Install dependencies
npm install

# Copy environment template and configure keys
cp .env.example .env.local

# Run Next.js local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the portal.

---

## 🌐 Deployed Smart Contract Information

* **Network**: Polygon Amoy Testnet (Chain ID: `80002`)
* **Contract Address**: `0x67eaE07f402A8aEfAf7e9BFfe418092459C326db`
* **Explorer Verification**: [View on Polygonscan Amoy](https://amoy.polygonscan.com/address/0x67eaE07f402A8aEfAf7e9BFfe418092459C326db)
* **Compiler**: Solidity v0.8.20 (EVM Target: Shanghai, Optimizer Runs: 200)

---

## 📜 License & Academic Attribution
Developed as an Undergraduate Final Project (Skripsi) at **Program Studi Teknik Informatika, Universitas Krisnadwipayana**.  
Licensed under the [ISC License](LICENSE).
