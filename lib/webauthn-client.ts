"use client";

// Utility helpers for base64url <-> ArrayBuffer
function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function detectDeviceName(): string {
  if (typeof window === "undefined") return "Admin Device";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone Face ID / Touch ID";
  if (/Macintosh/i.test(ua)) return "Mac Touch ID";
  if (/Android/i.test(ua)) return "Android Fingerprint / Face Unlock";
  if (/Windows/i.test(ua)) return "Windows Hello";
  return "Biometric Authenticator";
}

export function getValidRpId(): string {
  if (typeof window === "undefined") return "localhost";
  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return hostname;
  if (hostname.endsWith(".vercel.app")) return hostname;
  const parts = hostname.split(".");
  if (parts.length > 2) {
    return parts.slice(-2).join(".");
  }
  return hostname;
}

/**
 * Checks if the user's current device and browser support platform biometrics
 * (Touch ID, Face ID, Windows Hello, Android Fingerprint)
 */
export async function isBiometricsSupported(): Promise<boolean> {
  if (typeof window === "undefined" || !window.PublicKeyCredential) {
    return false;
  }

  try {
    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return Boolean(available);
    }
  } catch (_) {}

  return false;
}

/**
 * Prompts the user's device to enroll Face ID / Fingerprint / Touch ID
 */
export async function registerBiometricPasskey(
  adminEmail = "admin@bundlemartgh.com",
  adminPassword?: string,
  customDeviceName?: string
): Promise<{
  success: boolean;
  token?: string;
  email?: string;
  credentialId?: string;
  message: string;
}> {
  if (!(await isBiometricsSupported())) {
    throw new Error("Your current browser or device does not support biometric authentication.");
  }

  // 1. Get server registration challenge
  const res = await fetch("/api/admin/biometrics/challenge?type=register");
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.challenge) {
    const errorMsg = data.message || data.error || `Failed to initiate biometric registration (HTTP ${res.status}).`;
    throw new Error(errorMsg);
  }

  const challengeBuffer = base64urlToBuffer(data.challenge);
  const userIdBuffer = new TextEncoder().encode(adminEmail);
  const deviceName = customDeviceName || detectDeviceName();

  const validRpId = getValidRpId();

  // 2. Request native platform authenticator creation (Apple Face ID / Android Fingerprint / Windows Hello)
  let credential: PublicKeyCredential | null = null;
  const pubKeyConfig = {
    challenge: challengeBuffer,
    rp: {
      name: "BundleMartGh Admin Portal",
      id: validRpId,
    },
    user: {
      id: userIdBuffer,
      name: adminEmail,
      displayName: `BundleMartGh Admin (${adminEmail})`,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" as const }, // ES256 (Apple Face ID, Touch ID & Android)
      { alg: -257, type: "public-key" as const }, // RS256 (Windows Hello)
      { alg: -8, type: "public-key" as const }, // Ed25519
      { alg: -37, type: "public-key" as const }, // PS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform" as AuthenticatorAttachment, // Native built-in sensor (Face ID / Fingerprint / Windows Hello)
      userVerification: "preferred" as UserVerificationRequirement,
      residentKey: "preferred" as ResidentKeyRequirement,
    },
    timeout: 60000,
    attestation: "none" as AttestationConveyancePreference,
  };

  try {
    credential = (await navigator.credentials.create({
      publicKey: pubKeyConfig,
    })) as PublicKeyCredential | null;
  } catch (err: any) {
    if (validRpId !== window.location.hostname && (err?.name === "SecurityError" || err?.name === "NotSupportedError")) {
      credential = (await navigator.credentials.create({
        publicKey: {
          ...pubKeyConfig,
          rp: { ...pubKeyConfig.rp, id: window.location.hostname },
        },
      })) as PublicKeyCredential | null;
    } else {
      throw err;
    }
  }

  if (!credential) {
    throw new Error("Biometric enrollment was cancelled by device.");
  }

  const credentialId = bufferToBase64url(credential.rawId);

  // 3. Send enrolled credential to server (authenticated via session or password)
  const regRes = await fetch("/api/admin/biometrics/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      credentialId,
      deviceName,
      challenge: data.challenge,
      email: adminEmail,
      password: adminPassword || undefined,
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(regData.message || "Failed to save biometric key.");
  }

  if (regData.token) {
    localStorage.setItem("bundlemart_admin_auth", regData.token);
  }
  localStorage.setItem("bmgh_biometric_device_registered", "true");
  localStorage.setItem("bmgh_biometric_last_id", credentialId);
  localStorage.removeItem("bmgh_biometric_disabled");

  return {
    success: true,
    token: regData.token,
    email: regData.email,
    credentialId,
    message: regData.message || `Biometrics (${deviceName}) enrolled successfully!`,
  };
}

