# GymApp — Application de Gestion d'une Salle de Sport
**Projet de Fin d'Études — LSIM2 | Développement Cross-Plateforme | 2024-2025**

---

## 🚀 Installation et lancement

```bash
# 1. Aller dans le dossier du projet
cd GymApp

# 2. Installer les dépendances (Electron)
npm install

# 3. Lancer l'application
npm start
```

---

## 🏗️ Architecture du projet

```
GymApp/
│
├── main.js                  ← Processus Principal (Main Process)
│   └── Gère : BrowserWindow, Menu, IPC handlers, accès fichier
│
├── renderer.js              ← Processus Renderer
│   └── Gère : CRUD UI, affichage, modal, dashboard, recherche
│
├── index.html               ← Interface graphique (HTML + CSS inline)
│
├── package.json             ← Configuration npm + script "start"
│
├── modules/
│   └── memberStore.js       ← Module Node.js : CRUD fichier JSON
│       └── fonctions : getAll, getById, addMember,
│                       updateMember, deleteMember, getStats
│
└── data/
    └── members.json         ← Fichier de stockage local (JSON)
```

---

## 🔄 Séparation Main Process / Renderer Process

```
┌─────────────────────────────────────────────────────────────┐
│                        main.js                              │
│  (Main Process — accès Node.js complet)                     │
│                                                             │
│  ┌─────────────────────┐   ┌────────────────────────────┐  │
│  │   BrowserWindow     │   │       IPC Handlers          │  │
│  │   (fenêtre app)     │   │  members:getAll             │  │
│  │                     │   │  members:getStats           │  │
│  │   Menu personnalisé │   │  members:add                │  │
│  │                     │   │  members:update             │  │
│  └─────────────────────┘   │  members:delete             │  │
│                             └────────────┬───────────────┘  │
│                                          │                  │
│                             ┌────────────▼───────────────┐  │
│                             │     memberStore.js          │  │
│                             │   (Lecture/Écriture JSON)   │  │
│                             │   fs.readFileSync()         │  │
│                             │   fs.writeFileSync()        │  │
│                             └────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC (ipcMain.handle / ipcRenderer.invoke)
┌──────────────────────────▼──────────────────────────────────┐
│                    renderer.js + index.html                  │
│  (Renderer Process — interface graphique)                    │
│                                                             │
│  ┌──────────────┐  ┌─────────────┐  ┌─────────────────┐   │
│  │  Dashboard   │  │   Tableau   │  │  Modal CRUD     │   │
│  │  (stats)     │  │  (membres)  │  │  (ajout/edit)   │   │
│  └──────────────┘  └─────────────┘  └─────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Modèle logique des données (structure JSON)

### Fichier : `data/members.json`

```json
[
  {
    "id": "m001",
    "nom": "Ben Ali",
    "prenom": "Yassine",
    "age": 24,
    "telephone": "55123456",
    "email": "yassine@email.com",
    "abonnement": {
      "type": "mensuel",
      "dateDebut": "2025-04-01",
      "dateFin": "2025-05-01"
    },
    "dateInscription": "2025-04-01"
  }
]
```

### Description des champs

| Champ                   | Type     | Description                        |
|-------------------------|----------|------------------------------------|
| `id`                    | String   | Identifiant unique (ex: "m001")    |
| `nom`                   | String   | Nom de famille du membre           |
| `prenom`                | String   | Prénom du membre                   |
| `age`                   | Integer  | Âge en années                      |
| `telephone`             | String   | Numéro de téléphone (optionnel)    |
| `email`                 | String   | Adresse email (optionnel)          |
| `abonnement.type`       | String   | "mensuel" ou "annuel"              |
| `abonnement.dateDebut`  | String   | Date début format "YYYY-MM-DD"     |
| `abonnement.dateFin`    | String   | Date fin format "YYYY-MM-DD"       |
| `dateInscription`       | String   | Date d'ajout dans le système       |

### Statut abonnement (calculé dynamiquement)
```
Si dateFin >= aujourd'hui  →  Statut = "Actif"
Si dateFin <  aujourd'hui  →  Statut = "Expiré"
```

---

## 📐 Conception UML

### 1. Diagramme de Cas d'Utilisation

```
                    ┌─────────────────────────────────────────┐
                    │           Système GymApp                │
                    │                                         │
                    │  ┌─────────────────────┐               │
                    │  │ Consulter Dashboard  │               │
                    │  └─────────────────────┘               │
                    │                                         │
                    │  ┌─────────────────────┐               │
                    │  │  Ajouter un Membre  │               │
                    │  └─────────────────────┘               │
   ┌────────┐       │                                         │
   │        │─────▶ │  ┌─────────────────────┐               │
   │ Gérant │       │  │  Modifier un Membre │               │
   │        │─────▶ │  └─────────────────────┘               │
   └────────┘       │                                         │
                    │  ┌─────────────────────┐               │
                    │  │ Supprimer un Membre │               │
                    │  └─────────────────────┘               │
                    │                                         │
                    │  ┌─────────────────────┐               │
                    │  │  Lister les Membres │               │
                    │  └─────────────────────┘               │
                    │                                         │
                    │  ┌─────────────────────┐               │
                    │  │  Rechercher Membre  │               │
                    │  └─────────────────────┘               │
                    └─────────────────────────────────────────┘
