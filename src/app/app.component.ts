import { Component } from '@angular/core';
const {BrowserWindow} = require('electron').remote;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'app works!';

  openwindow(){
    let win = new BrowserWindow({width: 800, height: 600})
    win.on('closed', () => {
      win = null
    })

    // Load a remote URL
    win.loadURL('https://github.com')
  }
}
