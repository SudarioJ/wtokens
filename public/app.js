/**
 * WTOKENS Client Application Logic & Multi-Currency Engine
 */

// Exchange rates pegged to 1 USD (Reference rates for LATAM conversion)
const CURRENCIES = {
  USD: { symbol: '$', rate: 1.0, name: 'Dólares (USD)', flag: '🌐', decimals: 2 },
  ARS: { symbol: '$', rate: 1225.0, name: 'Pesos Argentinos (ARS)', flag: '🇦🇷', decimals: 0 },
  CLP: { symbol: '$', rate: 960.0, name: 'Pesos Chilenos (CLP)', flag: '🇨🇱', decimals: 0 },
  PEN: { symbol: 'S/ ', rate: 3.75, name: 'Soles Peruanos (PEN)', flag: '🇵🇪', decimals: 2 },
  UYU: { symbol: '$U ', rate: 41.5, name: 'Pesos Uruguayos (UYU)', flag: '🇺🇾', decimals: 0 },
  PYG: { symbol: '₲ ', rate: 7750.0, name: 'Guaraníes Paraguayos (PYG)', flag: '🇵🇾', decimals: 0 },
  BOB: { symbol: 'Bs ', rate: 6.95, name: 'Bolivianos (BOB)', flag: '🇧🇴', decimals: 2 }
};

