import { ElectronTestPage } from './app.po';

describe('electron-test App', function() {
  let page: ElectronTestPage;

  beforeEach(() => {
    page = new ElectronTestPage();
  });

  it('should display message saying app works', () => {
    page.navigateTo();
    expect(page.getParagraphText()).toEqual('app works!');
  });
});
