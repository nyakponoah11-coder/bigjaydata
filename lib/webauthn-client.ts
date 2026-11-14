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
  customDeviceName?: string
): Promise<{ success: boolean; message: string }> {
  if (!(await isBiometricsSupported())) {
    throw new Error("Your current browser or device does not support biometric authentication.");
  }

  // 1. Get server registration challenge
  const res = await fetch("/api/admin/biometrics/challenge?type=register");
  const data = await res.json();
  if (!res.ok || !data.challenge) {
    throw new Error(data.message || "Failed to initiate biometric registration.");
  }

  const challengeBuffer = base64urlToBuffer(data.challenge);
  const userIdBuffer = new TextEncoder().encode(adminEmail);
  const deviceName = customDeviceName || detectDeviceName();

  // 2. Request platform authenticator creation (Face ID / Fingerprint)
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: challengeBuffer,
      rp: {
        name: "BundleMartGh Admin Portal",
        id: window.location.hostname,
      },
      user: {
        id: userIdBuffer,
        name: adminEmail,
        displayName: `BundleMartGh Admin (${adminEmail})`,
      },
      pubKeyCredParams: [
        { alg: -7, type: "public-key" }, // ES256
        { alg: -257, type: "public-key" }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // Enforces built-in Fingerprint/Face ID
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Biometric enrollment was cancelled by device.");
  }

  const credentialId = bufferToBase64url(credential.rawId);

  // 3. Send enrolled credential to server
  const regRes = await fetch("/api/admin/biometrics/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      credentialId,
      deviceName,
      challenge: data.challenge,
      email: adminEmail,
    }),
  });

  const regData = await regRes.json();
  if (!regRes.ok || !regData.success) {
    throw new Error(regData.message || "Failed to save biometric key.");
  }

  localStorage.setItem("bmgh_biometric_device_registered", "true");
  localStorage.setItem("bmgh_biometric_last_id", credentialId);

  return {
    success: true,
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

  // 1. Get authentication challenge
  const res = await fetch("/api/admin/biometrics/challenge?type=auth");
  const data = await res.json();
  if (!res.ok || !data.challenge) {
    throw new Error(data.message || "Failed to initiate biometric sign-in challenge.");
  }

  const challengeBuffer = base64urlToBuffer(data.challenge);

  // 2. Prompt Face ID / Touch ID / Fingerprint
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: challengeBuffer,
      rpId: window.location.hostname,
      userVerification: "required",
      timeout: 60000,
    },
  })) as PublicKeyCredential | null;

  if (!credential) {
    throw new Error("Biometric sign-in was cancelled or timed out.");
  }

  const credentialId = bufferToBase64url(credential.rawId);

  // 3. Verify on server
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

  return {
    success: true,
    token: verifyData.token,
    email: verifyData.email,
    deviceName: verifyData.deviceName,
    message: verifyData.message,
  };
}
