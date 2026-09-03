const GSHEET_WEBAPP_URL =
  'https://script.google.com/macros/s/AKfycbxl2X94smE8QdBxS_rSKm2gTxmEMkank1-iCX0V6Eo9psKFv7vv-HkQ4mUbeTtQd_7F6w/exec'

// State Aplikasi
let currentUser = null
let allTransactions = []
let charts = {}

// Utilities Format
const fRupiah = (num) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(num)
const fDate = (dStr) =>
  new Date(dStr).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

// ==========================================
// 2. SIMULASI / FETCH ENGINE
// ==========================================
async function fetchAPI(action, dataObj) {
  // Gunakan Simulasi Mock jika GSheet URL kosong
  if (!GSHEET_WEBAPP_URL || GSHEET_WEBAPP_URL.trim() === '') {
    return await mockEngine(action, dataObj)
  }

  // Real Fetch GSheets
  try {
    const formData = new FormData()
    formData.append('action', action)
    formData.append('data', JSON.stringify(dataObj))

    const response = await fetch(GSHEET_WEBAPP_URL, {
      method: 'POST',
      body: formData,
    })
    return await response.json()
  } catch (error) {
    console.error('Fetch Error:', error)
    return { status: 'error', message: 'Koneksi jaringan bermasalah.' }
  }
}

// Mock Engine untuk tes proporsi UI
async function mockEngine(action, data) {
  await new Promise((r) => setTimeout(r, 600)) // Animasi loading profesional

  let users = JSON.parse(localStorage.getItem('aww_mock_users') || '[]')
  let txs = JSON.parse(localStorage.getItem('aww_mock_txs') || '[]')

  // Solusi JavaScript Umum
  const options = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }

  if (action === 'register') {
    if (users.find((u) => u.Email === data.Email))
      return { status: 'error', message: 'Email sudah terdaftar.' }
    users.push({
      ...data,
      Timestamp: new Date()
        .toLocaleString('id-ID', options)
        .replace(/\./g, ':'),
    })
    localStorage.setItem('aww_mock_users', JSON.stringify(users))
    return { status: 'success', message: 'Akun berhasil didaftarkan.' }
  }
  if (action === 'login') {
    const user = users.find(
      (u) => u.Email === data.Email && u.Password === data.Password,
    )
    if (user)
      return { status: 'success', data: { Nama: user.Nama, Email: user.Email } }
    return { status: 'error', message: 'Kredensial tidak valid.' }
  }
  if (action === 'addTransaction') {
    const newTx = {
      ID: 'TX' + Date.now(),
      ...data,
      Timestamp: new Date().toISOString(),
    }
    txs.push(newTx)
    localStorage.setItem('aww_mock_txs', JSON.stringify(txs))
    return { status: 'success', data: newTx }
  }
  if (action === 'getTransactions') {
    return {
      status: 'success',
      data: txs.filter((t) => t.Email === data.Email),
    }
  }
}

// ==========================================
// 3. UI KONTROL & NAVIGASI
// ==========================================
function showToast(msg, type = 'info') {
  const toast = document.getElementById('toast')
  document.getElementById('toast-msg').textContent = msg
  const card = toast.querySelector('.glass-card')
  const icon = toast.querySelector('i')

  // Set styles based on type
  card.className = `glass-card px-5 py-3 md:px-6 md:py-4 flex items-center gap-3 border-l-4 shadow-xl ${type === 'success' ? 'border-success' : type === 'error' ? 'border-danger' : 'border-brand-500'}`
  icon.className = `fas fa-info-circle text-lg md:text-xl ${type === 'success' ? 'text-success fa-check-circle' : type === 'error' ? 'text-danger fa-exclamation-circle' : 'text-brand-500'}`

  toast.classList.remove('translate-x-[150%]', 'opacity-0')
  setTimeout(() => toast.classList.add('translate-x-[150%]', 'opacity-0'), 3500)
}

function toggleAuth() {
  const login = document.getElementById('login-card')
  const reg = document.getElementById('register-card')
  if (login.classList.contains('hidden')) {
    reg.classList.add('hidden')
    login.classList.remove('hidden')
  } else {
    login.classList.add('hidden')
    reg.classList.remove('hidden')
  }
}

function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu')
  menu.classList.toggle('hidden')
}

function setLoading(btnId, isLoading) {
  const btn = document.getElementById(btnId)
  if (isLoading) {
    btn.classList.add('loading')
    btn.disabled = true
  } else {
    btn.classList.remove('loading')
    btn.disabled = false
  }
}

