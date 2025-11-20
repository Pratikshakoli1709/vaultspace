'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot, FileText, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';

interface AIAssistantProps {
  currentUser: User;
}

interface Message {
  type: 'user' | 'assistant';
  content: string;
  referencedFiles?: string[];
  timestamp: Date;
}

export function AIAssistant({ currentUser }: AIAssistantProps) {
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages are added or loading state changes
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        // Force scroll to bottom
        container.scrollTop = container.scrollHeight;
      }
      // Also use scrollIntoView as backup
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    // Immediate scroll
    scrollToBottom();
    
    // Multiple delayed attempts to ensure it works
    const timers = [
      setTimeout(scrollToBottom, 10),
      setTimeout(scrollToBottom, 50),
      setTimeout(scrollToBottom, 100),
      setTimeout(scrollToBottom, 200)
    ];
    
    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      type: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMessage.content,
          userId: currentUser.id,
          userRole: currentUser.role,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        // If there's an error, show it clearly - don't treat it as an AI response
        const errorMsg = data.error || 'Failed to get answer from AI assistant';
        throw new Error(errorMsg);
      }

      // Only add message if we have a valid answer (not an error message)
      if (!data.answer || typeof data.answer !== 'string') {
        throw new Error('Invalid response from AI assistant');
      }

      const assistantMessage: Message = {
        type: 'assistant',
        content: data.answer,
        referencedFiles: data.referencedFiles || [],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error asking AI assistant:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to get answer from AI assistant';
      
      toast({
        title: 'AI Assistant Error',
        description: errorMessage,
        variant: 'destructive',
      });

      // Show error message in chat but clearly marked as an error
      const errorChatMessage: Message = {
        type: 'assistant',
        content: `⚠️ Error: ${errorMessage}\n\nPlease check your API configuration and try again.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorChatMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full h-full flex flex-col" style={{ height: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)' }}>
      <CardHeader className="pb-3 flex-shrink-0 border-b">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base sm:text-lg">AI Assistant</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Ask questions about your files
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3 p-3 sm:p-4 min-h-0" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-scroll overflow-x-hidden ai-chat-scroll"
          style={{ 
            height: '100%',
            maxHeight: '100%',
            minHeight: 0,
            overscrollBehavior: 'contain'
          }}
        >
          <div className="space-y-3 sm:space-y-4 pr-4 pb-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                <p className="text-xs sm:text-sm">Ask me anything about your files!</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try: "Where is the AWS key?" or "What is the API architecture?"
                </p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  'flex gap-2 sm:gap-3',
                  message.type === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.type === 'assistant' && (
                  <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full flex-shrink-0">
                    <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  </div>
                )}
                <div
                  className={cn(
                    'rounded-lg px-3 py-2 max-w-[85%] sm:max-w-[75%] text-xs sm:text-sm',
                    message.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  {message.referencedFiles && message.referencedFiles.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <p className="text-xs text-muted-foreground mb-1">Referenced files:</p>
                      <div className="flex flex-wrap gap-1">
                        {message.referencedFiles.slice(0, 3).map((fileId) => (
                          <span
                            key={fileId}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-background/50 rounded text-xs"
                          >
                            <FileText className="h-2.5 w-2.5" />
                            {fileId.substring(0, 8)}...
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {message.type === 'user' && (
                  <div className="p-1.5 sm:p-2 bg-muted rounded-full flex-shrink-0">
                    <div className="h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 sm:gap-3 justify-start">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-full">
                  <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-3 py-2">
                  <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask about your files..."
            disabled={isLoading}
            className="text-xs sm:text-sm h-8 sm:h-10"
          />
          <Button type="submit" disabled={isLoading || !question.trim()} size="sm" className="h-8 sm:h-10 px-3 sm:px-4">
            {isLoading ? (
              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
            ) : (
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