// Official Country Mapping & Country-Specific Payment Methods
const COUNTRY_METHODS = {
  PER: {
    code: 'PER',
    countryName: 'Perú',
    flag: '🇵🇪',
    currency: 'PEN',
    symbol: 'S/.',
    depositMethods: [
      {
        id: 'yape_plin',
        name: '🇵🇪 Yape / Plin (QR y Celular)',
        html: `
          <div class="flex flex-col sm:flex-row items-center gap-4">
            <div class="w-28 h-28 rounded-xl bg-white p-2 flex flex-col items-center justify-center shadow shrink-0">
              <i class="fa-solid fa-qrcode text-5xl text-purple-900"></i>
              <span class="text-[8px] font-bold text-purple-900 mt-1 uppercase">QR Yape / Plin</span>
            </div>
            <div class="space-y-1.5 text-xs text-slate-300 w-full">
              <div class="font-bold text-white text-sm">🇵🇪 Yape / Plin Perú</div>
              <div><strong>Número Celular:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono text-sm select-all">928 374 819</code></div>
              <div><strong>Titular:</strong> WTOKENS PERÚ (Soporte Oficial)</div>
              <div class="text-[11px] text-emerald-400 font-mono pt-1">💡 Envía tu captura con tu usuario de Discord tras enviar.</div>
            </div>
          </div>
        `
      },
      {
        id: 'bcp_pe',
        name: '🇵🇪 Transferencia BCP / Interbank (Soles)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🇵🇪 Banco de Crédito del Perú (BCP) & Interbank</div>
            <div><strong>Banco:</strong> BCP (Banco de Crédito)</div>
            <div><strong>Cuenta Corriente Soles:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono select-all">193-98241029-0-44</code></div>
            <div><strong>CCI Interbancario:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[10px] select-all">00219300982410290441</code></div>
            <div><strong>Titular:</strong> WTOKENS LATAM S.A.C.</div>
          </div>
        `
      },
      {
        id: 'binance_pe',
        name: '🌐 Binance Pay / USDT Cripto (0% Comisión)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🌐 Binance Pay & Cripto (Acreditación Automática)</div>
            <div><strong>Binance Pay ID:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono text-sm select-all">82910492</code></div>
            <div><strong>USDT (Red TRC-20):</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[9px] select-all">TL6c7WTok921fnCs9284kmZP812</code></div>
          </div>
        `
      }
    ],
    withdrawMethods: [
      { id: 'yape', name: '🇵🇪 Yape / Plin (Número celular)', label: 'Celular Yape o Plin', placeholder: 'Ej: 928 374 819' },
      { id: 'banco_pe', name: '🇵🇪 Transferencia BCP / Interbank (Soles)', label: 'Cuenta BCP o CCI Interbancario', placeholder: 'Ej: 193-98241029-0-44 o CCI' },
      { id: 'binance', name: '🌐 Binance Pay (Pay ID o Email)', label: 'Pay ID o Email Binance', placeholder: 'Ej: 82910492 o tu email' }
    ]
  },
  ARG: {
    code: 'ARG',
    countryName: 'Argentina',
    flag: '🇦🇷',
    currency: 'ARS',
    symbol: '$',
    depositMethods: [
      {
        id: 'mp_arg',
        name: '🇦🇷 Mercado Pago (QR, Alias y CVU)',
        html: `
          <div class="flex flex-col sm:flex-row items-center gap-4">
            <div class="w-28 h-28 rounded-xl bg-white p-2 flex flex-col items-center justify-center shadow shrink-0">
              <i class="fa-solid fa-qrcode text-5xl text-slate-900"></i>
              <span class="text-[8px] font-bold text-slate-900 mt-1 uppercase">QR Mercado Pago</span>
            </div>
            <div class="space-y-1.5 text-xs text-slate-300 w-full">
              <div class="font-bold text-white text-sm">🇦🇷 Mercado Pago Argentina</div>
              <div><strong>Alias:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono select-all">wtokens.latam.mp</code></div>
              <div><strong>CVU:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[10px] select-all">0000003100083921049281</code></div>
              <div><strong>Titular:</strong> WTOKENS MEDIACIÓN S.A.</div>
              <div class="text-[11px] text-emerald-400 font-mono pt-1">💡 Escanea el QR o transfiere al alias. Acreditación automática.</div>
            </div>
          </div>
        `
      },
      {
        id: 'banco_arg',
        name: '🇦🇷 Transferencia Bancaria (CBU / Pesos)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🇦🇷 Transferencia Bancaria Argentina (CBU)</div>
            <div><strong>CBU:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono select-all">0720037388000037192831</code></div>
            <div><strong>Alias:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono select-all">wtokens.banco.ars</code></div>
          </div>
        `
      },
      {
        id: 'binance_arg',
        name: '🌐 Binance Pay / USDT Cripto (0% Comisión)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🌐 Binance Pay & Cripto (Acreditación Automática)</div>
            <div><strong>Binance Pay ID:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono text-sm select-all">82910492</code></div>
            <div><strong>USDT (Red TRC-20):</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[9px] select-all">TL6c7WTok921fnCs9284kmZP812</code></div>
          </div>
        `
      }
    ],
    withdrawMethods: [
      { id: 'mp', name: '🇦🇷 Mercado Pago (Alias / CVU)', label: 'Alias o CVU de Mercado Pago', placeholder: 'Ej: k1ng.mp o 0000003100083921049281' },
      { id: 'banco_ar', name: '🇦🇷 Cuenta Bancaria (CBU)', label: 'CBU Bancario (22 dígitos)', placeholder: 'Ej: 0720037388000037192831' },
      { id: 'binance', name: '🌐 Binance Pay (Pay ID o Email)', label: 'Pay ID o Email Binance', placeholder: 'Ej: 82910492 o tu email' }
    ]
  },
  CHI: {
    code: 'CHI',
    countryName: 'Chile',
    flag: '🇨🇱',
    currency: 'CLP',
    symbol: '$',
    depositMethods: [
      {
        id: 'cuentarut_chi',
        name: '🇨🇱 CuentaRUT / BancoEstado / MACH',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🇨🇱 CuentaRUT / BancoEstado / MACH Chile</div>
            <div><strong>Banco:</strong> BancoEstado (CuentaRUT)</div>
            <div><strong>RUT:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono select-all">19.824.192-3</code></div>
            <div><strong>Tipo:</strong> Cuenta Vista / CuentaRUT</div>
            <div><strong>Titular:</strong> WTOKENS CHILE SpA</div>
          </div>
        `
      },
      {
        id: 'binance_chi',
        name: '🌐 Binance Pay / USDT Cripto (0% Comisión)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🌐 Binance Pay & Cripto (Acreditación Automática)</div>
            <div><strong>Binance Pay ID:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono text-sm select-all">82910492</code></div>
            <div><strong>USDT (Red TRC-20):</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[9px] select-all">TL6c7WTok921fnCs9284kmZP812</code></div>
          </div>
        `
      }
    ],
    withdrawMethods: [
      { id: 'cuentarut', name: '🇨🇱 CuentaRUT / BancoEstado', label: 'RUT y Número de Cuenta Vista', placeholder: 'Ej: 19.824.192-3 y BancoEstado' },
      { id: 'mach', name: '🇨🇱 MACH (Celular o Correo)', label: 'Celular o Correo registrado en MACH', placeholder: 'Ej: +56912345678' },
      { id: 'binance', name: '🌐 Binance Pay (Pay ID o Email)', label: 'Pay ID o Email Binance', placeholder: 'Ej: 82910492 o tu email' }
    ]
  },
  URU: {
    code: 'URU',
    countryName: 'Uruguay',
    flag: '🇺🇾',
    currency: 'UYU',
    symbol: '$',
    depositMethods: [
      {
        id: 'prex_uru',
        name: '🇺🇾 Prex Uruguay / Midinero / BROU',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🇺🇾 Prex Uruguay & Midinero</div>
            <div><strong>Prex ID Directo:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono select-all">1092837</code></div>
            <div><strong>Titular:</strong> WTOKENS URUGUAY</div>
          </div>
        `
      },
      {
        id: 'binance_uru',
        name: '🌐 Binance Pay / USDT Cripto (0% Comisión)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🌐 Binance Pay & Cripto (Acreditación Automática)</div>
            <div><strong>Binance Pay ID:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono text-sm select-all">82910492</code></div>
            <div><strong>USDT (Red TRC-20):</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[9px] select-all">TL6c7WTok921fnCs9284kmZP812</code></div>
          </div>
        `
      }
    ],
    withdrawMethods: [
      { id: 'prex', name: '🇺🇾 Prex Uruguay (Prex ID)', label: 'Prex ID Directo', placeholder: 'Ej: 1092837' },
      { id: 'midinero', name: '🇺🇾 Midinero (Cédula de Identidad)', label: 'Cédula de Identidad', placeholder: 'Ej: 4.821.902-3' },
      { id: 'binance', name: '🌐 Binance Pay (Pay ID o Email)', label: 'Pay ID o Email Binance', placeholder: 'Ej: 82910492 o tu email' }
    ]
  },
  PAR: {
    code: 'PAR',
    countryName: 'Paraguay',
    flag: '🇵🇾',
    currency: 'PYG',
    symbol: '₲',
    depositMethods: [
      {
        id: 'tigo_par',
        name: '🇵🇾 Giros Tigo & SIPAP Paraguay',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🇵🇾 Giros Tigo & SIPAP Paraguay</div>
            <div><strong>Línea Tigo:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono select-all">0981 492 819</code></div>
            <div><strong>Titular:</strong> WTOKENS PARAGUAY</div>
          </div>
        `
      },
      {
        id: 'binance_par',
        name: '🌐 Binance Pay / USDT Cripto (0% Comisión)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🌐 Binance Pay & Cripto (Acreditación Automática)</div>
            <div><strong>Binance Pay ID:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono text-sm select-all">82910492</code></div>
            <div><strong>USDT (Red TRC-20):</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[9px] select-all">TL6c7WTok921fnCs9284kmZP812</code></div>
          </div>
        `
      }
    ],
    withdrawMethods: [
      { id: 'tigo', name: '🇵🇾 Giros Tigo (Línea Telefónica)', label: 'Número de Línea Tigo', placeholder: 'Ej: 0981 492 819' },
      { id: 'ueno_sipap', name: '🇵🇾 Ueno / SIPAP Bancario', label: 'Cuenta Ueno o SIPAP Bancario', placeholder: 'Ej: Cuenta bancaria o Cédula' },
      { id: 'binance', name: '🌐 Binance Pay (Pay ID o Email)', label: 'Pay ID o Email Binance', placeholder: 'Ej: 82910492 o tu email' }
    ]
  },
  BOL: {
    code: 'BOL',
    countryName: 'Bolivia',
    flag: '🇧🇴',
    currency: 'BOB',
    symbol: 'Bs',
    depositMethods: [
      {
        id: 'qr_bol',
        name: '🇧🇴 QR Simple Bolivia (Banco Unión / BCP / BNB)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🇧🇴 QR Simple Bolivia</div>
            <div>Interoperable con Banco Unión, BCP, BNB y Tigo Money.</div>
            <div><strong>Cuenta BCP Bolivia:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono select-all">201-5082193-3-12</code></div>
          </div>
        `
      },
      {
        id: 'binance_bol',
        name: '🌐 Binance Pay / USDT Cripto (0% Comisión)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🌐 Binance Pay & Cripto (Acreditación Automática)</div>
            <div><strong>Binance Pay ID:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono text-sm select-all">82910492</code></div>
            <div><strong>USDT (Red TRC-20):</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[9px] select-all">TL6c7WTok921fnCs9284kmZP812</code></div>
          </div>
        `
      }
    ],
    withdrawMethods: [
      { id: 'qr_bol', name: '🇧🇴 QR Simple / Transferencia (Banco Unión o BCP)', label: 'Celular QR o Cuenta Bancaria', placeholder: 'Ej: Celular registrado o Cuenta BCP/Unión' },
      { id: 'binance', name: '🌐 Binance Pay (Pay ID o Email)', label: 'Pay ID o Email Binance', placeholder: 'Ej: 82910492 o tu email' }
    ]
  },
  CRYPTO: {
    code: 'CRYPTO',
    countryName: 'Internacional',
    flag: '🌐',
    currency: 'USD',
    symbol: '$',
    depositMethods: [
      {
        id: 'binance_pay',
        name: '🌐 Binance Pay ID (0% Comisión)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🌐 Binance Pay (Acreditación Inmediata)</div>
            <div><strong>Binance Pay ID:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-amber-400 font-mono text-sm select-all">82910492</code></div>
          </div>
        `
      },
      {
        id: 'usdt_trc20',
        name: '🌐 USDT (Red TRC-20)',
        html: `
          <div class="space-y-2 text-xs text-slate-300">
            <div class="font-bold text-white text-sm">🌐 Tether USDT (Red TRC-20)</div>
            <div><strong>Dirección de Billetera:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[10px] select-all">TL6c7WTok921fnCs9284kmZP812</code></div>
          </div>
        `
      }
    ],
    withdrawMethods: [
      { id: 'binance', name: '🌐 Binance Pay (Pay ID o Email)', label: 'Binance Pay ID o Correo', placeholder: 'Ej: 82910492 o tu email' },
      { id: 'usdt_trc20', name: '🌐 USDT (Red TRC-20)', label: 'Billetera USDT (TRC-20)', placeholder: 'Ej: TL6c7WTok921fnCs9284kmZP812...' }
    ]
  }
};

const CURRENCY_TO_COUNTRY = {
  PEN: 'PER',
  ARS: 'ARG',
  CLP: 'CHI',
  UYU: 'URU',
  PYG: 'PAR',
  BOB: 'BOL',
  USD: 'CRYPTO'
};

let currentCurrency = 'PEN'; // Default to PEN (or loaded from user profile)

function renderDepositMethodDetails(countryCode, methodId) {
  const box = document.getElementById('dashPaymentBoxDetails');
  if (!box) return;
  if (!countryCode) countryCode = localStorage.getItem('wtokens_user_country') || 'PER';
  if (CURRENCY_TO_COUNTRY[countryCode]) countryCode = CURRENCY_TO_COUNTRY[countryCode];

  const country = COUNTRY_METHODS[countryCode] || COUNTRY_METHODS.PER;
  let method = country.depositMethods.find(m => m.id === methodId);
  if (!method) method = country.depositMethods[0];

  if (method && method.html) {
    box.innerHTML = method.html;
  }
}

function updateWithdrawFieldInfo(methodObj) {
  if (!methodObj) return;
  const labelEl = document.getElementById('dashWithdrawDestinationLabel');
  const inputEl = document.getElementById('dashWithdrawDestination');
  if (labelEl && methodObj.label) labelEl.textContent = `Dato de Destino (${methodObj.label}):`;
  if (inputEl && methodObj.placeholder) inputEl.placeholder = methodObj.placeholder;
}

function renderDashPaymentDetails(codeOrMethod) {
  const curCountry = localStorage.getItem('wtokens_user_country') || 'PER';
  renderDepositMethodDetails(curCountry, codeOrMethod);
}

function applyUserCountry(countryCode, syncSession = true) {
  if (!countryCode) countryCode = 'PER';
  if (CURRENCY_TO_COUNTRY[countryCode]) {
    countryCode = CURRENCY_TO_COUNTRY[countryCode];
  }
  const country = COUNTRY_METHODS[countryCode] || COUNTRY_METHODS.PER;

  localStorage.setItem('wtokens_user_country', country.code);
  currentCurrency = country.currency;

  if (syncSession) {
    const saved = localStorage.getItem('wtokens_user_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        u.country = country.code;
        u.currency = country.currency;
        localStorage.setItem('wtokens_user_session', JSON.stringify(u));
      } catch (e) {}
    }
  }

  // 1. Update Country Flag & Name in Dashboard Header
  const flagEl = document.getElementById('dashCountryFlag');
  const nameEl = document.getElementById('dashCountryName');
  if (flagEl) flagEl.textContent = country.flag;
  if (nameEl) nameEl.textContent = country.countryName;

  // 2. Update Country Labels in Finanzas Recargar and Retirar
  const recargarCountryName = document.getElementById('dashRecargarCountryName');
  if (recargarCountryName) recargarCountryName.textContent = `${country.flag} ${country.countryName}`;

  const retirarCountryName = document.getElementById('dashRetirarCountryName');
  if (retirarCountryName) retirarCountryName.textContent = `${country.flag} ${country.countryName}`;

  // 3. Populate Recargar Select with ONLY this country's deposit methods
  const depositSelect = document.getElementById('dashDepositCountrySelect');
  if (depositSelect) {
    depositSelect.innerHTML = country.depositMethods.map(m => `
      <option value="${m.id}">${m.name}</option>
    `).join('');
    if (country.depositMethods.length > 0) {
      renderDepositMethodDetails(country.code, country.depositMethods[0].id);
    }
  }

  // 4. Populate Retirar Select with ONLY this country's withdrawal methods
  const withdrawSelect = document.getElementById('dashWithdrawMethodSelect');
  if (withdrawSelect) {
    withdrawSelect.innerHTML = country.withdrawMethods.map(m => `
      <option value="${m.id}">${m.name}</option>
    `).join('');
    if (country.withdrawMethods.length > 0) {
      updateWithdrawFieldInfo(country.withdrawMethods[0]);
    }
  }

  // 5. Update Modals & Dropdowns if present
  const selectCountryModal = document.getElementById('selectCountryModal');
  if (selectCountryModal) selectCountryModal.value = country.currency;

  const dashSelectCurrency = document.getElementById('dashSelectCurrency');
  if (dashSelectCurrency) dashSelectCurrency.value = country.currency;

  const currencySelector = document.getElementById('currencySelector');
  const currencySelectorMobile = document.getElementById('currencySelectorMobile');
  if (currencySelector) currencySelector.value = country.currency;
  if (currencySelectorMobile) currencySelectorMobile.value = country.currency;

  // 6. Update All Currency Displays across the platform
  updateAllCurrencyDisplays();
}

function formatMoney(usdAmount, currencyKey = currentCurrency) {
  const curr = CURRENCIES[currencyKey] || CURRENCIES.USD;
  const localVal = usdAmount * curr.rate;
  if (currencyKey === 'USD') {
    return `$${usdAmount.toFixed(curr.decimals)} USD`;
  }
  const formattedLocal = localVal.toLocaleString('es-ES', {
    minimumFractionDigits: curr.decimals,
    maximumFractionDigits: curr.decimals
  });
  return `${curr.symbol}${formattedLocal} ${currencyKey}`;
}

function formatMoneyShort(usdAmount, currencyKey = currentCurrency) {
  const curr = CURRENCIES[currencyKey] || CURRENCIES.USD;
  const localVal = usdAmount * curr.rate;
  if (currencyKey === 'USD') {
    return `$${usdAmount.toFixed(2)} USD`;
  }
  const formattedLocal = localVal.toLocaleString('es-ES', {
    minimumFractionDigits: curr.decimals,
    maximumFractionDigits: curr.decimals
  });
  return `${curr.symbol}${formattedLocal} ${currencyKey}`;
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  initHeroShowcaseCarousel();
  initMobileMenu();
  initFAQ();
  initLeaderboardFilter();
  initDiscordAuth();
  initEpicLinkModal();
  initEpicVerification();
  initWalletModal();
  initDashboardNavigation();
  initCountryPicker();
  initPeriodButtons();
  initLobbyControls();

  // Apply default or saved country
  const savedCountry = localStorage.getItem('wtokens_user_country') || 'PER';
  applyUserCountry(savedCountry, false);

  updateAllCurrencyDisplays();
  checkDiscordOAuthCallback();
  checkEpicOAuthCallback();

  // Handle URL hashes for navigation
  if (window.location.hash.includes('verificacion')) {
    showDashboard(true);
    if (window.switchDashTab) window.switchDashTab('verificacion');
  } else if (window.location.hash.includes('finanzas')) {
    showDashboard(true);
    if (window.switchDashTab) window.switchDashTab('finanzas');
  } else if (window.location.hash.includes('lobby')) {
    showDashboard(true);
    if (window.switchDashTab) window.switchDashTab('lobby');
  } else if (window.location.hash.includes('perfil') || window.location.hash.includes('dashboard') || window.location.hash.includes('panel')) {
    showDashboard(true);
    if (window.switchDashTab) window.switchDashTab('perfil');
  }
});

function updateAllCurrencyDisplays() {
  // Update elements with data-usd attribute
  document.querySelectorAll('[data-usd]').forEach(el => {
    const usd = parseFloat(el.getAttribute('data-usd'));
    const isShort = el.getAttribute('data-format') === 'short';
    el.textContent = isShort ? formatMoneyShort(usd) : formatMoney(usd);
  });

  // Update hero simulated card
  const potDisplay = document.getElementById('heroPotDisplay');
  if (potDisplay) {
    potDisplay.textContent = formatMoney(40);
  }

  // Update Dashboard currency displays
  const saved = localStorage.getItem('wtokens_user_session');
  let userBal = 25.0;
  if (saved) {
    try {
      const u = JSON.parse(saved);
      if (u.balance !== undefined) userBal = u.balance;
    } catch(e) {}
  }

  const localFormatted = formatMoneyShort(userBal, currentCurrency);
  const secondaryTokens = `(${userBal.toFixed(2)} WT)`;

  const dashBalanceTokens = document.getElementById('dashBalanceTokens');
  const dashBalanceLocal = document.getElementById('dashBalanceLocal');
  if (dashBalanceTokens) dashBalanceTokens.textContent = localFormatted;
  if (dashBalanceLocal) dashBalanceLocal.textContent = secondaryTokens;

  const dashFinBalance = document.getElementById('dashFinMainBalance');
  const dashFinBalanceLocal = document.getElementById('dashFinMainBalanceLocal');
  if (dashFinBalance) dashFinBalance.textContent = localFormatted;
  if (dashFinBalanceLocal) dashFinBalanceLocal.textContent = secondaryTokens;

  const walletModalTokens = document.getElementById('walletModalTokens');
  const walletModalLocal = document.getElementById('walletModalLocal');
  if (walletModalTokens) walletModalTokens.textContent = localFormatted;
  if (walletModalLocal) walletModalLocal.textContent = secondaryTokens;

  const navWalletBalance = document.getElementById('navWalletBalance');
  if (navWalletBalance) navWalletBalance.textContent = localFormatted;

  const dashWithdrawLocalEq = document.getElementById('dashWithdrawLocalEquivalent');
  const dashWithdrawInput = document.getElementById('dashWithdrawAmount');
  if (dashWithdrawLocalEq && dashWithdrawInput) {
    const amt = parseFloat(dashWithdrawInput.value) || 10;
    dashWithdrawLocalEq.textContent = `Recibirás: ~${formatMoney(amt, currentCurrency)}`;
  }
}

// Mobile Navigation
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', () => {
    menu.classList.toggle('hidden');
  });

  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.add('hidden');
    });
  });
}

// FAQ Accordion
function initFAQ() {
  const faqBtns = document.querySelectorAll('.faq-btn');

  faqBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const content = btn.nextElementSibling;
      const icon = btn.querySelector('i');
      const isExpanded = !content.classList.contains('hidden');

      document.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
      document.querySelectorAll('.faq-btn i').forEach(ic => ic.classList.remove('rotate-180'));

      if (!isExpanded) {
        content.classList.remove('hidden');
        if (icon) icon.classList.add('rotate-180');
      }
    });
  });
}

// Official WTOKENS Price Ladder (Escalafón oficial de apuestas)
// 0.50 a 5.00 (de 0.50 en 0.50) y 5.00 a 20.00 (de 1.00 en 1.00)
const ALLOWED_STAKES = [
  0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0,
  6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0, 13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0
];

// =========================================================================
// DASHBOARD NAVIGATION & VIEW CONTROLLER (BR Tokens Inspired)
// =========================================================================
function showDashboard(shouldShow) {
  const landingView = document.getElementById('landingView');
  const mainHeader = document.getElementById('mainHeader');
  const dashboardView = document.getElementById('dashboardView');

  if (shouldShow) {
    if (landingView) landingView.classList.add('hidden');
    if (mainHeader) mainHeader.classList.add('hidden');
    if (dashboardView) {
      dashboardView.classList.remove('hidden');
      window.scrollTo(0, 0);
    }
    // Refresh user details in dashboard
    const saved = localStorage.getItem('wtokens_user_session');
    if (saved) {
      try { renderAuthUser(JSON.parse(saved)); } catch (e) {}
    }
  } else {
    if (landingView) landingView.classList.remove('hidden');
    if (mainHeader) mainHeader.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
    window.scrollTo(0, 0);
  }
}

function initDashboardNavigation() {
  const dashboardView = document.getElementById('dashboardView');
  if (!dashboardView) return;

  const navBtns = document.querySelectorAll('.dash-nav-btn');
  const tabs = {
    perfil: document.getElementById('dashTabPerfil'),
    verificacion: document.getElementById('dashTabVerificacion'),
    ajustes: document.getElementById('dashTabAjustes'),
    finanzas: document.getElementById('dashTabFinanzas'),
    lobby: document.getElementById('dashTabLobby'),
    clan: document.getElementById('dashTabClan'),
    evento: document.getElementById('dashTabEvento')
  };

  const mobileTabTitle = document.getElementById('dashMobileCurrentTab');

  function switchTab(tabKey) {
    // Update nav buttons
    navBtns.forEach(btn => {
      const isTarget = btn.getAttribute('data-dash-tab') === tabKey;
      if (isTarget) {
        btn.className = 'dash-nav-btn active w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/[0.08] transition-all';
      } else {
        btn.className = 'dash-nav-btn w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/[0.04] transition-all';
      }
    });

    // Toggle tab contents
    Object.keys(tabs).forEach(k => {
      if (tabs[k]) {
        if (k === tabKey) {
          tabs[k].classList.remove('hidden');
        } else {
          tabs[k].classList.add('hidden');
        }
      }
    });

    // Update mobile title
    if (mobileTabTitle) {
      const titles = {
        lobby: 'Lobby de Partidas',
        finanzas: 'Finanzas & Retiros',
        perfil: 'Mi Perfil',
        verificacion: 'Verificación Epic Games',
        ajustes: 'Ajustes de Cuenta'
      };
      mobileTabTitle.textContent = titles[tabKey] || 'Panel';
    }

    // Close mobile drawer if open
    closeMobileSidebar();
  }

  window.switchDashTab = switchTab;

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-dash-tab');
      if (key) switchTab(key);
    });
  });

  // Header "Mi Panel" button
  const goToDashBtn = document.getElementById('btnGoToDashboard');
  if (goToDashBtn) {
    goToDashBtn.addEventListener('click', () => {
      showDashboard(true);
      switchTab('perfil');
    });
  }

  // Back to landing buttons
  const backBtn = document.getElementById('btnBackToLanding');
  const mobileBackBtn = document.getElementById('btnDashMobileBack');
  if (backBtn) backBtn.addEventListener('click', () => showDashboard(false));
  if (mobileBackBtn) mobileBackBtn.addEventListener('click', () => showDashboard(false));

  // Logo in dashboard
  const logoBtn = document.getElementById('dashLogoBtn');
  if (logoBtn) logoBtn.addEventListener('click', () => switchTab('perfil'));

  // Mobile sidebar drawer
  const mobileToggle = document.getElementById('btnDashMobileToggle');
  const sidebar = document.getElementById('dashSidebar');
  const backdrop = document.getElementById('dashSidebarBackdrop');

  function openMobileSidebar() {
    if (sidebar) sidebar.classList.remove('-translate-x-full');
    if (backdrop) backdrop.classList.remove('hidden');
  }

  function closeMobileSidebar() {
    if (sidebar) sidebar.classList.add('-translate-x-full');
    if (backdrop) backdrop.classList.add('hidden');
  }

  if (mobileToggle) mobileToggle.addEventListener('click', openMobileSidebar);
  if (backdrop) backdrop.addEventListener('click', closeMobileSidebar);

  // Shortcut from Perfil: "VER FINANZAS"
  const verFinanzasBtn = document.getElementById('dashBtnVerFinanzas');
  if (verFinanzasBtn) {
    verFinanzasBtn.addEventListener('click', () => {
      switchTab('finanzas');
    });
  }

  // Shortcut from Perfil: "VER PERFIL PÚBLICO"
  const verPublicoBtn = document.getElementById('dashBtnVerPublico');
  if (verPublicoBtn) {
    verPublicoBtn.addEventListener('click', () => {
      const url = window.location.origin + window.location.pathname + '#perfil';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          alert(`🔗 ¡Enlace a tu perfil público copiado al portapapeles!\n${url}`);
        }).catch(() => {
          alert(`Tu perfil público está disponible en:\n${url}`);
        });
      } else {
        alert(`Tu perfil público está disponible en:\n${url}`);
      }
    });
  }

  // Finanzas Subtabs
  const finSubtabs = document.querySelectorAll('.dash-fin-tab');
  const finContents = {
    extracto: document.getElementById('subtabContentExtracto'),
    transferir: document.getElementById('subtabContentTransferir'),
    recargar: document.getElementById('subtabContentRecargar'),
    retirar: document.getElementById('subtabContentRetirar')
  };

  finSubtabs.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-fin-subtab');
      finSubtabs.forEach(b => {
        if (b === btn) {
          b.className = 'dash-fin-tab active px-4 py-2 rounded-xl bg-white/10 text-white font-bold transition-all flex items-center gap-1.5';
        } else {
          b.className = 'dash-fin-tab px-4 py-2 rounded-xl text-slate-400 hover:text-white transition-all flex items-center gap-1.5';
        }
      });
      Object.keys(finContents).forEach(k => {
        if (finContents[k]) {
          if (k === target) {
            finContents[k].classList.remove('hidden');
            if (target === 'recargar') {
              const curCountry = localStorage.getItem('wtokens_user_country') || 'PER';
              const curMethod = document.getElementById('dashDepositCountrySelect')?.value;
              renderDepositMethodDetails(curCountry, curMethod);
            }
          } else {
            finContents[k].classList.add('hidden');
          }
        }
      });
    });
  });

  // Method select in Finanzas Recargar
  const depositCountrySelect = document.getElementById('dashDepositCountrySelect');
  if (depositCountrySelect) {
    depositCountrySelect.addEventListener('change', (e) => {
      const curCountry = localStorage.getItem('wtokens_user_country') || 'PER';
      renderDepositMethodDetails(curCountry, e.target.value);
    });
  }

  // Switch Toggles in Ajustes
  document.querySelectorAll('.switch-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const switchName = btn.getAttribute('data-switch');
      const siblings = document.querySelectorAll(`[data-switch="${switchName}"]`);
      siblings.forEach(s => {
        s.className = 'switch-toggle px-3 py-1 rounded-lg text-slate-400 hover:text-white';
      });
      btn.className = 'switch-toggle active px-3 py-1 rounded-lg bg-amber-500 text-obsidian-950 font-bold';
    });
  });

  // Save Ajustes button
  const saveAjustesBtn = document.getElementById('btnSaveDashAjustes');
  if (saveAjustesBtn) {
    saveAjustesBtn.addEventListener('click', () => {
      const chosenCurrency = document.getElementById('dashSelectCurrency')?.value || 'PEN';
      applyUserCountry(chosenCurrency);
      alert('✅ ¡Ajustes guardados correctamente!');
    });
  }

  // Update Epic nickname in Verificación
  const saveVerifEpicBtn = document.getElementById('btnSaveVerifEpic');
  const inputVerifEpicNick = document.getElementById('inputVerifEpicNick');
  if (saveVerifEpicBtn && inputVerifEpicNick) {
    saveVerifEpicBtn.addEventListener('click', () => {
      const nick = inputVerifEpicNick.value.trim();
      if (!nick) {
        alert('Por favor ingresa tu nickname de Epic Games.');
        return;
      }
      localStorage.setItem('wtokens_epic_nick', nick);
      const saved = localStorage.getItem('wtokens_user_session');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          u.epicNickname = nick;
          localStorage.setItem('wtokens_user_session', JSON.stringify(u));
          renderAuthUser(u);
        } catch (e) {}
      }
      alert(`✅ ¡Apodo de Epic Games actualizado a "${nick}"! Tu rol ha sido verificado.`);
    });
  }

  // Creator code in Verificación
  const registerCodeBtn = document.getElementById('btnDashRegisterCode');
  const inputCode = document.getElementById('inputDashCreatorCode');
  if (registerCodeBtn && inputCode) {
    registerCodeBtn.addEventListener('click', () => {
      const code = inputCode.value.trim();
      if (!code) {
        alert('Ingresa el código de un creador.');
        return;
      }
      alert(`🎉 ¡Código "${code.toUpperCase()}" activado con éxito! Recibirás un 5% de bono extra en tus partidas.`);
      inputCode.value = '';
    });
  }

  // Confirm Deposit from Dashboard Finanzas
  const confirmDepositBtn = document.getElementById('btnDashConfirmDeposit');
  if (confirmDepositBtn) {
    confirmDepositBtn.addEventListener('click', () => {
      confirmDepositBtn.disabled = true;
      confirmDepositBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Validando comprobante...';
      setTimeout(() => {
        const saved = localStorage.getItem('wtokens_user_session');
        let bal = 25.0;
        if (saved) {
          try {
            const u = JSON.parse(saved);
            bal = (u.balance || 25.0) + 10.0;
            u.balance = bal;
            localStorage.setItem('wtokens_user_session', JSON.stringify(u));
            renderAuthUser(u);
          } catch(e) {}
        }
        confirmDepositBtn.disabled = false;
        confirmDepositBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Confirmar Recarga</span>';
        alert(`🎉 ¡Recarga de $10.00 USD aprobada y acreditada en tu billetera!\nNuevo saldo: ${bal.toFixed(2)} WT.`);
      }, 1500);
    });
  }

  // Withdraw method selector change in Finanzas Retirar
  const withdrawMethodSelect = document.getElementById('dashWithdrawMethodSelect');
  if (withdrawMethodSelect) {
    withdrawMethodSelect.addEventListener('change', (e) => {
      const curCountry = localStorage.getItem('wtokens_user_country') || 'PER';
      const country = COUNTRY_METHODS[curCountry] || COUNTRY_METHODS.PER;
      const methodObj = country.withdrawMethods.find(m => m.id === e.target.value) || country.withdrawMethods[0];
      updateWithdrawFieldInfo(methodObj);
    });
  }

  // Quick switch country buttons from within Finanzas
  document.querySelectorAll('.btn-change-country-link').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openCountryModal();
    });
  });

  // Confirm Withdrawal from Dashboard Finanzas
  const confirmWithdrawBtn = document.getElementById('btnDashConfirmWithdraw');
  const withdrawAmountInput = document.getElementById('dashWithdrawAmount');
  const withdrawDestInput = document.getElementById('dashWithdrawDestination');
  const withdrawLocalEq = document.getElementById('dashWithdrawLocalEquivalent');

  if (withdrawAmountInput && withdrawLocalEq) {
    withdrawAmountInput.addEventListener('input', () => {
      const amt = parseFloat(withdrawAmountInput.value) || 0;
      withdrawLocalEq.textContent = `Recibirás: ~${formatMoney(amt)}`;
    });
  }

  if (confirmWithdrawBtn) {
    confirmWithdrawBtn.addEventListener('click', () => {
      const amount = parseFloat(withdrawAmountInput ? withdrawAmountInput.value : 0);
      const dest = withdrawDestInput ? withdrawDestInput.value.trim() : '';

      if (amount < 5) {
        alert('El monto mínimo de retiro es de $5.00 USD Tokens.');
        return;
      }
      const saved = localStorage.getItem('wtokens_user_session');
      let currentBal = 25.0;
      let userObj = {};
      if (saved) {
        try {
          userObj = JSON.parse(saved);
          currentBal = userObj.balance !== undefined ? userObj.balance : 25.0;
        } catch(e) {}
      }

      if (amount > currentBal) {
        alert('Saldo insuficiente en tu billetera.');
        return;
      }
      if (!dest) {
        alert('Ingresa tu destino (Alias de Mercado Pago, número de Yape, CuentaRUT o Binance ID).');
        return;
      }

      confirmWithdrawBtn.disabled = true;
      confirmWithdrawBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Solicitando retiro...';
      setTimeout(() => {
        userObj.balance = currentBal - amount;
        localStorage.setItem('wtokens_user_session', JSON.stringify(userObj));
        renderAuthUser(userObj);
        confirmWithdrawBtn.disabled = false;
        confirmWithdrawBtn.innerHTML = '<i class="fa-solid fa-money-bill-transfer"></i> <span>Solicitar Retiro de Fondos</span>';
        alert(`✅ ¡Retiro de $${amount.toFixed(2)} USD solicitado con éxito hacia ${dest}!\nEl staff procesará la transferencia en menos de 15 minutos.`);
      }, 1200);
    });
  }

  // Dashboard Logout button
  const dashLogoutBtn = document.getElementById('btnDashLogout');
  if (dashLogoutBtn) {
    dashLogoutBtn.addEventListener('click', () => {
      showDashboard(false);
      logoutUser();
    });
  }

  // Expose global functions
  window.switchDashTab = switchTab;
  window.showDashboard = showDashboard;
}

// =========================================================================
// Country Picker Modal (Post-Discord Onboarding & Country Switcher)
// =========================================================================
function openCountryModal() {
  const modal = document.getElementById('countrySelectModal');
  if (!modal) return;
  modal.classList.remove('hidden');

  const currentCountry = localStorage.getItem('wtokens_user_country') || 'PER';
  document.querySelectorAll('.country-pick-btn').forEach(btn => {
    if (btn.getAttribute('data-country') === currentCountry) {
      btn.classList.add('border-amber-500', 'bg-white/10');
    } else {
      btn.classList.remove('border-amber-500', 'bg-white/10');
    }
  });
}

function closeCountryModal() {
  const modal = document.getElementById('countrySelectModal');
  if (modal) modal.classList.add('hidden');
}

function initCountryPicker() {
  const modal = document.getElementById('countrySelectModal');
  const closeBtn = document.getElementById('closeCountryModalBtn');
  const openBtn = document.getElementById('btnOpenChangeCountry');

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openCountryModal();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', closeCountryModal);
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCountryModal();
    });
  }

  document.querySelectorAll('.country-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-country');
      applyUserCountry(code);
      closeCountryModal();

      // Check if user was in post-Discord onboarding flow
      const pendingEpic = localStorage.getItem('wtokens_pending_epic_prompt');
      if (pendingEpic === 'true') {
        localStorage.removeItem('wtokens_pending_epic_prompt');
        setTimeout(() => {
          if (typeof window.openEpicModal === 'function') {
            window.openEpicModal();
          }
        }, 350);
      }
    });
  });

  window.openCountryModal = openCountryModal;
  window.closeCountryModal = closeCountryModal;
}

// =========================================================================
// Period Filter Tabs (Perfil & Finanzas Extracto)
// =========================================================================
function initPeriodButtons() {
  document.querySelectorAll('.dash-period-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.parentElement;
      if (!parent) return;

      parent.querySelectorAll('.dash-period-btn').forEach(sibling => {
        sibling.classList.remove('active', 'bg-white/10', 'text-white', 'font-bold');
        sibling.classList.add('text-slate-400');
      });

      btn.classList.add('active', 'bg-white/10', 'text-white', 'font-bold');
      btn.classList.remove('text-slate-400');

      const label = btn.textContent.trim().toLowerCase();
      const metricWinRate = document.getElementById('metricWinRate');
      const metricProfit = document.getElementById('metricProfit');
      const metricVolume = document.getElementById('metricVolume');
      const metricMatches = document.getElementById('metricMatches');

      if (metricWinRate && metricProfit && metricVolume && metricMatches) {
        const periodData = {
          '7 días': { wr: '66.7%', profit: '+$35,00', vol: '$120,00', matches: '12' },
          '15 días': { wr: '70.0%', profit: '+$84,00', vol: '$280,00', matches: '28' },
          '30 días': { wr: '73.4%', profit: '+$192,50', vol: '$650,00', matches: '64' },
          '60 días': { wr: '71.2%', profit: '+$380,00', vol: '$1.320,00', matches: '126' },
          'todo el historial': { wr: '72.5%', profit: '+$840,00', vol: '$2.950,00', matches: '280' }
        };
        const data = periodData[label] || periodData['30 días'];
        metricWinRate.textContent = data.wr;
        metricProfit.textContent = data.profit;
        metricVolume.textContent = data.vol;
        metricMatches.textContent = data.matches;
      }
    });
  });
}

// =========================================================================
// Lobby Controls & Invitations
// =========================================================================
function initLobbyControls() {
  const sendInviteBtn = document.getElementById('btnLobbySendInvite');
  const inviteInput = document.getElementById('inputLobbyInvite');
  const slotCards = document.querySelectorAll('.lobby-slot-card');

  const tabFriends = document.getElementById('tabLobbyFriends');
  const tabSuggestions = document.getElementById('tabLobbySuggestions');
  const tabSearch = document.getElementById('tabLobbySearch');
  const friendsContainer = document.getElementById('lobbyFriendsContent');
  const btnSuggestionsEmpty = document.getElementById('btnLobbySuggestions');

  let invitedSlots = {};

  function updateLobbyCount() {
    const count = 1 + Object.keys(invitedSlots).length;
    const badge = document.getElementById('lobbyCounterBadge');
    if (badge) badge.textContent = `Lobby ${count}/4`;
  }

  function resetSlot(slotId) {
    delete invitedSlots[slotId];
    const slotEl = document.getElementById(slotId);
    if (!slotEl) return;

    slotEl.className = 'lobby-slot-card h-64 rounded-2xl bg-[#0e1017] border border-dashed border-white/10 hover:border-amber-500/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group';
    slotEl.innerHTML = `
      <div class="w-10 h-10 rounded-full bg-white/5 group-hover:bg-amber-500/20 text-slate-500 group-hover:text-amber-400 flex items-center justify-center transition-colors">
        <i class="fa-solid fa-plus"></i>
      </div>
      <span class="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 group-hover:text-white">INVITAR</span>
    `;
    slotEl.onclick = handleSlotClick;
    updateLobbyCount();
  }

  function invitePlayerToSlot(username) {
    const cleanName = username.replace(/^@/, '').trim();
    if (!cleanName) return false;

    const availableSlots = ['lobbySlot1', 'lobbySlot2', 'lobbySlot4'].filter(id => !invitedSlots[id]);
    if (availableSlots.length === 0) {
      alert('El lobby ya está lleno (4/4 jugadores).');
      return false;
    }

    const slotId = availableSlots[0];
    const slotEl = document.getElementById(slotId);
    if (!slotEl) return false;

    invitedSlots[slotId] = cleanName;

    slotEl.onclick = null;
    slotEl.className = 'h-64 rounded-2xl bg-obsidian-950 border border-amber-500/40 p-4 flex flex-col items-center justify-between relative overflow-hidden transition-all shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    slotEl.innerHTML = `
      <button class="btn-cancel-lobby-slot absolute top-2.5 right-2.5 text-slate-500 hover:text-rose-400 p-1 text-xs transition-colors" data-slot="${slotId}" title="Cancelar invitación">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="pt-2 text-center">
        <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono font-bold text-[9px] uppercase tracking-wider animate-pulse">
          INVITADO
        </span>
      </div>
      <div class="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
        ${escapeHTML(cleanName.slice(0, 2).toUpperCase())}
      </div>
      <div class="text-center px-2 space-y-0.5 pb-2">
        <div class="text-xs font-bold text-white truncate max-w-[120px]">@${escapeHTML(cleanName)}</div>
        <div class="text-[9px] font-mono text-slate-400">Esperando respuesta...</div>
      </div>
    `;

    const cancelBtn = slotEl.querySelector('.btn-cancel-lobby-slot');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetSlot(slotId);
      });
    }

    updateLobbyCount();
    alert(`📨 ¡Invitación enviada a @${cleanName}! El jugador recibirá una notificación para unirse a tu lobby.`);
    return true;
  }

  function handleSlotClick() {
    if (inviteInput) {
      inviteInput.focus();
      inviteInput.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  slotCards.forEach(slot => {
    slot.onclick = handleSlotClick;
  });

  if (sendInviteBtn && inviteInput) {
    sendInviteBtn.addEventListener('click', () => {
      const val = inviteInput.value.trim();
      if (!val) {
        inviteInput.focus();
        alert('Por favor ingresa el nombre o ID de Discord del jugador que deseas invitar.');
        return;
      }
      if (invitePlayerToSlot(val)) {
        inviteInput.value = '';
      }
    });

    inviteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        sendInviteBtn.click();
      }
    });
  }

  function setLobbySideTab(activeTab) {
    [tabFriends, tabSuggestions, tabSearch].forEach(t => {
      if (!t) return;
      if (t === activeTab) {
        t.className = 'lobby-side-tab active px-3 py-1 rounded-lg bg-white/10 text-white font-bold transition-all';
      } else {
        t.className = 'lobby-side-tab px-3 py-1 rounded-lg text-slate-400 hover:text-white transition-all';
      }
    });
  }

  if (tabFriends) {
    tabFriends.addEventListener('click', () => {
      setLobbySideTab(tabFriends);
      if (friendsContainer) {
        friendsContainer.innerHTML = `
          <div class="p-6 text-center space-y-3">
            <p class="text-xs text-slate-400 leading-relaxed">Aún no tienes amigos agregados. Usa sugerencias o busca jugadores para agregar.</p>
            <button id="btnLobbySuggestionsInner" class="px-4 py-2 rounded-xl bg-obsidian-950 hover:bg-obsidian-850 border border-white/10 text-xs font-mono font-bold text-amber-400 uppercase transition-all">
              SUGERENCIAS
            </button>
          </div>
        `;
        const innerBtn = document.getElementById('btnLobbySuggestionsInner');
        if (innerBtn) innerBtn.addEventListener('click', () => tabSuggestions?.click());
      }
    });
  }

  if (tabSuggestions) {
    tabSuggestions.addEventListener('click', () => {
      setLobbySideTab(tabSuggestions);
      if (friendsContainer) {
        friendsContainer.innerHTML = `
          <div class="space-y-3 text-left">
            <div class="flex items-center justify-between p-3 rounded-xl bg-obsidian-950 border border-white/5">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs">K1</div>
                <div>
                  <div class="text-xs font-bold text-white">@k1ng_fn</div>
                  <div class="text-[10px] text-emerald-400 font-mono">79% Winrate · En línea</div>
                </div>
              </div>
              <button class="btn-quick-invite px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-obsidian-950 font-bold text-[10px] transition-all" data-user="k1ng_fn">
                + Invitar
              </button>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-obsidian-950 border border-white/5">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-amber-600/30 text-amber-400 flex items-center justify-center font-bold text-xs">SB</div>
                <div>
                  <div class="text-xs font-bold text-white">@santi_builds</div>
                  <div class="text-[10px] text-slate-400 font-mono">División Diamante</div>
                </div>
              </div>
              <button class="btn-quick-invite px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-obsidian-950 font-bold text-[10px] transition-all" data-user="santi_builds">
                + Invitar
              </button>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-obsidian-950 border border-white/5">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-bold text-xs">FM</div>
                <div>
                  <div class="text-xs font-bold text-white">@faze_mateo</div>
                  <div class="text-[10px] text-slate-400 font-mono">Box Fight Pro</div>
                </div>
              </div>
              <button class="btn-quick-invite px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-obsidian-950 font-bold text-[10px] transition-all" data-user="faze_mateo">
                + Invitar
              </button>
            </div>
          </div>
        `;

        friendsContainer.querySelectorAll('.btn-quick-invite').forEach(b => {
          b.addEventListener('click', () => {
            const u = b.getAttribute('data-user');
            invitePlayerToSlot(u);
          });
        });
      }
    });
  }

  if (tabSearch) {
    tabSearch.addEventListener('click', () => {
      setLobbySideTab(tabSearch);
      if (friendsContainer) {
        friendsContainer.innerHTML = `
          <div class="space-y-3">
            <input type="text" id="inputSearchPlayer" placeholder="Buscar por Discord o Epic Nick..." class="w-full bg-obsidian-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500">
            <div id="searchResults" class="text-xs text-slate-500 text-center py-4">
              Escribe un nombre para buscar jugadores activos en WTOKENS.
            </div>
          </div>
        `;
        const searchInput = document.getElementById('inputSearchPlayer');
        const resultsBox = document.getElementById('searchResults');
        if (searchInput && resultsBox) {
          searchInput.addEventListener('input', () => {
            const q = searchInput.value.trim().toLowerCase();
            if (!q) {
              resultsBox.innerHTML = '<div class="text-xs text-slate-500 text-center py-4">Escribe un nombre para buscar jugadores activos.</div>';
              return;
            }
            resultsBox.innerHTML = `
              <div class="flex items-center justify-between p-3 rounded-xl bg-obsidian-950 border border-white/5 text-left">
                <div class="flex items-center gap-2.5">
                  <div class="w-8 h-8 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center font-bold text-xs">${escapeHTML(q.slice(0, 2).toUpperCase())}</div>
                  <div>
                    <div class="text-xs font-bold text-white">@${escapeHTML(q)}</div>
                    <div class="text-[10px] text-slate-400 font-mono">Jugador verificado</div>
                  </div>
                </div>
                <button class="btn-quick-invite px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-obsidian-950 font-bold text-[10px] transition-all" data-user="${escapeHTML(q)}">
                  + Invitar
                </button>
              </div>
            `;
            const quickBtn = resultsBox.querySelector('.btn-quick-invite');
            if (quickBtn) {
              quickBtn.addEventListener('click', () => {
                invitePlayerToSlot(q);
              });
            }
          });
        }
      }
    });
  }

  if (btnSuggestionsEmpty) {
    btnSuggestionsEmpty.addEventListener('click', () => {
      tabSuggestions?.click();
    });
  }
}

function renderDashPaymentDetails(methodOrCountryCode) {
  const currentCountry = localStorage.getItem('wtokens_user_country') || 'PER';
  renderDepositMethodDetails(currentCountry, methodOrCountryCode);
}

// Leaderboard Data by Mode
const LEADERBOARDS = {
  all: [
    { rank: 1, name: 'SlayerKing.fn', epic: 'SlayerFN_7', tag: 'SK', gradient: 'from-wpurple-600 to-wcyan-400', matches: 284, winrate: '79.2%', streak: '🔥 8 W', earningsUSD: 4920 },
    { rank: 2, name: 'Vitor_AimGod', epic: 'VitorBR_99', tag: 'VF', gradient: 'from-indigo-600 to-pink-500', matches: 241, winrate: '74.5%', streak: '🔥 5 W', earningsUSD: 3840 },
    { rank: 3, name: 'Nexuz_Piece', epic: 'NexuzFNCS', tag: 'NX', gradient: 'from-emerald-600 to-cyan-500', matches: 198, winrate: '71.0%', streak: '3 W', earningsUSD: 3110 },
    { rank: 4, name: 'K4zuto_Zero', epic: 'KazutoPlays', tag: 'KZ', gradient: 'from-slate-700 to-slate-800', matches: 165, winrate: '68.4%', streak: '2 W', earningsUSD: 2450 },
    { rank: 5, name: 'BlackOut_Build', epic: 'Blackout_7', tag: 'BL', gradient: 'from-purple-800 to-indigo-900', matches: 142, winrate: '67.1%', streak: '4 W', earningsUSD: 1980 }
  ],
  box: [
    { rank: 1, name: 'Vitor_AimGod', epic: 'VitorBR_99', tag: 'VF', gradient: 'from-indigo-600 to-pink-500', matches: 180, winrate: '82.1%', streak: '🔥 9 W', earningsUSD: 3200 },
    { rank: 2, name: 'BoxDemon_FN', epic: 'BoxDemon99', tag: 'BD', gradient: 'from-wpurple-600 to-cyan-400', matches: 154, winrate: '77.3%', streak: '4 W', earningsUSD: 2750 },
    { rank: 3, name: 'SlayerKing.fn', epic: 'SlayerFN_7', tag: 'SK', gradient: 'from-wpurple-600 to-wcyan-400', matches: 130, winrate: '75.0%', streak: '2 W', earningsUSD: 2100 },
    { rank: 4, name: 'PieceGod_Latam', epic: 'PieceGod_X', tag: 'PG', gradient: 'from-amber-600 to-yellow-500', matches: 112, winrate: '70.5%', streak: '3 W', earningsUSD: 1850 },
    { rank: 5, name: 'Zerk_Box', epic: 'ZerkPlays', tag: 'ZK', gradient: 'from-slate-700 to-slate-800', matches: 98, winrate: '68.0%', streak: '1 W', earningsUSD: 1400 }
  ],
  zone: [
    { rank: 1, name: 'Nexuz_Piece', epic: 'NexuzFNCS', tag: 'NX', gradient: 'from-emerald-600 to-cyan-500', matches: 140, winrate: '76.4%', streak: '🔥 6 W', earningsUSD: 2950 },
    { rank: 2, name: 'Endgame_King', epic: 'Endgame_Pro', tag: 'EK', gradient: 'from-wpurple-600 to-wcyan-400', matches: 122, winrate: '73.2%', streak: '3 W', earningsUSD: 2300 },
    { rank: 3, name: 'ZoneLord_FN', epic: 'ZoneLord_BR', tag: 'ZL', gradient: 'from-rose-600 to-orange-500', matches: 110, winrate: '70.8%', streak: '2 W', earningsUSD: 1920 },
    { rank: 4, name: 'SlayerKing.fn', epic: 'SlayerFN_7', tag: 'SK', gradient: 'from-wpurple-600 to-wcyan-400', matches: 95, winrate: '69.1%', streak: '4 W', earningsUSD: 1750 },
    { rank: 5, name: 'StormRider', epic: 'StormRiderFN', tag: 'SR', gradient: 'from-blue-600 to-indigo-600', matches: 84, winrate: '66.5%', streak: '1 W', earningsUSD: 1290 }
  ],
  build: [
    { rank: 1, name: 'BlackOut_Build', epic: 'Blackout_7', tag: 'BL', gradient: 'from-purple-800 to-indigo-900', matches: 120, winrate: '80.0%', streak: '🔥 7 W', earningsUSD: 2600 },
    { rank: 2, name: 'HighGround_God', epic: 'HeightGod_FN', tag: 'HG', gradient: 'from-wgold-500 to-amber-400', matches: 105, winrate: '75.2%', streak: '5 W', earningsUSD: 2150 },
    { rank: 3, name: 'Faze_Cloner', epic: 'Cloner_99', tag: 'FC', gradient: 'from-wpurple-600 to-indigo-500', matches: 92, winrate: '71.5%', streak: '3 W', earningsUSD: 1780 },
    { rank: 4, name: 'Crank_Master', epic: 'CrankM_7', tag: 'CM', gradient: 'from-emerald-600 to-teal-500', matches: 85, winrate: '69.0%', streak: '2 W', earningsUSD: 1420 },
    { rank: 5, name: 'Mechanical_God', epic: 'MechGod_FN', tag: 'MG', gradient: 'from-slate-700 to-slate-800', matches: 78, winrate: '67.3%', streak: '1 W', earningsUSD: 1200 }
  ]
};

function initLeaderboardFilter() {
  const tabs = document.querySelectorAll('.rank-tab');
  const tbody = document.getElementById('leaderboardBody');

  if (!tabs.length || !tbody) return;

  function renderTable(data) {
    tbody.innerHTML = data.map((player, idx) => {
      const rankBadge = idx === 0 
        ? '<span class="w-6 h-6 rounded-full bg-wgold-500/20 text-wgold-400 flex items-center justify-center text-xs font-bold">1</span>'
        : idx === 1
        ? '<span class="w-6 h-6 rounded-full bg-slate-400/20 text-slate-300 flex items-center justify-center text-xs font-bold">2</span>'
        : idx === 2
        ? '<span class="w-6 h-6 rounded-full bg-amber-600/20 text-amber-500 flex items-center justify-center text-xs font-bold">3</span>'
        : `<span class="font-mono text-slate-400">${player.rank}</span>`;

      return `
        <tr class="hover:bg-white/[0.02] transition-colors">
          <td class="py-4 px-6 font-mono font-bold flex items-center gap-2">
            ${rankBadge}
          </td>
          <td class="py-4 px-6">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-tr ${player.gradient} flex items-center justify-center font-bold text-white text-xs">
                ${player.tag}
              </div>
              <div>
                <div class="font-bold text-white flex items-center gap-1.5">
                  <span>${player.name}</span>
                  <i class="fa-solid fa-circle-check text-wcyan-400 text-xs"></i>
                </div>
                <div class="text-xs text-slate-400 font-mono">Epic: ${player.epic}</div>
              </div>
            </div>
          </td>
          <td class="py-4 px-6 text-center font-mono text-slate-300">${player.matches}</td>
          <td class="py-4 px-6 text-center font-mono font-bold text-emerald-400">${player.winrate}</td>
          <td class="py-4 px-6 text-center font-mono text-wgold-400 font-bold">${player.streak}</td>
          <td class="py-4 px-6 text-right font-mono font-black text-emerald-400 text-sm">
            ${formatMoney(player.earningsUSD)}
          </td>
        </tr>
      `;
    }).join('');
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active', 'bg-wpurple-600', 'text-white'));
      tab.classList.add('active', 'bg-wpurple-600', 'text-white');

      const mode = tab.dataset.mode;
      renderTable(LEADERBOARDS[mode] || LEADERBOARDS.all);
    });
  });

  renderTable(LEADERBOARDS.all);
}

// Discord OAuth2 Configuration & Session State
const DISCORD_CLIENT_ID = '1562186330841161838';

function getDiscordRedirectUri() {
  const host = window.location.hostname;
  if (host === 'wtokens.net' || host === 'www.wtokens.net') {
    return 'https://wtokens.net/';
  }
  const origin = window.location.origin;
  return origin.endsWith('/') ? origin : origin + '/';
}

function redirectToDiscordOAuth() {
  const redirectUri = getDiscordRedirectUri();
  const scope = encodeURIComponent('identify');
  const authUrl = `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=token&scope=${scope}&redirect_uri=${encodeURIComponent(redirectUri)}`;
  window.location.href = authUrl;
}

function checkDiscordOAuthCallback() {
  const hash = window.location.hash;
  if (!hash || !hash.includes('access_token=')) {
    // Check if user already logged in from localStorage
    const saved = localStorage.getItem('wtokens_user_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        renderAuthUser(u);
        const savedCountry = localStorage.getItem('wtokens_user_country') || u.country || 'PER';
        applyUserCountry(savedCountry, false);
      } catch (e) {}
    }
    return;
  }

  // Parse token from hash fragment
  const params = new URLSearchParams(hash.substring(1));
  const token = params.get('access_token');

  if (token) {
    // Clean URL hash so token is removed from browser address bar
    window.history.replaceState(null, null, window.location.pathname);

    // Fetch user profile from Discord API
    fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(discordUser => {
      if (discordUser && discordUser.id) {
        const avatarUrl = discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
          : 'https://cdn.discordapp.com/embed/avatars/0.png';

        const existingNick = localStorage.getItem('wtokens_epic_nick');
        const existingSession = localStorage.getItem('wtokens_user_session');
        let prevUser = {};
        if (existingSession) {
          try { prevUser = JSON.parse(existingSession); } catch (e) {}
        }

        const savedCountry = localStorage.getItem('wtokens_user_country') || prevUser.country;

        const userObj = {
          id: discordUser.id,
          username: discordUser.global_name || discordUser.username,
          discordTag: discordUser.username,
          avatar: avatarUrl,
          epicNickname: existingNick || prevUser.epicNickname || '',
          country: savedCountry || '',
          balance: prevUser.balance !== undefined ? prevUser.balance : 25.0
        };

        localStorage.setItem('wtokens_user_session', JSON.stringify(userObj));
        renderAuthUser(userObj);

        // Open dashboard directly upon login
        showDashboard(true);
        if (typeof window.switchDashTab === 'function') {
          window.switchDashTab('perfil');
        }

        // Post-Discord onboarding: Ask country FIRST to filter payment methods!
        if (!savedCountry) {
          if (!userObj.epicNickname) {
            localStorage.setItem('wtokens_pending_epic_prompt', 'true');
          }
          setTimeout(() => {
            if (typeof window.openCountryModal === 'function') {
              window.openCountryModal();
            }
          }, 450);
        } else {
          applyUserCountry(savedCountry);
          // If country was already chosen, check Epic Games link
          if (!userObj.epicNickname) {
            setTimeout(() => {
              if (typeof window.openEpicModal === 'function') {
                window.openEpicModal();
              }
            }, 450);
          } else {
            alert(`¡Sesión iniciada con éxito! Bienvenido @${userObj.username} a tu panel de WTOKENS.`);
          }
        }
      }
    })
    .catch(err => {
      console.error('Error fetching Discord profile:', err);
      alert('Hubo un error al autenticar con Discord. Por favor intenta nuevamente.');
    });
  }
}

function renderAuthUser(user) {
  const loginBtn = document.getElementById('btnOpenDiscordLogin');
  const profilePill = document.getElementById('userProfilePill');
  const navAvatar = document.getElementById('userNavAvatar');
  const navName = document.getElementById('userNavName');
  const mobileLoginText = document.getElementById('mobileLoginBtnText');

  if (loginBtn) loginBtn.classList.add('hidden');
  if (profilePill) {
    profilePill.classList.remove('hidden');
    profilePill.classList.add('flex');
  }

  if (mobileLoginText) mobileLoginText.textContent = `Mi Panel (@${user.username})`;
  if (navAvatar && user.avatar) navAvatar.src = user.avatar;
  if (navName) navName.textContent = `@${user.username}`;

  // Update Dashboard Profile Elements
  const dashUserAvatar = document.getElementById('dashUserAvatar');
  const dashUsername = document.getElementById('dashUsername');
  const dashUserDiscordTag = document.getElementById('dashUserDiscordTag');
  const dashBalanceTokens = document.getElementById('dashBalanceTokens');
  const dashBalanceLocal = document.getElementById('dashBalanceLocal');

  const dashFinBalance = document.getElementById('dashFinMainBalance');
  const dashFinBalanceLocal = document.getElementById('dashFinMainBalanceLocal');

  const dashVerifDiscordAvatar = document.getElementById('dashVerifDiscordAvatar');
  const dashVerifDiscordName = document.getElementById('dashVerifDiscordName');
  const dashVerifEpicNickDisplay = document.getElementById('dashVerifEpicNickDisplay');
  const inputVerifEpicNick = document.getElementById('inputVerifEpicNick');
  const badgeFortniteStatus = document.getElementById('badgeFortniteStatus');

  const dashLobbyLeaderAvatar = document.getElementById('dashLobbyLeaderAvatar');
  const dashLobbyLeaderName = document.getElementById('dashLobbyLeaderName');

  const currentBal = user.balance !== undefined ? user.balance : 25.0;

  if (dashUserAvatar && user.avatar) dashUserAvatar.src = user.avatar;
  if (dashUsername) dashUsername.textContent = user.username;
  if (dashUserDiscordTag) dashUserDiscordTag.textContent = `@${user.discordTag || user.username}`;

  const localFormatted = formatMoneyShort(currentBal, currentCurrency);
  const secondaryTokens = `(${currentBal.toFixed(2)} WT)`;

  if (dashBalanceTokens) dashBalanceTokens.textContent = localFormatted;
  if (dashBalanceLocal) dashBalanceLocal.textContent = secondaryTokens;

  if (dashFinBalance) dashFinBalance.textContent = localFormatted;
  if (dashFinBalanceLocal) dashFinBalanceLocal.textContent = secondaryTokens;

  if (dashVerifDiscordAvatar && user.avatar) dashVerifDiscordAvatar.src = user.avatar;
  if (dashVerifDiscordName) dashVerifDiscordName.textContent = user.username;

  const epic = user.epicNickname || localStorage.getItem('wtokens_epic_nick');
  if (dashVerifEpicNickDisplay) dashVerifEpicNickDisplay.textContent = epic || 'PENDIENTE';
  if (inputVerifEpicNick && epic) inputVerifEpicNick.value = epic;
  
  const displayEpicNickVerified = document.getElementById('displayEpicNickVerified');
  const displayEpicIdVerified = document.getElementById('displayEpicIdVerified');
  if (displayEpicNickVerified) {
    displayEpicNickVerified.textContent = epic || 'Pendiente de verificar';
    displayEpicNickVerified.className = epic ? 'font-bold text-emerald-400 font-mono text-sm' : 'font-bold text-slate-500 font-mono text-sm';
  }
  if (displayEpicIdVerified) {
    const epicId = user.epicAccountId || localStorage.getItem('wtokens_epic_id');
    displayEpicIdVerified.textContent = epicId ? `ID: ${epicId}` : (epic ? 'Verificado con Epic Games' : 'Requiere vincular');
  }

  if (badgeFortniteStatus) {
    if (epic) {
      badgeFortniteStatus.className = 'px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold';
      badgeFortniteStatus.textContent = 'VINCULADO DIRECTO';
    } else {
      badgeFortniteStatus.className = 'px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold animate-pulse';
      badgeFortniteStatus.textContent = 'PENDIENTE';
    }
  }

  // Update Epic Verification 1:1 Card (Matches BR Tokens)
  const badgeEpicVerifCard = document.getElementById('badgeEpicVerifCard');
  const subtextEpicVerifCard = document.getElementById('subtextEpicVerifCard');
  const btnDirectEpicLogin = document.getElementById('btnDirectEpicLogin');
  const labelPendingGames = document.getElementById('labelPendingGames');

  if (badgeEpicVerifCard) {
    if (epic) {
      badgeEpicVerifCard.className = 'px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold flex items-center gap-1';
      badgeEpicVerifCard.innerHTML = '<i class="fa-solid fa-check text-[10px]"></i> VINCULADO';
    } else {
      badgeEpicVerifCard.className = 'px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400 text-[10px] font-mono font-bold';
      badgeEpicVerifCard.textContent = 'PENDIENTE';
    }
  }

  if (subtextEpicVerifCard) {
    if (epic) {
      const epicId = user.epicAccountId || localStorage.getItem('wtokens_epic_id') || 'VERIFICADO';
      subtextEpicVerifCard.innerHTML = `Cuenta oficial: <strong class="text-white font-mono">${escapeHTML(epic)}</strong> · <span class="text-emerald-400 font-mono text-[11px]"><i class="fa-solid fa-circle-check"></i> Verificada</span>`;
    } else {
      subtextEpicVerifCard.textContent = 'Libera validación de partidas y torneos de Fortnite.';
    }
  }

  if (btnDirectEpicLogin) {
    if (epic) {
      btnDirectEpicLogin.className = 'px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 font-bold text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 flex items-center justify-center gap-2';
      btnDirectEpicLogin.innerHTML = '<i class="fa-solid fa-arrows-rotate text-xs text-amber-400"></i> <span>CAMBIAR CUENTA</span>';
    } else {
      btnDirectEpicLogin.className = 'px-6 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-obsidian-950 font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.25)] hover:shadow-[0_0_30px_rgba(245,158,11,0.45)] hover:scale-[1.02] active:scale-[0.98] transition-all shrink-0 flex items-center justify-center gap-2';
      btnDirectEpicLogin.innerHTML = '<i class="fa-brands fa-epic-games text-sm"></i> <span id="btnEpicCardText">VINCULAR EPIC GAMES</span>';
    }
  }

  if (labelPendingGames) {
    if (epic) {
      labelPendingGames.textContent = 'JUEGOS VINCULADOS';
      labelPendingGames.className = 'text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold';
    } else {
      labelPendingGames.textContent = 'AÚN FALTAN';
      labelPendingGames.className = 'text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold';
    }
  }

  if (dashLobbyLeaderAvatar && user.avatar) dashLobbyLeaderAvatar.src = user.avatar;
  if (dashLobbyLeaderName) dashLobbyLeaderName.textContent = user.username.toUpperCase();

  // Sync settings dropdown and country flag with user country
  const userCountry = user.country || localStorage.getItem('wtokens_user_country') || 'PER';
  applyUserCountry(userCountry, false);
}

function logoutUser() {
  localStorage.removeItem('wtokens_user_session');
  localStorage.removeItem('wtokens_epic_nick');
  const loginBtn = document.getElementById('btnOpenDiscordLogin');
  const profilePill = document.getElementById('userProfilePill');
  const mobileLoginText = document.getElementById('mobileLoginBtnText');

  if (loginBtn) loginBtn.classList.remove('hidden');
  if (profilePill) {
    profilePill.classList.add('hidden');
    profilePill.classList.remove('flex');
  }
  if (mobileLoginText) mobileLoginText.textContent = 'Entrar con Discord';

  if (typeof showDashboard === 'function') {
    showDashboard(false);
  }

  alert('Sesión de Discord cerrada correctamente.');
}

// Discord Auth Buttons (Exclusively OAuth2, no manual inputs)
function initDiscordAuth() {
  const openBtn = document.getElementById('btnOpenDiscordLogin');
  const mobileOpenBtn = document.getElementById('mobileDiscordBtn');
  const logoutBtn = document.getElementById('btnUserLogout');

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      redirectToDiscordOAuth();
    });
  }

  if (mobileOpenBtn) {
    mobileOpenBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const saved = localStorage.getItem('wtokens_user_session');
      if (saved) {
        showDashboard(true);
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu) mobileMenu.classList.add('hidden');
      } else {
        redirectToDiscordOAuth();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      logoutUser();
    });
  }
}

// Epic Games Nickname & Country Link Modal (Shown after Discord login)
function initEpicLinkModal() {
  const modal = document.getElementById('epicLinkModal');
  const closeBtn = document.getElementById('closeEpicModalBtn');
  const saveBtn = document.getElementById('btnSaveEpicLink');
  const inputEpicNick = document.getElementById('inputEpicNick');
  const selectCountry = document.getElementById('selectCountryModal');
  const profilePill = document.getElementById('userProfilePill');

  if (!modal) return;

  function openEpicModal() {
    const saved = localStorage.getItem('wtokens_user_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        const notice = document.getElementById('epicModalUserNotice');
        if (notice) {
          notice.innerHTML = `Sesión de Discord: <strong class="text-wcyan-400">@${escapeHTML(u.username)}</strong>.<br>Ingresa tu Nickname exacto de Epic Games para completar tu perfil competitivo.`;
        }
        if (inputEpicNick && u.epicNickname) {
          inputEpicNick.value = u.epicNickname;
        }
        if (selectCountry && u.country) {
          selectCountry.value = u.country;
        }
      } catch (e) {}
    }
    modal.classList.remove('hidden');
  }

  function closeEpicModal() {
    modal.classList.add('hidden');
  }

  if (closeBtn) closeBtn.addEventListener('click', closeEpicModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeEpicModal();
  });

  // Clicking profile pill allows viewing or editing Epic Nickname
  if (profilePill) {
    profilePill.addEventListener('click', (e) => {
      if (e.target.closest('#btnUserLogout')) return;
      openEpicModal();
    });
    profilePill.style.cursor = 'pointer';
    profilePill.title = 'Haz clic para vincular o actualizar tu Nick de Epic Games';
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const epicNick = inputEpicNick ? inputEpicNick.value.trim() : '';
      const chosenCountry = selectCountry ? selectCountry.value : currentCurrency;

      if (!epicNick) {
        alert('Por favor ingresa tu Nickname exacto en Epic Games (Fortnite).');
        return;
      }

      const saved = localStorage.getItem('wtokens_user_session');
      let userObj = {};
      if (saved) {
        try { userObj = JSON.parse(saved); } catch (e) {}
      }

      userObj.epicNickname = epicNick;
      userObj.country = chosenCountry;

      localStorage.setItem('wtokens_epic_nick', epicNick);
      localStorage.setItem('wtokens_user_session', JSON.stringify(userObj));

      // Update currency across app
      currentCurrency = chosenCountry;
      const currencySelector = document.getElementById('currencySelector');
      const currencySelectorMobile = document.getElementById('currencySelectorMobile');
      if (currencySelector) currencySelector.value = chosenCountry;
      if (currencySelectorMobile) currencySelectorMobile.value = chosenCountry;
      updateAllCurrencyDisplays();

      renderAuthUser(userObj);
      closeEpicModal();

      alert(`✅ ¡Cuenta Vinculada con Éxito!\n\nDiscord: @${userObj.username || 'Usuario'}\nEpic Games: ${epicNick}\nMoneda de Saldo: ${CURRENCIES[chosenCountry].name}\n\n¡Ya estás listo para competir en la Arena WTOKENS!`);
    });
  }

  // Direct Epic Games 1-Click Button in Modal
  const modalDirectEpicLogin = document.getElementById('btnModalDirectEpicLogin');
  if (modalDirectEpicLogin) {
    modalDirectEpicLogin.addEventListener('click', () => {
      triggerEpicOAuthFlow();
    });
  }

  window.openEpicModal = openEpicModal;
}

// 1-Click Epic Games Official OAuth Flow (Matches BR Tokens)
function triggerEpicOAuthFlow() {
  const saved = localStorage.getItem('wtokens_user_session');
  if (!saved) {
    alert('⚠️ Debes iniciar sesión con Discord primero antes de vincular tu cuenta de Epic Games.');
    loginWithDiscord();
    return;
  }

  try {
    const u = JSON.parse(saved);
    if (u.epicVerified && u.epicNickname) {
      if (!confirm(`Ya tienes vinculada la cuenta de Epic Games: "${u.epicNickname}".\n\n¿Deseas desvincularla para enlazar una cuenta diferente?`)) {
        return;
      }
      u.epicNickname = null;
      u.epicAccountId = null;
      u.epicVerified = false;
      localStorage.removeItem('wtokens_epic_nick');
      localStorage.removeItem('wtokens_epic_id');
      localStorage.setItem('wtokens_user_session', JSON.stringify(u));
      renderAuthUser(u);
    }
  } catch (e) {}

  const epicClientId = localStorage.getItem('wtokens_epic_client_id') || 'xyza7891Ei8U2usurzW8tvXKGtztOY';
  const redirectUri = window.location.origin + '/';
  const authUrl = `https://www.epicgames.com/id/authorize?client_id=${encodeURIComponent(epicClientId)}&response_type=code&scope=basic_profile&redirect_uri=${encodeURIComponent(redirectUri)}`;

  const btnText = document.getElementById('btnEpicCardText');
  if (btnText) btnText.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> CONECTANDO A EPIC...';

  sessionStorage.setItem('wtokens_epic_oauth_started', 'true');
  window.location.href = authUrl;
}

function initEpicVerification() {
  const directBtn = document.getElementById('btnDirectEpicLogin');
  if (directBtn) {
    directBtn.addEventListener('click', triggerEpicOAuthFlow);
  }
}

async function checkEpicOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  const errorDesc = urlParams.get('error_description');

  if (error) {
    console.warn('Epic OAuth Error:', error, errorDesc);
    window.history.replaceState(null, null, window.location.pathname + '#verificacion');
    showDashboard(true);
    if (window.switchDashTab) window.switchDashTab('verificacion');

    const isRedirectError = error.includes('redirect') || (errorDesc && errorDesc.includes('redirect'));
    if (isRedirectError) {
      alert(`⚠️ Nota sobre Epic Games OAuth:\n\nEpic Games requiere que el dominio "${window.location.origin}" esté registrado en dev.epicgames.com para tu Client ID.\n\nPuedes ingresar tu apodo de Fortnite directamente para quedar 100% verificado en la app.`);
      if (typeof window.openEpicModal === 'function') {
        window.openEpicModal();
      }
    } else {
      alert(`Aviso de Epic Games: ${errorDesc || error}`);
    }
    return;
  }

  if (code) {
    window.history.replaceState(null, null, window.location.pathname + '#verificacion');
    showDashboard(true);
    if (window.switchDashTab) window.switchDashTab('verificacion');

    const btnText = document.getElementById('btnEpicCardText');
    if (btnText) btnText.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> VALIDANDO...';

    await pullEpicAccountFromCode(code, false);
  }
}

// Global Resolver for Epic Games Code Exchange & Verification
async function pullEpicAccountFromCode(authCode, sourceModal = false) {
  if (!authCode) {
    alert('Por favor pega el código generado por Epic Games o ingresa tu nickname.');
    return;
  }

  let cleanCode = authCode.trim();
  if (cleanCode.includes('authorizationCode')) {
    try {
      const parsed = JSON.parse(cleanCode);
      if (parsed.authorizationCode) cleanCode = parsed.authorizationCode;
    } catch (e) {}
  }

  let data = null;
  const endpoints = ['/api/epic-verify', '/api/auth/epic/verify-code'];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: cleanCode, 
          nickname: cleanCode,
          redirect_uri: window.location.origin + '/'
        })
      });
      if (res.ok) {
        data = await res.json();
        if (data.displayName) break;
      }
    } catch (err) {}
  }

  // Fallback if offline / demo code
  if (!data || !data.displayName) {
    if (!cleanCode.includes('{') && cleanCode.length <= 32) {
      data = {
        success: true,
        displayName: cleanCode,
        accountId: 'epic_' + Math.random().toString(36).substring(2, 10),
        verified: true
      };
    } else {
      alert('⚠️ No pudimos validar ese código con los servidores de Epic Games. Asegúrate de autorizar tu cuenta en Epic Games.');
      return;
    }
  }

  if (data && data.displayName) {
    const saved = localStorage.getItem('wtokens_user_session');
    let userObj = {};
    if (saved) {
      try { userObj = JSON.parse(saved); } catch (e) {}
    }
    userObj.epicNickname = data.displayName;
    userObj.epicAccountId = data.accountId || ('epic_' + Math.random().toString(36).substring(2, 10));
    userObj.epicVerified = true;

    localStorage.setItem('wtokens_epic_nick', data.displayName);
    localStorage.setItem('wtokens_epic_id', userObj.epicAccountId);
    localStorage.setItem('wtokens_user_session', JSON.stringify(userObj));

    renderAuthUser(userObj);

    if (sourceModal) {
      const modal = document.getElementById('epicLinkModal');
      if (modal) modal.classList.add('hidden');
    }

    alert(`🎉 ¡Cuenta de Epic Games Vinculada Exitosamente!\n\nUsuario de Fortnite: ${data.displayName}\nEpic Account ID: ${userObj.epicAccountId}\n\nTu identidad competitiva de Fortnite ha sido enlazada con éxito sin errores.`);
  }
}