function nav(viewId) {
  // Update Menu Active State
  document.querySelectorAll('.nav-item').forEach((el) => {
    el.classList.remove(
      'bg-brand-50',
      'text-brand-600',
      'border-l-4',
      'border-brand-500',
    )
    el.classList.add('text-slate-500', 'hover:bg-slate-100/80')
  })
  const active = document.getElementById(`nav-${viewId}`)
  if (active) {
    active.classList.remove('text-slate-500', 'hover:bg-slate-100/80')
    active.classList.add(
      'bg-brand-50',
      'text-brand-600',
      'border-l-4',
      'border-brand-500',
    )
  }

  // Animate View
  document
    .querySelectorAll('.view-section')
    .forEach((el) => el.classList.remove('active'))
  document.getElementById(`view-${viewId}`).classList.add('active')

  // Eksekusi logic view specific
  if (viewId === 'dashboard') renderDashboard()
  if (viewId === 'history') {
    populateFilterTahun()
    renderHistory()
  }
  if (viewId === 'reports') renderReports()
}

// ==========================================
// 4. EVENT LISTENER (AUTH & INPUT)
// ==========================================
document
  .getElementById('register-form')
  .addEventListener('submit', async (e) => {
    e.preventDefault()
    setLoading('btn-register', true)
    const data = {
      Nama: document.getElementById('reg-nama').value,
      Email: document.getElementById('reg-email').value.toLowerCase(),
      Password: document.getElementById('reg-password').value,
    }
    const res = await fetchAPI('register', data)
    setLoading('btn-register', false)
    if (res.status === 'success') {
      showToast(res.message, 'success')
      document.getElementById('register-form').reset()
      toggleAuth()
    } else showToast(res.message, 'error')
  })

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault()
  setLoading('btn-login', true)
  const data = {
    Email: document.getElementById('login-email').value.toLowerCase(),
    Password: document.getElementById('login-password').value,
  }
  const res = await fetchAPI('login', data)
  setLoading('btn-login', false)
  if (res.status === 'success') {
    currentUser = res.data
    sessionStorage.setItem('aww_active_user', JSON.stringify(currentUser))
    showToast(`Halo, ${currentUser.Nama}!`, 'success')
    initApp()
  } else showToast(res.message, 'error')
})

function logout() {
  sessionStorage.removeItem('aww_active_user')
  currentUser = null
  document.getElementById('app-view').classList.add('hidden')
  document.getElementById('auth-view').classList.remove('hidden')
  document.getElementById('login-form').reset()
}

document.getElementById('form-input').addEventListener('submit', async (e) => {
  e.preventDefault()
  setLoading('btn-submit-tx', true)
  const tgl = document.getElementById('in-tanggal').value
  const d = new Date(tgl)

  const data = {
    Email: currentUser.Email,
    Tanggal: tgl,
    Bulan: String(d.getMonth() + 1).padStart(2, '0'),
    Tahun: String(d.getFullYear()),
    Jenis: document.querySelector('input[name="jenis"]:checked').value,
    Kategori: document.getElementById('in-kategori').value,
    Jumlah: parseFloat(document.getElementById('in-jumlah').value),
    Keterangan: document.getElementById('in-keterangan').value,
  }

  const res = await fetchAPI('addTransaction', data)
  setLoading('btn-submit-tx', false)

  if (res.status === 'success') {
    showToast('Data berhasil disimpan!', 'success')
    document.getElementById('in-jumlah').value = ''
    document.getElementById('in-keterangan').value = ''
    await loadData()
    nav('dashboard')
  } else showToast('Gagal menyimpan data.', 'error')
})

// ==========================================
// 5. ENGINE RENDER DATA
// ==========================================
async function initApp() {
  document.getElementById('auth-view').classList.add('hidden')
  document.getElementById('app-view').classList.remove('hidden')

  // Set Sidebar
  document.getElementById('display-nama').textContent = currentUser.Nama
  document.getElementById('display-email').textContent = currentUser.Email
  document.getElementById('user-avatar').textContent =
    currentUser.Nama.charAt(0).toUpperCase()

  document.getElementById('in-tanggal').valueAsDate = new Date()
  await loadData()
  nav('dashboard')
}

async function loadData() {
  const res = await fetchAPI('getTransactions', { Email: currentUser.Email })
  if (res.status === 'success') {
    allTransactions = res.data.sort(
      (a, b) => new Date(b.Tanggal) - new Date(a.Tanggal),
    )
  }
}

