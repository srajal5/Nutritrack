import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Type definitions for messages
interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

const AIChatInterface = ({ userId = 1 }) => {
  const { toast } = useToast();
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      content: "Hi there! I'm your AI fitness coach. How can I help you with your nutrition and fitness goals today?",
      sender: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [conversationId, setConversationId] = useState(uuidv4());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Fetch suggested topics
  const { data: suggestedTopics } = useQuery({
    queryKey: ['/api/chat/topics'],
  });
  
  // Fetch conversation history
  const { data: conversations } = useQuery({
    queryKey: [`/api/chat/conversations?userId=${userId}`],
  });
  
  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest('POST', '/api/chat', {
        userId,
        message,
        conversationId,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.id,
          content: data.response,
          sender: 'ai',
          timestamp: new Date(data.timestamp),
        },
      ]);
    },
    onError: (error) => {
      toast({
        title: 'Error sending message',
        description: error.message || 'There was an error communicating with the AI coach.',
        variant: 'destructive',
      });
    },
  });
  
  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!chatInput.trim()) return;
    
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: chatInput,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    
    // Send to API
    sendMessageMutation.mutate(chatInput);
    
    // Clear input
    setChatInput('');
  };
  
  // Handle topic suggestion click
  const handleTopicClick = (topic: string) => {
    setChatInput(topic);
  };
  
  // Handle conversation selection
  const loadConversation = async (convoId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?conversationId=${convoId}`);
      const data = await response.json();
      
      if (data.length > 0) {
        setConversationId(convoId);
        
        // Format messages
        const formattedMessages: ChatMessage[] = [
          {
            id: '0',
            content: "Hi there! I'm your AI fitness coach. How can I help you with your nutrition and fitness goals today?",
            sender: 'ai',
            timestamp: new Date(),
          },
        ];
        
        data.forEach((msg: any) => {
          formattedMessages.push({
            id: `user-${msg.id}`,
            content: msg.message,
            sender: 'user',
            timestamp: new Date(msg.timestamp),
          });
          
          if (msg.response) {
            formattedMessages.push({
              id: `ai-${msg.id}`,
              content: msg.response,
              sender: 'ai',
              timestamp: new Date(msg.timestamp),
            });
          }
        });
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      toast({
        title: 'Error loading conversation',
        description: 'Failed to load the conversation history.',
        variant: 'destructive',
      });
    }
  };
  
  // Start a new conversation
  const startNewConversation = () => {
    const newConvoId = uuidv4();
    setConversationId(newConvoId);
    setMessages([
      {
        id: '0',
        content: "Hi there! I'm your AI fitness coach. How can I help you with your nutrition and fitness goals today?",
        sender: 'ai',
        timestamp: new Date(),
      },
    ]);
  };
  
  return (
    <div className="max-w-4xl mx-auto bg-neutral-50 rounded-xl shadow-md overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-3 h-[600px]">
        {/* Chat Sidebar */}
        <div className="hidden md:block bg-neutral-100 p-4 border-r border-neutral-200">
          <div className="mb-4">
            <h3 className="font-heading text-lg font-semibold mb-2">Topic Suggestions</h3>
            <Button
              variant="outline"
              className="w-full text-left p-3 mb-2 bg-white rounded-lg hover:bg-neutral-50 transition text-sm font-medium justify-start"
              onClick={startNewConversation}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              New Conversation
            </Button>
            
            {suggestedTopics?.map((topic: string, index: number) => (
              <button 
                key={index}
                className="w-full text-left p-3 mb-2 bg-white rounded-lg hover:bg-neutral-50 transition text-sm font-medium"
                onClick={() => handleTopicClick(topic)}
              >
                {topic}
              </button>
            ))}
          </div>
          
          {conversations && conversations.length > 0 && (
            <div>
              <h3 className="font-heading text-lg font-semibold mb-2">Recent Conversations</h3>
              {conversations.map((convo: any) => (
                <div 
                  key={convo.id}
                  className="p-3 mb-2 border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer transition"
                  onClick={() => loadConversation(convo.id)}
                >
                  <h4 className="font-medium text-sm truncate">{convo.title}</h4>
                  <p className="text-xs text-neutral-500 truncate">
                    {new Date(convo.lastMessageDate).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Chat Main Area */}
        <div className="md:col-span-2 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.sender === 'user' ? 'justify-end mb-4' : 'mb-4'
                }`}
              >
                {message.sender === 'ai' && (
                  <div className="flex-shrink-0 mr-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                      AI
                    </div>
                  </div>
                )}
                <div
                  className={`${
                    message.sender === 'user'
                      ? 'chat-bubble-user bg-primary p-4 rounded-2xl text-white max-w-[80%]'
                      : 'chat-bubble-ai bg-neutral-100 p-4 rounded-2xl max-w-[80%]'
                  }`}
                >
                  <p className={message.sender === 'user' ? 'text-white' : 'text-neutral-800'}>
                    {message.content}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Chat Input */}
          <div className="border-t border-neutral-200 p-4">
            <form onSubmit={handleSubmit} className="flex space-x-2">
              <Input
                type="text"
                placeholder="Ask me anything about nutrition and fitness..."
                className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={sendMessageMutation.isPending}
              />
              <Button
                type="submit"
                className="bg-primary hover:bg-primary-dark text-white p-2 rounded-lg transition-colors"
                disabled={sendMessageMutation.isPending}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </Button>
            </form>
            <p className="text-xs text-neutral-500 mt-2">
              AI responses are generated based on best practices in nutrition and fitness but should not replace professional medical advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;
