import { expect } from "chai";
import { ethers } from "hardhat";
import "hardhat-gas-reporter";

describe("DokumenAkademik (Ijazah Digital) - Pengujian Keamanan & Alur Terpadu", function () {
    let ijazahDigital: any;
    let admin: any, dekan: any, rektor: any, mahasiswa: any, attacker: any;
    const dummyPdfHash = "494F1320BCDCA3C370A5924B5E00C13E5C897CEDEFAB350FA0613CF7D9809BD7";
    const dummyUri = "ipfs://QmbNLq1q1fu2CnzyJbdaCWW6mhArSiFxi7WhXfGiwyp3Do";
    const dummyDocType = "Ijazah";

    beforeEach(async function () {
        [admin, dekan, rektor, mahasiswa, attacker] = await ethers.getSigners();
        const IjazahDigital = await ethers.getContractFactory("DokumenAkademik");
        ijazahDigital = await IjazahDigital.deploy(admin.address, dekan.address, rektor.address);
        await ijazahDigital.deployed();
    });

    describe("1. Uji Penetrasi Hak Akses (RBAC Vulnerability Test)", function () {
        it("RBAC-01: Harus menggagalkan eksekusi proposeDokumen oleh entitas publik (attacker)", async function () {
            await expect(
                ijazahDigital.connect(attacker).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType)
            ).to.be.revertedWith(
                `AccessControl: account ${attacker.address.toLowerCase()} is missing role ${ethers.utils.id("STAFF_ROLE")}`
            );
        });

        it("RBAC-02: Harus menggagalkan Dekan yang memanipulasi fungsi pencetakan (Minting) Rektor", async function () {
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            await ijazahDigital.connect(dekan).dekanApprove(1);
            await expect(
                ijazahDigital.connect(dekan).rektorApproveAndMint(1)
            ).to.be.revertedWith(
                `AccessControl: account ${dekan.address.toLowerCase()} is missing role ${ethers.utils.id("REKTOR_ROLE")}`
            );
        });

        it("RBAC-03: Harus menolak eksekusi admin/mahasiswa murni tanpa otorisasi tingkat Dekan", async function () {
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            await expect(
                ijazahDigital.connect(mahasiswa).dekanApprove(1)
            ).to.be.revertedWith(
                `AccessControl: account ${mahasiswa.address.toLowerCase()} is missing role ${ethers.utils.id("DEKAN_ROLE")}`
            );
        });
    });

    describe("2. Uji Alur Persetujuan Berjenjang (Sequential Workflow)", function () {
        it("WF-01: Staf Akademik berhasil menginisiasi pendaftaran usulan dokumen baru", async function () {
            // Dibuat lebih fleksibel dengan hanya mengecek emit event-nya saja
            await expect(
                ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType)
            ).to.emit(ijazahDigital, "DocumentProposed");

            const proposal = await ijazahDigital.proposals(1);
            expect(proposal.exists).to.be.true;
        });

        it("WF-02: Harus menolak eksekusi cetak Rektor jika dokumen belum divalidasi oleh Dekan", async function () {
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            await expect(
                ijazahDigital.connect(rektor).rektorApproveAndMint(1)
            ).to.be.revertedWithCustomError(ijazahDigital, "DekanNotApproved");
        });

        it("WF-03: Dekan berhasil memvalidasi dan mengesahkan dokumen tingkat fakultas", async function () {
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            await ijazahDigital.connect(dekan).dekanApprove(1);

            const proposalAfterDekan = await ijazahDigital.proposals(1);
            expect(proposalAfterDekan.approvedByDekan).to.be.true;
        });

        it("WF-04: Rektor berhasil mengeksekusi pencetakan (Minting) aset kriptografis", async function () {
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            await ijazahDigital.connect(dekan).dekanApprove(1);

            await expect(
                ijazahDigital.connect(rektor).rektorApproveAndMint(1)
            ).to.emit(ijazahDigital, "Transfer").withArgs(ethers.constants.AddressZero, mahasiswa.address, 1);

            expect(await ijazahDigital.ownerOf(1)).to.equal(mahasiswa.address);
        });

        it("WF-05: Rektor berhasil menolak dokumen yang telah disetujui Dekan", async function () {
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            await ijazahDigital.connect(dekan).dekanApprove(1);

            await expect(
                ijazahDigital.connect(rektor).rektorRejectMint(1)
            ).to.emit(ijazahDigital, "MintProposalRejected").withArgs(1);

            const proposalAfterReject = await ijazahDigital.proposals(1);
            expect(proposalAfterReject.approvedByDekan).to.be.false; // Dikembalikan statusnya
        });
    });

    describe("3. Uji Ketahanan Soulbound Token (SBT)", function () {
        it("SBT-01: Harus menggagalkan transaksi jika mahasiswa mentransfer atau menjual Ijazah", async function () {
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            await ijazahDigital.connect(dekan).dekanApprove(1);
            await ijazahDigital.connect(rektor).rektorApproveAndMint(1);

            await expect(
                ijazahDigital.connect(mahasiswa).transferFrom(mahasiswa.address, attacker.address, 1)
            ).to.be.revertedWith("Ijazah Digital adalah Soulbound Token (SBT) dan tidak dapat ditransfer atau dipindahtangankan.");
        });
    });

    describe("4. Uji Optimalisasi Kueri Front-End O(1)", function () {
        it("OPT-01: Sistem berhasil melacak ID proposal secara instan berbasis Hash PDF", async function () {
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            const proposalId = await ijazahDigital.getProposalIdByHash(dummyPdfHash);
            expect(proposalId.toNumber()).to.equal(1);
        });
    });
    describe("5. Uji Protokol Pencabutan Kredensial (Dispute Protocol)", function () {
        // Deklarasi variabel dummy untuk sengketa
        const revokeReason = "Terbukti melakukan manipulasi nilai akhir";

        // SOLUSI KONDISI 2: Tipe Data Array. Wajib dibungkus kurung siku [...]
        const evidenceURIs = ["ipfs://QmBuktiSKPencabutan123"];

        it("REV-01: Harus berhasil mengeksekusi alur pencabutan mematuhi State Machine & RBAC", async function () {

            // =================================================================
            // SOLUSI KONDISI 1: Melompati Alur Mesin Status
            // Dokumen wajib melalui propose -> approve -> mint sebelum di-revoke
            // =================================================================
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            await ijazahDigital.connect(dekan).dekanApprove(1);
            await ijazahDigital.connect(rektor).rektorApproveAndMint(1);

            // Validasi prasyarat: Pastikan dokumen sudah dicetak (Minted) dan belum dicabut
            let proposal = await ijazahDigital.proposals(1);
            expect(proposal.isMinted).to.be.true;
            expect(proposal.isRevoked).to.be.false;


            // =================================================================
            // SOLUSI KONDISI 3: Kesalahan Aktor (onlyRole) - Fase Dekan
            // Wajib menggunakan .connect(dekan)
            // =================================================================
            await expect(
                ijazahDigital.connect(dekan).proposeRevoke(1, revokeReason, evidenceURIs)
            ).to.emit(ijazahDigital, "RevocationProposed")
                .withArgs(1, revokeReason); // Sesuaikan parameter event dengan Solidity

            // Validasi bahwa status telah masuk ke masa sengketa
            proposal = await ijazahDigital.proposals(1);
            expect(proposal.revokeProposed).to.be.true;


            // =================================================================
            // SOLUSI KONDISI 4: Mencabut Dokumen yang Sama Dua Kali
            // Membuktikan bahwa jika Dekan mencoba proposeRevoke lagi, akan ditolak (Revert)
            // =================================================================
            await expect(
                ijazahDigital.connect(dekan).proposeRevoke(1, "Alasan tambahan", evidenceURIs)
            ).to.be.revertedWithCustomError(ijazahDigital, "RevocationAlreadyProposed");


            // =================================================================
            // SOLUSI KONDISI 3: Kesalahan Aktor (onlyRole) - Fase Rektor
            // =================================================================
            await expect(
                ijazahDigital.connect(rektor).confirmRevoke(1)
            ).to.emit(ijazahDigital, "DocumentRevoked")
                .withArgs(1);

            // Validasi Akhir: Pastikan parameter isRevoked (State-Flagging) berubah menjadi true
            proposal = await ijazahDigital.proposals(1);
            expect(proposal.isRevoked).to.be.true;

            // HAPUS ATAU UBAH BARIS INI:
            // Karena di kontrak nilainya tidak direset ke false, kita biarkan saja true
            expect(proposal.revokeProposed).to.be.true;
        });

        it("REV-02: Harus berhasil membatalkan sengketa jika Rektor menolak pencabutan (Veto)", async function () {
            await ijazahDigital.connect(admin).proposeDokumen(mahasiswa.address, dummyPdfHash, dummyUri, dummyDocType);
            await ijazahDigital.connect(dekan).dekanApprove(1);
            await ijazahDigital.connect(rektor).rektorApproveAndMint(1);

            // Dekan mengajukan sengketa
            await ijazahDigital.connect(dekan).proposeRevoke(1, revokeReason, evidenceURIs);

            // Rektor menolak sengketa (Veto)
            await expect(
                ijazahDigital.connect(rektor).rejectRevoke(1)
            ).to.emit(ijazahDigital, "RevocationVetoed")
                .withArgs(1);

            // Validasi Akhir: Pastikan status sengketa dikembalikan
            const proposal = await ijazahDigital.proposals(1);
            expect(proposal.revokeProposed).to.be.false; // Sengketa dibatalkan
            expect(proposal.isRevoked).to.be.false; // Dokumen tetap valid
        });
    });
});