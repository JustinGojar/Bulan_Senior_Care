import { API_URL, type Announcement } from "@/lib/api";

export function storageUrl(path: string) {
  return `${API_URL.replace(/\/api$/, "")}/storage/${path}`;
}

export function announcementImageUrl(announcement: Announcement) {
  return announcement.image_path
    ? storageUrl(announcement.image_path)
    : announcement.source_image_url!;
}
