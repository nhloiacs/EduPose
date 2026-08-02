export default function Pagination({ page, meta, onPageChange, children, label }) {
  const totalPages = Math.max(1, Math.ceil((meta?.total ?? 0) / (meta?.size || 10)));

  return (
    <div className="pagination-row">
      <span className="pagination-label">
        {label ?? `Halaman ${meta?.page ?? page} dari ${totalPages}`}
      </span>
      <div className="pagination-actions">
        <button
          type="button"
          className="pagination-button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Sebelumnya
        </button>
        <button
          type="button"
          className="pagination-button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Berikutnya
        </button>
        {children}
      </div>
    </div>
  );
}
