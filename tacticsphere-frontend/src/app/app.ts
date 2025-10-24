import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('tacticsphere-frontend');
  pong = signal<string | null>(null);

  constructor(private http: HttpClient) {
    this.http.get<{ message: string }>('http://localhost:8000/ping').subscribe({
      next: (res) => this.pong.set(res.message),
      error: (err) => {
        console.error('Ping error', err);
        this.pong.set(null);
      },
    });
  }
}