export interface Education {
    id: string;
    degree: string;
    institution: string;
    location: string;
    startDate: Date;
    endDate?: Date | 'Present';
    description?: string;
    kind?: 'degree' | 'certification' | 'course'; // lets templates list certifications apart (see profileFields.ts)
}