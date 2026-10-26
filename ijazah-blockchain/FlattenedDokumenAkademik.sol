// Sources flattened with hardhat v2.28.6 https://hardhat.org

// SPDX-License-Identifier: MIT

// File contracts/DokumenAkademik.sol

// Original license: SPDX_License_Identifier: MIT
// Final Flattened Contract for Digital Academic Documents
// Soulbound Token (SBT) dengan Sequential State-Gated Dual-Party Revocation
// (Dekan Propose -> Rektor Confirm/Veto) & Rektor Veto
// Base: OpenZeppelin v4.9.6

pragma solidity ^0.8.20;

// --- STANDAR LIBRARIES ---

interface IERC165 {
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}

abstract contract ERC165 is IERC165 {
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}

interface IAccessControl {
    event RoleAdminChanged(
        bytes32 indexed role,
        bytes32 indexed previousAdminRole,
        bytes32 indexed newAdminRole
    );
    event RoleGranted(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    event RoleRevoked(
        bytes32 indexed role,
        address indexed account,
        address indexed sender
    );
    function hasRole(
        bytes32 role,
        address account
    ) external view returns (bool);
    function getRoleAdmin(bytes32 role) external view returns (bytes32);
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
}

abstract contract Context {
    function _msgSender() internal view virtual returns (address) {
        return msg.sender;
    }
}

library Math {
    function log10(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >= 10 ** 64) {
                value /= 10 ** 64;
                result += 64;
            }
            if (value >= 10 ** 32) {
                value /= 10 ** 32;
                result += 32;
            }
            if (value >= 10 ** 16) {
                value /= 10 ** 16;
                result += 16;
            }
            if (value >= 10 ** 8) {
                value /= 10 ** 8;
                result += 8;
            }
            if (value >= 10 ** 4) {
                value /= 10 ** 4;
                result += 4;
            }
            if (value >= 10 ** 2) {
                value /= 10 ** 2;
                result += 2;
            }
            if (value >= 10 ** 1) {
                result += 1;
            }
        }
        return result;
    }
}

library Strings {
    bytes16 private constant _SYMBOLS = "0123456789abcdef";
    function toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes16("0123456789abcdef")[value % 10];
            value /= 10;
        }
        return string(buffer);
    }

    function toHexString(
        uint256 value,
        uint256 length
    ) internal pure returns (string memory) {
        bytes memory buffer = new bytes(2 * length + 2);
        buffer[0] = "0";
        buffer[1] = "x";
        for (uint256 i = 2 * length + 1; i > 1; --i) {
            buffer[i] = _SYMBOLS[value & 0xf];
            value >>= 4;
        }
        return string(buffer);
    }

    function toHexString(address addr) internal pure returns (string memory) {
        return toHexString(uint256(uint160(addr)), 20);
    }
}

abstract contract AccessControl is Context, IAccessControl, ERC165 {
    struct RoleData {
        mapping(address => bool) members;
        bytes32 adminRole;
    }
    mapping(bytes32 => RoleData) private _roles;
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x00;
    modifier onlyRole(bytes32 role) {
        _checkRole(role);
        _;
    }
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override returns (bool) {
        return
            interfaceId == type(IAccessControl).interfaceId ||
            super.supportsInterface(interfaceId);
    }
    function hasRole(
        bytes32 role,
        address account
    ) public view virtual override returns (bool) {
        return _roles[role].members[account];
    }
    function _checkRole(bytes32 role) internal view virtual {
        if (!hasRole(role, _msgSender())) {
            revert(
                string(
                    abi.encodePacked(
                        "AccessControl: account ",
                        Strings.toHexString(_msgSender()),
                        " is missing role ",
                        Strings.toHexString(uint256(role), 32)
                    )
                )
            );
        }
    }
    function getRoleAdmin(
        bytes32 role
    ) public view virtual override returns (bytes32) {
        return _roles[role].adminRole;
    }
    function grantRole(
        bytes32 role,
        address account
    ) public virtual override onlyRole(getRoleAdmin(role)) {
        _grantRole(role, account);
    }
    function revokeRole(
        bytes32 role,
        address account
    ) public virtual override onlyRole(getRoleAdmin(role)) {
        _revokeRole(role, account);
    }
    function renounceRole(
        bytes32 role,
        address account
    ) public virtual override {
        require(
            account == _msgSender(),
            "AccessControl: can only renounce roles for self"
        );
        _revokeRole(role, account);
    }
    function _grantRole(bytes32 role, address account) internal virtual {
        if (!hasRole(role, account)) {
            _roles[role].members[account] = true;
            emit RoleGranted(role, account, _msgSender());
        }
    }
    function _revokeRole(bytes32 role, address account) internal virtual {
        if (hasRole(role, account)) {
            _roles[role].members[account] = false;
            emit RoleRevoked(role, account, _msgSender());
        }
    }
}