function renderDashboard() {
  const now = new Date()
  const cm = String(now.getMonth() + 1).padStart(2, '0')
  const cy = String(now.getFullYear())
  const months = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ]
  document.getElementById('dash-month-name').textContent =
    months[now.getMonth()]

  let tMasuk = 0,
    tKeluar = 0
  allTransactions.forEach((t) => {
    if (t.Bulan === cm && t.Tahun === cy) {
      if (t.Jenis === 'Pemasukan') tMasuk += parseFloat(t.Jumlah)
      else tKeluar += parseFloat(t.Jumlah)
    }
  })

  document.getElementById('card-saldo').textContent = fRupiah(tMasuk - tKeluar)
  document.getElementById('card-masuk').textContent = fRupiah(tMasuk)
  document.getElementById('card-keluar').textContent = fRupiah(tKeluar)

  // List 5 Aktivitas Terbaru
  const list = document.getElementById('recent-list')
  list.innerHTML = ''
  const recents = allTransactions.slice(0, 5)

  if (recents.length === 0) {
    list.innerHTML =
      '<div class="text-center py-6"><p class="text-slate-400 font-medium">Belum ada transaksi</p></div>'
  } else {
    recents.forEach((t) => {
      const isInc = t.Jenis === 'Pemasukan'
      list.innerHTML += `
                        <div class="flex items-center justify-between p-3.5 rounded-xl border border-slate-100/80 hover:bg-slate-50 transition-colors group">
                            <div class="flex items-center gap-3 md:gap-4">
                                <div class="w-10 h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center text-sm md:text-base shrink-0 transition-transform group-hover:scale-105 ${isInc ? 'bg-emerald-50 text-success' : 'bg-rose-50 text-danger'}">
                                    <i class="fas ${isInc ? 'fa-arrow-down' : 'fa-arrow-up'}"></i>
                                </div>
                                <div>
                                    <p class="font-bold text-slate-700 text-sm md:text-base">${t.Kategori}</p>
                                    <p class="text-xs md:text-sm text-slate-400 font-medium">${fDate(t.Tanggal)}</p>
                                </div>
                            </div>
                            <span class="font-bold text-sm md:text-base truncate max-w-[100px] sm:max-w-none ${isInc ? 'text-success' : 'text-danger'}">
                                ${isInc ? '+' : '-'}${fRupiah(t.Jumlah)}
                            </span>
                        </div>
                    `
    })
  }
  renderChartMain()
}

function populateFilterTahun() {
  const years = [...new Set(allTransactions.map((t) => t.Tahun))]
    .sort()
    .reverse()
  const currYear = String(new Date().getFullYear())
  if (!years.includes(currYear)) years.unshift(currYear)
  document.getElementById('filter-tahun').innerHTML = years
    .map((y) => `<option value="${y}">${y}</option>`)
    .join('')
}

function renderHistory() {
  const fB = document.getElementById('filter-bulan').value
  const fT = document.getElementById('filter-tahun').value

  let filtered = allTransactions.filter((t) => t.Tahun === fT)
  if (fB !== 'all') filtered = filtered.filter((t) => t.Bulan === fB)

  const tbody = document.getElementById('table-history')
  const empty = document.getElementById('empty-history')

  tbody.innerHTML = ''
  if (filtered.length === 0) {
    tbody.parentElement.classList.add('hidden')
    empty.classList.remove('hidden')
  } else {
    tbody.parentElement.classList.remove('hidden')
    empty.classList.add('hidden')
    filtered.forEach((t) => {
      const isInc = t.Jenis === 'Pemasukan'
      tbody.innerHTML += `
                        <tr class="hover:bg-slate-50/50 transition-colors">
                            <td class="py-3 px-5 text-xs md:text-sm font-semibold text-slate-600 whitespace-nowrap">${fDate(t.Tanggal)}</td>
                            <td class="py-3 px-5 text-xs md:text-sm font-bold text-slate-700">
                                <span class="bg-slate-100/80 px-2 py-1 md:px-3 md:py-1.5 rounded-lg border border-slate-200/50">${t.Kategori}</span>
                            </td>
                            <td class="py-3 px-5 text-xs md:text-sm font-medium text-slate-500 max-w-[150px] md:max-w-[250px] truncate" title="${t.Keterangan || ''}">${t.Keterangan || '-'}</td>
                            <td class="py-3 px-5 text-sm md:text-base font-bold text-right whitespace-nowrap ${isInc ? 'text-success' : 'text-danger'}">
                                ${isInc ? '+' : '-'}${fRupiah(t.Jumlah)}
                            </td>
                        </tr>
                    `
    })
  }
}

