export interface ExtractRequestMessage {
  action: 'EXTRACT_AND_HIGHLIGHT';
}

export interface ExtractResponseMessage {
  title: string;
  company: string;
  salary: string;
  mandate: string;
  url: string;
  _debug?: Record<string, unknown>;
}

export interface CVMakerPayload {
  title: string;
  company: string;
  salary: string;
  url: string;
  mandate: string;
  extractedAt: string;
}