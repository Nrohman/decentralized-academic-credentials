export interface ProposalItem {
    id: number;
    recipient: string;
    pdfHash: string;
    jsonURI: string;
    docType: string;
    approvedByDekan: boolean;
    exists: boolean;
    isMinted: boolean;
    isRevoked: boolean;
    revokeProposed: boolean;
    revokeReason: string;
    evidenceURI?: string;
    proposedAt: number;
    approvedAt: number;
    mintedAt: number;
    revokeProposedAt: number;
    revokedAt: number;
}