```

---

### 2. Diagramme de Classes

```
┌──────────────────────────┐         ┌──────────────────────────┐
│         Member            │         │       Subscription        │
├──────────────────────────┤         ├──────────────────────────┤
│ - id : String             │   1     │ - type : String           │
│ - nom : String            │─────────│   (mensuel | annuel)      │
│ - prenom : String         │         │ - dateDebut : String      │
│ - age : Integer           │         │ - dateFin : String        │
│ - telephone : String      │         ├──────────────────────────┤
│ - email : String          │         │ + getStatut() : String    │
│ - dateInscription : String│         │   (Actif | Expiré)        │
├──────────────────────────┤         └──────────────────────────┘
│ + getId() : String        │
│ + getNom() : String       │         ┌──────────────────────────┐
│ + getAbonnement()         │         │       MemberStore         │
│   : Subscription          │         ├──────────────────────────┤
└──────────────────────────┘         │ - filePath : String       │
                                      ├──────────────────────────┤
                                      │ + getAll() : Member[]    │
                                      │ + getById(id) : Member   │
                                      │ + addMember(data)        │
                                      │ + updateMember(id, data) │
                                      │ + deleteMember(id): Bool │
                                      │ + getStats() : Object    │
                                      └──────────────────────────┘
```

---

### 3. Diagramme de Séquence — Ajout d'un Membre

```
Gérant        index.html      renderer.js       main.js      memberStore.js  members.json
  │                │               │               │               │               │
  │ Clique         │               │               │               │               │
  │ "Ajouter"      │               │               │               │               │
  │───────────────▶│               │               │               │               │
  │                │ openAddModal()│               │               │               │
  │                │──────────────▶│               │               │               │
  │                │◀ ─ ─ ─ ─ ─ ─ │               │               │               │
  │                │ (modal s'ouvre)               │               │               │
  │                │               │               │               │               │
  │ Remplit        │               │               │               │               │
  │ formulaire     │               │               │               │               │
  │ + clic Save    │               │               │               │               │
  │───────────────▶│               │               │               │               │
  │                │ submitForm()  │               │               │               │
  │                │──────────────▶│               │               │               │
  │                │               │ validate()    │               │               │
  │                │               │───────────────│               │               │
  │                │               │               │               │               │
  │                │               │ ipcRenderer   │               │               │
  │                │               │ .invoke(      │               │               │
  │                │               │ 'members:add')│               │               │
  │                │               │──────────────▶│               │               │
  │                │               │               │ addMember()   │               │
  │                │               │               │──────────────▶│               │
  │                │               │               │               │ readFile()    │
  │                │               │               │               │──────────────▶│
  │                │               │               │               │◀ ─ ─ ─ ─ ─ ─ │
  │                │               │               │               │ (JSON data)   │
  │                │               │               │               │               │
  │                │               │               │               │ push(newMember│
  │                │               │               │               │ writeFile()   │
  │                │               │               │               │──────────────▶│
  │                │               │               │               │               │
  │                │               │               │◀ ─ ─ ─ ─ ─ ─ │               │
  │                │               │               │ {success:true}│               │
  │                │               │◀ ─ ─ ─ ─ ─ ─ │               │               │
  │                │               │ {success,data}│               │               │
  │                │               │               │               │               │
  │                │               │ loadAll()     │               │               │
  │                │               │ showToast()   │               │               │
  │                │◀ ─ ─ ─ ─ ─ ─ │               │               │               │
  │ (tableau mis   │               │               │               │               │
  │  à jour + toast)              │               │               │               │
```

---

## 💻 Fonctionnalités implémentées

| Fonctionnalité              | Status | Fichier          |
|-----------------------------|--------|------------------|
| Ajouter un membre (CRUD-C)  | ✅     | renderer.js      |
| Lister les membres (CRUD-R) | ✅     | renderer.js      |
| Modifier un membre (CRUD-U) | ✅     | renderer.js      |
| Supprimer un membre (CRUD-D)| ✅     | renderer.js      |
| Dashboard statistiques      | ✅     | renderer.js      |
| Calcul statut auto (actif/expiré) | ✅ | renderer.js   |
| Date fin auto (mensuel/annuel) | ✅  | renderer.js      |
| Recherche/Filtre membres    | ✅     | renderer.js      |
| Stockage JSON local         | ✅     | memberStore.js   |
| Communication IPC           | ✅     | main.js          |
| Menu personnalisé Electron  | ✅     | main.js          |
| Validation formulaire       | ✅     | renderer.js      |
| Notifications toast         | ✅     | renderer.js      |
| Confirmation suppression    | ✅     | renderer.js      |

---

## 🔐 Points techniques importants pour la soutenance

### Pourquoi IPC ?
Electron sépare strictement le **Main Process** (accès Node.js/OS) du **Renderer Process** (interface HTML).
Pour lire/écrire un fichier depuis un bouton HTML, on doit passer par `ipcRenderer.invoke()` → `ipcMain.handle()`.

### Pourquoi JSON et pas une base de données ?
Pour un projet PFE étudiant sans serveur backend, le fichier JSON offre :
- Simplicité de mise en œuvre avec le module `fs` de Node.js
- Lecture/écriture directe sans driver ou ORM
- Portabilité totale (le fichier suit l'application)

### Statut d'abonnement
Le statut n'est **pas stocké** dans le JSON — il est **calculé dynamiquement** à chaque affichage :
```javascript
dateFin >= today()  →  "Actif"
dateFin <  today()  →  "Expiré"
```
