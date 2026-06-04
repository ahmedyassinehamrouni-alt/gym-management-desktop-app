// main.js — Processus Principal Electron
// Gère : fenêtre, menu, IPC ↔ renderer, accès fichier JSON

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path       = require('path');
const store       = require('./modules/memberStore');
const staffStore  = require('./modules/staffStore');
const courseStore = require('./modules/courseStore');

let mainWindow;

// ── Création de la fenêtre principale ────────────────────────────────────────
function createWindow() {
  mainWindow = new BrowserWindow({
    width:           1100,
    height:          700,
    minWidth:        900,
    minHeight:       600,
    center:          true,
    title:           'GymApp — Gestion Salle de Sport',
    backgroundColor: '#0b0f1a',
    webPreferences: {
      nodeIntegration:  true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');

  // Ouvrir les DevTools uniquement en développement
  // mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── Menu personnalisé ─────────────────────────────────────────────────────────
function createMenu() {
  const template = [
    {
      label: 'Application',
      submenu: [
        { label: 'Actualiser', role: 'reload' },
        { type: 'separator' },
        {
          label: 'Quitter',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'togglefullscreen', label: 'Plein écran' },
        { role: 'toggleDevTools',   label: 'Outils développeur' }
      ]
    },
    {
      label: 'Aide',
      submenu: [
        {
          label: 'À propos',
          click: () => {
            mainWindow.webContents.send('show-about');
          }
        }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC Handlers — CRUD Membres ──────────────────────────────────────────────

// GET ALL : récupérer tous les membres
ipcMain.handle('members:getAll', () => {
  return store.getAll();
});

// GET STATS : récupérer les statistiques dashboard
ipcMain.handle('members:getStats', () => {
  return store.getStats();
});

// ADD : ajouter un membre
ipcMain.handle('members:add', (event, memberData) => {
  try {
    const created = store.addMember(memberData);
    return { success: true, data: created };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// UPDATE : modifier un membre
ipcMain.handle('members:update', (event, id, updatedData) => {
  try {
    const updated = store.updateMember(id, updatedData);
    if (!updated) return { success: false, error: 'Membre introuvable.' };
    return { success: true, data: updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// DELETE : supprimer un membre
ipcMain.handle('members:delete', (event, id) => {
  try {
    const ok = store.deleteMember(id);
    return { success: ok };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC Handlers — CRUD Staff ────────────────────────────────────────────────

ipcMain.handle('staff:getAll', () => staffStore.getAll());

ipcMain.handle('staff:getStats', () => staffStore.getStats());

ipcMain.handle('staff:add', (event, data) => {
  try {
    const created = staffStore.addStaff(data);
    return { success: true, data: created };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('staff:update', (event, id, data) => {
  try {
    const updated = staffStore.updateStaff(id, data);
    if (!updated) return { success: false, error: 'Employé introuvable.' };
    return { success: true, data: updated };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('staff:delete', (event, id) => {
  try {
    const ok = staffStore.deleteStaff(id);
    return { success: ok };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── IPC Handlers — CRUD Cours ────────────────────────────────────────────────

ipcMain.handle('courses:getAll',   () => courseStore.getAll());
ipcMain.handle('courses:getStats', () => courseStore.getStats());

ipcMain.handle('courses:add', (event, data) => {
  try { return { success: true, data: courseStore.addCourse(data) }; }
  catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('courses:update', (event, id, data) => {
  try {
    const updated = courseStore.updateCourse(id, data);
    if (!updated) return { success: false, error: 'Cours introuvable.' };
    return { success: true, data: updated };
  } catch (err) { return { success: false, error: err.message }; }
});

ipcMain.handle('courses:delete', (event, id) => {
  try { return { success: courseStore.deleteCourse(id) }; }
  catch (err) { return { success: false, error: err.message }; }
});

// ── Lancement ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createMenu();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
