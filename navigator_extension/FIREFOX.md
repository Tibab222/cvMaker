# Installing the extension permanently in Firefox

Regular Firefox only keeps extensions signed by Mozilla. Signing it as **unlisted** is free and automatic. The extension stays private, and you get an `.xpi` file to install.

## One-time setup

1. Create a developer account on [addons.mozilla.org](https://addons.mozilla.org/developers/).
2. Generate API keys at [Manage API Keys](https://addons.mozilla.org/developers/addon/api/key/). Keep them private.

## Sign and install

From `navigator_extension`, in PowerShell:

```powershell
$env:WEB_EXT_API_KEY = "user:xxxx"; $env:WEB_EXT_API_SECRET = "xxxx"
```

```powershell
npm run lint:firefox
```

```powershell
npm run sign:firefox
```

The signed file lands in `dist/signed/`. In Firefox, go to `about:addons`, click the gear icon, choose **Install Add-on From File…** and pick the `.xpi`.

## Updating

1. Bump `version` in `platforms/firefox/manifest.json` (for example 1.2.0 to 1.2.1). Mozilla won't sign the same version twice.
2. Run `npm run sign:firefox` again.
3. Install the new `.xpi`.

## Notes

- If autofill doesn't trigger, check the extension's **Permissions** tab and allow access to all websites.
- Mozilla may ask for the source code later. Point them to this repository.
- Without a Mozilla account, Firefox Developer Edition or Nightly can run unsigned builds: set `xpinstall.signatures.required` to `false` in `about:config`. Regular Firefox can't.
