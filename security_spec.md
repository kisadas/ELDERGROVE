# Eldergrove Online — Firestore Security Specification

## 1. Data Invariants
1. **Owner-Only PII & Account Isolation**: `/users/{userId}` contains `email` (PII). Reads and writes are strictly restricted to the verified authenticated owner (`request.auth.uid == userId && request.auth.token.email_verified == true`). No blanket `isSignedIn()` reads or public listing on `/users`.
2. **Owner-Only Multi-Character Persistence**: `/users/{userId}/characters/{characterId}` stores each created hero. Both the parent `userId` path and `data.ownerId` must equal `request.auth.uid`, and `characterId` must match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars).
3. **Strict Schema & No Shadow Fields**: Both `UserAccount` and `CharacterProfile` use `.keys().hasAll(...)` and `.keys().hasOnly(...)` on write, plus bounded string/array/number checks so attackers cannot inject arbitrary fields or 1MB payloads.
4. **Immutable Ownership & Timestamps**: `uid`, `ownerId`, `playerId`, `heroClass`, and `createdAt` cannot be modified after creation (`incoming().field == existing().field`). `createdAt` and `updatedAt` must strictly equal `request.time`.
5. **Secure List Queries**: Listing `/users/{userId}/characters` is restricted strictly to the owner (`request.auth.uid == userId && resource.data.ownerId == request.auth.uid`). Listing `/users` is denied.

## 2. Adversarial "Dirty Dozen" Attack Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: Read `/users/u1` with `auth == null`.
2. **Email Verification Spoof**: Write `/users/u1` with `auth.uid == 'u1'`, `email_verified == false`.
3. **Cross-User PII Read**: Authenticated verified `u2` calls `get(/users/u1)`.
4. **Users Collection Scrape**: Authenticated verified `u1` calls `list(/users)`.
5. **Cross-User Character Hijack**: `u2` creates `/users/u1/characters/hero1` with `ownerId: 'u2'`.
6. **OwnerId Spoof on Own Subcollection**: `u1` creates `/users/u1/characters/hero1` with `ownerId: 'u2'`.
7. **Shadow Field Injection**: `u1` writes `/users/u1` including `{ isAdmin: true }`.
8. **Oversized ID Poisoning**: `u1` creates `/users/u1/characters/${'a'.repeat(300)}`.
9. **Oversized Name DoW Attack**: `u1` creates character with `name: 'x'.repeat(100)`.
10. **Immutable Class Mutation**: `u1` updates `/users/u1/characters/hero1` changing `heroClass` from `'warrior'` to `'mage'`.
11. **Client Timestamp Forgery**: `u1` creates `/users/u1` with `createdAt: new Date(0)` instead of `serverTimestamp()`.
12. **Oversized Inventory Array Injection**: `u1` writes `inventory` with 120 entries (> 48 max).