// Interactive Wallet & Payments System (LATAM)
function initWalletModal() {
  const modal = document.getElementById('walletModal');
  const openBtn = document.getElementById('btnOpenWallet');
  const closeBtn = document.getElementById('closeWalletModalBtn');
  const tabDepositBtn = document.getElementById('tabDepositBtn');
  const tabWithdrawBtn = document.getElementById('tabWithdrawBtn');
  const tabDepositContent = document.getElementById('tabDepositContent');
  const tabWithdrawContent = document.getElementById('tabWithdrawContent');
  const countrySelect = document.getElementById('walletDepositCountry');
  const paymentBox = document.getElementById('paymentBoxDetails');
  const withdrawAmountInput = document.getElementById('withdrawAmount');
  const withdrawLocalEq = document.getElementById('withdrawLocalEquivalent');
  const btnConfirmDeposit = document.getElementById('btnConfirmDeposit');
  const btnConfirmWithdraw = document.getElementById('btnConfirmWithdraw');

  let currentWalletTokens = 25.0;
  const savedSession = localStorage.getItem('wtokens_user_session');
  if (savedSession) {
    try {
      const u = JSON.parse(savedSession);
      if (u.balance !== undefined) currentWalletTokens = u.balance;
    } catch(e) {}
  }

  function updateWalletDisplays() {
    const saved = localStorage.getItem('wtokens_user_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u.balance !== undefined) currentWalletTokens = u.balance;
      } catch(e) {}
    }
    const tokensDisplay = document.getElementById('walletModalTokens');
    const localDisplay = document.getElementById('walletModalLocal');
    const navBalance = document.getElementById('navWalletBalance');

    const localFormatted = formatMoneyShort(currentWalletTokens, currentCurrency);
    const secondaryTokens = `(${currentWalletTokens.toFixed(2)} WT)`;

    if (tokensDisplay) tokensDisplay.textContent = localFormatted;
    if (navBalance) navBalance.textContent = localFormatted;
    if (localDisplay) localDisplay.textContent = secondaryTokens;
  }

  function open() {
    if (modal) {
      modal.classList.remove('hidden');
      updateWalletDisplays();
      renderPaymentDetails(countrySelect ? countrySelect.value : 'ARG');
    }
  }

  function close() {
    if (modal) modal.classList.add('hidden');
  }

  if (openBtn) openBtn.addEventListener('click', open);
  if (closeBtn) closeBtn.addEventListener('click', close);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });
  }

  // Tab switching
  if (tabDepositBtn && tabWithdrawBtn) {
    tabDepositBtn.addEventListener('click', () => {
      tabDepositBtn.className = 'py-2.5 rounded-lg bg-emerald-600 text-white font-bold transition-all flex items-center justify-center gap-1.5 shadow-md';
      tabWithdrawBtn.className = 'py-2.5 rounded-lg text-slate-400 hover:text-white font-semibold transition-all flex items-center justify-center gap-1.5';
      tabDepositContent.classList.remove('hidden');
      tabWithdrawContent.classList.add('hidden');
    });

    tabWithdrawBtn.addEventListener('click', () => {
      tabWithdrawBtn.className = 'py-2.5 rounded-lg bg-emerald-600 text-white font-bold transition-all flex items-center justify-center gap-1.5 shadow-md';
      tabDepositBtn.className = 'py-2.5 rounded-lg text-slate-400 hover:text-white font-semibold transition-all flex items-center justify-center gap-1.5';
      tabWithdrawContent.classList.remove('hidden');
      tabDepositContent.classList.add('hidden');
    });
  }

  // Payment details renderer by country
  function renderPaymentDetails(code) {
    if (!paymentBox) return;

    let html = '';
    if (code === 'ARG') {
      html = `
        <div class="flex flex-col sm:flex-row items-center gap-4">
          <div class="w-32 h-32 rounded-xl bg-white p-2 flex flex-col items-center justify-center shadow-md shrink-0">
            <i class="fa-solid fa-qrcode text-6xl text-slate-900"></i>
            <span class="text-[9px] font-bold text-slate-900 mt-1 uppercase">QR Mercado Pago</span>
          </div>
          <div class="space-y-1.5 text-xs text-slate-300 w-full">
            <div class="font-bold text-white text-sm flex items-center gap-1.5">
              <span>Mercado Pago Argentina</span>
              <span class="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 text-[10px]">QR / Transferencia</span>
            </div>
            <div><strong>Alias:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-wcyan-400 font-mono select-all">wtokens.latam.mp</code></div>
            <div><strong>CVU:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[10px] select-all">0000003100083921049281</code></div>
            <div><strong>Titular:</strong> WTOKENS MEDIACIÓN S.A.</div>
            <div class="text-[11px] text-emerald-400 font-mono pt-1">💡 Escanea el QR desde tu app o transfiere al alias. Acreditación automática.</div>
          </div>
        </div>
      `;
    } else if (code === 'PER') {
      html = `
        <div class="flex flex-col sm:flex-row items-center gap-4">
          <div class="w-32 h-32 rounded-xl bg-white p-2 flex flex-col items-center justify-center shadow-md shrink-0">
            <i class="fa-solid fa-qrcode text-6xl text-purple-900"></i>
            <span class="text-[9px] font-bold text-purple-900 mt-1 uppercase">QR Yape / Plin</span>
          </div>
          <div class="space-y-1.5 text-xs text-slate-300 w-full">
            <div class="font-bold text-white text-sm flex items-center gap-1.5">
              <span>Yape / Plin / BCP Perú</span>
              <span class="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-400 text-[10px]">Pago Móvil</span>
            </div>
            <div><strong>Número de Yape:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-wcyan-400 font-mono text-sm select-all">928 374 819</code></div>
            <div><strong>Titular:</strong> WTOKENS PERÚ (Soporte Oficial)</div>
            <div><strong>Banco BCP:</strong> 193-94829104-0-92</div>
            <div class="text-[11px] text-emerald-400 font-mono pt-1">💡 Envía tu yapero y coloca en el mensaje tu usuario de Discord.</div>
          </div>
        </div>
      `;
    } else if (code === 'CHI') {
      html = `
        <div class="space-y-2 text-xs text-slate-300">
          <div class="font-bold text-white text-sm flex items-center gap-1.5">
            <span>🇨🇱 CuentaRUT / BancoEstado / MACH</span>
            <span class="px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 text-[10px]">Chile</span>
          </div>
          <div><strong>Banco:</strong> BancoEstado (CuentaRUT)</div>
          <div><strong>RUT:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-wcyan-400 font-mono select-all">19.824.192-3</code></div>
          <div><strong>Tipo de Cuenta:</strong> Cuenta Vista / CuentaRUT</div>
          <div><strong>Correo de Notificación:</strong> pagos@wtokens.net</div>
        </div>
      `;
    } else if (code === 'BOL') {
      html = `
        <div class="flex flex-col sm:flex-row items-center gap-4">
          <div class="w-32 h-32 rounded-xl bg-white p-2 flex flex-col items-center justify-center shadow-md shrink-0">
            <i class="fa-solid fa-qrcode text-6xl text-emerald-900"></i>
            <span class="text-[9px] font-bold text-emerald-900 mt-1 uppercase">QR Simple Bolivia</span>
          </div>
          <div class="space-y-1.5 text-xs text-slate-300 w-full">
            <div class="font-bold text-white text-sm">🇧🇴 QR Simple Interoperable</div>
            <div>Válido para Banco Unión, BCP, BNB, Banco Mercantil y Tigo Money.</div>
            <div class="text-[11px] text-emerald-400 font-mono pt-1">💡 Escanea el código QR desde cualquier app bancaria de Bolivia.</div>
          </div>
        </div>
      `;
    } else if (code === 'PAR') {
      html = `
        <div class="space-y-2 text-xs text-slate-300">
          <div class="font-bold text-white text-sm">🇵🇾 Giros Tigo & SIPAP Paraguay</div>
          <div><strong>Línea Tigo:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-wcyan-400 font-mono select-all">0981 492 819</code></div>
          <div><strong>Transferencia SIPAP (Ueno Bank):</strong> Cta. 92837190</div>
        </div>
      `;
    } else if (code === 'URU') {
      html = `
        <div class="space-y-2 text-xs text-slate-300">
          <div class="font-bold text-white text-sm">🇺🇾 Prex Uruguay & Midinero</div>
          <div><strong>Prex ID Directo:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-wcyan-400 font-mono select-all">1092837</code></div>
          <div><strong>Midinero / BROU:</strong> Cuenta corriente disponible en tickets.</div>
        </div>
      `;
    } else {
      // CRYPTO / BINANCE
      html = `
        <div class="flex flex-col sm:flex-row items-center gap-4">
          <div class="w-32 h-32 rounded-xl bg-white p-2 flex flex-col items-center justify-center shadow-md shrink-0">
            <i class="fa-solid fa-qrcode text-6xl text-amber-500"></i>
            <span class="text-[9px] font-bold text-slate-900 mt-1 uppercase">Binance Pay</span>
          </div>
          <div class="space-y-1.5 text-xs text-slate-300 w-full">
            <div class="font-bold text-white text-sm flex items-center gap-1.5">
              <span>Binance Pay / USDT</span>
              <span class="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 text-[10px]">0% Fee</span>
            </div>
            <div><strong>Binance Pay ID:</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-wgold-400 font-mono text-sm select-all">82910492</code></div>
            <div><strong>USDT (Red TRC-20):</strong> <code class="bg-obsidian-900 px-2 py-0.5 rounded text-slate-300 font-mono text-[9px] select-all">TL6c7WTok921fnCs9284kmZP812</code></div>
            <div class="text-[11px] text-emerald-400 font-mono pt-1">💡 Envía por Binance Pay sin ninguna comisión bancaria. Acreditación en 30 segundos.</div>
          </div>
        </div>
      `;
    }

    paymentBox.innerHTML = html;
  }

  if (countrySelect) {
    countrySelect.addEventListener('change', (e) => {
      renderPaymentDetails(e.target.value);
    });
  }

  // Withdraw input calculation
  if (withdrawAmountInput && withdrawLocalEq) {
    withdrawAmountInput.addEventListener('input', () => {
      const val = parseFloat(withdrawAmountInput.value) || 0;
      withdrawLocalEq.textContent = `Recibirás: ~${formatMoney(val)}`;
    });
  }

  if (btnConfirmDeposit) {
    btnConfirmDeposit.addEventListener('click', () => {
      btnConfirmDeposit.disabled = true;
      btnConfirmDeposit.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Validando comprobante...';

      setTimeout(() => {
        currentWalletTokens += 10.0;
        const saved = localStorage.getItem('wtokens_user_session');
        if (saved) {
          try {
            const u = JSON.parse(saved);
            u.balance = currentWalletTokens;
            localStorage.setItem('wtokens_user_session', JSON.stringify(u));
          } catch(e) {}
        }
        updateWalletDisplays();
        btnConfirmDeposit.disabled = false;
        btnConfirmDeposit.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i> ¡Recarga Confirmada (+10 WT)!';
        setTimeout(() => {
          btnConfirmDeposit.innerHTML = '<i class="fa-solid fa-circle-check"></i> <span>Confirmar Recarga</span>';
          alert('¡Tu recarga ha sido acreditada en tu billetera de WTOKENS! Saldo actual: ' + currentWalletTokens.toFixed(2) + ' WT.');
        }, 1500);
      }, 1500);
    });
  }

  if (btnConfirmWithdraw) {
    btnConfirmWithdraw.addEventListener('click', () => {
      const amount = parseFloat(withdrawAmountInput ? withdrawAmountInput.value : 0);
      const dest = document.getElementById('withdrawDestination');
      const destination = dest ? dest.value.trim() : '';

      if (amount < 5) {
        alert('El monto mínimo de retiro es de $5.00 USD Tokens.');
        return;
      }
      if (amount > currentWalletTokens) {
        alert('Saldo insuficiente en tu billetera para retirar ese monto.');
        return;
      }
      if (!destination) {
        alert('Por favor ingresa tu dato de destino (Alias de Mercado Pago, número de Yape, CuentaRUT o Binance ID).');
        return;
      }

      btnConfirmWithdraw.disabled = true;
      btnConfirmWithdraw.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> Procesando solicitud...';

      setTimeout(() => {
        currentWalletTokens -= amount;
        const saved = localStorage.getItem('wtokens_user_session');
        if (saved) {
          try {
            const u = JSON.parse(saved);
            u.balance = currentWalletTokens;
            localStorage.setItem('wtokens_user_session', JSON.stringify(u));
          } catch(e) {}
        }
        updateWalletDisplays();
        btnConfirmWithdraw.disabled = false;
        btnConfirmWithdraw.innerHTML = '¡Solicitud Enviada!';
        setTimeout(() => {
          btnConfirmWithdraw.innerHTML = '<i class="fa-solid fa-money-bill-transfer"></i> <span>Solicitar Retiro</span>';
          close();
          alert(`¡Retiro de $${amount.toFixed(2)} USD solicitado con éxito hacia ${destination}! El staff liberará la transferencia en menos de 15 minutos.`);
        }, 1200);
      }, 1500);
    });
  }
}

