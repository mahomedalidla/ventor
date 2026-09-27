import type { RedSocial } from "@/lib/types/database";

export type ParsedSocialProfile = {
  red_social: RedSocial;
  usuario_red_social: string;
  perfil_url: string;
};

/**
 * Extrae red + @handle desde un URL público de Instagram / Facebook / TikTok.
 * Sin llamadas externas — solo regex.
 */
export function parseSocialProfileUrl(raw: string): ParsedSocialProfile | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "instagram.com" || host === "instagr.am") {
    const user = parts[0];
    if (!user || ["p", "reel", "reels", "stories", "explore", "tv"].includes(user)) {
      return null;
    }
    return {
      red_social: "instagram",
      usuario_red_social: user.replace(/^@/, ""),
      perfil_url: `https://instagram.com/${user.replace(/^@/, "")}`,
    };
  }

  if (host === "tiktok.com" || host.endsWith(".tiktok.com")) {
    const userPart = parts.find((p) => p.startsWith("@"));
    if (!userPart) return null;
    const user = userPart.replace(/^@/, "");
    return {
      red_social: "tiktok",
      usuario_red_social: user,
      perfil_url: `https://www.tiktok.com/@${user}`,
    };
  }

  if (
    host === "facebook.com" ||
    host === "fb.com" ||
    host === "m.facebook.com" ||
    host === "web.facebook.com"
  ) {
    // facebook.com/username  |  facebook.com/profile.php?id=...
    if (parts[0] === "profile.php") {
      const id = url.searchParams.get("id");
      if (!id) return null;
      return {
        red_social: "facebook",
        usuario_red_social: id,
        perfil_url: `https://www.facebook.com/profile.php?id=${id}`,
      };
    }
    const skip = new Set([
      "pages",
      "groups",
      "watch",
      "events",
      "marketplace",
      "photo",
      "photos",
      "share",
      "story.php",
    ]);
    const user = parts[0];
    if (!user || skip.has(user)) return null;
    return {
      red_social: "facebook",
      usuario_red_social: user,
      perfil_url: `https://www.facebook.com/${user}`,
    };
  }

  return null;
}
