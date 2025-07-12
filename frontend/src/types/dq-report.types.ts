export interface DQReportMetadata {
    reporting_date: string;
    delivering_entity_code: string;
    delivering_entity_name: string;
    country: string;
    generated_at: string;
  }
  
  export interface PortfolioData {
    type: string;
    criteria: string;
    currency: string;
    no_of_contracts: number;
    weighted_irr_nominal: number;
    nbv_local_cms: number;
    gross_exposure: number;
    net_book_value: number;
    delinquent_amount: number;
    downpayment: number;
  }
  
  export interface OverviewSummary {
    total_contracts: number;
    total_delinquent_amount: number;
    delinquency_rate: number;
  }
  
  export interface IssueIdentified {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    impact: string;
  }
  
  export interface OverviewData {
    portfolios: PortfolioData[];
    summary: OverviewSummary;
    issues_identified: IssueIdentified[];
  }
  
  export interface WriteoffData {
    type: string;
    criteria: string;
    currency: string;
    number_of_contracts: number;
    net_loss_amount: number;
    remarketing_net_proceed: number;
    writeoff_recovery_amount: number;
    net_rv_loss_amount: number;
  }
  
  export interface WriteoffSummary {
    total_net_loss: number;
    new_writeoffs_count: number;
  }
  
  export interface WriteoffSection {
    writeoffs: WriteoffData[];
    summary: WriteoffSummary;
    flags: {
      has_new_writeoffs: boolean;
      significant_loss: boolean;
    };
  }
  
  export interface ErrorData {
    description: string;
    currency: string;
    contract_count: number;
    net_book_value: number;
  }
  
  export interface ErrorSection {
    errors: ErrorData[];
    error_details: any[];
    summary: {
      total_error_contracts: number;
      negative_amount_issues: number;
    };
  }
  
  export interface WarningData {
    description: string;
    currency: string;
    contracts: number;
    netbook_value_local: number;
  }
  
  export interface WarningSection {
    warnings: WarningData[];
    warning_details: any[];
    summary: {
      total_warning_contracts: number;
      rule_confirmation_issues: number;
    };
  }
  
  export interface AdditionalInfoSection {
    changes: Record<string, number>;
    summary: {
      total_changes: number;
      high_impact_changes_count: number;
      contract_related_changes: number;
    };
    categories?: {
      high_impact: Record<string, number>;
      contract_related: Record<string, number>;
    };
  }
  
  export interface RiskAnalysis {
    risk_score: number;
    priority_areas: string[];
    trends: Record<string, any>;
    thresholds_breached: Array<{
      metric: string;
      value: number;
      threshold: number;
    }>;
  }
  
  export interface DQReport {
    metadata: DQReportMetadata;
    overview: OverviewData;
    writeoffs: WriteoffSection;
    errors: ErrorSection;
    warnings: WarningSection;
    additional_info: AdditionalInfoSection;
    risk_analysis: RiskAnalysis;
    country: string;
    generated_at: string;
  }