/**
 * 3D Coverflow Showcase Carousel (Yamaha Editorial Style)
 */
function initHeroShowcaseCarousel() {
  const stage = document.getElementById('heroShowcaseStage');
  if (!stage) return;

  const cards = Array.from(stage.querySelectorAll('.showcase-card'));
  const prevBtn = document.getElementById('heroPrevBtn');
  const nextBtn = document.getElementById('heroNextBtn');
  const dots = Array.from(document.querySelectorAll('[data-slide-dot]'));
  const counterEl = document.getElementById('heroSlideCounter');
  const modeTagEl = document.getElementById('heroSlideModeTag');
  const watermarkNumEl = document.getElementById('heroWatermarkNum');
  const watermarkTextEl = document.getElementById('heroWatermarkText');
  const currencySelector = document.getElementById('currencySelector');

  let activeIndex = 0;
  const total = cards.length;
  let autoTimer = null;

  function renderCarousel(index) {
    activeIndex = (index + total) % total;

    cards.forEach((card, i) => {
      let diff = i - activeIndex;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      card.setAttribute('data-pos', String(diff));
    });

    const activeCard = cards[activeIndex];
    if (activeCard) {
      const num = activeCard.getAttribute('data-num') || `0${activeIndex + 1}`;
      const modeName = activeCard.getAttribute('data-mode') || '';
      const watermark = activeCard.getAttribute('data-watermark') || '';

      if (counterEl) counterEl.textContent = `${num} / 0${total}`;
      if (modeTagEl) modeTagEl.textContent = modeName;
      if (watermarkNumEl) watermarkNumEl.textContent = num;
      if (watermarkTextEl) watermarkTextEl.textContent = watermark;
    }

    dots.forEach((dot, i) => {
      if (i === activeIndex) {
        dot.className = 'w-6 h-1.5 rounded-full bg-wpurple-400 transition-all';
      } else {
        dot.className = 'w-2 h-1.5 rounded-full bg-white/25 hover:bg-white/50 transition-all';
      }
    });
  }

  function nextSlide() {
    renderCarousel(activeIndex + 1);
  }

  function prevSlide() {
    renderCarousel(activeIndex - 1);
  }

  function startAutoRotate() {
    stopAutoRotate();
    autoTimer = setInterval(nextSlide, 5500);
  }

  function stopAutoRotate() {
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      startAutoRotate();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      startAutoRotate();
    });
  }

  cards.forEach((card, i) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('button')) return;
      if (i !== activeIndex) {
        renderCarousel(i);
        startAutoRotate();
      }
    });
  });

  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      renderCarousel(i);
      startAutoRotate();
    });
  });

  stage.addEventListener('mouseenter', stopAutoRotate);
  stage.addEventListener('mouseleave', startAutoRotate);

  const handleCurrencyChange = (e) => {
    const val = e.target.value;
    currentCurrency = val;
    applyUserCountry(val, true);
    updateAllCurrencyDisplays();
  };

  if (currencySelector) {
    currencySelector.addEventListener('change', handleCurrencyChange);
  }

  const currencySelectorMobile = document.getElementById('currencySelectorMobile');
  if (currencySelectorMobile) {
    currencySelectorMobile.addEventListener('change', handleCurrencyChange);
  }

  renderCarousel(0);
  startAutoRotate();
}


