import { mergeTemplate } from "./dto/agreement-template.dto";

describe("mergeTemplate", () => {
  it("substitutes known placeholders", () => {
    const out = mergeTemplate(
      "Buyer {{buyerName}} unit {{unitNumber}}",
      { buyerName: "Rahul", unitNumber: "A-101" },
    );
    expect(out).toBe("Buyer Rahul unit A-101");
  });

  it("leaves unknown placeholders intact", () => {
    expect(mergeTemplate("Hi {{unknown}}", {})).toBe("Hi {{unknown}}");
  });
});
