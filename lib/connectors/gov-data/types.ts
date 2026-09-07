export interface SheriffDeptData {
  pressReleases: any[];
  incidentReports: any[];
  courtDocuments: any[];
}

export interface CivicEntity {
  id: string;
  source: string;
  timestamp: string;
  reliability: string;
  title: string;
  date: string;
  content: string;
  outcomes: any[];
  voteResult: string;
  type: string;
  engagementScore: number;
  numComments: number;
}

export interface PressRelease {
  id: string;
  source: string;
  timestamp: string;
  reliability: string;
  title: string;
  date: string;
  content: string;
}

export interface GovernmentMeeting {
  id: string;
  source: string;
  timestamp: string;
  reliability: string;
  title: string;
  date: string;
  content: string;
  outcomes: any[];
  voteResult: string;
}

export interface Candidate {
  id: string;
  source: string;
  timestamp: string;
  reliability: string;
  name: string;
  party: string;
  platform: string[];
  contact: {
    email: string;
    phone: string;
    website: string;
  };
  campaignFinance: {
    contributions: any[];
    sources: any[];
  };
  endorsements: any[];
}

export interface CourtCase {
  id: string;
  source: string;
  timestamp: string;
  reliability: string;
  title: string;
  date: string;
  content: string;
  outcomes: any[];
  voteResult: string;
}

export interface CivicProject {
  id: string;
  source: string;
  timestamp: string;
  reliability: string;
  title: string;
  date: string;
  content: string;
  outcomes: any[];
  voteResult: string;
}

// Add type definitions for specific entity types if needed