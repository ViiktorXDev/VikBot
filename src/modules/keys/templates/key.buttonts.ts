import { InlineKeyboard } from "grammy";

const text = encodeURIComponent(
  "Olá Viiktor, eu quero ter acesso ao bot no telegram, como posso adquirir minha key de acesso?",
);
export const acquireKey = new InlineKeyboard().url(
  "Adquirir key",
  `https://wa.me/+558291506383?text=${text}`,
);
