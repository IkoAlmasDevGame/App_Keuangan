/**
 * BACKEND API UNTUK APLIKASI KEUANGAN AWWWARDS STYLE
 * Deployment: Web App
 * Execute as: Me
 * Who has access: Anyone
 */

const SHEET_USERS = 'Users'
const SHEET_TX = 'Transaksi'

// Menerima HTTP POST dari Frontend HTML
function doPost(e) {
  const output = ContentService.createTextOutput()
  output.setMimeType(ContentService.MimeType.JSON)

  try {
    // Parsing action & data dari payload
    const action = e.parameter.action
    const data = JSON.parse(e.parameter.data)

    let result = {}

    // Routing berdasarkan action
    if (action === 'register') {
      result = registerUser(data)
    } else if (action === 'login') {
      result = loginUser(data)
    } else if (action === 'addTransaction') {
      result = addTransaction(data)
    } else if (action === 'getTransactions') {
      result = getTransactions(data)
    } else {
      result = { status: 'error', message: 'Action tidak dikenal oleh server.' }
    }

    output.setContent(JSON.stringify(result))
    return output
  } catch (error) {
    // Handle error & prevent CORS crash di frontend
    output.setContent(
      JSON.stringify({ status: 'error', message: error.message }),
    )
    return output
  }
}

// Opsional: Untuk mengecek apakah web app aktif jika link dibuka di browser
function doGet(e) {
  return ContentService.createTextOutput(
    'Backend Lumina Finance App (Active) - Gunakan POST untuk API Request.',
  )
}

// ==========================================
// 1. FUNGSI AUTHENTICATION (USERS)
// ==========================================
function registerUser(data) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS)
  if (!sheet)
    return {
      status: 'error',
      message: 'Database (Sheet Users) tidak ditemukan.',
    }

  const dataRange = sheet.getDataRange().getValues()

  // Cek apakah Email (Kolom A / Index 0) sudah ada
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][0] === data.Email) {
      return { status: 'error', message: 'Email sudah terdaftar!' }
    }
  }

  // Susunan Data: Email, Nama, Password, Timestamp
  // Solusi Google Apps Script
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

  // Menggunakan sv-SE untuk format YYYY-MM-DD HH:mm:ss
  const timestamp = new Date()
    .toLocaleDateString('id-ID', options)
    .replace(/\./g, ':')

  sheet.appendRow([data.Email, data.Nama, data.Password, timestamp])
  return { status: 'success', message: 'Akun berhasil dibuat. Silakan login.' }
}

function loginUser(data) {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_USERS)
  if (!sheet)
    return {
      status: 'error',
      message: 'Database (Sheet Users) tidak ditemukan.',
    }

  const dataRange = sheet.getDataRange().getValues()

  // Looping untuk cek Email dan Password
  for (let i = 1; i < dataRange.length; i++) {
    // Email (Index 0), Nama (Index 1), Password (Index 2)
    if (dataRange[i][0] === data.Email && dataRange[i][2] === data.Password) {
      return {
        status: 'success',
        data: { Nama: dataRange[i][1], Email: dataRange[i][0] },
        message: 'Login Berhasil',
      }
    }
  }

  return { status: 'error', message: 'Email atau Password salah.' }
}

// ==========================================
// 2. FUNGSI TRANSAKSI
// ==========================================
function addTransaction(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TX)
  if (!sheet)
    return {
      status: 'error',
      message: 'Database (Sheet Transaksi) tidak ditemukan.',
    }

  const txId = 'TX' + new Date().getTime()

  // Solusi JavaScript Umum
  const options = {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

 // Menggunakan sv-SE untuk format YYYY-MM-DD HH:mm:ss
 const timestamp = new Date().toLocaleDateString('id-ID', options);

  // Susunan Data: ID, Email, Tanggal, Bulan, Tahun, Jenis, Kategori, Keterangan, Jumlah, Timestamp
  sheet.appendRow([
    txId,
    data.Email,
    data.Tanggal,
    data.Bulan,
    data.Tahun,
    data.Jenis,
    data.Kategori,
    data.Keterangan,
    data.Jumlah,
    timestamp,
  ])

  return {
    status: 'success',
    message: 'Transaksi berhasil disimpan ke GSheet.',
    data: { ID: txId },
  }
}

function getTransactions(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_TX)
  if (!sheet)
    return {
      status: 'error',
      message: 'Database (Sheet Transaksi) tidak ditemukan.',
    }

  const dataRange = sheet.getDataRange().getValues()
  let results = []

  // Mulai dari i=1 untuk melewati header
  for (let i = 1; i < dataRange.length; i++) {
    const row = dataRange[i]

    // Cek apakah transaksi ini milik Email user yang sedang request (Index 1)
    if (row[1] === data.Email) {
      results.push({
        ID: row[0],
        Email: row[1],
        Tanggal: row[2],
        Bulan: String(row[3]).padStart(2, '0'), // Memastikan format string 2 digit
        Tahun: String(row[4]),
        Jenis: row[5],
        Kategori: row[6],
        Keterangan: row[7],
        Jumlah: Number(row[8]), // Memastikan format angka
        Timestamp: row[9],
      })
    }
  }

  return { status: 'success', data: results }
}