/**
 * Prompts user for Touch ID / Face ID / Fingerprint to log into the Admin portal
 */
export async function loginWithBiometrics(): Promise<{
  success: boolean;
  token?: string;
  email?: string;
  deviceName?: string;
  message?: string;
}> {
  if (!(await isBiometricsSupported())) {
    throw new Error("Biometrics are not supported on this browser or device.");
  }

  // 1. Get authentication challenge and allowCredentials for this host
  const res = await fetch("/api/admin/biometrics/challenge?type=auth");
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.challenge) {
    const errorMsg = data.message || data.error || (res.status === 401 ? "Unauthorized. Please sign in with your password first." : `Failed to initiate biometric sign-in challenge (HTTP ${res.status}).`);
    throw new Error(errorMsg);
  }

  const challengeBuffer = base64urlToBuffer(data.challenge);

  // 2. Build allowCredentials without restrictive transport filters so Windows Hello, Touch ID & Android sensors match smoothly
  const localCredId = typeof window !== "undefined" ? localStorage.getItem("bmgh_biometric_last_id") : null;
  const credSet = new Set<string>();

  if (localCredId) {
    credSet.add(localCredId);
  }

  if (Array.isArray(data.allowCredentials)) {
    for (const c of data.allowCredentials) {
      if (c?.id) {
        credSet.add(c.id);
      }
    }
  }

  const allowCredentials = credSet.size > 0
    ? Array.from(credSet).map((id) => ({
        id: base64urlToBuffer(id),
        type: "public-key" as const,
      }))
    : undefined;

  const validRpId = getValidRpId();

  // 3. Prompt native Apple Face ID / Android Fingerprint / Windows Hello
  let credential: PublicKeyCredential | null = null;
  try {
    credential = (await navigator.credentials.get({
      publicKey: {
        challenge: challengeBuffer,
        rpId: validRpId,
        allowCredentials,
        userVerification: "preferred", // Seamless biometric scan across Windows Hello & mobile
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
  } catch (err: any) {
    // If apex rpId had domain permission issue, fallback to exact window.location.hostname
    if (validRpId !== window.location.hostname && (err?.name === "SecurityError" || err?.name === "NotSupportedError")) {
      credential = (await navigator.credentials.get({
        publicKey: {
          challenge: challengeBuffer,
          rpId: window.location.hostname,
          allowCredentials,
          userVerification: "preferred",
          timeout: 60000,
        },
      })) as PublicKeyCredential | null;
    } else {
      throw err;
    }
  }

  if (!credential) {
    throw new Error("Biometric sign-in was cancelled or timed out.");
  }

  const credentialId = bufferToBase64url(credential.rawId);

  // 4. Verify on server
  const verifyRes = await fetch("/api/admin/biometrics/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      credentialId,
      challenge: data.challenge,
    }),
  });

  const verifyData = await verifyRes.json();
  if (!verifyRes.ok || !verifyData.success) {
    throw new Error(verifyData.message || "Biometric verification failed.");
  }

  localStorage.setItem("bundlemart_admin_auth", verifyData.token || "authenticated");
  localStorage.setItem("bmgh_biometric_device_registered", "true");
  localStorage.setItem("bmgh_biometric_last_id", credentialId);
  localStorage.removeItem("bmgh_biometric_disabled");

  return {
    success: true,
    token: verifyData.token,
    email: verifyData.email,
    deviceName: verifyData.deviceName,
    message: verifyData.message,
  };
}

/**
 * Disables biometric prompt on this device (reverts to password-only)
 */
export function disableBiometricsOnThisDevice(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("bmgh_biometric_device_registered");
    localStorage.removeItem("bmgh_biometric_last_id");
    localStorage.setItem("bmgh_biometric_disabled", "true");
  }
}