function renderReports() {
  let dIn = {},
    dOut = {}
  allTransactions.forEach((t) => {
    if (t.Jenis === 'Pemasukan')
      dIn[t.Kategori] = (dIn[t.Kategori] || 0) + parseFloat(t.Jumlah)
    else dOut[t.Kategori] = (dOut[t.Kategori] || 0) + parseFloat(t.Jumlah)
  })
  drawDoughnut('chart-pengeluaran', Object.keys(dOut), Object.values(dOut), [
    '#F43F5E',
    '#F97316',
    '#EAB308',
    '#8B5CF6',
    '#EC4899',
    '#64748B',
  ])
  drawDoughnut('chart-pemasukan', Object.keys(dIn), Object.values(dIn), [
    '#10B981',
    '#3B82F6',
    '#06B6D4',
    '#84CC16',
    '#14B8A6',
  ])
}

// ==========================================
// 6. CHART.JS CONFIGURATION
// ==========================================
Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif"
Chart.defaults.color = '#64748B'

function drawDoughnut(id, labels, data, colors) {
  if (charts[id]) charts[id].destroy()
  const ctx = document.getElementById(id).getContext('2d')
  charts[id] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels.length ? labels : ['Kosong'],
      datasets: [
        {
          data: data.length ? data : [1],
          backgroundColor: data.length ? colors : ['#E2E8F0'],
          borderWidth: 0,
          hoverOffset: 8,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '75%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: { weight: 'bold', size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#1E293B',
          titleFont: { family: 'Poppins' },
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (c) => (!data.length ? ' Kosong' : ' ' + fRupiah(c.raw)),
          },
        },
      },
    },
  })
}

function renderChartMain() {
  if (charts['main']) charts['main'].destroy()
  const ctx = document.getElementById('chart-arus-kas').getContext('2d')

  let labels = [],
    dIn = [0, 0, 0, 0, 0, 0],
    dOut = [0, 0, 0, 0, 0, 0]
  const mN = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'Mei',
    'Jun',
    'Jul',
    'Ags',
    'Sep',
    'Okt',
    'Nov',
    'Des',
  ]

  let d = new Date()
  for (let i = 5; i >= 0; i--) {
    let t = new Date(d.getFullYear(), d.getMonth() - i, 1)
    labels.push(mN[t.getMonth()] + ' ' + t.getFullYear().toString().substr(2))
    let tM = String(t.getMonth() + 1).padStart(2, '0'),
      tY = String(t.getFullYear())
    allTransactions.forEach((tx) => {
      if (tx.Bulan === tM && tx.Tahun === tY) {
        if (tx.Jenis === 'Pemasukan') dIn[5 - i] += parseFloat(tx.Jumlah)
        else dOut[5 - i] += parseFloat(tx.Jumlah)
      }
    })
  }

  let gIn = ctx.createLinearGradient(0, 0, 0, 300)
  gIn.addColorStop(0, 'rgba(16,185,129,0.2)')
  gIn.addColorStop(1, 'rgba(16,185,129,0)')
  let gOut = ctx.createLinearGradient(0, 0, 0, 300)
  gOut.addColorStop(0, 'rgba(244,63,94,0.2)')
  gOut.addColorStop(1, 'rgba(244,63,94,0)')

  charts['main'] = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Pemasukan',
          data: dIn,
          borderColor: '#10B981',
          backgroundColor: gIn,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#10B981',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
        {
          label: 'Pengeluaran',
          data: dOut,
          borderColor: '#F43F5E',
          backgroundColor: gOut,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#fff',
          pointBorderColor: '#F43F5E',
          pointBorderWidth: 2,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          align: 'end',
          labels: {
            usePointStyle: true,
            boxWidth: 6,
            font: { weight: 'bold', size: 11 },
          },
        },
        tooltip: {
          backgroundColor: '#1E293B',
          titleFont: { family: 'Poppins' },
          padding: 12,
          callbacks: { label: (c) => ' ' + fRupiah(c.raw) },
        },
      },
      scales: {
        y: {
          border: { display: false },
          grid: { color: 'rgba(15, 23, 42, 0.04)' },
          ticks: {
            font: { weight: 'bold', size: 10 },
            callback: (v) => 'Rp' + v / 1000 + 'k',
          },
        },
        x: {
          border: { display: false },
          grid: { display: false },
          ticks: { font: { weight: 'bold', size: 10 } },
        },
      },
    },
  })
}

// Init Check
window.onload = () => {
  const sv = sessionStorage.getItem('aww_active_user')
  if (sv) {
    currentUser = JSON.parse(sv)
    initApp()
  }
}
