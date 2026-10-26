export const BELO_PIX_CHECKOUT_LINKS: Record<number, { url: string; ars: number; brl: number }> = {
  2: {
    url: "https://pay.belo.app/checkout?id=6adfddc87b8023aaeb348f6f",
    ars: 2300,
    brl: 11.2,
  },
  3: {
    url: "https://pay.belo.app/checkout?id=6adfde2c85bf343dc849b6fe",
    ars: 3450,
    brl: 16.8,
  },
  5: {
    url: "https://pay.belo.app/checkout?id=6adfde8d7b8023aaeb353576",
    ars: 5750,
    brl: 28.0,
  },
  10: {
    url: "https://pay.belo.app/checkout?id=6adfded6b8432c946b5fd4aa",
    ars: 11500,
    brl: 56.0,
  },
  20: {
    url: "https://pay.belo.app/checkout?id=6adfdf2f583f2b3a61748298",
    ars: 23000,
    brl: 112.0,
  },
};

export interface PaymentAccount {
  id: string;
  name: string;
  badge: string;
  category: "mercadopago" | "lemon" | "belo" | "binance" | "paypal";
  description: string;
  recommendedFor: string[];
  currencies: string[];
  alias?: string;
  tag?: string;
  cvu?: string;
  binanceId?: string;
  url?: string;
  note?: string;
  feeNote?: string;
}

export const OFFICIAL_PAYMENT_ACCOUNTS: PaymentAccount[] = [
  {
    id: "mercadopago",
    name: "Mercado Pago",
    category: "mercadopago",
    badge: "🇦🇷 Argentina",
    description: "Transferencia instantánea en pesos argentinos ($ARS) sin comisiones bancarias.",
    recommendedFor: ["Argentina"],
    currencies: ["ARS"],
    alias: "gus.wtokens",
    note: "Envía desde Mercado Pago, Ualá o cualquier banco o billetera virtual de Argentina.",
  },
  {
    id: "binance",
    name: "Binance Pay",
    category: "binance",
    badge: "🟡 Cero Comisiones (Latam)",
    description: "Transferencia instantánea en USDT sin comisiones entre usuarios de Binance.",
    recommendedFor: ["Perú", "Chile", "Bolivia", "Uruguay", "Paraguay", "Brasil", "Argentina", "Internacional"],
    currencies: ["USD", "PEN", "CLP", "ARS", "BRL"],
    binanceId: "1045450722",
    note: "En la app de Binance ve a Pay ➔ Enviar y pega el Pay ID: 1045450722. Transfiere en USDT (1 USDT = 1 WT).",
  },
  {
    id: "lemon",
    name: "Lemon Cash",
    category: "lemon",
    badge: "🍋 $lemontag & CVU",
    description: "Transferencia instantánea en pesos argentinos o cripto por Lemon.",
    recommendedFor: ["Argentina", "Perú"],
    currencies: ["ARS", "USD"],
    tag: "$wtokens",
    alias: "Wtokens",
    cvu: "0000168300000029248788",
    note: "Si usas la app de Lemon, envía directo a $wtokens al instante.",
  },
  {
    id: "belo",
    name: "Belo & Pix (Brasil)",
    category: "belo",
    badge: "🇧🇷 Pix & Latam",
    description: "Recibe Pix desde Brasil y transferencias entre usuarios de Belo en toda Latinoamérica.",
    recommendedFor: ["Brasil", "Perú", "Chile", "Uruguay", "Paraguay", "Bolivia", "Argentina"],
    currencies: ["BRL", "ARS", "USD"],
    tag: "$wtokens",
    alias: "wtokenss",
    cvu: "0000139300000019268787",
    note: "Para Brasil: Transfiere vía Pix usando tu banco local. Para otros países: envía directo a $wtokens en Belo.",
  },
  {
    id: "paypal",
    name: "PayPal Internacional",
    category: "paypal",
    badge: "🌎 Tarjetas & Global",
    description: "Paga con cualquier tarjeta de débito/crédito internacional (Visa, Mastercard) o saldo PayPal.",
    recommendedFor: ["Perú", "Chile", "Uruguay", "Paraguay", "Bolivia", "Internacional"],
    currencies: ["USD", "PEN", "CLP", "UYU", "BRL"],
    url: "https://paypal.me/GRojasTissera",
    feeNote: "PayPal aplica una tarifa por transacción internacional de aprox. 5.4% + $0.30 USD.",
    note: "Al pagar en PayPal.me, ingresa el monto neto calculado para que tus WTokens se acrediten sin faltantes.",
  },
];
