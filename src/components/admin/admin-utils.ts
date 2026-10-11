// Pure helpers of the admin page (tested in admin-utils.test.ts).

/** Digits for a tel: link. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, "")}`;

/** WhatsApp link: Algerian 0XXXXXXXXX → 213XXXXXXXXX; +213 / 00213 kept as 213…; other numbers as typed (digits). */
export function waHref(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (/^0\d{9}$/.test(d)) d = `213${d.slice(1)}`;
  return `https://wa.me/${d}`;
}

/**
 * One CSV field: always quoted, inner quotes doubled. Text that a spreadsheet would run as a formula
 * (=, @, or + / - not followed by a digit, as in a phone number) gets a leading apostrophe.
 */
export function csvField(v: string): string {
  const safe = /^[=@\t\r]|^[+-](?!\d)/.test(v) ? `'${v}` : v;
  return `"${safe.replace(/"/g, '""')}"`;
}

/** A whole CSV file: UTF-8 BOM (so Excel reads Arabic), header row, CRLF line ends. */
export function toCsv(head: string[], rows: string[][]): string {
  return `﻿${[head, ...rows].map((r) => r.map(csvField).join(",")).join("\r\n")}\r\n`;
}
