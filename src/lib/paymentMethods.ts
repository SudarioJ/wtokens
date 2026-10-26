export interface PaymentAccount {
  id: string;
  name: string;
  badge: string;
  category: "mercadopago" | "lemon" | "belo" | "paypal";
  description: string;
  recommendedFor: string[];
  currencies: string[];
  alias?: string;
  tag?: string;
  cvu?: string;
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
