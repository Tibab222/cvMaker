export enum JobApplicationStatus {
    DRAFT = 'DRAFT',         // First draft
    REVIEW = 'REVIEW',       // AI generation done, need a human review
    APPLIED = 'APPLIED',     // Application sent to the company
    INTERVIEW = 'INTERVIEW', // Interview scheduled with the company
    OFFER = 'OFFER',         // received an offer from the company
    ACCEPTED = 'ACCEPTED',   // Offer accepted by the user
    REJECTED = 'REJECTED',   // Rejected by the company
    WITHDRAWN = 'WITHDRAWN', // Offer declined by the user
}

export interface CreateApplicationDto {
  jobTitle: string;
  companyName: string;
  jsonFilePath?: string;
  pdfFilePath?: string;
}