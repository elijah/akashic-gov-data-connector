import { CivicEntity, SheriffDeptData } from './types';
import { PressRelease, IncidentReport, CourtDocument } from './scraper';

// Helper functions for mapping different entity types
function mapPressRelease(release: PressRelease): CivicEntity {
  return {
    id: release.id || crypto.randomUUID(),
    source: release.source,
    timestamp: release.timestamp,
    reliability: release.reliability === 'high' ? 0.95 : release.reliability === 'medium' ? 0.75 : 0.5,
    title: release.title,
    date: release.date,
    content: release.content,
    outcomes: [],
    voteResult: 'not_present',
    type: 'press_release',
    engagementScore: 0,
    numComments: 0
  };
}

function mapIncidentReport(report: IncidentReport): CivicEntity {
  return {
    id: report.id || crypto.randomUUID(),
    source: report.source,
    timestamp: report.timestamp,
    reliability: report.reliability === 'high' ? 0.95 : report.reliability === 'medium' ? 0.75 : 0.5,
    title: report.type,
    date: report.date,
    content: report.description,
    outcomes: [],
    voteResult: 'not_present',
    type: 'incident_report',
    engagementScore: 0,
    numComments: 0
  };
}

function mapCourtDocument(document: CourtDocument): CivicEntity {
  return {
    id: document.id || document.caseNumber || crypto.randomUUID(),
    source: document.source,
    timestamp: document.timestamp,
    reliability: document.reliability === 'high' ? 0.95 : document.reliability === 'medium' ? 0.75 : 0.5,
    title: document.title,
    date: document.date,
    content: document.content,
    outcomes: [],
    voteResult: 'not_present',
    type: 'court_document',
    engagementScore: 0,
    numComments: 0
  };
}

export function mapToCivicNews(release: PressRelease): CivicEntity {
  return {
    id: release.id || crypto.randomUUID(),
    source: release.source,
    timestamp: release.timestamp,
    reliability: release.reliability === 'high' ? 0.95 : release.reliability === 'medium' ? 0.75 : 0.5,
    title: release.title || 'News Release',
    date: release.date || new Date().toISOString().slice(0,10),
    content: release.content || 'Government news release content',
    outcomes: [],
    voteResult: 'not_present',
    type: 'press_release',
    engagementScore: 0,
    numComments: 0
  };
}

export function mapToCourtCase(document: CourtDocument): CivicEntity {
  return {
    id: document.id || document.caseNumber || crypto.randomUUID(),
    source: document.source,
    timestamp: document.timestamp,
    reliability: document.reliability === 'high' ? 0.95 : document.reliability === 'medium' ? 0.75 : 0.5,
    title: document.title || document.caseNumber || 'Court Case',
    date: document.date || '1970-01-01',
    content: document.content || 'Court document content',
    outcomes: [],
    voteResult: 'not_present',
    type: 'court_document',
    engagementScore: 0,
    numComments: 0
  };
}

export function mapSheriffDeptToSchema(rawData: SheriffDeptData): CivicEntity[] {
  const entities: CivicEntity[] = [];

  // Process press releases
  if (rawData.pressReleases?.length > 0) {
    rawData.pressReleases.forEach(release => {
      entities.push(mapPressRelease(release));
    });
  }

  // Process incident reports
  if (rawData.incidentReports?.length > 0) {
    rawData.incidentReports.forEach(report => {
      entities.push(mapIncidentReport(report));
    });
  }

  // Process court documents
  if (rawData.courtDocuments?.length > 0) {
    rawData.courtDocuments.forEach(document => {
      entities.push(mapCourtDocument(document));
    });
  }

  return entities;
}