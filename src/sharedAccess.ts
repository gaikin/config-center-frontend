import type { RoleItem, ShareMode } from "./types";

export interface ViewerContext {
  orgScopeId: string;
  roleType: RoleItem["roleType"];
}

export interface ShareableTarget {
  ownerOrgId: string;
  shareMode?: ShareMode;
  sharedOrgIds?: string[];
}

function normalizeShareMode(shareMode?: ShareMode): ShareMode {
  return shareMode ?? "PRIVATE";
}

function normalizeSharedOrgIds(sharedOrgIds?: string[]): string[] {
  return Array.isArray(sharedOrgIds) ? sharedOrgIds : [];
}

export function canAccessSharedObject(target: ShareableTarget, viewer: ViewerContext): boolean {
  const shareMode = normalizeShareMode(target.shareMode);
  const sharedOrgIds = normalizeSharedOrgIds(target.sharedOrgIds);

  if (viewer.orgScopeId === target.ownerOrgId) {
    return true;
  }

  if (shareMode === "PRIVATE") {
    return false;
  }

  return sharedOrgIds.includes(viewer.orgScopeId);
}

export function canEditSharedObject(target: ShareableTarget, viewer: ViewerContext): boolean {
  return viewer.orgScopeId === target.ownerOrgId;
}

export function isReadonlySharedObject(target: ShareableTarget, viewer: ViewerContext): boolean {
  return canAccessSharedObject(target, viewer) && !canEditSharedObject(target, viewer);
}
