export interface Experience {
    id: string;
    jobTitle: string;
    company: string;
    location: string;
    startDate: Date;
    endDate?: Date | 'Present';
    description?: string;
}