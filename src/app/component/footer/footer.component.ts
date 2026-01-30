import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.css'
})
export class FooterComponent {
 currentYear: number = new Date().getFullYear();
  email: string = 'hello@makethetaste.com';
  phone: string = '+1 (555) 123-4567';
}
