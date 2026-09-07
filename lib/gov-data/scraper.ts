export interface PressRelease {
  id: string;
  source: string;
  timestamp: string;
  reliability: string;
  title: string;
  date: string;
  content: string;
}

export interface IncidentReport {
  id: string;
  source: string;
  timestamp: string;
  reliability: string;
  type: string;
  description: string;
  date: string;
  content: string;
}

export interface CourtDocument {
  id: string;
  source: string;
  timestamp: string;
  reliability: string;
  title: string;
  date: string;
  content: string;
}

export interface SheriffDeptData {
  pressReleases: PressRelease[];
  incidentReports: IncidentReport[];
  courtDocuments: CourtDocument[];
}