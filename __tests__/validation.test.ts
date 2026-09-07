import { mapSheriffDeptToSchema, mapToCivicNews, mapToCourtCase } from './mapper';
import { SheriffDeptData } from './types';
import { PressRelease, IncidentReport, CourtDocument } from './scraper';

describe('Gov-Data Connector Validation', () => {
  test('maps press releases correctly', () => {
    const mockData: SheriffDeptData = {
      pressReleases: [{
        id: 'pr1',
        source: '/api/v1/commission',
        timestamp: '2023-03-15T14:30:00Z',
        reliability: 'high',
        title: 'City Council Meeting',
        date: '2023-03-15',
        content: 'Public meeting minutes from March 15, 2023'
      }],
      incidentReports: [],
      courtDocuments: []
    };
    
    const entities = mapSheriffDeptToSchema(mockData);
    expect(entities.length).toBe(1);
    
    const entity = entities[0];
    expect(entity.id).toBe('pr1');
    expect(entity.source).toBe('/api/v1/commission');
    expect(entity.title).toBe('City Council Meeting');
    expect(entity.reliability).toBe(0.95);
  });

  test('maps incident reports correctly', () => {
    const mockData: SheriffDeptData = {
      pressReleases: [],
      incidentReports: [{
        id: 'ir1',
        source: '/api/v1/incident',
        timestamp: '2023-03-14T09:15:00Z',
        reliability: 'medium',
        type: 'court',
        description: 'Property dispute civil case',
        date: '2023-03-14',
        content: 'Civil case filing in Putnam County Court'
      }],
      courtDocuments: []
    };
    
    const entities = mapSheriffDeptToSchema(mockData);
    expect(entities.length).toBe(1);
    
    const entity = entities[0];
    expect(entity.source).toBe('/api/v1/incident');
    expect(entity.reliability).toBe(0.75);
    expect(entity.content).toContain('Property dispute');
  });

  test('maps court documents correctly', () => {
    const mockData: SheriffDeptData = {
      pressReleases: [],
      incidentReports: [],
      courtDocuments: [{
        id: 'cd1',
        source: '/api/v1/court',
        timestamp: '2023-03-13T16:45:00Z',
        reliability: 'high',
        title: 'State vs. Smith',
        date: '2023-03-13',
        content: 'Criminal case details'
      }]
    };
    
    const entities = mapSheriffDeptToSchema(mockData);
    expect(entities.length).toBe(1);
    
    const entity = entities[0];
    expect(entity.source).toBe('/api/v1/court');
  expect(entity.reliability).toBe(0.95);
  expect(entity.title).toBe('State vs. Smith');
  });

  test('handles empty data', () => {
    const emptyData: SheriffDeptData = {
      pressReleases: [],
      incidentReports: [],
      courtDocuments: []
    };
    
    const entities = mapSheriffDeptToSchema(emptyData);
    expect(entities.length).toBe(0);
  });
});