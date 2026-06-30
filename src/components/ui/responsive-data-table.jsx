import { cn } from '@/lib/utils';
import { ListCard, ListCardHeader } from '@/components/ui/list-card';

/**
 * Tableau desktop + cartes empilées sur mobile.
 *
 * columns: { key, header, cellClassName?, hideOnMobile?, render(row) }
 */
export default function ResponsiveDataTable({
  columns,
  rows,
  rowKey,
  emptyMessage = 'Aucune donnée.',
  className,
}) {
  if (!rows?.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  const mobileColumns = columns.filter((col) => !col.hideOnMobile);

  return (
    <div className={className}>
      <ul className="m-0 list-none space-y-2 p-0 md:hidden">
        {rows.map((row) => (
          <ListCard key={rowKey(row)} className="shadow-none">
            <ListCardHeader className="space-y-2">
              {mobileColumns.map((col) => {
                const content = col.render(row);
                if (content == null || content === '') return null;
                return (
                  <div key={col.key} className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {col.header}
                    </p>
                    <div className="text-sm text-slate-900">{content}</div>
                  </div>
                );
              })}
            </ListCardHeader>
          </ListCard>
        ))}
      </ul>

      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-3 py-2 font-medium">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className="border-t">
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-3 py-2 text-slate-700', col.cellClassName)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
