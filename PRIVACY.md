# Privacy Policy – Dirwise

**English** · [Čeština](#zásady-ochrany-osobních-údajů--dirwise)

*Last updated: 16 October 2026* · Also on the web: <https://krystof2-ops.github.io/dirwise/privacy/>

Dirwise is a file manager that runs entirely on your computer. It does not collect, store or send any personal data.

- **No telemetry, no analytics, no crash reporting, no accounts, no ads.**
- **Your files stay on your computer.** Dirwise reads and changes files only when you ask it to (open, copy, move, rename, delete).
- **Local data only.** Settings (favorites, recents, tags, tabs, appearance) are saved in a `settings.json` file in your user profile. Thumbnails (deleted after 30 days) and file icons are cached in your user profile. Nothing of this is sent anywhere. Uninstalling the Microsoft Store version removes this data; for the version from GitHub you can delete it yourself (`%APPDATA%\com.krystof2ops.finderwin`, `%LOCALAPPDATA%\dirwise` and `%LOCALAPPDATA%\com.krystof2ops.finderwin`).
- **Network:**
  - In the **Microsoft Store version, Dirwise itself makes no network requests.** Updates are delivered by the Microsoft Store. The Microsoft Edge WebView2 component that Dirwise uses to draw its window is part of Windows and is updated by Microsoft under Microsoft's own privacy statement.
  - The version downloaded from GitHub checks for a new version at most once a day with a single request to `https://api.github.com/repos/krystof2-ops/dirwise/releases/latest`. The request contains no information about you or your files (GitHub sees your IP address, as with any web request). The check can be turned off in More → Check for Updates.
- **Other apps.** When you choose *Open*, *Open with…*, *Open in Terminal* or *Open in Explorer*, the file or folder is handed over to that app; what it does is governed by its own privacy policy.

Questions: open an issue at <https://github.com/krystof2-ops/dirwise/issues>.

---

# Zásady ochrany osobních údajů – Dirwise

[English](#privacy-policy--dirwise) · **Čeština**

*Poslední změna: 16. října 2026* · Také na webu: <https://krystof2-ops.github.io/dirwise/cs/privacy/>

Dirwise je správce souborů, který běží celý ve tvém počítači. Nesbírá, neukládá ani neodesílá žádné osobní údaje.

- **Žádná telemetrie, analytika, hlášení pádů, účty ani reklamy.**
- **Tvoje soubory zůstávají v počítači.** Dirwise soubory čte a mění jen na tvůj pokyn (otevřít, kopírovat, přesunout, přejmenovat, smazat).
- **Jen lokální data.** Nastavení (oblíbené, nedávné, štítky, záložky, vzhled) se ukládá do souboru `settings.json` v uživatelském profilu. Náhledy (mažou se po 30 dnech) a ikony souborů se cachují v uživatelském profilu. Nic z toho se nikam neodesílá. Odinstalace verze z Microsoft Storu tato data odstraní; u verze z GitHubu je můžeš smazat sám (`%APPDATA%\com.krystof2ops.finderwin`, `%LOCALAPPDATA%\dirwise` a `%LOCALAPPDATA%\com.krystof2ops.finderwin`).
- **Síť:**
  - **Ve verzi z Microsoft Storu nedělá Dirwise sám žádné síťové požadavky.** Aktualizace doručuje Microsoft Store. Komponentu Microsoft Edge WebView2, kterou Dirwise používá k vykreslení okna, dodává a aktualizuje Microsoft podle svých vlastních zásad.
  - Verze stažená z GitHubu se nejvýš jednou denně jedním požadavkem na `https://api.github.com/repos/krystof2-ops/dirwise/releases/latest` zeptá, jestli existuje nová verze. Požadavek neobsahuje nic o tobě ani o tvých souborech (GitHub vidí tvou IP adresu jako u každého požadavku na web). Kontrolu jde vypnout v Více → Kontrolovat aktualizace.
- **Jiné aplikace.** Když zvolíš *Otevřít*, *Otevřít v aplikaci…*, *Otevřít v terminálu* nebo *Otevřít v Průzkumníku*, soubor či složka se předá té aplikaci; co s ním udělá, řídí její vlastní zásady.

Dotazy: založ issue na <https://github.com/krystof2-ops/dirwise/issues>.
