// modules/staffStore.js
// Module Node.js — gestion du fichier JSON pour les coachs et employés
// Utilisé UNIQUEMENT depuis le main process via IPC

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'staff.json');

// ── Utilitaires internes ─────────────────────────────────────────────────────

function readAll() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    return [];
  }
  const content = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(content);
}

function writeAll(staff) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(staff, null, 2), 'utf8');
}

function generateId() {
  const staff = readAll();
  if (staff.length === 0) return 's001';
  const lastId = staff
    .map(s => parseInt(s.id.replace('s', ''), 10))
    .reduce((max, n) => Math.max(max, n), 0);
  return 's' + String(lastId + 1).padStart(3, '0');
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

function getAll() {
  return readAll();
}

function addStaff(data) {
  const staff = readAll();
  const newStaff = {
    id:           generateId(),
    nom:          data.nom.trim(),
    prenom:       data.prenom.trim(),
    role:         data.role,           // 'coach' | 'receptionniste' | 'manager' | 'autre'
    specialite:   data.specialite ? data.specialite.trim() : '',
    telephone:    data.telephone ? data.telephone.trim() : '',
    email:        data.email ? data.email.trim() : '',
    salaire:      parseFloat(data.salaire) || 0,
    horaires:     data.horaires || [],  // tableau de { jour, debut, fin }
    dateEmbauche: data.dateEmbauche || new Date().toISOString().split('T')[0],
    actif:        true,
  };
  staff.push(newStaff);
  writeAll(staff);
  return newStaff;
}

function updateStaff(id, data) {
  const staff = readAll();
  const idx = staff.findIndex(s => s.id === id);
  if (idx === -1) return null;
  staff[idx] = {
    ...staff[idx],
    nom:        data.nom.trim(),
    prenom:     data.prenom.trim(),
    role:       data.role,
    specialite: data.specialite ? data.specialite.trim() : '',
    telephone:  data.telephone ? data.telephone.trim() : '',
    email:      data.email ? data.email.trim() : '',
    salaire:    parseFloat(data.salaire) || 0,
    horaires:   data.horaires || [],
    dateEmbauche: data.dateEmbauche,
    actif:      data.actif !== undefined ? data.actif : staff[idx].actif,
  };
  writeAll(staff);
  return staff[idx];
}

function deleteStaff(id) {
  const staff = readAll();
  const filtered = staff.filter(s => s.id !== id);
  if (filtered.length === staff.length) return false;
  writeAll(filtered);
  return true;
}

function getStats() {
  const staff = readAll();
  const coachs         = staff.filter(s => s.role === 'coach' && s.actif).length;
  const employes       = staff.filter(s => s.role !== 'coach' && s.actif).length;
  const total          = staff.filter(s => s.actif).length;
  return { total, coachs, employes };
}

module.exports = { getAll, addStaff, updateStaff, deleteStaff, getStats };