// --- ERC721 STANDARDS ---

interface IERC721 is IERC165 {
    event Transfer(
        address indexed from,
        address indexed to,
        uint256 indexed tokenId
    );
    event Approval(
        address indexed owner,
        address indexed approved,
        uint256 indexed tokenId
    );
    event ApprovalForAll(
        address indexed owner,
        address indexed operator,
        bool approved
    );

    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes calldata data
    ) external;
    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId
    ) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function getApproved(
        uint256 tokenId
    ) external view returns (address operator);
    function setApprovalForAll(address operator, bool _approved) external;
    function isApprovedForAll(
        address owner,
        address operator
    ) external view returns (bool);
}

interface IERC721Metadata is IERC721 {
    function name() external view returns (string memory);
    function symbol() external view returns (string memory);
    function tokenURI(uint256 tokenId) external view returns (string memory);
}

library Address {
    function isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }
}

contract ERC721 is Context, ERC165, IERC721, IERC721Metadata {
    using Address for address;
    using Strings for uint256;
    string private _name;
    string private _symbol;
    mapping(uint256 => address) private _owners;
    mapping(address => uint256) private _balances;
    constructor(string memory name_, string memory symbol_) {
        _name = name_;
        _symbol = symbol_;
    }
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IERC721).interfaceId ||
            interfaceId == type(IERC721Metadata).interfaceId ||
            super.supportsInterface(interfaceId);
    }
    function balanceOf(
        address owner
    ) public view virtual override returns (uint256) {
        return _balances[owner];
    }
    function ownerOf(
        uint256 tokenId
    ) public view virtual override returns (address) {
        address owner = _owners[tokenId];
        require(owner != address(0), "ERC721: invalid token ID");
        return owner;
    }
    function name() public view virtual override returns (string memory) {
        return _name;
    }
    function symbol() public view virtual override returns (string memory) {
        return _symbol;
    }
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(ownerOf(tokenId) != address(0), "ERC721: invalid token ID");
        return "";
    }

    // =========================================================================
    // SOULBOUND TOKEN (SBT) LOCK: Override fungsi transfer & approval bawaan
    // ERC-721 agar kepemilikan ijazah terikat permanen pada wallet penerima.
    // Seluruh percobaan pemindahan aset akan ditolak (revert) secara mutlak.
    // =========================================================================

    function transferFrom(
        address /*from*/,
        address /*to*/,
        uint256 /*tokenId*/
    ) public virtual override {
        revert(
            "Ijazah Digital adalah Soulbound Token (SBT) dan tidak dapat ditransfer atau dipindahtangankan."
        );
    }

    function safeTransferFrom(
        address /*from*/,
        address /*to*/,
        uint256 /*tokenId*/
    ) public virtual override {
        revert(
            "Ijazah Digital adalah Soulbound Token (SBT) dan tidak dapat ditransfer atau dipindahtangankan."
        );
    }

    function safeTransferFrom(
        address /*from*/,
        address /*to*/,
        uint256 /*tokenId*/,
        bytes memory /*data*/
    ) public virtual override {
        revert(
            "Ijazah Digital adalah Soulbound Token (SBT) dan tidak dapat ditransfer atau dipindahtangankan."
        );
    }

    function approve(
        address /*to*/,
        uint256 /*tokenId*/
    ) public virtual override {
        revert(
            "Ijazah Digital adalah Soulbound Token (SBT) dan tidak dapat disetujui untuk dipindahtangankan."
        );
    }

    function getApproved(
        uint256 tokenId
    ) public view virtual override returns (address) {
        require(ownerOf(tokenId) != address(0), "ERC721: invalid token ID");
        return address(0);
    }

    // [REVISI] Tambahan pengunci operator pihak ketiga
    function setApprovalForAll(
        address /*operator*/,
        bool /*approved*/
    ) public virtual override {
        revert(
            "SBT: Ijazah tidak dapat diwakilkan/ditransfer oleh smart contract pihak ketiga."
        );
    }

    // [REVISI] Mengembalikan false secara absolut untuk pertanyaan wewenang operator
    function isApprovedForAll(
        address /*owner*/,
        address /*operator*/
    ) public view virtual override returns (bool) {
        return false;
    }

    function _safeMint(address to, uint256 tokenId) internal virtual {
        require(to != address(0), "ERC721: mint to the zero address");
        _balances[to] += 1;
        _owners[tokenId] = to;
        emit Transfer(address(0), to, tokenId);
    }
}

