// frontend/src/app/services/speech.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SpeechService {
  private recognition: any;
  private speechSubject = new Subject<string>();
  private isListening = false;
  
  // For speech synthesis
  private synth = window.speechSynthesis;
  private voices: SpeechSynthesisVoice[] = [];
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    this.initSpeechRecognition();
    this.initSpeechSynthesis();
  }

  private initSpeechRecognition() {
    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.lang = 'en-US';
      this.recognition.interimResults = false;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        this.speechSubject.next(transcript);
        this.isListening = false;
      };

      this.recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        this.speechSubject.error(event.error);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
  }

  private initSpeechSynthesis() {
    const loadVoices = () => {
      this.voices = this.synth.getVoices();
      // Prefer natural-sounding English voices
      this.selectedVoice = this.voices.find(v => 
        v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google'))
      ) || this.voices.find(v => v.lang.startsWith('en')) || null;
    };
    
    this.synth.onvoiceschanged = loadVoices;
    loadVoices();
  }

  // Start listening for voice input
  startListening(): Observable<string> {
    if (!this.recognition) {
      throw new Error('Speech recognition not supported');
    }
    
    if (this.isListening) {
      this.stopListening();
    }
    
    this.isListening = true;
    this.recognition.start();
    
    return this.speechSubject.asObservable();
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  // Speak text (optimized for food assistant)
  speak(text: string, options: any = {}): Promise<void> {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
    
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(this.optimizeForSpeech(text));
      
      // Configure voice
      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      }
      
      // Configure options
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.1; // Slightly higher = more enthusiastic
      utterance.volume = options.volume || 1.0;
      
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      
      this.synth.speak(utterance);
    });
  }

  // Optimize AI responses for speech
  private optimizeForSpeech(text: string): string {
    return text
      // Remove markdown
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/`/g, '')
      // Make measurements clearer
      .replace(/(\d+)g/g, '$1 grams')
      .replace(/(\d+)ml/g, '$1 milliliters')
      .replace(/(\d+)min/g, '$1 minutes')
      .replace(/(\d+)°C/g, '$1 degrees celsius')
      // Add natural pauses
      .replace(/\. /g, '. ')
      .replace(/, /g, ', ')
      // Final cleanup
      .replace(/\s+/g, ' ')
      .trim();
  }

  stopSpeaking() {
    if (this.synth.speaking) {
      this.synth.cancel();
    }
  }

  // Check if speech is supported
  isSpeechSupported(): boolean {
    return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition) &&
           'speechSynthesis' in window;
  }

  getIsListening(): boolean {
    return this.isListening;
  }
}