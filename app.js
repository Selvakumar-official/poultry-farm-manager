// ---------- IMPORTANT: Add your Firebase config below ----------
// 1) Create Firebase project (instructions below)
// 2) In Firebase Console -> Add Web App -> copy config object and paste here
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  // ... rest of config
};
// ---------------------------------------------------------------

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Set manager email here (change to manager's real email)
// Manager can view all farmers' data. Farmers have role 'farmer'.
const MANAGER_EMAIL = "manager@example.com";

// UI elements
const signupName = document.getElementById('signup-name');
const signupEmail = document.getElementById('signup-email');
const signupPassword = document.getElementById('signup-password');
const btnSignup = document.getElementById('btn-signup');

const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');

const farmerSection = document.getElementById('farmer-section');
const managerSection = document.getElementById('manager-section');
const authSection = document.getElementById('auth-section');

const messageBox = document.getElementById('message');

// Entry fields
const entryDate = document.getElementById('entry-date');
const birdCount = document.getElementById('bird-count');
const feedUsed = document.getElementById('feed-used');
const medicine = document.getElementById('medicine');
const mortality = document.getElementById('mortality');
const notes = document.getElementById('notes');
const btnSaveEntry = document.getElementById('btn-save-entry');
const yourEntries = document.getElementById('your-entries');

// Manager table
const entriesTableBody = document.querySelector('#entries-table tbody');
const filterEmailInput = document.getElementById('filter-email');
const btnFilter = document.getElementById('btn-filter');
const btnClearFilter = document.getElementById('btn-clear-filter');

function showMessage(text, time=3000) {
  messageBox.style.display = 'block';
  messageBox.textContent = text;
  setTimeout(()=> messageBox.style.display='none', time);
}

// Sign up as farmer
btnSignup.addEventListener('click', async () => {
  const name = signupName.value.trim();
  const email = signupEmail.value.trim();
  const pass = signupPassword.value;
  if (!name || !email || !pass) return showMessage('Please fill all sign up fields');
  try {
    const userCred = await auth.createUserWithEmailAndPassword(email, pass);
    const uid = userCred.user.uid;
    // Save profile + role
    await db.collection('users').doc(uid).set({
      name, email, role: (email === MANAGER_EMAIL ? 'manager' : 'farmer'),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    showMessage('Signup successful. You can login now.');
    signupName.value = signupEmail.value = signupPassword.value = '';
  } catch (err) {
    showMessage('Sign up error: ' + err.message);
  }
});

// Login
btnLogin.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const pass = loginPassword.value;
  if (!email || !pass) return showMessage('Please fill login fields');
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    showMessage('Login successful');
    loginEmail.value = loginPassword.value = '';
  } catch (err) {
    showMessage('Login error: ' + err.message);
  }
});

// Logout
btnLogout.addEventListener('click', () => auth.signOut());

// Save entry (farmers)
btnSaveEntry.addEventListener('click', async () => {
  const user = auth.currentUser;
  if (!user) return showMessage('Not logged in');
  const date = entryDate.value || new Date().toISOString().slice(0,10);
  const data = {
    date,
    birdCount: Number(birdCount.value || 0),
    feedUsed: Number(feedUsed.value || 0),
    medicine: medicine.value || '',
    mortality: Number(mortality.value || 0),
    notes: notes.value || '',
    farmerUid: user.uid,
    farmerEmail: user.email,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  try {
    await db.collection('entries').add(data);
    showMessage('Entry saved');
    birdCount.value = feedUsed.value = medicine.value = mortality.value = notes.value = '';
    loadYourEntries();
  } catch (err) {
    showMessage('Save error: ' + err.message);
  }
});

// Load current user's entries
async function loadYourEntries() {
  const user = auth.currentUser;
  if (!user) return;
  const snapshot = await db.collection('entries')
    .where('farmerUid','==',user.uid)
    .orderBy('createdAt','desc')
    .limit(20)
    .get();
  yourEntries.innerHTML = '';
  snapshot.forEach(doc => {
    const d = doc.data();
    const el = document.createElement('div');
    el.className = 'card';
    el.innerHTML = `<b>${d.date}</b> - Birds: ${d.birdCount}, Feed: ${d.feedUsed}kg, Mortality: ${d.mortality}<div>Note: ${d.notes || '-'}</div>`;
    yourEntries.appendChild(el);
  });
}

// Load all entries for manager
async function loadAllEntries(filterEmail=null) {
  let q = db.collection('entries').orderBy('createdAt','desc').limit(200);
  if (filterEmail) q = q.where('farmerEmail','==', filterEmail);
  const snapshot = await q.get();
  entriesTableBody.innerHTML = '';
  snapshot.forEach(doc => {
    const d = doc.data();
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${d.date || ''}</td><td>${d.farmerEmail || ''}</td><td>${d.birdCount || 0}</td><td>${d.feedUsed || 0}</td><td>${d.medicine || ''}</td><td>${d.mortality || 0}</td><td>${d.notes || ''}</td>`;
    entriesTableBody.appendChild(tr);
  });
}

// Manager filter
btnFilter.addEventListener('click', () => {
  const email = filterEmailInput.value.trim();
  loadAllEntries(email || null);
});
btnClearFilter.addEventListener('click', () => {
  filterEmailInput.value = '';
  loadAllEntries(null);
});

// React to auth state
auth.onAuthStateChanged(async user => {
  if (user) {
    // read role
    const doc = await db.collection('users').doc(user.uid).get();
    const data = doc.exists ? doc.data() : null;
    const role = data && data.role ? data.role : (user.email === MANAGER_EMAIL ? 'manager' : 'farmer');

    authSection.style.display = 'none';
    btnLogout.style.display = 'inline-block';

    if (role === 'manager') {
      managerSection.classList.remove('hidden');
      farmerSection.classList.add('hidden');
      loadAllEntries(null);
    } else {
      farmerSection.classList.remove('hidden');
      managerSection.classList.add('hidden');
      loadYourEntries();
    }
  } else {
    authSection.style.display = 'block';
    farmerSection.classList.add('hidden');
    managerSection.classList.add('hidden');
    btnLogout.style.display = 'none';
  }
});
