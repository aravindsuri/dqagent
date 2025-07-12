export interface AutoSaveStatus {
    enabled: boolean;
    last_saved: Date | null;
    saving: boolean;
    error?: string;
  }
  
  export interface AIAnalysis {
    confidence: number;
    key_insights: string[];
    risk_level: 'low' | 'medium' | 'high';
    requires_attention: boolean;
    patterns_identified: string[];
  }