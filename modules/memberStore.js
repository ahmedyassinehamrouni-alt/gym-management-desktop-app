// modules/memberStore.js
// Module Node.js — gestion du fichier JSON (CRUD complet)
// Utilisé UNIQUEMENT depuis le main process via IPC

const fs = require("fs");
const path = require("path");

// Chemin absolu vers le fichier de données
const DATA_FILE = path.join(__dirname, "..", "data", "members.json");

// ── Utilitaires internes ─────────────────────────────────────────────────────

/**
 * Lire tous les membres depuis le fichier JSON
 * @returns {Array} tableau de membres
 */
function readAll() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
    return [];
  }
  const content = fs.readFileSync(DATA_FILE, "utf8");
  return JSON.parse(content);
}

/**
 * Écrire le tableau complet dans le fichier JSON
 * @param {Array} members - tableau de membres à sauvegarder
 */
function writeAll(members) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(members, null, 2), "utf8");
}

/**
 * Générer un ID unique pour un nouveau membre
 * @returns {string} ID de type "m001", "m002"...
 */
function generateId() {
  const members = readAll();
  if (members.length === 0) return "m001";
  const lastId = members
    .map((m) => parseInt(m.id.replace("m", ""), 10))
    .reduce((max, n) => Math.max(max, n), 0);
  return "m" + String(lastId + 1).padStart(3, "0");
}

// ── Fonctions CRUD exportées ─────────────────────────────────────────────────

/**
 * GET ALL — Retourner tous les membres
 */
function getAll() {
  return readAll();
}

/**
 * GET ONE — Retourner un membre par son ID
 * @param {string} id
 */
function getById(id) {
  const members = readAll();
  return members.find((m) => m.id === id) || null;
}

/**
 * ADD — Ajouter un nouveau membre
 * @param {Object} memberData - données du formulaire (sans id)
 * @returns {Object} le membre créé avec son ID
 */
function addMember(memberData) {
  const members = readAll();
  const newMember = {
    id: generateId(),
    nom: memberData.nom.trim(),
    prenom: memberData.prenom.trim(),
    age: parseInt(memberData.age, 10),
    telephone: memberData.telephone.trim(),
    email: memberData.email.trim(),
    abonnement: {
      type: memberData.abonnement.type, // 'mensuel' | 'annuel'
      dateDebut: memberData.abonnement.dateDebut, // 'YYYY-MM-DD'
      dateFin: memberData.abonnement.dateFin, // 'YYYY-MM-DD'
    },
    dateInscription: new Date().toISOString().split("T")[0],
  };
  members.push(newMember);
  writeAll(members);
  return newMember;
}

/**
 * UPDATE — Modifier un membre existant
 * @param {string} id - ID du membre à modifier
 * @param {Object} updatedData - nouvelles données
 * @returns {Object|null} le membre mis à jour, ou null si introuvable
 */
function updateMember(id, updatedData) {
  const members = readAll();
  const index = members.findIndex((m) => m.id === id);
  if (index === -1) return null;

  members[index] = {
    ...members[index],
    nom: updatedData.nom.trim(),
    prenom: updatedData.prenom.trim(),
    age: parseInt(updatedData.age, 10),
    telephone: updatedData.telephone.trim(),
    email: updatedData.email.trim(),
    abonnement: {
      type: updatedData.abonnement.type,
      dateDebut: updatedData.abonnement.dateDebut,
      dateFin: updatedData.abonnement.dateFin,
    },
  };
  writeAll(members);
  return members[index];
}

/**
 * DELETE — Supprimer un membre par ID
 * @param {string} id
 * @returns {boolean} true si supprimé, false si introuvable
 */
function deleteMember(id) {
  const members = readAll();
  const filtered = members.filter((m) => m.id !== id);
  if (filtered.length === members.length) return false;
  writeAll(filtered);
  return true;
}

/**
 * STATS — Calculer les statistiques du dashboard
 * @returns {Object} { total, actifs, expires }
 */
function getStats() {
  const members = readAll();
  const today = new Date().toISOString().split("T")[0];
  let actifs = 0;
  let expires = 0;
  members.forEach((m) => {
    if (m.abonnement.dateFin >= today) actifs++;
    else expires++;
  });
  return { total: members.length, actifs, expires };
}

// ── Export ───────────────────────────────────────────────────────────────────
module.exports = {
  getAll,
  getById,
  addMember,
  updateMember,
  deleteMember,
  getStats,
};
