export interface CoverLetterBlock {
  id: string;
  position: number; // 1, 2, 3, 4...
  content: string;
  isEditable: boolean; // true if the block can be edited by the user, false if it's a static block (e.g., a header or footer)
}

export interface CoverLetterData {
  id: string;
  jobApplicationId: string;

  roleName: string;
  companyName: string;
  date: string;

  blocks: CoverLetterBlock[];

  createdAt: string;
  updatedAt: string;
}

// FOR TESTS PURPOSES ONLY
export const MOCK_COVER_LETTER_DATA: CoverLetterData = {
  id: "cl_9b18f2a4",
  jobApplicationId: "app_4f89d1e2",
  roleName: "Senior Full-Stack & Desktop Software Engineer",
  companyName: "CloudScale Systems",
  date: "September 8, 2026",
  blocks: [
    {
      id: "block_1",
      position: 1,
      content: "Currently pursuing my degree in Computer Engineering at University of Toronto, I have developed solid professional experience in full-stack architecture and systems engineering. At Startup Solutions, I engineered scalable Flask backends, PostgreSQL/PostGIS spatial databases, and REST APIs designed for real-time data integration, bridging high-level web services with strict low-latency performance requirements.",
      isEditable: true
    },
    {
      id: "block_2",
      position: 2,
      content: "Beyond my professional roles, my technical projects highlight my expertise in low-level systems and desktop performance. I built a system utilizing C++ and Edge AI to reduce processing latency from 1s to 5ms, as well as desktop data profiling tools featuring virtualized UI grids and native C++ add-ons running seamlessly in an app at 60 FPS.",
      isEditable: true
    }
  ],
  createdAt: "2026-09-08T14:30:00.000Z",
  updatedAt: "2026-09-08T15:45:00.000Z"
};