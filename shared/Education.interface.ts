export interface Education {
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: Date;
    endDate?: Date | 'Present';
    description?: string;
}