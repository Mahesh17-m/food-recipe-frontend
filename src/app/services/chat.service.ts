// frontend/src/app/services/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { Router } from '@angular/router'; // Add Router import
import { AuthService } from './auth.service';

export interface ChatMessage {
  id?: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'chat' | 'recipes' | 'command';
  data?: any;
  voiceText?: string;
  shouldSpeak?: boolean;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  type: 'chat' | 'recipes';
  timestamp: string;
  suggestions?: RecipeSuggestion[];
  voiceText?: string;
  shouldSpeak?: boolean;
  userContext?: {
    name: string;
    hasPreferences: boolean;
  };
}

export interface RecipeSuggestion {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  prepTime: number;
  cookTime: number;
  difficulty: string;
  category: string;
  rating: number;
  author?: {
    username: string;
    profilePicture: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'http://localhost:5000/api/chatbot';
  
  private conversationHistory = new BehaviorSubject<ChatMessage[]>([]);
  public conversation$ = this.conversationHistory.asObservable();
  
  private isTyping = new BehaviorSubject<boolean>(false);
  public isTyping$ = this.isTyping.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router // Inject Router
  ) {
    this.loadHistory();
  }

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  sendMessage(message: string, voiceMode: boolean = false): Observable<ChatResponse> {
    this.addUserMessage(message);
    this.isTyping.next(true);
    
    return this.http.post<ChatResponse>(
      `${this.apiUrl}/chat`,
      { message, voiceMode },
      { headers: this.getHeaders() }
    );
  }

  sendVoiceMessage(audioText: string): Observable<ChatResponse> {
    this.addUserMessage(audioText);
    this.isTyping.next(true);
    
    return this.http.post<ChatResponse>(
      `${this.apiUrl}/voice-chat`,
      { audioText, isVoiceOutput: true },
      { headers: this.getHeaders() }
    );
  }

  sendCommand(command: string): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/command`,
      { command },
      { headers: this.getHeaders() }
    );
  }

  generateMealPlan(preferences: any): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/meal-plan`,
      preferences,
      { headers: this.getHeaders() }
    );
  }

  // Add this method for recipe navigation
  navigateToRecipe(recipeId: string) {
    // Navigate in the same window/tab
    this.router.navigate(['/recipes', recipeId]);
  }

  addUserMessage(text: string) {
    const message: ChatMessage = {
      text,
      sender: 'user',
      timestamp: new Date()
    };
    
    const updated = [...this.conversationHistory.value, message];
    this.conversationHistory.next(updated);
    this.saveHistory();
  }

  addBotMessage(response: ChatResponse) {
    const message: ChatMessage = {
      text: response.response,
      sender: 'bot',
      timestamp: new Date(),
      type: response.type,
      data: response.suggestions,
      voiceText: response.voiceText,
      shouldSpeak: response.shouldSpeak
    };
    
    const updated = [...this.conversationHistory.value, message];
    this.conversationHistory.next(updated);
    this.isTyping.next(false);
    this.saveHistory();
  }

  clearConversation() {
    this.conversationHistory.next([]);
    localStorage.removeItem('chat_history');
    
    this.addBotMessage({
      success: true,
      response: "Hello! I'm your Food Assistant. I can help you find recipes, suggest meal plans, and answer cooking questions. What would you like to explore today?",
      type: 'chat',
      timestamp: new Date().toISOString(),
      userContext: { name: 'Friend', hasPreferences: false }
    });
  }

  private saveHistory() {
    const history = this.conversationHistory.value.slice(-20);
    localStorage.setItem('chat_history', JSON.stringify(history));
  }

  private loadHistory() {
    const saved = localStorage.getItem('chat_history');
    if (saved) {
      try {
        const history: ChatMessage[] = JSON.parse(saved);
        history.forEach(msg => msg.timestamp = new Date(msg.timestamp));
        this.conversationHistory.next(history);
      } catch (e) {
        console.error('Error loading chat history:', e);
      }
    }
    
    if (this.conversationHistory.value.length === 0) {
      setTimeout(() => {
        this.addBotMessage({
          success: true,
          response: "👋 Welcome! I'm your Food Assistant. I can help you find recipes, plan meals, and answer cooking questions.",
          type: 'chat',
          timestamp: new Date().toISOString(),
          userContext: { name: 'Friend', hasPreferences: false }
        });
      }, 500);
    }
  }
}