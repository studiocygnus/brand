import { expect, test } from "bun:test";
import company from "./company.json" with { type: "json" };

test("every translated field has each language and no other", () => {
  const translated = [
    company.descriptor,
    company.tagline,
    company.about,
    company.credit,
    company.notice,
  ];
  for (const field of translated) {
    expect(Object.keys(field)).toEqual(company.languages);
    for (const text of Object.values(field)) expect(text).not.toBe("");
  }
  expect(company.languages[0]).toBe("en");
});

test("the website is the bare domain over https", () => {
  expect(company.website).toMatch(/^https:\/\/(?!www\.)[a-z0-9.-]+$/);
});

test("every address is at the website's domain", () => {
  const domain = new URL(company.website).hostname;
  for (const address of Object.values(company.email)) {
    expect(address).toEndWith(`@${domain}`);
  }
});

test("no address or registration details are published", () => {
  const text = JSON.stringify(company);
  expect(text).not.toMatch(/Arad/i);
  // Registration numbers: the CUI, the VAT number and the trade register number.
  expect(text).not.toMatch(/\d{6,}|\bRO\d|\bJ\d{2}/);
});
