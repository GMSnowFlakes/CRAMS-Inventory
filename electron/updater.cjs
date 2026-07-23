// electron/updater.cjs — Auto-update for InventoryOS
const { autoUpdater } = require('electron-updater');
const { BrowserWindow, dialog, Notification } = require('electron');

let checkInterval = null;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

function startUpdateChecker(mainWindow) {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log(`[updater] Update available: ${info.version}`);
    mainWindow.webContents.send('update-available', { version: info.version });
    if (Notification.isSupported()) {
      new Notification({
        title: 'InventoryOS Update Available',
        body: `Version ${info.version} is downloading...`,
        silent: true,
      }).show();
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[updater] Update downloaded: ${info.version}`);
    mainWindow.webContents.send('update-downloaded', { version: info.version });
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new version of InventoryOS is ready to install.',
      detail: `Version ${info.version} has been downloaded. Click "Install Now" to restart and apply the update.`,
      buttons: ['Install Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater] Error:', err);
  });

  autoUpdater.checkForUpdates().catch((err) => console.error('[updater] Check failed:', err));

  checkInterval = setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, CHECK_INTERVAL_MS);
}

function stopUpdateChecker() {
  if (checkInterval) { clearInterval(checkInterval); checkInterval = null; }
}

module.exports = { startUpdateChecker, stopUpdateChecker };
