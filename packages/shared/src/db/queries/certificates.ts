import { query, queryOne } from "../connection.ts";
import type { Certificate, CertificateStatus } from "../../types.ts";

export async function findByDomainId(domainId: string): Promise<Certificate | null> {
  return await queryOne<Certificate>(
    "SELECT * FROM certificates WHERE domain_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1",
    [domainId],
  );
}

export async function findById(id: string): Promise<Certificate | null> {
  return await queryOne<Certificate>(
    "SELECT * FROM certificates WHERE id = $1 AND deleted_at IS NULL",
    [id],
  );
}

export async function findExpiringCertificates(daysBeforeExpiry: number = 14): Promise<Certificate[]> {
  return await query<Certificate>(
    `SELECT c.* FROM certificates c
     JOIN domains d ON c.domain_id = d.id
     WHERE c.status = 'issued'
     AND c.expires_at < NOW() + ($1 || ' days')::INTERVAL
     AND c.deleted_at IS NULL
     AND d.deleted_at IS NULL`,
    [daysBeforeExpiry.toString()],
  );
}

export async function findByStatus(status: CertificateStatus): Promise<Certificate[]> {
  return await query<Certificate>(
    "SELECT * FROM certificates WHERE status = $1 AND deleted_at IS NULL",
    [status],
  );
}

export async function create(
  domainId: string,
  domain: string,
  isWildcard: boolean,
): Promise<Certificate> {
  const rows = await query<Certificate>(
    `INSERT INTO certificates (domain_id, domain, is_wildcard)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [domainId, domain, isWildcard],
  );
  return rows[0];
}

export async function updateStatus(
  id: string,
  status: CertificateStatus,
  errorMessage?: string | null,
): Promise<Certificate | null> {
  return await queryOne<Certificate>(
    `UPDATE certificates SET status = $1, error_message = $2, updated_at = NOW()
     WHERE id = $3 AND deleted_at IS NULL
     RETURNING *`,
    [status, errorMessage ?? null, id],
  );
}

export async function updateAcmeData(
  id: string,
  acmeAccountKeyEncrypted: string,
  acmeAccountKeyIv: string,
  acmeOrderUrl: string,
): Promise<Certificate | null> {
  return await queryOne<Certificate>(
    `UPDATE certificates SET
       acme_account_key_encrypted = $1,
       acme_account_key_iv = $2,
       acme_order_url = $3,
       updated_at = NOW()
     WHERE id = $4 AND deleted_at IS NULL
     RETURNING *`,
    [acmeAccountKeyEncrypted, acmeAccountKeyIv, acmeOrderUrl, id],
  );
}

export async function updateIssuedCertificate(
  id: string,
  certificatePem: string,
  privateKeyPemEncrypted: string,
  privateKeyIv: string,
  expiresAt: Date,
): Promise<Certificate | null> {
  return await queryOne<Certificate>(
    `UPDATE certificates SET
       certificate_pem = $1,
       private_key_pem_encrypted = $2,
       private_key_iv = $3,
       status = 'issued',
       issued_at = NOW(),
       expires_at = $4,
       error_message = NULL,
       renewal_attempts = 0,
       updated_at = NOW()
     WHERE id = $5 AND deleted_at IS NULL
     RETURNING *`,
    [certificatePem, privateKeyPemEncrypted, privateKeyIv, expiresAt, id],
  );
}

export async function markRenewalFailed(
  id: string,
  errorMessage: string,
): Promise<Certificate | null> {
  return await queryOne<Certificate>(
    `UPDATE certificates SET
       status = 'renewal_failed',
       error_message = $1,
       last_renewal_attempt = NOW(),
       renewal_attempts = renewal_attempts + 1,
       updated_at = NOW()
     WHERE id = $2 AND deleted_at IS NULL
     RETURNING *`,
    [errorMessage, id],
  );
}

export async function markExpired(id: string): Promise<Certificate | null> {
  return await queryOne<Certificate>(
    `UPDATE certificates SET status = 'expired', updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id],
  );
}

export async function softDelete(id: string): Promise<void> {
  await query(
    "UPDATE certificates SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1",
    [id],
  );
}
