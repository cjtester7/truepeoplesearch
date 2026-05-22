export interface PersonRecord {
  name: string;
  age: string;
  currentAddress: string;
  pastAddresses: string[];
  phoneNumbers: string[];
  relatives: string[];
  emailAddresses: string[];
}

export type SearchType = "name" | "phone" | "address";

export interface SearchCriteria {
  type: SearchType;
  query: string;
  location: string;
  isDemo?: boolean;
}

export interface SearchCacheItem {
  type: SearchType;
  query: string;
  location: string;
  results: PersonRecord[];
  createdAt: string;
}

export interface ExportHistoryItem {
  userId: string;
  userEmail: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  queryType: string;
  queryText: string;
  exportedCount: number;
  exportedAt: string;
}

export interface SearchSource {
  title: string;
  url: string;
}
