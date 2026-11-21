# Security Specification & Payload-First TDD — KaryaDigital

## 1. Data Invariants
1. **User PII Isolation**: `/users/{userId}` contains `email` and `phone`. Only the owning authenticated user (`request.auth.uid == userId`) or a verified admin may read it.
2. **No Self-Assigned Admin Role**: A user creating their profile at `/users/{userId}` may only set `role` to `'customer'` or `'seller'`, never `'admin'`. Users cannot alter `role` on update.
3. **Order Integrity & Relational Existence**: Creating `/orders/{orderId}` requires `buyerId == request.auth.uid`, `paymentStatus == 'pending'`, `createdAt == request.time`, and `exists(/databases/$(database)/documents/products/$(incoming().productId))`.
4. **Terminal State Locking**: Orders with `paymentStatus == 'refunded'` and payouts with `status == 'completed'` cannot be modified by non-admins.
5. **Immutable Audit Trail**: `/activity_logs/{logId}` and `/cloud_backups/{backupId}` cannot be updated or deleted once created.
6. **Verified Email Gate**: All authenticated write mutations require `request.auth.token.email_verified == true`.
7. **Strict Path ID & Volumetric Guards**: All single-document target path IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and every string field has an explicit `.size()` ceiling.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Self-Admin Escalation**: `POST /users/u1` with `{ role: "admin" }` -> `PERMISSION_DENIED`.
2. **Shadow Field Injection**: `POST /products/p1` with extra ghost key `isFeaturedHack: true` -> `PERMISSION_DENIED`.
3. **Unverified Admin Email Spoof**: Request with `email: "fauzankamal02@gmail.com"` and `email_verified: false` -> `PERMISSION_DENIED`.
4. **Cross-User PII Read**: Authenticated `u2` reading `/users/u1` -> `PERMISSION_DENIED`.
5. **Blanket Order List Scrape**: `u2` listing `/orders` without `buyerId == u2` / `sellerId == u2` -> `PERMISSION_DENIED`.
6. **Identity Spoofing on Order**: `u1` creating order with `buyerId: "u2"` -> `PERMISSION_DENIED`.
7. **State Shortcutting on Order Create**: `u1` creating order directly with `paymentStatus: "verified"` -> `PERMISSION_DENIED`.
8. **Orphan Order Injection**: `u1` creating order referencing non-existent `productId: "ghost_prod"` -> `PERMISSION_DENIED`.
9. **Resource Poisoning via Oversized ID**: `PUT /products/<200-char-junk>` -> `PERMISSION_DENIED`.
10. **Value Poisoning on Update**: Updating `stock` to negative `-50` or string `"unlimited"` -> `PERMISSION_DENIED`.
11. **Backdated Timestamp Spoofing**: Creating order with client-forged `createdAt` != `request.time` -> `PERMISSION_DENIED`.
12. **Audit Log Tampering**: Updating or deleting `/activity_logs/log1` -> `PERMISSION_DENIED`.
