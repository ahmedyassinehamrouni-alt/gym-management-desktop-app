// renderer.js — Processus Renderer
// Gère : IPC vers main, CRUD UI, affichage tableau, modal, dashboard

const { ipcRenderer } = require('electron');

// ─── État global ──────────────────────────────────────────────────────────────
let allMembers    = [];
let editingId     = null;
let pendingDelete = null;

// Staff state
let allStaff       = [];
let editingStaffId = null;

// Course state
let allCourses      = [];
let editingCourseId = null;
let currentView     = 'cal'; // 'cal' | 'list'

const COURSE_COLORS = ['#f97316','#a855f7','#38bdf8','#4ade80','#f43f5e','#facc15','#14b8a6','#fb923c','#818cf8'];

// ─── Initialisation ───────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  loadAll();
  // Date par défaut = aujourd'hui
  document.getElementById('fDateDebut').value = today();
  autoDateFin();
});

// Écouter l'événement "À propos" depuis le menu
ipcRenderer.on('show-about', () => showToast('GymApp — PFE LSIM2 2024-2025'));

// ─── Chargement des données depuis main process ───────────────────────────────
async function loadAll() {
  allMembers = await ipcRenderer.invoke('members:getAll');
  allStaff   = await ipcRenderer.invoke('staff:getAll');
  allCourses = await ipcRenderer.invoke('courses:getAll');
  renderDashboard();
  renderTable(allMembers);
  renderStaffTable(allStaff);
  renderStaffStats();
  renderPlanningStats();
  renderCalendar();
  renderCoursesList();
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
async function renderDashboard() {
  const stats = await ipcRenderer.invoke('members:getStats');
  document.getElementById('statTotal').textContent   = stats.total;
  document.getElementById('statActifs').textContent  = stats.actifs;
  document.getElementById('statExpires').textContent = stats.expires;
  document.getElementById('memberCount').textContent = stats.total;

  // Afficher les 5 derniers inscrits
  const recent = [...allMembers].reverse().slice(0, 5);
  const tbody = document.getElementById('dashRecentBody');
  tbody.innerHTML = '';

  if (recent.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><span class="big">👤</span>Aucun membre inscrit.</td></tr>`;
    return;
  }

  recent.forEach((m, i) => {
    const statut = getStatut(m.abonnement.dateFin);
    const row = document.createElement('tr');
    row.style.animationDelay = `${i * 0.05}s`;
    row.innerHTML = `
      <td class="id-col">${m.id}</td>
      <td class="name-col">${escHtml(m.nom)} ${escHtml(m.prenom)}</td>
      <td>${m.age} ans</td>
      <td><span class="badge badge-${m.abonnement.type === 'mensuel' ? 'mensuel' : 'annuel'}">${m.abonnement.type}</span></td>
      <td>${formatDate(m.abonnement.dateFin)}</td>
      <td><span class="badge badge-${statut.cls}">${statut.label}</span></td>
    `;
    tbody.appendChild(row);
  });
}

// ─── Tableau des membres ──────────────────────────────────────────────────────
function renderTable(members) {
  const tbody = document.getElementById('membersTableBody');
  tbody.innerHTML = '';

  if (members.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="big">🔍</span>Aucun membre trouvé.</div></td></tr>`;
    return;
  }

  members.forEach((m, i) => {
    const statut = getStatut(m.abonnement.dateFin);
    const row = document.createElement('tr');
    row.style.animationDelay = `${i * 0.04}s`;
    row.innerHTML = `
      <td class="id-col">${m.id}</td>
      <td class="name-col">${escHtml(m.nom)} ${escHtml(m.prenom)}</td>
      <td>${m.age} ans</td>
      <td>${escHtml(m.telephone || '—')}</td>
      <td><span class="badge badge-${m.abonnement.type === 'mensuel' ? 'mensuel' : 'annuel'}">${m.abonnement.type}</span></td>
      <td>${formatDate(m.abonnement.dateDebut)}</td>
      <td>${formatDate(m.abonnement.dateFin)}</td>
      <td><span class="badge badge-${statut.cls}">${statut.label}</span></td>
      <td>
        <div class="actions-col">
          <button class="btn btn-edit btn-sm" onclick="openEditModal('${m.id}')">✏️ Modifier</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDelete('${m.id}', '${escHtml(m.nom)} ${escHtml(m.prenom)}')">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ─── Recherche / Filtre ───────────────────────────────────────────────────────
function filterMembers() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  if (!q) { renderTable(allMembers); return; }
  const filtered = allMembers.filter(m =>
    m.nom.toLowerCase().includes(q)      ||
    m.prenom.toLowerCase().includes(q)   ||
    m.id.toLowerCase().includes(q)       ||
    (m.telephone && m.telephone.includes(q)) ||
    m.abonnement.type.includes(q)
  );
  renderTable(filtered);
}

// ─── Navigation entre pages ───────────────────────────────────────────────────
function showPage(page, btn) {
  // Cacher toutes les pages
  document.querySelectorAll('[id^="page-"]').forEach(el => el.style.display = 'none');
  document.getElementById('page-' + page).style.display = 'block';

  // Mettre à jour le titre
  const titles = { dashboard: '📊 Dashboard', members: '👥 Membres', staff: '🏋️ Coachs & Employés', planning: '📅 Planification des Cours' };
  document.getElementById('pageTitle').textContent = titles[page] || page;

  // Nav active
  if (btn) {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }

  // Rafraîchir les données à chaque navigation
  loadAll();
}

// ─── Modal Ajouter ────────────────────────────────────────────────────────────
function openAddModal() {
  editingId = null;
  resetForm();
  document.getElementById('modalTitle').textContent = '➕ Ajouter un Membre';
  document.getElementById('modalSubmitBtn').textContent = '✓ Enregistrer';
  document.getElementById('memberModal').classList.add('open');
}

// ─── Modal Modifier ───────────────────────────────────────────────────────────
function openEditModal(id) {
  const member = allMembers.find(m => m.id === id);
  if (!member) return;
  editingId = id;

  // Remplir le formulaire
  document.getElementById('fNom').value      = member.nom;
  document.getElementById('fPrenom').value   = member.prenom;
  document.getElementById('fAge').value      = member.age;
  document.getElementById('fTel').value      = member.telephone || '';
  document.getElementById('fEmail').value    = member.email || '';
  document.getElementById('fType').value     = member.abonnement.type;
  document.getElementById('fDateDebut').value = member.abonnement.dateDebut;
  document.getElementById('fDateFin').value  = member.abonnement.dateFin;

  document.getElementById('modalTitle').textContent = '✏️ Modifier le Membre — ' + member.nom + ' ' + member.prenom;
  document.getElementById('modalSubmitBtn').textContent = '✓ Mettre à jour';
  document.getElementById('memberModal').classList.add('open');
}

function closeModal() {
  document.getElementById('memberModal').classList.remove('open');
  editingId = null;
}

// ─── Soumission du formulaire (Ajout ou Modification) ─────────────────────────
async function submitForm() {
  const nom      = document.getElementById('fNom').value.trim();
  const prenom   = document.getElementById('fPrenom').value.trim();
  const age      = document.getElementById('fAge').value.trim();
  const tel      = document.getElementById('fTel').value.trim();
  const email    = document.getElementById('fEmail').value.trim();
  const type     = document.getElementById('fType').value;
  const dateDebut = document.getElementById('fDateDebut').value;
  const dateFin  = document.getElementById('fDateFin').value;

  // Validation simple
  if (!nom || !prenom || !age || !dateDebut || !dateFin) {
    showToast('⚠️ Veuillez remplir tous les champs obligatoires.', 'error');
    return;
  }
  if (parseInt(age) < 10 || parseInt(age) > 100) {
    showToast('⚠️ Âge invalide (entre 10 et 100).', 'error');
    return;
  }
  if (dateFin < dateDebut) {
    showToast('⚠️ La date de fin doit être après la date de début.', 'error');
    return;
  }

  const data = { nom, prenom, age, telephone: tel, email, abonnement: { type, dateDebut, dateFin } };

  if (editingId) {
    // ── UPDATE ──
    const res = await ipcRenderer.invoke('members:update', editingId, data);
    if (res.success) {
      showToast('✅ Membre mis à jour avec succès !');
      closeModal();
      loadAll();
    } else {
      showToast('❌ Erreur : ' + res.error, 'error');
    }
  } else {
    // ── ADD ──
    const res = await ipcRenderer.invoke('members:add', data);
    if (res.success) {
      showToast('✅ Membre ajouté avec succès !');
      closeModal();
      loadAll();
    } else {
      showToast('❌ Erreur : ' + res.error, 'error');
    }
  }
}

// ─── Suppression ──────────────────────────────────────────────────────────────
function confirmDelete(id, nom) {
  pendingDelete = id;
  document.getElementById('confirmMsg').textContent = `Supprimer "${nom}" ? Cette action est irréversible.`;
  document.getElementById('confirmOkBtn').onclick = async () => {
    const res = await ipcRenderer.invoke('members:delete', pendingDelete);
    closeConfirm();
    if (res.success) {
      showToast('🗑️ Membre supprimé.');
      loadAll();
    } else {
      showToast('❌ Erreur lors de la suppression.', 'error');
    }
  };
  document.getElementById('confirmOverlay').classList.add('open');
}

function closeConfirm() {
  document.getElementById('confirmOverlay').classList.remove('open');
  pendingDelete = null;
}

// ─── Calcul automatique date de fin ───────────────────────────────────────────
function autoDateFin() {
  const type  = document.getElementById('fType').value;
  const debut = document.getElementById('fDateDebut').value;
  if (!debut) return;

  const d = new Date(debut);
  if (type === 'mensuel') d.setMonth(d.getMonth() + 1);
  else                    d.setFullYear(d.getFullYear() + 1);

  document.getElementById('fDateFin').value = d.toISOString().split('T')[0];
}

// ─── Reset formulaire ─────────────────────────────────────────────────────────
function resetForm() {
  ['fNom','fPrenom','fAge','fTel','fEmail'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('fType').value     = 'mensuel';
  document.getElementById('fDateDebut').value = today();
  autoDateFin();
}

// ─── Utilitaires ──────────────────────────────────────────────────────────────

/** Retourne la date du jour au format YYYY-MM-DD */
function today() {
  return new Date().toISOString().split('T')[0];
}

/** Formater une date YYYY-MM-DD en DD/MM/YYYY */
function formatDate(str) {
  if (!str) return '—';
  const [y, m, d] = str.split('-');
  return `${d}/${m}/${y}`;
}

/** Calculer le statut d'un abonnement (actif / expiré) */
function getStatut(dateFin) {
  return dateFin >= today()
    ? { label: 'Actif',   cls: 'actif'  }
    : { label: 'Expiré',  cls: 'expire' };
}

/** Échapper le HTML pour éviter les injections */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Afficher une notification toast */
let toastTimeout = null;
function showToast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type === 'error' ? ' error' : '');
  setTimeout(() => t.classList.add('show'), 10);
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => t.classList.remove('show'), 3200);
}

// ─── Staff Stats ───────────────────────────────────────────────────────────────
async function renderStaffStats() {
  const stats = await ipcRenderer.invoke('staff:getStats');
  document.getElementById('statStaffTotal').textContent   = stats.total;
  document.getElementById('statStaffCoachs').textContent  = stats.coachs;
  document.getElementById('statStaffEmployes').textContent = stats.employes;
  document.getElementById('staffCount').textContent = stats.total;
}

// ─── Staff Table ───────────────────────────────────────────────────────────────
const ROLE_LABELS = {
  coach: 'Coach', receptionniste: 'Réceptionniste',
  manager: 'Manager', autre: 'Autre'
};

function renderStaffTable(staff) {
  const tbody = document.getElementById('staffTableBody');
  tbody.innerHTML = '';
  if (staff.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9"><div class="empty-state"><span class="big">🏋️</span>Aucun employé enregistré.</div></td></tr>`;
    return;
  }
  staff.forEach((s, i) => {
    const row = document.createElement('tr');
    row.style.animationDelay = `${i * 0.04}s`;
    const horairesTags = s.horaires && s.horaires.length
      ? s.horaires.map(h => `<span class="horaire-tag">📅 ${h.jour} ${h.debut}–${h.fin}</span>`).join('')
      : '<span style="color:var(--muted);font-size:11px">—</span>';
    row.innerHTML = `
      <td class="id-col">${s.id}</td>
      <td class="name-col">${escHtml(s.nom)} ${escHtml(s.prenom)}</td>
      <td><span class="badge badge-${s.role}">${ROLE_LABELS[s.role] || s.role}</span></td>
      <td style="font-size:12px;color:var(--muted)">${escHtml(s.specialite || '—')}</td>
      <td>${escHtml(s.telephone || '—')}</td>
      <td style="color:var(--green);font-weight:600">${s.salaire ? s.salaire.toLocaleString('fr-TN') + ' TND' : '—'}</td>
      <td style="max-width:180px">${horairesTags}</td>
      <td>${formatDate(s.dateEmbauche)}</td>
      <td>
        <div class="actions-col">
          <button class="btn btn-edit btn-sm" onclick="openEditStaffModal('${s.id}')">✏️ Modifier</button>
          <button class="btn btn-danger btn-sm" onclick="confirmDeleteStaff('${s.id}', '${escHtml(s.nom)} ${escHtml(s.prenom)}')">🗑️</button>
        </div>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// ─── Staff Modal ───────────────────────────────────────────────────────────────
function openAddStaffModal() {
  editingStaffId = null;
  resetStaffForm();
  document.getElementById('staffModalTitle').textContent = '🏋️ Ajouter un Employé';
  document.getElementById('staffSubmitBtn').textContent  = '✓ Enregistrer';
  document.getElementById('staffModal').classList.add('open');
}

function openEditStaffModal(id) {
  const s = allStaff.find(x => x.id === id);
  if (!s) return;
  editingStaffId = id;
  document.getElementById('sfNom').value         = s.nom;
  document.getElementById('sfPrenom').value      = s.prenom;
  document.getElementById('sfRole').value        = s.role;
  document.getElementById('sfSpecialite').value  = s.specialite || '';
  document.getElementById('sfTel').value         = s.telephone || '';
  document.getElementById('sfEmail').value       = s.email || '';
  document.getElementById('sfSalaire').value     = s.salaire || '';
  document.getElementById('sfDateEmbauche').value = s.dateEmbauche || today();
  toggleSpecialite();
  // Rebuild horaires
  const grid = document.getElementById('horairesGrid');
  grid.innerHTML = '';
  (s.horaires || []).forEach(h => addHoraireRow(h.jour, h.debut, h.fin));
  document.getElementById('staffModalTitle').textContent = `✏️ Modifier — ${s.nom} ${s.prenom}`;
  document.getElementById('staffSubmitBtn').textContent  = '✓ Mettre à jour';
  document.getElementById('staffModal').classList.add('open');
}

function closeStaffModal() {
  document.getElementById('staffModal').classList.remove('open');
  editingStaffId = null;
}

function resetStaffForm() {
  ['sfNom','sfPrenom','sfSpecialite','sfTel','sfEmail','sfSalaire'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('sfRole').value        = 'coach';
  document.getElementById('sfDateEmbauche').value = today();
  document.getElementById('horairesGrid').innerHTML = '';
  toggleSpecialite();
}

function toggleSpecialite() {
  const role = document.getElementById('sfRole').value;
  document.getElementById('sfSpecialiteGroup').style.display = role === 'coach' ? 'flex' : 'flex';
}

// ─── Horaire rows ──────────────────────────────────────────────────────────────
const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

function addHoraireRow(jour = 'Lundi', debut = '08:00', fin = '17:00') {
  const grid = document.getElementById('horairesGrid');
  const div  = document.createElement('div');
  div.className = 'horaire-row';
  div.innerHTML = `
    <select class="hJour">${JOURS.map(j => `<option value="${j}" ${j===jour?'selected':''}>${j}</option>`).join('')}</select>
    <input type="time" class="hDebut" value="${debut}" />
    <input type="time" class="hFin"   value="${fin}"   />
    <button class="btn-remove-horaire" onclick="this.parentElement.remove()">✕</button>
  `;
  grid.appendChild(div);
}

function getHoraires() {
  const rows = document.querySelectorAll('#horairesGrid .horaire-row');
  return Array.from(rows).map(r => ({
    jour:  r.querySelector('.hJour').value,
    debut: r.querySelector('.hDebut').value,
    fin:   r.querySelector('.hFin').value,
  }));
}

// ─── Staff Submit ──────────────────────────────────────────────────────────────
async function submitStaffForm() {
  const nom        = document.getElementById('sfNom').value.trim();
  const prenom     = document.getElementById('sfPrenom').value.trim();
  const role       = document.getElementById('sfRole').value;
  const specialite = document.getElementById('sfSpecialite').value.trim();
  const telephone  = document.getElementById('sfTel').value.trim();
  const email      = document.getElementById('sfEmail').value.trim();
  const salaire    = document.getElementById('sfSalaire').value;
  const dateEmbauche = document.getElementById('sfDateEmbauche').value;

  if (!nom || !prenom || !salaire || !dateEmbauche) {
    showToast('⚠️ Veuillez remplir tous les champs obligatoires.', 'error');
    return;
  }
  const horaires = getHoraires();
  const data = { nom, prenom, role, specialite, telephone, email, salaire, dateEmbauche, horaires };

  if (editingStaffId) {
    const res = await ipcRenderer.invoke('staff:update', editingStaffId, data);
    if (res.success) { showToast('✅ Employé mis à jour !'); closeStaffModal(); loadAll(); }
    else showToast('❌ ' + res.error, 'error');
  } else {
    const res = await ipcRenderer.invoke('staff:add', data);
    if (res.success) { showToast('✅ Employé ajouté !'); closeStaffModal(); loadAll(); }
    else showToast('❌ ' + res.error, 'error');
  }
}

// ─── Staff Delete ──────────────────────────────────────────────────────────────
function confirmDeleteStaff(id, nom) {
  pendingDelete = id;
  document.getElementById('confirmMsg').textContent = `Supprimer "${nom}" ? Cette action est irréversible.`;
  document.getElementById('confirmOkBtn').onclick = async () => {
    const res = await ipcRenderer.invoke('staff:delete', pendingDelete);
    closeConfirm();
    if (res.success) { showToast('🗑️ Employé supprimé.'); loadAll(); }
    else showToast('❌ Erreur lors de la suppression.', 'error');
  };
  document.getElementById('confirmOverlay').classList.add('open');
}

// Fermer modal en cliquant sur l'overlay
document.getElementById('memberModal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});
document.getElementById('staffModal').addEventListener('click', function(e) {
  if (e.target === this) closeStaffModal();
});
document.getElementById('confirmOverlay').addEventListener('click', function(e) {
  if (e.target === this) closeConfirm();
});

// Raccourcis clavier
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeModal(); closeStaffModal(); closeConfirm(); }
});

// ════════════════════════════════════════════════════════════════════════════
// ─── PLANNING DES COURS ─────────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════

const JOURS_SEMAINE = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

// ─── Stats planning ───────────────────────────────────────────────────────────
function renderPlanningStats() {
  const actifs    = allCourses.filter(c => c.actif);
  const coaches   = [...new Set(actifs.map(c => c.coach).filter(Boolean))].length;
  const inscrits  = actifs.reduce((s, c) => s + (c.inscrits || 0), 0);
  const capacite  = actifs.reduce((s, c) => s + (c.capacite || 0), 0);
  const el = id => document.getElementById(id);
  el('psTotalCours').textContent = actifs.length;
  el('psCoachs').textContent     = coaches;
  el('psInscrits').textContent   = inscrits;
  el('psCapacite').textContent   = capacite;
}

// ─── Calendrier semaine ───────────────────────────────────────────────────────
function renderCalendar() {
  const container = document.getElementById('planningCalView');
  if (!container) return;
  container.innerHTML = '';

  JOURS_SEMAINE.forEach(jour => {
    const coursDuJour = allCourses.filter(c => c.jour === jour && c.actif)
      .sort((a, b) => a.heureDebut.localeCompare(b.heureDebut));

    const col = document.createElement('div');
    col.className = 'calendar-day-col';
    col.innerHTML = `
      <div class="calendar-day-header">
        ${jour}
        ${coursDuJour.length ? `<span class="day-count">${coursDuJour.length}</span>` : ''}
      </div>
      <div class="calendar-day-body" id="dayBody-${jour}"></div>
    `;
    container.appendChild(col);

    const body = col.querySelector('.calendar-day-body');
    if (coursDuJour.length === 0) {
      body.innerHTML = `<div class="day-empty">Aucun cours</div>`;
    } else {
      coursDuJour.forEach(c => {
        const fillPct = c.capacite > 0 ? Math.min(100, Math.round((c.inscrits / c.capacite) * 100)) : 0;
        const card = document.createElement('div');
        card.className = 'course-card';
        card.style.cssText = `background:${c.couleur}cc; border-left-color:${c.couleur};`;
        card.innerHTML = `
          <div class="cc-actions">
            <button class="cc-btn" onclick="openEditCourseModal('${c.id}');event.stopPropagation()">✏️</button>
            <button class="cc-btn" onclick="confirmDeleteCourse('${c.id}','${escHtml(c.nom)}');event.stopPropagation()">🗑️</button>
          </div>
          <div class="cc-name">${escHtml(c.nom)}</div>
          <div class="cc-time">⏱ ${c.heureDebut} – ${c.heureFin}</div>
          ${c.coach ? `<div class="cc-coach">👤 ${escHtml(c.coach)}</div>` : ''}
          ${c.salle  ? `<div class="cc-coach">📍 ${escHtml(c.salle)}</div>` : ''}
          <div class="cc-fill">
            <div class="fill-bar"><div class="fill-bar-inner" style="width:${fillPct}%"></div></div>
            ${c.inscrits}/${c.capacite}
          </div>
        `;
        body.appendChild(card);
      });
    }
  });
}

// ─── Vue liste ────────────────────────────────────────────────────────────────
function renderCoursesList() {
  const tbody = document.getElementById('coursesTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  const actifs = allCourses.filter(c => c.actif);
  if (actifs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><span class="big">📅</span>Aucun cours planifié.</div></td></tr>`;
    return;
  }
  actifs
    .sort((a,b) => JOURS_SEMAINE.indexOf(a.jour) - JOURS_SEMAINE.indexOf(b.jour) || a.heureDebut.localeCompare(b.heureDebut))
    .forEach((c, i) => {
      const fillPct = c.capacite > 0 ? Math.min(100, Math.round((c.inscrits / c.capacite) * 100)) : 0;
      const complet = fillPct >= 100;
      const row = document.createElement('tr');
      row.style.animationDelay = `${i * 0.04}s`;
      row.innerHTML = `
        <td class="id-col">${c.id}</td>
        <td class="name-col">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${c.couleur};margin-right:6px"></span>
          ${escHtml(c.nom)}
        </td>
        <td>${escHtml(c.coach || '—')}</td>
        <td>${escHtml(c.salle || '—')}</td>
        <td><span class="badge" style="background:rgba(249,115,22,0.15);color:var(--accent)">${c.jour}</span></td>
        <td>${c.heureDebut} – ${c.heureFin}</td>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="fill-bar" style="width:60px;height:6px;display:inline-block">
              <div class="fill-bar-inner" style="width:${fillPct}%;background:${complet?'var(--red)':'var(--green)'}"></div>
            </div>
            <span style="font-size:12px;color:${complet?'var(--red)':'var(--text)'}">${c.inscrits}/${c.capacite}</span>
            ${complet ? '<span class="badge" style="background:rgba(248,113,113,0.15);color:var(--red);font-size:10px">Complet</span>' : ''}
          </div>
        </td>
        <td>
          <div class="actions-col">
            <button class="btn btn-edit btn-sm" onclick="openEditCourseModal('${c.id}')">✏️ Modifier</button>
            <button class="btn btn-danger btn-sm" onclick="confirmDeleteCourse('${c.id}', '${escHtml(c.nom)}')">🗑️</button>
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });
}

// ─── Toggle vue cal / liste ───────────────────────────────────────────────────
function switchView(view) {
  currentView = view;
  document.getElementById('planningCalView').style.display  = view === 'cal'  ? 'grid' : 'none';
  document.getElementById('planningListView').style.display = view === 'list' ? 'block' : 'none';
  document.getElementById('viewCalBtn').classList.toggle('active',  view === 'cal');
  document.getElementById('viewListBtn').classList.toggle('active', view === 'list');
}

// ─── Modal Cours ──────────────────────────────────────────────────────────────
function buildColorPicker(selected) {
  const picker = document.getElementById('cfColorPicker');
  picker.innerHTML = '';
  COURSE_COLORS.forEach(col => {
    const sw = document.createElement('div');
    sw.className = 'color-swatch' + (col === selected ? ' selected' : '');
    sw.style.background = col;
    sw.title = col;
    sw.onclick = () => {
      document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      document.getElementById('cfCouleur').value = col;
    };
    picker.appendChild(sw);
  });
}

function openAddCourseModal() {
  editingCourseId = null;
  ['cfNom','cfCoach','cfSalle','cfDescription'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('cfJour').value    = 'Lundi';
  document.getElementById('cfDebut').value   = '08:00';
  document.getElementById('cfFin').value     = '09:00';
  document.getElementById('cfCapacite').value = '20';
  document.getElementById('cfInscrits').value = '0';
  document.getElementById('cfCouleur').value  = '#f97316';
  buildColorPicker('#f97316');
  document.getElementById('courseModalTitle').textContent = '📅 Ajouter un Cours';
  document.getElementById('courseSubmitBtn').textContent  = '✓ Enregistrer';
  document.getElementById('courseModal').classList.add('open');
}

function openEditCourseModal(id) {
  const c = allCourses.find(x => x.id === id);
  if (!c) return;
  editingCourseId = id;
  document.getElementById('cfNom').value         = c.nom;
  document.getElementById('cfCoach').value       = c.coach || '';
  document.getElementById('cfSalle').value       = c.salle || '';
  document.getElementById('cfJour').value        = c.jour;
  document.getElementById('cfDebut').value       = c.heureDebut;
  document.getElementById('cfFin').value         = c.heureFin;
  document.getElementById('cfCapacite').value    = c.capacite;
  document.getElementById('cfInscrits').value    = c.inscrits;
  document.getElementById('cfDescription').value = c.description || '';
  document.getElementById('cfCouleur').value     = c.couleur || '#f97316';
  buildColorPicker(c.couleur || '#f97316');
  document.getElementById('courseModalTitle').textContent = `✏️ Modifier — ${c.nom}`;
  document.getElementById('courseSubmitBtn').textContent  = '✓ Mettre à jour';
  document.getElementById('courseModal').classList.add('open');
}

function closeCourseModal() {
  document.getElementById('courseModal').classList.remove('open');
  editingCourseId = null;
}

// ─── Submit Cours ─────────────────────────────────────────────────────────────
async function submitCourseForm() {
  const nom     = document.getElementById('cfNom').value.trim();
  const debut   = document.getElementById('cfDebut').value;
  const fin     = document.getElementById('cfFin').value;
  const jour    = document.getElementById('cfJour').value;
  if (!nom || !debut || !fin) {
    showToast('⚠️ Remplissez les champs obligatoires (nom, horaires).', 'error'); return;
  }
  if (fin <= debut) {
    showToast('⚠️ L\'heure de fin doit être après l\'heure de début.', 'error'); return;
  }
  const data = {
    nom,
    coach:       document.getElementById('cfCoach').value.trim(),
    salle:       document.getElementById('cfSalle').value.trim(),
    jour,
    heureDebut:  debut,
    heureFin:    fin,
    capacite:    document.getElementById('cfCapacite').value || 20,
    inscrits:    document.getElementById('cfInscrits').value || 0,
    description: document.getElementById('cfDescription').value.trim(),
    couleur:     document.getElementById('cfCouleur').value,
  };

  if (editingCourseId) {
    const res = await ipcRenderer.invoke('courses:update', editingCourseId, data);
    if (res.success) { showToast('✅ Cours mis à jour !'); closeCourseModal(); loadAll(); }
    else showToast('❌ ' + res.error, 'error');
  } else {
    const res = await ipcRenderer.invoke('courses:add', data);
    if (res.success) { showToast('✅ Cours ajouté !'); closeCourseModal(); loadAll(); }
    else showToast('❌ ' + res.error, 'error');
  }
}

// ─── Delete Cours ─────────────────────────────────────────────────────────────
function confirmDeleteCourse(id, nom) {
  pendingDelete = id;
  document.getElementById('confirmMsg').textContent = `Supprimer le cours "${nom}" ? Cette action est irréversible.`;
  document.getElementById('confirmOkBtn').onclick = async () => {
    const res = await ipcRenderer.invoke('courses:delete', pendingDelete);
    closeConfirm();
    if (res.success) { showToast('🗑️ Cours supprimé.'); loadAll(); }
    else showToast('❌ Erreur.', 'error');
  };
  document.getElementById('confirmOverlay').classList.add('open');
}

// Fermer le modal cours en cliquant overlay
document.getElementById('courseModal').addEventListener('click', function(e) {
  if (e.target === this) closeCourseModal();
});
