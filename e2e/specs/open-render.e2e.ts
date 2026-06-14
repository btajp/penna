// e2e/specs/open-render.e2e.ts
// OPTIONAL stretch スモーク。v0.1 では skip。tauri-driver 環境が整い次第 .skip を外す。
describe("penna smoke (stretch)", () => {
  it.skip("opens a markdown file and renders the heading", async () => {
    // 起動引数 or window_path 経由で開いた文書の本文が描画されることを確認する。
    const body = await $("#content");
    await expect(body).toHaveTextContaining("Hello");
  });

  it.skip("toggles theme to dark via the settings panel control", async () => {
    const root = await $("html");
    // 設定パネルの theme コントロール（settingsPanel.ts の data-field="theme"）を駆動する。
    const themeSelect = await $('#settings [data-field="theme"]');
    await themeSelect.selectByAttribute("value", "dark");
    // ネイティブの change が発火しない環境向けに明示的に dispatch する。
    await browser.execute(() => {
      const el = document.querySelector('#settings [data-field="theme"]') as HTMLSelectElement;
      el.value = "dark";
      el.dispatchEvent(new Event("change"));
    });
    await expect(root).toHaveAttribute("data-theme", "dark");
  });

  it.skip("opens the find bar with Cmd/Ctrl+F", async () => {
    await browser.keys(process.platform === "darwin" ? ["Meta", "f"] : ["Control", "f"]);
    const findBar = await $("#findbar");
    await expect(findBar).toBeDisplayed();
  });
});