interface IERC4906 is IERC165, IERC721 {
    event MetadataUpdate(uint256 _tokenId);
}

abstract contract ERC721URIStorage is IERC4906, ERC721 {
    mapping(uint256 => string) private _tokenURIs;
    function supportsInterface(
        bytes4 interfaceId
    ) public view virtual override(ERC721, IERC165) returns (bool) {
        return
            interfaceId == bytes4(0x49064906) ||
            super.supportsInterface(interfaceId);
    }
    function tokenURI(
        uint256 tokenId
    ) public view virtual override returns (string memory) {
        require(
            ownerOf(tokenId) != address(0),
            "ERC721URIStorage: invalid token ID"
        );
        return _tokenURIs[tokenId];
    }
    function _setTokenURI(
        uint256 tokenId,
        string memory _tokenURI
    ) internal virtual {
        _tokenURIs[tokenId] = _tokenURI;
        emit MetadataUpdate(tokenId);
    }
}

// --- KONTRAK UTAMA (DOKUMEN AKADEMIK) ---

contract DokumenAkademik is ERC721URIStorage, AccessControl {
    bytes32 public constant STAFF_ROLE = keccak256("STAFF_ROLE");
    bytes32 public constant DEKAN_ROLE = keccak256("DEKAN_ROLE");
    bytes32 public constant REKTOR_ROLE = keccak256("REKTOR_ROLE");

    // Custom Error Definitions for Gas Optimization
    error HashAlreadyRegistered();
    error ProposalNotFound();
    error DocumentAlreadyMinted();
    error DekanNotApproved();
    error DocumentNotMinted();
    error DocumentAlreadyRevoked();
    error RevocationAlreadyProposed();
    error RevocationNotProposed();

    struct Proposal {
        address recipient;
        string pdfHash;
        string jsonURI;
        string docType;
        bool approvedByDekan;
        bool exists;
        bool isMinted;
        bool isRevoked;
        bool revokeProposed;
        string revokeReason;
        string[] evidenceURIs;
        uint256 proposedAt;
        uint256 approvedAt;
        uint256 mintedAt;
        uint256 revokeProposedAt;
        uint256 revokedAt;
    }

    mapping(uint256 => Proposal) public proposals;
    uint256 public nextProposalId = 1;

    // =========================================================================
    // ARSITEKTUR OPTIMASI KUERI: ON-CHAIN INDEXING FOR O(1) & O(K) COMPLEXITY
    // =========================================================================
    mapping(string => uint256) private hashToProposalId;
    mapping(address => uint256[]) private studentProposals;

    struct HistoryLog {
        string actionName;
        uint256 timestamp;
        string details;
    }
    mapping(uint256 => HistoryLog[]) private _proposalHistory;

    function getProposalHistory(
        uint256 _proposalId
    ) public view returns (HistoryLog[] memory) {
        return _proposalHistory[_proposalId];
    }

    event DocumentProposed(
        uint256 indexed proposalId,
        address indexed recipient,
        string docType
    );
    event DocumentApprovedByDekan(uint256 indexed proposalId);
    event DocumentMinted(uint256 indexed proposalId, uint256 indexed tokenId);
    event MintProposalRejected(uint256 indexed proposalId);
    event RevocationProposed(uint256 indexed proposalId, string reason);
    event RevocationVetoed(uint256 indexed proposalId);
    event DocumentRevoked(uint256 indexed proposalId);

    constructor(
        address staf,
        address dekan,
        address rektor
    ) ERC721("Academic Credential Digital Unkris", "ACDU") {
        _grantRole(DEFAULT_ADMIN_ROLE, rektor);
        _grantRole(STAFF_ROLE, staf);
        _grantRole(DEKAN_ROLE, dekan);
        _grantRole(REKTOR_ROLE, rektor);
    }

    // TAHAP 1: Staf Akademik Mengajukan Dokumen
    function proposeDokumen(
        address _to,
        string calldata _pdfHash,
        string calldata _uri,
        string calldata _docType
    ) public onlyRole(STAFF_ROLE) {
        // [REVISI] Pengecekan krusial untuk mencegah penimpaan (overwrite) data dari hash yang sama
        if (hashToProposalId[_pdfHash] != 0) {
            revert HashAlreadyRegistered();
        }

        Proposal storage p = proposals[nextProposalId];
        p.recipient = _to;
        p.pdfHash = _pdfHash;
        p.jsonURI = _uri;
        p.docType = _docType;
        p.exists = true;
        p.proposedAt = block.timestamp;

        // Jalur penguncian data pemetaan on-chain reverse-mapping
        hashToProposalId[_pdfHash] = nextProposalId;
        studentProposals[_to].push(nextProposalId);

        emit DocumentProposed(nextProposalId, _to, _docType);
        _proposalHistory[nextProposalId].push(
            HistoryLog("Diajukan oleh Staf", block.timestamp, "")
        );
        nextProposalId++;
    }

    // TAHAP 2: Dekan Menyetujui (Validasi Tingkat Fakultas)
    function dekanApprove(uint256 _proposalId) 
    public onlyRole(DEKAN_ROLE) {
        if (!proposals[_proposalId].exists) {
            revert ProposalNotFound();
        }
        if (proposals[_proposalId].isMinted) {
            revert DocumentAlreadyMinted();
        }
        proposals[_proposalId].approvedByDekan = true;
        proposals[_proposalId].approvedAt = block.timestamp;
        _proposalHistory[_proposalId].push(
            HistoryLog("Divalidasi Dekan", block.timestamp, "")
        );
        emit DocumentApprovedByDekan(_proposalId);
    }

    // TAHAP 3: Opsi A - Rektor Menyetujui & Mint NFT Ke Blockchain
    function rektorApproveAndMint(
        uint256 _proposalId
    ) public onlyRole(REKTOR_ROLE) {
        Proposal storage p = proposals[_proposalId];
        if (!p.approvedByDekan) {
            revert DekanNotApproved();
        }
        if (p.isMinted) {
            revert DocumentAlreadyMinted();
        }

        p.isMinted = true;
        p.mintedAt = block.timestamp;
        _safeMint(p.recipient, _proposalId);
        _setTokenURI(_proposalId, p.jsonURI);

        _proposalHistory[_proposalId].push(
            HistoryLog("Diterbitkan Rektor (Mint)", block.timestamp, "")
        );
        emit DocumentMinted(_proposalId, _proposalId);
    }

    // TAHAP 3: Opsi B - Rektor Menolak Usulan Cetak Staf/Dekan (Fungsi Baru Sesuai Teori)
    function rektorRejectMint(
        uint256 _proposalId
    ) public onlyRole(REKTOR_ROLE) {
        if (!proposals[_proposalId].exists) {
            revert ProposalNotFound();
        }
        if (proposals[_proposalId].isMinted) {
            revert DocumentAlreadyMinted();
        }

        proposals[_proposalId].approvedByDekan = false;
        _proposalHistory[_proposalId].push(
            HistoryLog("Ditolak oleh Rektor", block.timestamp, "")
        );
        emit MintProposalRejected(_proposalId);
    }

    // --- FITUR SENGKETA & PEMBATALAN (REVOKE) SEQUENTIAL DUAL-PARTY ---

    // Dekan mengajukan sengketa pembatalan dokumen pasca-terbit disertai SK Bukti
    function proposeRevoke(
        uint256 _proposalId,
        string calldata _reason,
        string[] memory _evidences
    ) public onlyRole(DEKAN_ROLE) {
        if (!proposals[_proposalId].isMinted) {
            revert DocumentNotMinted();
        }
        if (proposals[_proposalId].isRevoked) {
            revert DocumentAlreadyRevoked();
        }
        // [REVISI] Pengecekan agar Dekan tidak spam usulan yang sama
        if (proposals[_proposalId].revokeProposed) {
            revert RevocationAlreadyProposed();
        }

        proposals[_proposalId].revokeProposed = true;
        proposals[_proposalId].revokeReason = _reason;
        proposals[_proposalId].evidenceURIs = _evidences;
        proposals[_proposalId].revokeProposedAt = block.timestamp;

        _proposalHistory[_proposalId].push(
            HistoryLog("Sengketa Diajukan Dekan", block.timestamp, _reason)
        );
        emit RevocationProposed(_proposalId, _reason);
    }

    // Opsi Eksekusi Final Rektor ÔÇö Menyetujui Pencabutan Dokumen Kelulusan
    function confirmRevoke(uint256 _proposalId) public onlyRole(REKTOR_ROLE) {
        if (!proposals[_proposalId].revokeProposed) {
            revert RevocationNotProposed();
        }
        if (proposals[_proposalId].isRevoked) {
            revert DocumentAlreadyRevoked();
        }

        proposals[_proposalId].isRevoked = true;
        proposals[_proposalId].revokedAt = block.timestamp;
        _proposalHistory[_proposalId].push(
            HistoryLog("Dicabut Permanen (Revoked)", block.timestamp, "")
        );
        emit DocumentRevoked(_proposalId);
    }

    // Opsi Hak Veto Rektor ÔÇö Menolak Pembatalan Dekan & Mengembalikan Status Dokumen (Fungsi Baru Sesuai Teori)
    function rejectRevoke(uint256 _proposalId) public onlyRole(REKTOR_ROLE) {
        if (!proposals[_proposalId].revokeProposed) {
            revert RevocationNotProposed();
        }
        if (proposals[_proposalId].isRevoked) {
            revert DocumentAlreadyRevoked();
        }
        proposals[_proposalId].revokeProposed = false;
        proposals[_proposalId].revokeReason = "";
        delete proposals[_proposalId].evidenceURIs;
        proposals[_proposalId].revokeProposedAt = 0;

        _proposalHistory[_proposalId].push(
            HistoryLog("Sengketa Ditolak Rektor (Veto)", block.timestamp, "")
        );
        emit RevocationVetoed(_proposalId);
    }

    // Fungsi helper untuk membaca manifest berkas bukti PDF SK pembatalan
    function getEvidenceURIs(
        uint256 _proposalId
    ) public view returns (string[] memory) {
        return proposals[_proposalId].evidenceURIs;
    }

    // =========================================================================
    // HELPER VIEW CALLS UNTUK OPTIMASI KUERI FRONTIER O(1) DAN O(K)
    // =========================================================================
    function getProposalIdByHash(
        string memory _pdfHash
    ) public view returns (uint256) {
        return hashToProposalId[_pdfHash];
    }

    function getStudentProposalIds(
        address _student
    ) public view returns (uint256[] memory) {
        return studentProposals[_student];
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
