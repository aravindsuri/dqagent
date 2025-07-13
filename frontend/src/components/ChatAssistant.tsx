// src/components/ChatAssistant.tsx
import React, { useState } from 'react';

interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  isStructured?: boolean;
  actionSteps?: ActionStep[];  // NEW: Add ReAct steps
  isThinking?: boolean;        // NEW: Flag for ReAct mode
}

// NEW: Add ActionStep interface
interface ActionStep {
  id?: string;
  type: 'thinking' | 'action' | 'observation' | 'final_answer';
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  timestamp?: string;
  tool_used?: string;
  result?: any;
  deliverable?: any;  // For PowerPoint presentations
}

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCountry: string;
  selectedDate: string;
  apiBaseUrl?: string;
}

export const ChatAssistant: React.FC<ChatAssistantProps> = ({
  isOpen,
  onClose,
  selectedCountry,
  selectedDate,
  apiBaseUrl = process.env.REACT_APP_API_BASE_URL || 'https://dqagent.azurewebsites.net/api'
}) => {
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // NEW: Helper functions for ReAct step styling
  const getStepBackground = (type: string) => {
    switch (type) {
      case 'thinking': return '#FEF7CD';
      case 'action': return '#DBEAFE';
      case 'observation': return '#D1FAE5';
      case 'final_answer': return '#F3E8FF';
      default: return '#F9FAFB';
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'thinking': return '#F59E0B';
      case 'action': return '#3B82F6';
      case 'observation': return '#10B981';
      case 'final_answer': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'thinking': return '🤔';
      case 'action': return '⚡';
      case 'observation': return '👀';
      case 'final_answer': return '✅';
      default: return '📋';
    }
  };

  const getStatusBackground = (status: string) => {
    switch (status) {
      case 'completed': return '#D1FAE5';
      case 'in_progress': return '#FEF3C7';
      case 'pending': return '#F3F4F6';
      case 'failed': return '#FEE2E2';
      default: return '#F9FAFB';
    }
  };

  // NEW: Component for rendering PowerPoint deliverable
  const renderDeliverable = (deliverable: any) => {
    if (!deliverable || !deliverable.slides) return null;
    
    return (
      <div style={{ 
        marginTop: '12px', 
        border: '1px solid #E5E7EB', 
        borderRadius: '6px',
        background: 'white'
      }}>
        <div style={{ 
          padding: '10px', 
          background: '#F8FAFC', 
          borderBottom: '1px solid #E5E7EB',
          fontWeight: '600',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 {deliverable.presentation_title}
          <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '400' }}>
            ({deliverable.slides.length} slides)
          </span>
        </div>
        
        <div style={{ padding: '12px' }}>
          {deliverable.slides.slice(0, 3).map((slide: any, index: number) => (
            <div key={index} style={{ 
              marginBottom: '10px', 
              padding: '8px',
              background: '#FAFBFC',
              border: '1px solid #F0F1F2',
              borderRadius: '4px'
            }}>
              <div style={{ fontWeight: '500', fontSize: '12px', marginBottom: '4px' }}>
                Slide {slide.slide_number}: {slide.title}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>
                Type: {slide.content_type}
              </div>
            </div>
          ))}
          
          {deliverable.slides.length > 3 && (
            <div style={{ 
              fontSize: '11px', 
              color: '#6B7280', 
              textAlign: 'center',
              fontStyle: 'italic'
            }}>
              ... and {deliverable.slides.length - 3} more slides
            </div>
          )}
          
          <div style={{ 
            marginTop: '12px', 
            display: 'flex', 
            gap: '8px',
            justifyContent: 'center'
          }}>
            <button style={{
              background: '#6366F1',
              color: 'white',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}>
              📥 Download PPT
            </button>
            
            <button style={{
              background: '#F3F4F6',
              color: '#374151',
              border: '1px solid #D1D5DB',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}>
              👁️ Preview
            </button>
            
            {deliverable.email_ready && (
              <button style={{
                background: '#059669',
                color: 'white',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer'
              }}>
                📧 Send Email
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // NEW: Component for rendering ReAct steps
  const ReActStepsRenderer: React.FC<{ steps: ActionStep[], isComplete: boolean }> = ({ steps, isComplete }) => {
    return (
      <div style={{ margin: '12px 0' }}>
        {steps.map((step, index) => (
          <div key={index} style={{ 
            margin: '8px 0', 
            padding: '10px', 
            background: getStepBackground(step.type),
            borderLeft: `4px solid ${getStepColor(step.type)}`,
            borderRadius: '4px',
            fontSize: '12px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              marginBottom: '4px'
            }}>
              <span style={{ fontWeight: '600', color: getStepColor(step.type) }}>
                {getStepIcon(step.type)} {step.type.replace('_', ' ').toUpperCase()}
              </span>
              <span style={{ 
                fontSize: '10px', 
                color: '#6B7280',
                background: getStatusBackground(step.status),
                padding: '2px 6px',
                borderRadius: '10px'
              }}>
                {step.status}
              </span>
            </div>
            
            <div style={{ color: '#374151', lineHeight: '1.4' }}>
              {step.type === 'final_answer' && step.deliverable ? (
                <div>
                  <div>{step.content}</div>
                  {renderDeliverable(step.deliverable)}
                </div>
              ) : (
                step.content
              )}
            </div>
            
            {step.result && (
              <div style={{ 
                marginTop: '6px', 
                padding: '6px', 
                background: '#F8FAFC', 
                borderRadius: '3px',
                fontSize: '11px',
                color: '#64748B'
              }}>
                {typeof step.result === 'string' ? step.result : JSON.stringify(step.result, null, 2)}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderStructuredResponse = (responseData: any): string => {
    try {
      console.log('🎨 renderStructuredResponse called with:', responseData);
      
      if (!responseData || typeof responseData !== 'object') {
        return `<div style="color: #DC2626;">Error: Invalid response data format</div>`;
      }
      
      let html = '';
      
      // Add summary if available
      if (responseData.summary) {
        html += `<div style="background: #F0F9FF; border-left: 4px solid #0078D4; padding: 12px; margin-bottom: 16px; border-radius: 6px;">
          <div style="font-weight: 600; color: #1E40AF; margin-bottom: 4px;">Summary</div>
          <div style="color: #1E40AF;">${String(responseData.summary)}</div>
        </div>`;
      }
      
      // Render sections
      if (responseData.sections && Array.isArray(responseData.sections)) {
        responseData.sections.forEach((section: any) => {
          html += `<div style="margin-bottom: 20px;">`;
          
          if (section.title) {
            html += `<div style="font-weight: 700; color: #1F2937; margin-bottom: 12px; padding-bottom: 4px; border-bottom: 2px solid #6366F1; font-size: 14px;">${String(section.title)}</div>`;
          }
          
          if (section.content && Array.isArray(section.content)) {
            section.content.forEach((item: any) => {
              switch (item.type) {
                case 'paragraph':
                  if (item.text) {
                    html += `<div style="margin-bottom: 8px; line-height: 1.5; color: #374151;">${String(item.text)}</div>`;
                  }
                  break;
                  
                case 'bullet_list':
                  if (item.items && Array.isArray(item.items)) {
                    item.items.forEach((bullet: any) => {
                      const style = bullet.highlight 
                        ? 'font-weight: 600; color: #1F2937;' 
                        : 'color: #374151;';
                      html += `<div style="margin: 4px 0; padding-left: 16px; position: relative; line-height: 1.5; ${style}">
                        <span style="position: absolute; left: 0; color: #6366F1; font-weight: bold;">•</span>
                        ${String(bullet.text || '')}
                      </div>`;
                    });
                  }
                  break;
                  
                case 'table':
                  if (item.headers && item.rows && Array.isArray(item.headers) && Array.isArray(item.rows)) {
                    html += `<div style="margin: 12px 0; border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden;">`;
                    
                    html += `<div style="display: grid; grid-template-columns: repeat(${item.headers.length}, 1fr); background: #F8FAFC; font-weight: 600; border-bottom: 2px solid #E2E8F0;">`;
                    item.headers.forEach((header: any) => {
                      html += `<div style="padding: 8px; border-right: 1px solid #E5E7EB; font-size: 11px; color: #374151;">${String(header || '')}</div>`;
                    });
                    html += `</div>`;
                    
                    item.rows.forEach((row: any) => {
                      if (Array.isArray(row)) {
                        html += `<div style="display: grid; grid-template-columns: repeat(${item.headers.length}, 1fr); border-bottom: 1px solid #E5E7EB;">`;
                        row.forEach((cell: any, cellIndex: number) => {
                          const textAlign = cellIndex === 0 ? 'left' : 'center';
                          const fontWeight = cellIndex === 0 ? '500' : '400';
                          html += `<div style="padding: 6px 8px; border-right: 1px solid #E5E7EB; font-size: 11px; text-align: ${textAlign}; font-weight: ${fontWeight}; color: #1F2937;">${String(cell || '')}</div>`;
                        });
                        html += `</div>`;
                      }
                    });
                    
                    html += `</div>`;
                  }
                  break;
                  
                case 'metric':
                  if (item.label && item.value) {
                    const trendColor = item.trend === 'positive' ? '#059669' : item.trend === 'negative' ? '#DC2626' : '#6B7280';
                    html += `<div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 10px; margin: 8px 0; display: flex; justify-content: space-between; align-items: center;">
                      <div style="font-weight: 500; color: #374151;">${String(item.label)}</div>
                      <div style="font-weight: 700; color: ${trendColor}; font-size: 16px;">${String(item.value)}</div>
                    </div>`;
                  }
                  break;
              }
            });
          }
          
          html += `</div>`;
        });
      }
      
      // Render recommendations
      if (responseData.recommendations && Array.isArray(responseData.recommendations)) {
        html += `<div style="margin-top: 16px;">
          <div style="font-weight: 600; color: #374151; margin-bottom: 8px; font-size: 13px;">Recommendations</div>`;
        
        responseData.recommendations.forEach((rec: any) => {
          if (rec.action) {
            const priorityColor = rec.priority === 'high' ? '#DC2626' : rec.priority === 'medium' ? '#F59E0B' : '#6B7280';
            const priorityBg = rec.priority === 'high' ? '#FEF2F2' : rec.priority === 'medium' ? '#FFFBEB' : '#F9FAFB';
            
            html += `<div style="background: ${priorityBg}; border-left: 4px solid ${priorityColor}; padding: 8px 12px; margin: 4px 0; border-radius: 4px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="background: ${priorityColor}; color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: 600; text-transform: uppercase;">${String(rec.priority || 'medium')}</span>
                <span style="color: #374151; font-size: 12px;">${String(rec.action)}</span>
              </div>
            </div>`;
          }
        });
        
        html += `</div>`;
      }
      
      const finalHtml = html || '<div style="color: #6B7280;">No content to display</div>';
      console.log('🎨 Generated HTML length:', finalHtml.length);
      
      return finalHtml;
      
    } catch (error) {
      console.error('Error rendering structured response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return `<div style="color: #DC2626;">Error rendering response: ${String(errorMessage)}</div>`;
    }
  };

  // MODIFIED: Enhanced handleSendMessage with PowerPoint detection
  const handleSendMessage = async () => {
    console.log('🚀 Enhanced handleSendMessage with ReAct support called!');
    
    if (!chatInput.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: chatInput,
      isUser: true,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    const currentInput = chatInput;
    setChatInput('');
    setIsLoading(true);
    
    try {
      // NEW: Detect if this is a PowerPoint request
      const isPowerPointRequest = /create|generate|make.*(?:powerpoint|presentation|ppt|slides?)/i.test(currentInput);
      
      const endpoint = isPowerPointRequest ? 'generate-presentation' : 'chat';
      
      const getCountryCode = (countryName: string): string => {
        const countryMap: Record<string, string> = {
          'Netherlands': 'NL',
          'Germany': 'DE', 
          'Spain': 'ES'
        };
        return countryMap[countryName] || 'NL';
      };

      const formatDateForAPI = (dateStr: string): string => {
        const monthMap: Record<string, string> = {
          'January': '01', 'February': '02', 'March': '03', 'April': '04',
          'May': '05', 'June': '06', 'July': '07', 'August': '08',
          'September': '09', 'October': '10', 'November': '11', 'December': '12'
        };
        
        const [month, year] = dateStr.split(' ');
        const monthNum = monthMap[month] || '05';
        return `${year}-${monthNum}-01`;
      };

      const countryCode = getCountryCode(selectedCountry);
      const formattedDate = formatDateForAPI(selectedDate);
      
      console.log(`💬 Making ${endpoint} API request...`);

      const response = await fetch(`${apiBaseUrl}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentInput,
          country: countryCode,
          month: formattedDate,
          context: `User is asking about ${selectedCountry} financial data for ${selectedDate}. Include specific metrics and insights where relevant.`,
          selectedCountry: selectedCountry,
          selectedDate: selectedDate
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ API response received successfully');
      
      // NEW: Process both regular and ReAct responses
      let finalResponseText = '';
      let isReActResponse = false;
      let reactSteps: ActionStep[] = [];
      
      if (result.success && result.data) {
        const responseData = result.data;
        
        // Check if this is a ReAct response
        if (responseData.react_mode && responseData.steps) {
          isReActResponse = true;
          reactSteps = responseData.steps;
          
          // For ReAct responses, show the steps
          finalResponseText = 'Processing your request using ReAct approach...';
        } else if (responseData.response) {
          // Regular structured response
          if (typeof responseData.response === 'object' && responseData.response !== null) {
            console.log('🔄 Converting structured response to HTML...');
            finalResponseText = renderStructuredResponse(responseData.response);
          } else {
            finalResponseText = String(responseData.response);
          }
        } else {
          finalResponseText = 'I received your question but had trouble processing the response format.';
        }
      } else {
        finalResponseText = 'I received your question but had trouble processing the response format.';
      }
      
      // Absolute safety check
      if (typeof finalResponseText !== 'string') {
        console.error('❌ finalResponseText is not a string!', typeof finalResponseText);
        finalResponseText = 'Error: Could not process response properly.';
      }
      
      console.log('✅ Final response prepared, length:', finalResponseText.length);
      
      // NEW: Create message with ReAct support
      const aiResponse = {
        id: Date.now() + 1,
        text: finalResponseText,
        isUser: false,
        timestamp: new Date(),
        isStructured: !isReActResponse,
        actionSteps: isReActResponse ? reactSteps : undefined,
        isThinking: isReActResponse
      };
      
      setChatMessages(prev => [...prev, aiResponse]);
      
    } catch (error) {
      console.error('❌ Chat request failed:', error);
      
      const errorResponse = {
        id: Date.now() + 1,
        text: `I apologize, but I encountered an error while processing your request. Please try again.`,
        isUser: false,
        timestamp: new Date(),
        isStructured: false
      };
      setChatMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '32px',
      width: '400px',
      height: 'calc(100vh - 112px)',
      background: 'white',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      border: '1px solid #E5E7EB',
      zIndex: 1000
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            💬
          </div>
          <div>
            <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600', color: '#1F2937' }}>
              AI Assistant
            </h3>
            <p style={{ margin: '0', fontSize: '11px', color: '#6B7280' }}>
              {selectedCountry} • {selectedDate}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {chatMessages.length > 0 && (
            <button
              onClick={clearChat}
              style={{
                background: '#F3F4F6',
                border: '1px solid #D1D5DB',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                color: '#374151'
              }}
              title="Clear conversation"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              cursor: 'pointer',
              color: '#6B7280',
              padding: '2px',
              lineHeight: 1
            }}
            title="Close chat"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        background: '#FAFBFC'
      }}>
        {chatMessages.length === 0 ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              background: 'linear-gradient(135deg, #F8FAFC, #F1F5F9)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto',
              fontSize: '24px'
            }}>
              💬
            </div>

            <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', fontWeight: '600', color: '#1E293B' }}>
              How can I help?
            </h3>
            
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748B', lineHeight: '1.4' }}>
              Ask me about data quality metrics and insights for {selectedCountry}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: '#64748B' }}>
                Try asking:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button 
                  onClick={() => setChatInput("Why is MB/CV performing better than other segments?")}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                >
                  "Why is MB/CV performing better than other segments?"
                </button>
                
                <button 
                  onClick={() => setChatInput("What's driving the high delinquency in MB/CV segment?")}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                >
                  "What's driving the high delinquency in MB/CV?"
                </button>
                
                <button 
                  onClick={() => setChatInput("Compare BFLEA vs FILEA product performance")}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                >
                  "Compare BFLEA vs FILEA performance"
                </button>

                <button 
                  onClick={() => setChatInput("Why does MB/PC have such a high IRR at 6.11%?")}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                >
                  "Why does MB/PC have 6.11% IRR?"
                </button>

                <button 
                  onClick={() => setChatInput("Analyze the inactive portfolio risk profile")}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                >
                  "Analyze inactive portfolio risk profile"
                </button>

                <button 
                  onClick={() => setChatInput("What are the trends in portfolio conversion rates?")}
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    color: '#475569',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                >
                  "Portfolio conversion rate trends?"
                </button>

                {/* NEW: Add PowerPoint suggestion buttons */}
                <button 
                  onClick={() => setChatInput("Create a portfolio performance presentation for the board")}
                  style={{
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    borderRadius: '16px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    color: '#0369A1',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0F2FE'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F0F9FF'}
                >
                  📊 "Create a portfolio performance presentation"
                </button>

                <button 
                  onClick={() => setChatInput("Generate quarterly review slides with risk analysis")}
                  style={{
                    background: '#F0F9FF',
                    border: '1px solid #BAE6FD',
                    borderRadius: '16px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    color: '#0369A1',
                    cursor: 'pointer',
                    width: '100%',
                    textAlign: 'left',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#E0F2FE'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#F0F9FF'}
                >
                  📈 "Generate quarterly review slides"
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {chatMessages.map(message => (
                <div
                  key={message.id}
                  style={{
                    display: 'flex',
                    justifyContent: message.isUser ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: message.actionSteps ? '95%' : '85%',  // NEW: Wider for ReAct
                    padding: '10px 14px',
                    borderRadius: message.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background: message.isUser ? '#6366F1' : 'white',
                    color: message.isUser ? 'white' : '#1E293B',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    border: message.isUser ? 'none' : '1px solid #E2E8F0',
                    boxShadow: message.isUser ? 'none' : '0 1px 2px rgba(0, 0, 0, 0.05)'
                  }}>
                    {message.isUser ? (
                      message.text
                    ) : (
                      <div>
                        {/* Regular message content */}
                        {!message.actionSteps && (
                          <div 
                            style={{ whiteSpace: 'pre-wrap' }}
                            dangerouslySetInnerHTML={{
                              __html: (() => {
                                let content = message.text;
                                
                                if (typeof content === 'object' && content !== null) {
                                  console.error('🚨 OBJECT DETECTED in message.text:', content);
                                  try {
                                    content = renderStructuredResponse(content);
                                  } catch (e) {
                                    content = '<div style="color: #DC2626;">Error: Could not render response</div>';
                                  }
                                }
                                
                                content = String(content || '');
                                
                                if (message.isStructured) {
                                  return content;
                                } else {
                                  return content
                                    .replace(/&amp;/g, '&')
                                    .replace(/&lt;/g, '<')
                                    .replace(/&gt;/g, '>')
                                    .replace(/&quot;/g, '"')
                                    .replace(/^### (\d+\..*$)/gm, '<div style="font-weight: 700; color: #1F2937; margin: 16px 0 8px 0; padding-bottom: 4px; border-bottom: 2px solid #6366F1; font-size: 14px;">$1</div>')
                                    .replace(/\*\*([^*\n]+)\*\*/g, '<strong style="font-weight: 600; color: #1F2937;">$1</strong>')
                                    .replace(/^[\s]*-\s+(.+)$/gm, '<div style="margin: 4px 0; padding-left: 16px; position: relative; line-height: 1.5;"><span style="position: absolute; left: 0; color: #6366F1; font-weight: bold;">•</span>$1</div>')
                                    .replace(/(\d+\.\d+%)/g, '<span style="font-weight: 600; color: #059669;">$1</span>')
                                    .replace(/(€[\d,]+\.?\d*[MK]?)/g, '<span style="font-weight: 600; color: #0078D4;">$1</span>')
                                    .replace(/\n\s*\n/g, '<div style="margin: 12px 0;"></div>')
                                    .replace(/\n/g, '<br/>');
                                }
                              })()
                            }}
                          />
                        )}
                        
                        {/* NEW: ReAct steps */}
                        {message.actionSteps && (
                          <ReActStepsRenderer 
                            steps={message.actionSteps} 
                            isComplete={!message.isThinking} 
                          />
                        )}
                      </div>
                    )}
                    
                    <div style={{
                      fontSize: '10px',
                      marginTop: '4px',
                      opacity: '0.7'
                    }}>
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'white',
                    color: '#1E293B',
                    fontSize: '13px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#6366F1',
                      animation: 'pulse 1.5s ease-in-out infinite'
                    }}></div>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#6366F1',
                      animation: 'pulse 1.5s ease-in-out infinite 0.2s'
                    }}></div>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#6366F1',
                      animation: 'pulse 1.5s ease-in-out infinite 0.4s'
                    }}></div>
                    <style>
                      {`@keyframes pulse { 0%, 80%, 100% { opacity: 0.3; } 40% { opacity: 1; } }`}
                    </style>
                    <span style={{ marginLeft: '6px', color: '#6B7280' }}>Thinking...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Chat Input */}
      <div style={{
        background: 'white',
        borderTop: '1px solid #E2E8F0',
        padding: '16px 20px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about data quality..."
            disabled={isLoading}
            style={{
              flex: 1,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '16px',
              padding: '10px 16px',
              fontSize: '13px',
              outline: 'none',
              opacity: isLoading ? 0.6 : 1
            }}
          />
          
          <button 
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isLoading}
            style={{
              width: '36px',
              height: '36px',
              background: chatInput.trim() && !isLoading ? '#6366F1' : '#9CA3AF',
              border: 'none',
              borderRadius: '50%',
              color: 'white',
              cursor: chatInput.trim() && !isLoading ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            title="Send message"
          >
            {isLoading ? '⋯' : '→'}
          </button>
        </div>
        
        <div style={{ 
          fontSize: '10px', 
          color: '#6B7280', 
          textAlign: 'center', 
          marginTop: '6px' 
        }}>
          Press Enter to send
        </div>
      </div>
    </div>
  );
};