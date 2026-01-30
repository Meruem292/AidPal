
export interface AnalysisResult {
  woundType: string;
  severity: 'Low' | 'Medium' | 'High';
  description: string;
  firstAidSteps: string[];
  recommendation: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  image: string;
  result: AnalysisResult;
}
