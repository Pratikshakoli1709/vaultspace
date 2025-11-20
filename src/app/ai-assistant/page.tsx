'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from '@/components/common/AppSidebar';
import { Header } from '@/components/common/Header';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Bot, FileText, Sparkles, User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSupabase } from '@/components/SupabaseProvider';
import type { User, EnrichedDataItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import supabase from '@/lib/supabaseClient';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  referencedFiles?: Array<{
    id: string;
    title: string;
    type: string;
  }>;
  timestamp: Date;
}

export default function AIAssistantPage() {
  const router = useRouter();
  const { user: supabaseUser, isLoading: isAuthLoading } = useSupabase();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [referencedFiles, setReferencedFiles] = useState<Map<string, EnrichedDataItem>>(new Map());
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAuthLoading && !supabaseUser) {
      router.push('/login');
      return;
    }

    if (supabaseUser) {
      // Load user profile
      const loadUser = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .maybeSingle();

          if (error) throw error;
          if (data) {
            setCurrentUser({
              id: data.id,
              name: data.full_name || data.email || 'User',
              email: data.email,
              role: (data.role as 'admin' | 'user') || 'user',
              avatarUrl: data.avatar_url || undefined,
            });
          }
        } catch (error) {
          console.error('Failed to load user:', error);
        }
      };
      void loadUser();
    }
  }, [supabaseUser, isAuthLoading, router]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    const scrollToBottom = () => {
      // Direct scroll on the container div
      if (scrollAreaRef.current) {
        const container = scrollAreaRef.current;
        container.scrollTop = container.scrollHeight;
      }
      // Also try scrollIntoView as backup
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
    if (!input.trim() || isLoading || !currentUser) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
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

      // Even if response is not OK or success is false, try to use the answer if available
      if (!response.ok || !data.success) {
        // If there's an answer in the error response, use it
        if (data.answer) {
          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            type: 'assistant',
            content: data.answer,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
          return;
        }
        
        // Otherwise, throw error to be caught below
        throw new Error(data.error || data.answer || `Server error: ${response.status}`);
      }

      // Use fileDetails from response if available, otherwise fetch
      let fileDetailsMap = new Map<string, EnrichedDataItem>();
      
      if (data.fileDetails && data.fileDetails.length > 0) {
        // Use file details from response
        data.fileDetails.forEach((file: any) => {
          fileDetailsMap.set(file.id, {
            id: file.id,
            title: file.title,
            type: file.type as any,
            created_at: new Date().toISOString(),
            created_by: currentUser.id,
          } as EnrichedDataItem);
        });
      } else if (data.referencedFiles && data.referencedFiles.length > 0) {
        // Fallback: fetch files individually
        for (const fileId of data.referencedFiles) {
          try {
            const fileResponse = await fetch(`/api/files/${fileId}`);
            if (fileResponse.ok) {
              const fileData = await fileResponse.json();
              if (fileData.success && fileData.file) {
                fileDetailsMap.set(fileId, fileData.file);
              }
            }
          } catch (error) {
            console.warn('Failed to fetch referenced file:', fileId, error);
          }
        }
      }
      
      setReferencedFiles((prev) => new Map([...prev, ...fileDetailsMap]));

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        referencedFiles: data.fileDetails || data.referencedFiles?.map((id: string) => {
          const file = fileDetailsMap.get(id);
          return file ? { id: file.id, title: file.title, type: file.type } : { id, title: 'Unknown', type: 'unknown' };
        }),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error asking AI assistant:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get answer from AI assistant',
        variant: 'destructive',
      });

      const errorMessageText = error instanceof Error 
        ? `Sorry, I encountered an error: ${error.message}. Please try again or check if you have files uploaded with text content.`
        : 'Sorry, I encountered an error. Please try again.';
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: errorMessageText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileClick = (fileId: string) => {
    // Navigate to file or open preview
    router.push(`/userDashboard?fileId=${fileId}`);
  };

  if (isAuthLoading || !currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar user={currentUser} />
        <SidebarInset className="flex flex-grow flex-col bg-background main-layout-content-column">
          <div className="dashboard-dynamic-margin">
            <Header
              user={currentUser}
              notifications={[]}
              onAssetCreated={() => {}}
              onUserUpdate={(updatedUser) => setCurrentUser(updatedUser)}
            />
            <main className="w-full overflow-x-hidden">
              <div className="w-full px-2 sm:px-4 md:px-6 lg:px-8 xl:px-10 2xl:px-16">
                <div className="w-full space-y-2 sm:space-y-4 md:space-y-6 py-2 sm:py-4 md:py-6">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4 md:mb-6">
                    <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
                      <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">AI Assistant</h1>
                      <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
                        Ask questions about your files and get intelligent answers
                      </p>
                    </div>
                  </div>

                  <Card className="w-full h-[calc(100vh-180px)] sm:h-[calc(100vh-200px)] md:h-[calc(100vh-220px)] lg:h-[calc(100vh-250px)] min-h-[400px] sm:min-h-[500px] md:min-h-[600px] flex flex-col">
                    <CardHeader className="border-b pb-2 sm:pb-3 flex-shrink-0 px-3 sm:px-4 md:px-6">
                      <CardTitle className="text-base sm:text-lg md:text-xl">Chat with AI Assistant</CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs md:text-sm">
                        Ask anything about your files, documents, and data
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col p-0 min-h-0 overflow-hidden">
                      <div 
                        className="flex-1 overflow-y-auto overflow-x-hidden ai-chat-scroll p-2 sm:p-4 md:p-6"
                        ref={scrollAreaRef}
                        style={{ 
                          minHeight: 0,
                          maxHeight: '100%'
                        }}
                      >
                        <div className="space-y-3 sm:space-y-4 md:space-y-6 pb-4">
                          {messages.length === 0 && (
                            <div className="text-center py-8 sm:py-12 text-muted-foreground px-2">
                              <Bot className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 mx-auto mb-3 sm:mb-4 opacity-50" />
                              <p className="text-xs sm:text-sm md:text-base font-medium mb-2">Start a conversation</p>
                              <p className="text-[10px] sm:text-xs md:text-sm">
                                Try asking: "Where is the AWS key?" or "What is the API architecture?"
                              </p>
                            </div>
                          )}
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={cn(
                                'flex gap-2 sm:gap-3 md:gap-4',
                                message.type === 'user' ? 'justify-end' : 'justify-start'
                              )}
                            >
                              {message.type === 'assistant' && (
                                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 flex-shrink-0">
                                  <AvatarFallback className="bg-primary text-primary-foreground">
                                    <Bot className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                              <div className={cn('flex flex-col gap-1 sm:gap-2 max-w-[90%] sm:max-w-[85%] md:max-w-[75%]')}>
                                <div
                                  className={cn(
                                    'rounded-lg px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm md:text-base',
                                    message.type === 'user'
                                      ? 'bg-primary text-primary-foreground ml-auto'
                                      : 'bg-muted'
                                  )}
                                >
                                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                </div>
                                {message.referencedFiles && message.referencedFiles.length > 0 && (
                                  <div className="space-y-1 sm:space-y-2">
                                    <p className="text-[10px] sm:text-xs text-muted-foreground">Referenced files:</p>
                                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                      {message.referencedFiles.map((file) => {
                                        const fullFile = referencedFiles.get(file.id);
                                        return (
                                          <Card
                                            key={file.id}
                                            className="p-1.5 sm:p-2 md:p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                                            onClick={() => handleFileClick(file.id)}
                                          >
                                            <div className="flex items-center gap-1.5 sm:gap-2">
                                              <FileText className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-muted-foreground flex-shrink-0" />
                                              <div className="min-w-0 flex-1">
                                                <p className="text-[10px] sm:text-xs md:text-sm font-medium truncate">
                                                  {file.title}
                                                </p>
                                                <div className="flex items-center gap-1 sm:gap-2 mt-0.5 sm:mt-1">
                                                  <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5">
                                                    {file.type}
                                                  </Badge>
                                                  {fullFile?.category && (
                                                    <Badge variant="outline" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0.5">
                                                      {fullFile.category}
                                                    </Badge>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </Card>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                                <span className="text-[10px] sm:text-xs text-muted-foreground">
                                  {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                                </span>
                              </div>
                              {message.type === 'user' && (
                                <Avatar className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 flex-shrink-0">
                                  <AvatarFallback className="bg-muted">
                                    <UserIcon className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          ))}
                          {isLoading && (
                            <div className="flex gap-2 sm:gap-3 md:gap-4 justify-start">
                              <Avatar className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 flex-shrink-0">
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                  <Bot className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="bg-muted rounded-lg px-3 py-2 sm:px-4 sm:py-3">
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 animate-spin" />
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      </div>
                      <div className="border-t p-2 sm:p-4 md:p-6 flex-shrink-0">
                        <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2">
                          <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask a question about your files..."
                            disabled={isLoading}
                            className="flex-1 text-xs sm:text-sm md:text-base h-9 sm:h-10 md:h-12"
                          />
                          <Button type="submit" disabled={isLoading || !input.trim()} size="lg" className="h-9 sm:h-10 md:h-12 px-3 sm:px-4 md:px-6 flex-shrink-0">
                            {isLoading ? (
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 animate-spin" />
                            ) : (
                              <Send className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                            )}
                          </Button>
                        </form>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

