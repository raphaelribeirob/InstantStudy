type GoogleDriveSelection = {
  fileId: string;
  name: string;
  mimeType?: string;
  accessToken: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GooglePickerData = {
  action?: string;
  docs?: Array<{
    id?: string;
    name?: string;
    mimeType?: string;
  }>;
};

function env(name: string) {
  return String((import.meta.env as Record<string, unknown>)[name] ?? "").trim();
}

function loadScript(src: string, id: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null;
    if (existing?.dataset.loaded === "true") {
      resolve();
      return;
    }

    const script = existing ?? document.createElement("script");
    script.id = id;
    script.async = true;
    script.defer = true;
    script.src = src;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error("google_drive_script_failed"));
    if (!existing) document.head.appendChild(script);
  });
}

async function googleRuntime() {
  await Promise.all([
    loadScript("https://accounts.google.com/gsi/client", "google-identity-services"),
    loadScript("https://apis.google.com/js/api.js", "google-api-loader"),
  ]);

  const runtime = window as Window & {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient?: (input: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => { requestAccessToken: (input?: { prompt?: string }) => void };
        };
      };
      picker?: {
        Action?: { PICKED?: string; CANCEL?: string };
        ViewId?: { DOCS?: string };
        PickerBuilder?: new () => {
          addView: (view: string) => unknown;
          setOAuthToken: (token: string) => unknown;
          setDeveloperKey: (key: string) => unknown;
          setAppId: (appId: string) => unknown;
          setCallback: (callback: (data: GooglePickerData) => void) => unknown;
          build: () => { setVisible: (visible: boolean) => void };
        };
      };
    };
    gapi?: {
      load?: (
        name: string,
        options: { callback: () => void; onerror?: () => void },
      ) => void;
    };
  };

  if (!runtime.gapi?.load || !runtime.google?.accounts?.oauth2?.initTokenClient) {
    throw new Error("google_drive_runtime_unavailable");
  }

  await new Promise<void>((resolve, reject) => {
    runtime.gapi!.load!("picker", {
      callback: resolve,
      onerror: () => reject(new Error("google_picker_load_failed")),
    });
  });

  if (!runtime.google?.picker?.PickerBuilder || !runtime.google.picker.ViewId?.DOCS) {
    throw new Error("google_picker_unavailable");
  }

  return runtime.google;
}

export function googleDrivePrivateConfigured() {
  return Boolean(
    env("VITE_GOOGLE_DRIVE_CLIENT_ID") &&
      env("VITE_GOOGLE_DRIVE_API_KEY") &&
      env("VITE_GOOGLE_DRIVE_APP_ID"),
  );
}

export async function pickPrivateGoogleDriveFile(): Promise<GoogleDriveSelection> {
  const clientId = env("VITE_GOOGLE_DRIVE_CLIENT_ID");
  const apiKey = env("VITE_GOOGLE_DRIVE_API_KEY");
  const appId = env("VITE_GOOGLE_DRIVE_APP_ID");
  if (!clientId || !apiKey || !appId) {
    throw new Error("google_drive_not_configured");
  }

  const google = await googleRuntime();

  return new Promise<GoogleDriveSelection>((resolve, reject) => {
    const tokenClient = google.accounts!.oauth2!.initTokenClient!({
      client_id: clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: (response) => {
        const accessToken = String(response.access_token || "");
        if (!accessToken) {
          reject(new Error(response.error || "google_drive_authorization_failed"));
          return;
        }

        const builder = new google.picker!.PickerBuilder!();
        builder.addView(google.picker!.ViewId!.DOCS!);
        builder.setOAuthToken(accessToken);
        builder.setDeveloperKey(apiKey);
        builder.setAppId(appId);
        builder.setCallback((data) => {
          const action = String(data.action || "");
          if (action === String(google.picker!.Action?.CANCEL || "cancel")) {
            reject(new Error("google_drive_picker_cancelled"));
            return;
          }
          if (action !== String(google.picker!.Action?.PICKED || "picked")) return;

          const doc = data.docs?.[0];
          const fileId = String(doc?.id || "");
          if (!fileId) {
            reject(new Error("google_drive_file_missing"));
            return;
          }

          resolve({
            fileId,
            name: String(doc?.name || "Google Drive file"),
            mimeType: doc?.mimeType ? String(doc.mimeType) : undefined,
            accessToken,
          });
        });
        builder.build().setVisible(true);
      },
    });

    tokenClient.requestAccessToken({ prompt: "" });
  });
}
