// src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { ChatAssistant } from '../components/ChatAssistant';



// API Types
interface Question {
  id: string;
  category: string;
  priority: 'low' | 'high' | 'critical';
  question_text: string;
  context: string;
  expected_response_type: string;
  related_data: Record<string, any>;
  order_sequence: number;
  generated_by_ai: boolean;
  confidence_score: number;
}

interface QuestionnaireData {
  country: string;
  entity: string;
  report_date: string;
  questions: Question[];
  summary: {
    total_questions: number;
    high_priority: number;
    critical_priority: number;
    categories: string[];
    requires_immediate_attention: boolean;
    data_points_analyzed: number;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  timestamp: string;
}

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://dqagent.azurewebsites.net/api';

// API Functions
const apiClient = {
  async generateQuestionnaire(country: string, month: string): Promise<QuestionnaireData> {
    console.log(`Making API call to: ${API_BASE_URL}/questionnaire/generate`);
    console.log(`Payload:`, { country, month });
    
    const response = await fetch(`${API_BASE_URL}/questionnaire/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        country: country,
        month: month
      })
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error:`, errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log(`API Response:`, data);
    return data;
  },

  async getCountryMetrics(country: string, month: string) {
    console.log(`Fetching country metrics for ${country}, ${month}`);
    const response = await fetch(`${API_BASE_URL}/country-metrics/${country}/${month}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result: ApiResponse = await response.json();
    console.log('Country metrics response:', result);
    return result.data;
  },

  async healthCheck() {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  }
};

// Utility function to convert date format
const formatDateForAPI = (dateStr: string): string => {
  // Convert "June 2025" to "2025-06-01"
  const monthMap: Record<string, string> = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };
  
  const [month, year] = dateStr.split(' ');
  const monthNum = monthMap[month] || '01';
  return `${year}-${monthNum}-01`;
};

// Convert country name to country code
const getCountryCode = (countryName: string): string => {
  const countryMap: Record<string, string> = {
    'Netherlands': 'NL',
    'Germany': 'DE',
    'Spain': 'ES'
  };
  return countryMap[countryName] || 'NL';
};

// Questionnaire Component
const Questionnaire: React.FC<{ 
  selectedCountry: string;
  selectedDate: string;
  questionnaireData: QuestionnaireData | null;
  setQuestionnaireData: (data: QuestionnaireData | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  error: string | null;
  setError: (error: string | null) => void;
  onOpenChat: () => void;
}> = ({ 
  selectedCountry, 
  selectedDate, 
  questionnaireData, 
  setQuestionnaireData, 
  loading, 
  setLoading, 
  error, 
  setError,
  onOpenChat
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, string>>({});

  // Load questionnaire data when country or date changes
  useEffect(() => {
    const loadQuestionnaire = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const countryCode = getCountryCode(selectedCountry);
        const formattedDate = formatDateForAPI(selectedDate);
        
        console.log(`Generating questionnaire for ${countryCode} (${selectedCountry}) for ${formattedDate}`);
        
        const data = await apiClient.generateQuestionnaire(countryCode, formattedDate);
        console.log('Received questionnaire data:', data);
        
        setQuestionnaireData(data);
        setCurrentQuestionIndex(0);
        setResponses({});
      } catch (err) {
        console.error('Failed to load questionnaire:', err);
        setError(err instanceof Error ? err.message : 'Failed to load questionnaire. Please check the console for more details.');
      } finally {
        setLoading(false);
      }
    };

    // Only load if we're on the questionnaire tab
    if (selectedCountry && selectedDate) {
      loadQuestionnaire();
    }
  }, [selectedCountry, selectedDate, setLoading, setError, setQuestionnaireData]);

  const handleResponseChange = (questionId: string, response: string) => {
    setResponses(prev => ({
      ...prev,
      [questionId]: response
    }));
  };

  const handleNextQuestion = () => {
    if (questionnaireData && currentQuestionIndex < questionnaireData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Updated questionnaire loading section in Dashboard.tsx
  if (loading) {
    return (
      <div style={{ padding: '32px', background: '#FAFBFC', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ 
          background: 'white',
          borderRadius: '12px',
          padding: '40px',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E5E7EB',
          maxWidth: '400px'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid #E5E7EB', 
            borderTop: '3px solid #6366F1', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }}></div>
          <style>
            {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
          </style>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
            Generating Questionnaire
          </h3>
          <p style={{ margin: '0', color: '#64748B', fontSize: '14px' }}>
            Analyzing data for {selectedCountry} ({selectedDate})...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', background: '#FAFBFC', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', maxWidth: '600px' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#DC2626' }}>
            Error Loading Questionnaire
          </h3>
          <p style={{ margin: '0 0 16px 0', color: '#64748B', fontSize: '14px', lineHeight: '1.5' }}>
            {error}
          </p>
          <div style={{ 
            background: '#F9FAFB', 
            border: '1px solid #E5E7EB', 
            borderRadius: '6px', 
            padding: '12px', 
            marginBottom: '16px',
            fontSize: '12px',
            color: '#6B7280',
            textAlign: 'left'
          }}>
            <strong>Debug Info:</strong><br/>
            Country: {selectedCountry} → {getCountryCode(selectedCountry)}<br/>
            Date: {selectedDate} → {formatDateForAPI(selectedDate)}<br/>
            API URL: {API_BASE_URL}/questionnaire/generate
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: '#6366F1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
            <button
              onClick={onOpenChat}
              style={{
                background: '#F3F4F6',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Ask AI Assistant
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!questionnaireData || questionnaireData.questions.length === 0) {
    return (
      <div style={{ padding: '32px', background: '#FAFBFC', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>📝</div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
            No Questions Available
          </h3>
          <p style={{ margin: '0 0 16px 0', color: '#64748B' }}>
            No questionnaire data found for {selectedCountry} in {selectedDate}
          </p>
          <button
            onClick={onOpenChat}
            style={{
              background: '#6366F1',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Ask AI Assistant
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questionnaireData.questions[currentQuestionIndex];
  const completedQuestions = Object.keys(responses).length;
  const progressPercentage = (completedQuestions / questionnaireData.questions.length) * 100;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#DC2626';
      case 'high': return '#F59E0B';
      default: return '#6B7280';
    }
  };

  const getPriorityBackground = (priority: string) => {
    switch (priority) {
      case 'critical': return '#FEF2F2';
      case 'high': return '#FFFBEB';
      default: return '#F9FAFB';
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'critical': return '#FECACA';
      case 'high': return '#FEF3C7';
      default: return '#E5E7EB';
    }
  };

  return (
    <div style={{ padding: '32px', background: '#FAFBFC', height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Questionnaire Header */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
              CDAA Questionnaire
            </h2>
            <button
              onClick={onOpenChat}
              style={{
                background: '#6366F1',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
              title="Open Chat Assistant"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 2H4C2.9 2 2.01 2.9 2.01 4L2 22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM18 14H6V12H18V14ZM18 11H6V9H18V11ZM18 8H6V6H18V8Z" fill="white"/>
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Country: {selectedCountry} - Entity {getCountryCode(selectedCountry) === 'NL' ? '76' : getCountryCode(selectedCountry) === 'DE' ? '77' : '78'}
            </div>
            
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Report Date: {questionnaireData?.report_date || formatDateForAPI(selectedDate)}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {questionnaireData?.summary.high_priority > 0 && (
                <span style={{
                  background: '#FEF3C7',
                  color: '#92400E',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  ⚠ {questionnaireData.summary.high_priority} High
                </span>
              )}
              {questionnaireData?.summary.critical_priority > 0 && (
                <span style={{
                  background: '#FEE2E2',
                  color: '#DC2626',
                  padding: '4px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '600'
                }}>
                  🔴 {questionnaireData.summary.critical_priority} Critical
                </span>
              )}
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Progress:</div>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                {currentQuestionIndex + 1} of {questionnaireData.questions.length} completed
              </div>
              <div style={{
                width: '120px',
                height: '6px',
                background: '#E5E7EB',
                borderRadius: '3px'
              }}>
                <div style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  background: '#10B981',
                  borderRadius: '3px'
                }}></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{
                background: '#6366F1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}>
                Submit All
              </button>
            </div>
          </div>
        </div>

        {/* Main Question Area */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden'
        }}>
          {/* Question Header */}
          <div style={{
            background: getPriorityBackground(currentQuestion.priority),
            padding: '16px 20px',
            borderBottom: `1px solid ${getPriorityBorder(currentQuestion.priority)}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: getPriorityColor(currentQuestion.priority),
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                {currentQuestion.priority.toUpperCase()}
              </span>
              <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                {currentQuestion.category}
              </h3>
            </div>
            <div style={{ fontSize: '13px', color: getPriorityColor(currentQuestion.priority), marginBottom: '4px' }}>
              AI-Generated Question • {currentQuestion.generated_by_ai ? 'High' : 'Medium'} Priority Response Required
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              {currentQuestion.context}
            </div>
          </div>

          {/* Question Content */}
          <div style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Question {currentQuestionIndex + 1} of {questionnaireData.questions.length} - {currentQuestion.category}
            </h4>
            
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              {currentQuestion.question_text}
            </p>

            <textarea
              value={responses[currentQuestion.id] || ''}
              onChange={(e) => handleResponseChange(currentQuestion.id, e.target.value)}
              placeholder="Enter your response here..."
              style={{
                width: '100%',
                height: '120px',
                padding: '12px',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                fontSize: '14px',
                resize: 'vertical',
                fontFamily: 'inherit',
                marginBottom: '20px'
              }}
            />

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  onClick={handlePreviousQuestion}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    background: currentQuestionIndex === 0 ? '#9CA3AF' : '#F3F4F6',
                    color: currentQuestionIndex === 0 ? 'white' : '#374151',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    cursor: currentQuestionIndex === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                
                <button 
                  onClick={handleNextQuestion}
                  disabled={currentQuestionIndex === questionnaireData.questions.length - 1}
                  style={{
                    background: currentQuestionIndex === questionnaireData.questions.length - 1 ? '#9CA3AF' : '#6366F1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '10px 20px',
                    fontSize: '14px',
                    cursor: currentQuestionIndex === questionnaireData.questions.length - 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  {currentQuestionIndex === questionnaireData.questions.length - 1 ? 'Complete' : 'Next Question'}
                </button>
              </div>
              
              <button 
                onClick={() => {
                  console.log('Saving draft...', responses);
                  alert('Draft saved successfully!');
                }}
                style={{
                  background: '#F3F4F6',
                  color: '#374151',
                  border: '1px solid #D1D5DB',
                  borderRadius: '6px',
                  padding: '10px 20px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// AI Insights Component
const AIInsights: React.FC<{
  selectedCountry: string;
  selectedDate: string;
  onOpenChat: () => void;
}> = ({ selectedCountry, selectedDate, onOpenChat }) => {
  const [groupTypes, setGroupTypes] = useState<string[]>([]);
  const [selectedGroupType, setSelectedGroupType] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('IRR (%)');
  const [allMetrics, setAllMetrics] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGroupTypeDropdown, setShowGroupTypeDropdown] = useState(false);
  const [showMetricDropdown, setShowMetricDropdown] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const metrics = ['IRR (%)', 'NBV (€)', 'Delinquency (%)', 'Contracts (#)'];

  // Load all metrics data when country/date changes
  useEffect(() => {
    const loadAllMetrics = async () => {
      setLoading(true);
      try {
        const countryCode = getCountryCode(selectedCountry);
        const formattedDate = formatDateForAPI(selectedDate);
        
        const data = await apiClient.getCountryMetrics(countryCode, formattedDate);
        const metricsArray = data.metrics || [];
        
        console.log('All metrics data:', metricsArray);
        setAllMetrics(metricsArray);
        
        // Extract unique group types
        const uniqueGroupTypes = Array.from(new Set(metricsArray.map((item: any) => item.group_type))).filter(Boolean) as string[];
        console.log('Extracted group types:', uniqueGroupTypes);
        setGroupTypes(uniqueGroupTypes);
        
        // Set default to brand_/_segment if available, otherwise first type
        const defaultType = uniqueGroupTypes.find(type => type === 'brand_/_segment') || uniqueGroupTypes[0] || '';
        setSelectedGroupType(defaultType);
        
      } catch (error) {
        console.error('Failed to load metrics:', error);
        setAllMetrics([]);
        setGroupTypes([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllMetrics();
  }, [selectedCountry, selectedDate]);

  // Filter heatmap data when group type changes
  useEffect(() => {
    if (!selectedGroupType || !allMetrics.length) {
      setHeatmapData([]);
      return;
    }
    
    // Filter the data by selected group type
    const filteredData = allMetrics.filter((item: any) => item.group_type === selectedGroupType);
    console.log(`Filtered data for ${selectedGroupType}:`, filteredData);
    setHeatmapData(filteredData);
  }, [selectedGroupType, allMetrics]);

  // Generate AI summary when heatmap data changes
  useEffect(() => {
    const generateSummary = async () => {
      if (!heatmapData.length || !selectedCountry || !selectedDate || !selectedGroupType || !selectedMetric) {
        setAiSummary(null);
        return;
      }

      setAiLoading(true);
      setAiError(null);
      
      try {
        const countryCode = getCountryCode(selectedCountry);
        const formattedDate = formatDateForAPI(selectedDate);
        
        // Call the AI summary endpoint
        console.log(`Calling AI summary endpoint with:`, {
          country: countryCode,
          month: formattedDate,
          group_type: selectedGroupType,
          metric: selectedMetric,
          data_count: heatmapData.length
        });

        const response = await fetch(`${API_BASE_URL}/ai-summary`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            country: countryCode,
            month: formattedDate,
            group_type: selectedGroupType,
            metric: selectedMetric,
            data: heatmapData
          })
        });

        console.log(`AI Summary response status: ${response.status}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AI Summary API Error:`, errorText);
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const result = await response.json();
        console.log(`AI Summary response:`, result);
        
        // Extract the summary from the nested data structure
        const summaryText = result.data?.summary || result.summary || result.analysis || result.message || 'AI analysis completed';
        setAiSummary(summaryText);
      } catch (error) {
        console.error('Failed to generate AI summary:', error);
        setAiError(error instanceof Error ? error.message : 'Failed to generate AI summary');
      } finally {
        setAiLoading(false);
      }
    };

    // Debounce the API call to avoid too many requests
    const timeoutId = setTimeout(generateSummary, 500);
    return () => clearTimeout(timeoutId);
  }, [heatmapData, selectedCountry, selectedDate, selectedGroupType, selectedMetric]);

  const getMetricValue = (item: any, metric: string) => {
    switch (metric) {
      case 'IRR (%)':
        return item.irr_nominal || 0;
      case 'NBV (€)':
        return item.net_book_value || 0;
      case 'Delinquency (%)':
        return ((item.delinquent_amount || 0) / (item.net_book_value || 1)) * 100;
      case 'Contracts (#)':
        return item.num_contracts || 0;
      default:
        return 0;
    }
  };

  const formatMetricDisplay = (value: number, metric: string) => {
    switch (metric) {
      case 'IRR (%)':
        return `${(value * 100).toFixed(1)}%`;  // Convert decimal to percentage
      case 'NBV (€)':
        return `€${(value / 1000000).toFixed(0)}M`;
      case 'Delinquency (%)':
        return `${value.toFixed(2)}%`;
      case 'Contracts (#)':
        return value.toLocaleString();
      default:
        return value.toString();
    }
  };

  const getHeatmapColor = (value: number, metric: string) => {
    if (metric === 'IRR (%)')  {
      // Green gradient for IRR (higher is better)
      if (value >= 6.0) return '#10B981'; // Strong green
      if (value >= 5.0) return '#34D399'; // Medium green
      if (value >= 4.0) return '#6EE7B7'; // Light green
      return '#A7F3D0'; // Very light green
    } else if (metric === 'Delinquency (%)') {
      // Red gradient for delinquency (lower is better)
      if (value >= 3.0) return '#DC2626'; // Dark red
      if (value >= 1.5) return '#EF4444'; // Medium red
      if (value >= 0.5) return '#F87171'; // Light red
      return '#FCA5A5'; // Very light red
    } else if (metric === 'NBV (€)') {
      // Blue gradient for NBV (higher is better)
      if (value >= 300000000) return '#1E40AF'; // Dark blue
      if (value >= 200000000) return '#3B82F6'; // Medium blue
      if (value >= 100000000) return '#60A5FA'; // Light blue
      return '#93C5FD'; // Very light blue
    } else {
      // Purple gradient for contracts (higher is better)
      if (value >= 5000) return '#7C3AED'; // Dark purple
      if (value >= 1000) return '#8B5CF6'; // Medium purple
      if (value >= 500) return '#A78BFA'; // Light purple
      return '#C4B5FD'; // Very light purple
    }
  };

  return (
    <div style={{ padding: '32px', background: '#FAFBFC', height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: '0', fontSize: '28px', fontWeight: '700', color: '#1E293B' }}>
            AI Insights Dashboard
          </h2>
        </div>

        {/* Main Content: Heat Map + AI Panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '32px' }}>
          
          {/* Left Side: Performance Heat Map */}
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '20px', fontWeight: '600', color: '#374151' }}>
              Portfolio Performance Heat Map
            </h3>
            
            {/* Controls */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#6B7280', marginBottom: '8px', display: 'block' }}>
                  View Type:
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowGroupTypeDropdown(!showGroupTypeDropdown)}
                    disabled={loading || groupTypes.length === 0}
                    style={{
                      background: 'white',
                      border: '2px solid #6366F1',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      minWidth: '200px',
                      cursor: loading || groupTypes.length === 0 ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      opacity: loading || groupTypes.length === 0 ? 0.6 : 1
                    }}
                  >
                    {loading ? 'Loading...' : (selectedGroupType || 'Select type...')} ▼
                  </button>
                  
                  {showGroupTypeDropdown && groupTypes.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {groupTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedGroupType(type);
                            setShowGroupTypeDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '14px',
                            border: 'none',
                            background: type === selectedGroupType ? '#F3F4F6' : 'white',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#6B7280', marginBottom: '8px', display: 'block' }}>
                  Metric:
                </label>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowMetricDropdown(!showMetricDropdown)}
                    style={{
                      background: 'white',
                      border: '1px solid #D1D5DB',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      minWidth: '150px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    {selectedMetric} ▼
                  </button>
                  
                  {showMetricDropdown && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #E2E8F0',
                      borderRadius: '6px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      zIndex: 1000,
                      marginTop: '4px'
                    }}>
                      {metrics.map(metric => (
                        <button
                          key={metric}
                          onClick={() => {
                            setSelectedMetric(metric);
                            setShowMetricDropdown(false);
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            fontSize: '14px',
                            border: 'none',
                            background: metric === selectedMetric ? '#F3F4F6' : 'white',
                            cursor: 'pointer',
                            textAlign: 'left'
                          }}
                        >
                          {metric}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{ alignSelf: 'flex-end' }}>
                <button
                  onClick={() => {
                    // Refresh by reloading the data
                    const loadData = async () => {
                      const countryCode = getCountryCode(selectedCountry);
                      const formattedDate = formatDateForAPI(selectedDate);
                      try {
                        const data = await apiClient.getCountryMetrics(countryCode, formattedDate);
                        setAllMetrics(data.metrics || []);
                      } catch (error) {
                        console.error('Failed to refresh data:', error);
                      }
                    };
                    loadData();
                  }}
                  style={{
                    background: 'white',
                    border: '1px solid #D1D5DB',
                    borderRadius: '8px',
                    padding: '12px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Refresh Data"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10C21 10 18.995 7.26822 17.3662 5.63824C15.7373 4.00827 13.4864 3 11 3C6.02944 3 2 7.02944 2 12C2 16.9706 6.02944 21 11 21C15.1031 21 18.5649 18.2543 19.6482 14.5M21 10V4M21 10H15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Data Summary */}
            <div style={{ 
              background: '#F8FAFC', 
              border: '1px solid #E2E8F0', 
              borderRadius: '6px', 
              padding: '12px', 
              marginBottom: '16px',
              fontSize: '12px',
              color: '#6B7280'
            }}>
              <strong>Data Summary:</strong> 
              {loading ? ' Loading...' : 
               ` Total records: ${allMetrics.length} • Available group types: ${groupTypes.length} • 
                 Current filter: ${selectedGroupType || 'None'} (${heatmapData.length} records)`}
            </div>

            {/* Heat Map */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                {selectedMetric} by {selectedGroupType || 'Group Type'}
              </h4>
              
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
                  <p>Loading data from country-metrics endpoint...</p>
                </div>
              ) : heatmapData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', background: 'white', borderRadius: '8px' }}>
                  <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
                  <p>No data available for {selectedGroupType || 'selected filter'}</p>
                  <p style={{ fontSize: '12px', color: '#6B7280' }}>
                    Available group types: {groupTypes.join(', ')}
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                  {heatmapData.map((item, index) => {
                    const value = getMetricValue(item, selectedMetric);
                    const displayValue = formatMetricDisplay(value, selectedMetric);
                    const color = getHeatmapColor(value, selectedMetric);
                    
                    return (
                      <div
                        key={index}
                        style={{
                          background: color,
                          borderRadius: '10px',
                          padding: '12px',
                          textAlign: 'center',
                          color: 'white',
                          fontWeight: '600',
                          minHeight: '80px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center'
                        }}
                      >
                        <div style={{ fontSize: '18px', marginBottom: '3px' }}>{displayValue}</div>
                        <div style={{ fontSize: '12px', marginBottom: '4px' }}>
                          €{((item.net_book_value || 0) / 1000000).toFixed(0)}M
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: '500' }}>
                          {item.group_name || 'Unknown'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              {heatmapData.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                    {selectedMetric} Scale
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>
                      {selectedMetric === 'Delinquency (%)' ? 'Better' : 'Lower'}
                    </span>
                    <div style={{ display: 'flex', height: '20px', width: '200px', borderRadius: '10px', overflow: 'hidden' }}>
                      <div style={{ background: selectedMetric === 'Delinquency (%)' ? '#FCA5A5' : '#A7F3D0', flex: 1 }}></div>
                      <div style={{ background: selectedMetric === 'Delinquency (%)' ? '#F87171' : '#6EE7B7', flex: 1 }}></div>
                      <div style={{ background: selectedMetric === 'Delinquency (%)' ? '#EF4444' : '#34D399', flex: 1 }}></div>
                      <div style={{ background: selectedMetric === 'Delinquency (%)' ? '#DC2626' : '#10B981', flex: 1 }}></div>
                    </div>
                    <span style={{ fontSize: '12px', color: '#6B7280' }}>
                      {selectedMetric === 'Delinquency (%)' ? 'Worse' : 'Higher'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Side: AI Insights Panel */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '600', color: '#374151' }}>
                AI Analysis
              </h3>
              <button
                onClick={onOpenChat}
                style={{
                  background: '#6366F1',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                }}
                title="Open Chat Assistant"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M20 2H4C2.9 2 2.01 2.9 2.01 4L2 22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2ZM18 14H6V12H18V14ZM18 11H6V9H18V11ZM18 8H6V6H18V8Z" fill="white"/>
                </svg>
              </button>
            </div>
            
            {aiLoading ? (
              <div style={{ 
                background: 'white',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  border: '3px solid #E5E7EB', 
                  borderTop: '3px solid #6366F1', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px auto'
                }}></div>
                <style>
                  {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
                </style>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                  Generating Analysis...
                </h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#6B7280' }}>
                  Analyzing {heatmapData.length} records for {selectedGroupType} {selectedMetric}
                </p>
              </div>
            ) : aiError ? (
              <div style={{ 
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                border: '1px solid #E5E7EB',
                borderLeft: '4px solid #DC2626'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '20px' }}>⚠️</span>
                  <span style={{
                    background: '#DC2626',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>ERROR</span>
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>
                  AI Analysis Failed
                </h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
                  {aiError}
                </p>
                <button
                  onClick={() => {
                    setAiError(null);
                    // Trigger a retry by updating one of the dependencies
                    setHeatmapData([...heatmapData]);
                  }}
                  style={{
                    marginTop: '12px',
                    background: '#6366F1',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '8px 16px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Retry Analysis
                </button>
              </div>
            ) : aiSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* AI Generated Summary */}
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #E5E7EB',
                  borderLeft: '4px solid #6366F1'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
                      {selectedMetric} Analysis for {selectedGroupType}
                    </h4>
                  </div>
                  <div style={{ 
                    fontSize: '13px', 
                    color: '#374151', 
                    lineHeight: '1.7',
                    whiteSpace: 'pre-wrap'
                  }}>
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: aiSummary
                          // Remove the executive summary header line
                          .replace(/\*\*Executive Summary:[^*]*\*\*\s*\n*/g, '')
                          // Convert numbered section headers (e.g., **1. Key Findings**)
                          .replace(/\*\*(\d+\.\s*[^*]+)\*\*/g, '<h4 style="font-size: 15px; font-weight: 700; color: #1F2937; margin: 20px 0 12px 0; border-bottom: 2px solid #6366F1; padding-bottom: 6px; display: inline-block;">$1</h4>')
                          // Convert subsection headers (e.g., **Segment Performance:**)
                          .replace(/\*\*([^*]+:)\*\*/g, '<h5 style="font-size: 14px; font-weight: 600; color: #374151; margin: 12px 0 6px 0;">$1</h5>')
                          // Convert other **bold** text
                          .replace(/\*\*([^*]+)\*\*/g, '<strong style="font-weight: 600; color: #1F2937;">$1</strong>')
                          // Convert main bullet points (•)
                          .replace(/^• (.+)$/gm, '<div style="margin: 8px 0; padding-left: 20px; position: relative; line-height: 1.6;"><span style="position: absolute; left: 0; color: #6366F1; font-weight: bold; font-size: 14px;">•</span>$1</div>')
                          // Convert sub-bullet points with dashes (-)
                          .replace(/^\s*- (.+)$/gm, '<div style="margin: 4px 0 4px 20px; padding-left: 20px; position: relative; line-height: 1.5; font-size: 12px;"><span style="position: absolute; left: 0; color: #8B5CF6; font-weight: bold;">–</span>$1</div>')
                          // Add spacing after horizontal rules
                          .replace(/---/g, '<hr style="border: none; border-top: 1px solid #E5E7EB; margin: 16px 0;" />')
                          // Convert double line breaks to spacing
                          .replace(/\n\n/g, '<div style="margin: 12px 0;"></div>')
                          // Convert single line breaks
                          .replace(/\n/g, '<br />')
                      }}
                    />
                  </div>
                  <div style={{ 
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: '#F8FAFC',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#6B7280'
                  }}>
                    Analysis based on {heatmapData.length} records • Updated {new Date().toLocaleTimeString()}
                  </div>
                </div>

                {/* Quick Stats Summary */}
                <div style={{
                  background: 'white',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                  border: '1px solid #E5E7EB'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '20px' }}>📊</span>
                    <h4 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                      Quick Stats
                    </h4>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '12px' }}>Records</div>
                      <div style={{ fontWeight: '600', color: '#1F2937' }}>{heatmapData.length}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '12px' }}>Group Type</div>
                      <div style={{ fontWeight: '600', color: '#1F2937' }}>{selectedGroupType}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '12px' }}>Metric</div>
                      <div style={{ fontWeight: '600', color: '#1F2937' }}>{selectedMetric}</div>
                    </div>
                    <div>
                      <div style={{ color: '#6B7280', fontSize: '12px' }}>Country</div>
                      <div style={{ fontWeight: '600', color: '#1F2937' }}>{selectedCountry}</div>
                    </div>
                  </div>
                </div>

                {/* Manual Refresh Button */}
                <button
                  onClick={() => {
                    setAiSummary(null);
                    setHeatmapData([...heatmapData]); // Trigger re-analysis
                  }}
                  style={{
                    background: 'white',
                    border: '1px solid #D1D5DB',
                    borderRadius: '6px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 10C21 10 18.995 7.26822 17.3662 5.63824C15.7373 4.00827 13.4864 3 11 3C6.02944 3 2 7.02944 2 12C2 16.9706 6.02944 21 11 21C15.1031 21 18.5649 18.2543 19.6482 14.5M21 10V4M21 10H15" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Regenerate Analysis
                </button>

              </div>
            ) : (
              <div style={{ 
                background: 'white',
                borderRadius: '12px',
                padding: '40px',
                textAlign: 'center',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                border: '1px solid #E5E7EB'
              }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>📈</div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                  Analysis Ready
                </h4>
                <p style={{ margin: '0', fontSize: '14px', color: '#6B7280' }}>
                  Select a view type and metric to see insights
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export const Dashboard = () => {
  const [selectedCountry, setSelectedCountry] = useState('Netherlands');
  const [selectedDate, setSelectedDate] = useState('May 2025');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState('questionnaire');
  const [showChatModal, setShowChatModal] = useState(false);
  
  // Questionnaire state - moved to parent to share with sidebar
  const [questionnaireData, setQuestionnaireData] = useState<QuestionnaireData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countries = ['Netherlands', 'Germany', 'Spain'];
  const dates = ['May 2025', 'April 2025', 'March 2025'];

  const handleOpenChat = () => {
    setShowChatModal(true);
  };

  const handleCloseChat = () => {
    setShowChatModal(false);
  };

  const renderMainContent = () => {
    switch (activeTab) {
      case 'questionnaire':
        return (
          <Questionnaire 
            selectedCountry={selectedCountry}
            selectedDate={selectedDate}
            questionnaireData={questionnaireData}
            setQuestionnaireData={setQuestionnaireData}
            loading={loading}
            setLoading={setLoading}
            error={error}
            setError={setError}
            onOpenChat={handleOpenChat}
          />
        );
      case 'insights':
        return (
          <AIInsights 
            selectedCountry={selectedCountry}
            selectedDate={selectedDate}
            onOpenChat={handleOpenChat}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'Inter, system-ui, sans-serif',
      backgroundColor: '#FAFBFC'
    }}>
      {/* Header */}
      <header style={{
        height: '80px',
        background: 'linear-gradient(90deg, #6366F1 0%, #8B5CF6 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        color: 'white'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '700',
            color: 'white'
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 17h2a3 3 0 0 0 6 0h2a3 3 0 0 0 6 0h2v-5l-3-4h-2V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v11z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6" cy="17" r="2" stroke="white" strokeWidth="2"/>
              <circle cx="18" cy="17" r="2" stroke="white" strokeWidth="2"/>
              <path d="M15 5v3h3l2 2" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1 style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>
              CDAA AI Assistant
            </h1>
            <p style={{ margin: '0', fontSize: '14px', opacity: '0.8' }}>
              Daimler Truck Financial Services
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Country Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
              style={{
                background: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#1E293B',
                minWidth: '120px',
                textAlign: 'left'
              }}
            >
              {selectedCountry} ▼
            </button>
            
            {showCountryDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                marginTop: '4px'
              }}>
                {countries.map(country => (
                  <button
                    key={country}
                    onClick={() => {
                      setSelectedCountry(country);
                      setShowCountryDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: 'none',
                      background: 'white',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {country}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date Dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setShowDateDropdown(!showDateDropdown)}
              style={{
                background: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
                fontSize: '14px',
                color: '#1E293B',
                minWidth: '120px',
                textAlign: 'left'
              }}
            >
              {selectedDate} ▼
            </button>
            
            {showDateDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '6px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                marginTop: '4px'
              }}>
                {dates.map(date => (
                  <button
                    key={date}
                    onClick={() => {
                      setSelectedDate(date);
                      setShowDateDropdown(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: '14px',
                      border: 'none',
                      background: 'white',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    {date}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={{
            width: '40px',
            height: '40px',
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            DT
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1 }}>
        {/* Sidebar */}
        <aside style={{
          width: '280px',
          background: 'white',
          borderRight: '1px solid #E2E8F0',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Tabs */}
          <div style={{ borderBottom: '1px solid #E2E8F0' }}>
            <div style={{ display: 'flex' }}>
              {[
                { key: 'questionnaire', label: 'Questionnaire' },
                { key: 'insights', label: 'AI Insights' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    fontWeight: '500',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    borderBottom: activeTab === tab.key ? '2px solid #6366F1' : '2px solid transparent',
                    color: activeTab === tab.key ? '#6366F1' : '#64748B',
                    position: 'relative',
                    flex: 1
                  }}
                >
                  <span style={{ 
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {tab.key === 'questionnaire' ? 'Questionnaire' : tab.key === 'insights' ? 'AI Insights' : tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            {activeTab === 'questionnaire' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
                  Data Quality Questionnaire
                </h3>
                <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px' }}>
                  Current Selection: {selectedCountry} • {selectedDate}
                </div>
                <div style={{
                  padding: '12px',
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>Status</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>
                    {loading ? '🔄 Loading questions...' : 
                     error ? '❌ Error occurred' :
                     questionnaireData ? `✅ ${questionnaireData.questions.length} questions loaded` :
                     '⏳ Ready to load'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
                  Quick Actions
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderLeft: '4px solid #6366F1',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      Export Report
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Download current metrics
                    </div>
                  </div>
                  <div style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderLeft: '4px solid #6366F1',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      Send Email
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Share summary with team
                    </div>
                  </div>
                  <div style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderLeft: '4px solid #6366F1',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      Schedule Meeting
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Plan team discussion
                    </div>
                  </div>
                  <div style={{
                    background: '#F9FAFB',
                    border: '1px solid #E5E7EB',
                    borderLeft: '4px solid #6366F1',
                    borderRadius: '6px',
                    padding: '10px',
                    cursor: 'pointer'
                  }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      Setup Alerts
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Configure notifications
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderMainContent()}
        </div>

        {/* Chat Assistant Modal */}
        <ChatAssistant
          isOpen={showChatModal}
          onClose={handleCloseChat}
          selectedCountry={selectedCountry}
          selectedDate={selectedDate}
          apiBaseUrl={API_BASE_URL}
        />
      </div>
    </div>
  );
};