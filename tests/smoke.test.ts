describe("toolchain smoke", () => {
  it("runs vitest in a jsdom environment", () => {
    const el = document.createElement("div");
    el.textContent = "penna";
    expect(el.textContent).toBe("penna");
  });
});
