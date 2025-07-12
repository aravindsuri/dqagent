// src/pages/Dashboard.tsx
import React, { useState } from 'react';

interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

// Chat Component
const Chat: React.FC<{ 
  chatInput: string;
  setChatInput: (input: string) => void;
  chatMessages: ChatMessage[];
  setChatMessages: (messages: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  selectedCountry: string;
  selectedDate: string;
}> = ({ chatInput, setChatInput, chatMessages, setChatMessages, selectedCountry, selectedDate }) => {
  const handleSendMessage = () => {
    if (chatInput.trim()) {
      const newMessage = {
        id: Date.now(),
        text: chatInput,
        isUser: true,
        timestamp: new Date()
      };
      
      setChatMessages(prev => [...prev, newMessage]);
      setChatInput('');
      
      // Simulate AI response
      setTimeout(() => {
        const aiResponse = {
          id: Date.now() + 1,
          text: `I understand you're asking about "${chatInput}". Let me analyze the data quality metrics for ${selectedCountry} in ${selectedDate}. Based on current data, I can provide insights on completion rates, critical issues, and recommendations.`,
          isUser: false,
          timestamp: new Date()
        };
        setChatMessages(prev => [...prev, aiResponse]);
      }, 1000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Chat Messages */}
      <div style={{
        flex: 1,
        padding: '32px',
        overflowY: 'auto',
        background: '#FAFBFC'
      }}>
        {chatMessages.length === 0 ? (
          // Welcome State
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px auto',
              fontSize: '32px'
            }}>
              💬
            </div>

            <h3 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '600', color: '#1E293B' }}>
              How can I help you today?
            </h3>
            
            <p style={{ margin: '0 0 32px 0', fontSize: '16px', color: '#64748B' }}>
              I can help you analyze data quality metrics, generate reports, and provide insights
            </p>

            <div style={{ marginBottom: '24px' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748B' }}>
                Popular questions:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <button 
                  onClick={() => setChatInput("What's the completion rate for Netherlands in Q4 2024?")}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '20px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '500px'
                  }}
                >
                  "What's the completion rate for Netherlands in Q4 2024?"
                </button>
                
                <button 
                  onClick={() => setChatInput("Show me all critical issues that need immediate attention")}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '20px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '500px'
                  }}
                >
                  "Show me all critical issues that need immediate attention"
                </button>
                
                <button 
                  onClick={() => setChatInput("Generate a summary report for the DTFS leadership team")}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '20px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    maxWidth: '500px'
                  }}
                >
                  "Generate a summary report for the DTFS leadership team"
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Chat Messages
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {chatMessages.map(message => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: message.isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    padding: '12px 16px',
                    borderRadius: message.isUser ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                    background: message.isUser ? '#6366F1' : 'white',
                    color: message.isUser ? 'white' : '#1E293B',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    border: message.isUser ? 'none' : '1px solid #E2E8F0'
                  }}>
                    {message.text}
                    <div style={{
                      fontSize: '11px',
                      marginTop: '4px',
                      opacity: '0.7'
                    }}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div style={{
        background: 'white',
        borderTop: '1px solid #E2E8F0',
        padding: '20px 32px'
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your question about data quality..."
              style={{
                flex: 1,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '20px',
                padding: '12px 20px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
            
            <button 
              onClick={handleSendMessage}
              disabled={!chatInput.trim()}
              style={{
                width: '40px',
                height: '40px',
                background: '#6366F1',
                border: 'none',
                borderRadius: '50%',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: chatInput.trim() ? '1' : '0.5'
              }}
            >
              →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Questionnaire Component
const Questionnaire: React.FC<{ selectedCountry: string }> = ({ selectedCountry }) => {
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
              DQ Management {selectedCountry} • Questionnaire Review
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
            <div style={{
              background: '#F3F4F6',
              border: '1px solid #D1D5DB',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              minWidth: '200px'
            }}>
              🇳🇱 {selectedCountry} - Entity 76 ▼
            </div>
            
            <div>
              <div style={{ fontSize: '12px', color: '#6B7280' }}>Report Date:</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>May 31, 2025</div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{
                background: '#FEF3C7',
                color: '#92400E',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                ⚠ 2 High
              </span>
              <span style={{
                background: '#FEE2E2',
                color: '#DC2626',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>
                🔴 1 Critical
              </span>
            </div>

            <div style={{ marginLeft: 'auto' }}>
              <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Progress:</div>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>1 of 5 completed</div>
              <div style={{
                width: '120px',
                height: '6px',
                background: '#E5E7EB',
                borderRadius: '3px'
              }}>
                <div style={{
                  width: '20%',
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
              <button style={{
                background: '#F3F4F6',
                color: '#374151',
                border: '1px solid #D1D5DB',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                cursor: 'pointer'
              }}>
                Save Draft
              </button>
            </div>
          </div>
        </div>

        {/* Main Question Area - Full Width */}
        <div style={{
          background: 'white',
          borderRadius: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          border: '1px solid #E5E7EB',
          overflow: 'hidden'
        }}>
          {/* Question Header */}
          <div style={{
            background: '#FEF2F2',
            padding: '16px 20px',
            borderBottom: '1px solid #FECACA'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: '#DC2626',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>CRITICAL</span>
              <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#374151' }}>
                Portfolio Risk Assessment Required
              </h3>
            </div>
            <div style={{ fontSize: '13px', color: '#7F1D1D', marginBottom: '4px' }}>
              AI-Generated Question • High Priority Response Required
            </div>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Data Source: Overview Sheet Analysis • Delinquent Amount: €682,924.14 • Contracts: 8,720
            </div>
          </div>

          {/* Question Content */}
          <div style={{ padding: '20px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
              Question 1 of 5 - Portfolio Overview Analysis
            </h4>
            
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', lineHeight: '1.6', color: '#374151' }}>
              It has been observed that there is a considerable increase in delinquent amount (€682,924.14) and change in the NBV of the relevant portfolio compared to the previous month.
            </p>
            
            <p style={{ margin: '0 0 20px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Can you please provide additional information on this?
            </p>

            <textarea
              defaultValue="The increase is primarily due to terminated contracts (vehicle invoices) and timing issues. Several large commercial clients terminated their leases early due to fleet downsizing..."
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

            <div style={{ display: 'flex', gap: '12px' }}>
              <button style={{
                background: '#6366F1',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer'
              }}>Next Question</button>
              <button style={{
                background: '#9CA3AF',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 20px',
                fontSize: '14px',
                cursor: 'pointer'
              }}>Save Draft</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// AI Insights Component
const AIInsights: React.FC = () => {
  return (
    <div style={{ padding: '32px', background: '#FAFBFC', height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: '700', color: '#1E293B' }}>
          AI Insights Dashboard
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB',
            borderLeft: '4px solid #DC2626'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>🚨</span>
              <span style={{
                background: '#DC2626',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>CRITICAL ALERT</span>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              Data Quality Alert
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
              Netherlands: 23% data completeness drop detected in last 24 hours. Immediate investigation required.
            </p>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Confidence: 94% • 15 minutes ago
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB',
            borderLeft: '4px solid #0078D4'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>📈</span>
              <span style={{
                background: '#0078D4',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>PREDICTION</span>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              Quality Improvement Trend
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
              Spain data quality metrics show 15% improvement trend. Expected completion by next quarter.
            </p>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Confidence: 87% • 2 hours ago
            </div>
          </div>

          <div style={{
            background: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #E5E7EB',
            borderLeft: '4px solid #10B981'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span style={{ fontSize: '20px' }}>💡</span>
              <span style={{
                background: '#10B981',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: '600'
              }}>RECOMMENDATION</span>
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              Process Optimization
            </h3>
            <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151', lineHeight: '1.5' }}>
              Implement automated validation for 3 high-error data fields to reduce manual intervention by 40%.
            </p>
            <div style={{ fontSize: '12px', color: '#6B7280' }}>
              Confidence: 91% • 3 hours ago
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Actions Component
const Actions: React.FC = () => {
  return (
    <div style={{ padding: '32px', background: '#FAFBFC', height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ margin: '0 0 24px 0', fontSize: '28px', fontWeight: '700', color: '#1E293B' }}>
          Available Actions
        </h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <button style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Export Report</div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>Download current data quality metrics</div>
          </button>
          
          <button style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📧</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Send Email</div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>Email summary to stakeholders</div>
          </button>
          
          <button style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>📅</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Schedule Meeting</div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>Plan team discussion</div>
          </button>
          
          <button style={{
            background: 'white',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            padding: '20px',
            textAlign: 'left',
            cursor: 'pointer',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔔</div>
            <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>Setup Alerts</div>
            <div style={{ fontSize: '13px', color: '#6B7280' }}>Configure automated notifications</div>
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
export const Dashboard = () => {
  const [chatInput, setChatInput] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('Netherlands');
  const [selectedDate, setSelectedDate] = useState('June 2025');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [activeTab, setActiveTab] = useState('chat');

  const countries = ['Netherlands', 'Germany', 'Spain'];
  const dates = ['June 2025', 'May 2025', 'April 2025'];

  const renderMainContent = () => {
    switch (activeTab) {
      case 'chat':
        return (
          <Chat
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatMessages={chatMessages}
            setChatMessages={setChatMessages}
            selectedCountry={selectedCountry}
            selectedDate={selectedDate}
          />
        );
      case 'questionnaire':
        return <Questionnaire selectedCountry={selectedCountry} />;
      case 'insights':
        return <AIInsights />;
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
            background: 'white',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            fontWeight: '700',
            color: '#6366F1'
          }}>
            DQ
          </div>
          <div>
            <h1 style={{ margin: '0', fontSize: '20px', fontWeight: '700' }}>
              Data Quality Assistant
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
                { key: 'chat', label: 'Chat' },
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
                    {tab.key === 'questionnaire' ? 'Quest.' : tab.key === 'insights' ? 'Insights' : tab.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            {activeTab === 'chat' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
                  Quick Commands
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    onClick={() => setChatInput("Show me an overview of data quality for Netherlands")}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderLeft: '4px solid #6366F1',
                      borderRadius: '6px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      Overview
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Data quality summary
                    </div>
                  </div>
                  <div
                    onClick={() => setChatInput("What are the current errors in the data quality system?")}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderLeft: '4px solid #6366F1',
                      borderRadius: '6px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      Errors
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Current system errors
                    </div>
                  </div>
                  <div
                    onClick={() => setChatInput("Show me all warnings that need attention")}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderLeft: '4px solid #6366F1',
                      borderRadius: '6px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      Warnings
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Items needing attention
                    </div>
                  </div>
                  <div
                    onClick={() => setChatInput("Display writeoffs and data corrections needed")}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderLeft: '4px solid #6366F1',
                      borderRadius: '6px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      Writeoffs
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Data corrections needed
                    </div>
                  </div>
                  <div
                    onClick={() => setChatInput("What additional actions can I take to improve data quality?")}
                    style={{
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      borderLeft: '4px solid #6366F1',
                      borderRadius: '6px',
                      padding: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                      Additional Actions
                    </div>
                    <div style={{ fontSize: '10px', color: '#6B7280' }}>
                      Improvement suggestions
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'questionnaire' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
                  Data Quality Questionnaire
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{
                    padding: '12px',
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>Progress</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>1 of 5 completed</div>
                    <div style={{
                      width: '100%',
                      height: '6px',
                      background: '#E5E7EB',
                      borderRadius: '3px',
                      marginTop: '8px'
                    }}>
                      <div style={{
                        width: '20%',
                        height: '100%',
                        background: '#10B981',
                        borderRadius: '3px'
                      }}></div>
                    </div>
                  </div>

                  {/* Questions List in Sidebar */}
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                      Questions
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {/* Critical Question */}
                      <div style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderLeft: '4px solid #DC2626',
                        borderRadius: '6px',
                        padding: '10px',
                        cursor: 'pointer'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            background: '#DC2626',
                            color: 'white',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>1</span>
                          <span style={{
                            background: '#DC2626',
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '8px',
                            fontSize: '8px',
                            fontWeight: '600'
                          }}>CRITICAL</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                          Portfolio Delinquent Analysis
                        </div>
                        <div style={{ fontSize: '10px', color: '#7F1D1D' }}>
                          €682k increase detected
                        </div>
                      </div>

                      {/* High Priority Question */}
                      <div style={{
                        background: '#FFFBEB',
                        border: '1px solid #FEF3C7',
                        borderLeft: '4px solid #F59E0B',
                        borderRadius: '6px',
                        padding: '10px',
                        cursor: 'pointer'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            background: '#F59E0B',
                            color: 'white',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>2</span>
                          <span style={{
                            background: '#F59E0B',
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '8px',
                            fontSize: '8px',
                            fontWeight: '600'
                          }}>HIGH</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                          Contract Data Changes
                        </div>
                        <div style={{ fontSize: '10px', color: '#92400E' }}>
                          186 end date modifications
                        </div>
                      </div>

                      {/* Medium Priority Question */}
                      <div style={{
                        background: '#F9FAFB',
                        border: '1px solid #D1D5DB',
                        borderLeft: '4px solid #6B7280',
                        borderRadius: '6px',
                        padding: '10px',
                        cursor: 'pointer'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            background: '#6B7280',
                            color: 'white',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>3</span>
                          <span style={{
                            background: '#6B7280',
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '8px',
                            fontSize: '8px',
                            fontWeight: '600'
                          }}>MEDIUM</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                          Data Validation Review
                        </div>
                        <div style={{ fontSize: '10px', color: '#4B5563' }}>
                          Pending completion
                        </div>
                      </div>

                      {/* Low Priority Questions */}
                      <div style={{
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderLeft: '4px solid #9CA3AF',
                        borderRadius: '6px',
                        padding: '10px',
                        cursor: 'pointer',
                        opacity: '0.7'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            background: '#9CA3AF',
                            color: 'white',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>4</span>
                          <span style={{
                            background: '#9CA3AF',
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '8px',
                            fontSize: '8px',
                            fontWeight: '600'
                          }}>LOW</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                          Monthly Reconciliation
                        </div>
                        <div style={{ fontSize: '10px', color: '#6B7280' }}>
                          Routine check
                        </div>
                      </div>

                      <div style={{
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderLeft: '4px solid #9CA3AF',
                        borderRadius: '6px',
                        padding: '10px',
                        cursor: 'pointer',
                        opacity: '0.7'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span style={{
                            background: '#9CA3AF',
                            color: 'white',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600'
                          }}>5</span>
                          <span style={{
                            background: '#9CA3AF',
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '8px',
                            fontSize: '8px',
                            fontWeight: '600'
                          }}>LOW</span>
                        </div>
                        <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '2px' }}>
                          Documentation Update
                        </div>
                        <div style={{ fontSize: '10px', color: '#6B7280' }}>
                          Standard review
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'insights' && (
              <div>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
                  Recent AI Insights
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{
                    padding: '8px',
                    background: '#FEF2F2',
                    border: '1px solid #FECACA',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#DC2626' }}>Critical Alert</div>
                    <div style={{ color: '#7F1D1D' }}>Data completeness drop detected</div>
                  </div>
                  <div style={{
                    padding: '8px',
                    background: '#EBF8FF',
                    border: '1px solid #BAE6FD',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}>
                    <div style={{ fontWeight: '600', color: '#0078D4' }}>Prediction</div>
                    <div style={{ color: '#1E40AF' }}>Quality improvement trend</div>
                  </div>
                </div>

                {/* Quick Actions moved here */}
                <div style={{ marginTop: '24px' }}>
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
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area - No Header, Just Components */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {renderMainContent()}
        </div>
      </div>
    </div>
  );
};