// modules/courseStore.js
// Module Node.js — gestion du fichier JSON pour la planification des cours
// Utilisé UNIQUEMENT depuis le main process via IPC

const fs   = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'courses.json');

// ── Utilitaires internes ─────────────────────────────────────────────────────

function readAll() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    return [];
  }
  const content = fs.readFileSync(DATA_FILE, 'utf8');
  return JSON.parse(content);
}

function writeAll(courses) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(courses, null, 2), 'utf8');
}

function generateId() {
  const courses = readAll();
  if (courses.length === 0) return 'c001';
  const lastId = courses
    .map(c => parseInt(c.id.replace('c', ''), 10))
    .reduce((max, n) => Math.max(max, n), 0);
  return 'c' + String(lastId + 1).padStart(3, '0');
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

function getAll() {
  return readAll();
}

function addCourse(data) {
  const courses = readAll();
  const newCourse = {
    id:          generateId(),
    nom:         data.nom.trim(),
    coach:       data.coach ? data.coach.trim() : '',
    coachId:     data.coachId || null,
    salle:       data.salle ? data.salle.trim() : '',
    jour:        data.jour,           // 'Lundi' … 'Dimanche'
    heureDebut:  data.heureDebut,
    heureFin:    data.heureFin,
    capacite:    parseInt(data.capacite) || 20,
    inscrits:    parseInt(data.inscrits) || 0,
    couleur:     data.couleur || '#f97316',
    description: data.description ? data.description.trim() : '',
    actif:       true,
  };
  courses.push(newCourse);
  writeAll(courses);
  return newCourse;
}

function updateCourse(id, data) {
  const courses = readAll();
  const idx = courses.findIndex(c => c.id === id);
  if (idx === -1) return null;
  courses[idx] = {
    ...courses[idx],
    nom:         data.nom.trim(),
    coach:       data.coach ? data.coach.trim() : '',
    coachId:     data.coachId || null,
    salle:       data.salle ? data.salle.trim() : '',
    jour:        data.jour,
    heureDebut:  data.heureDebut,
    heureFin:    data.heureFin,
    capacite:    parseInt(data.capacite) || 20,
    inscrits:    parseInt(data.inscrits) || 0,
    couleur:     data.couleur || '#f97316',
    description: data.description ? data.description.trim() : '',
    actif:       data.actif !== undefined ? data.actif : courses[idx].actif,
  };
  writeAll(courses);
  return courses[idx];
}

function deleteCourse(id) {
  const courses = readAll();
  const filtered = courses.filter(c => c.id !== id);
  if (filtered.length === courses.length) return false;
  writeAll(filtered);
  return true;
}

function getStats() {
  const courses = readAll();
  const total       = courses.filter(c => c.actif).length;
  const parJour     = {};
  const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
  JOURS.forEach(j => { parJour[j] = courses.filter(c => c.jour === j && c.actif).length; });
  return { total, parJour };
}

module.exports = { getAll, addCourse, updateCourse, deleteCourse, getStats };
