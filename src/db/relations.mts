import { autoTable, kennzeichenTable, wartungTable } from './schema.mts';
import { defineRelations } from 'drizzle-orm';

export const relations = defineRelations({ autoTable, kennzeichenTable, wartungTable }, (rel) => {
    return {
        autoTable: {
            // 1:1, because kennzeichen.auto_id is UNIQUE
            kennzeichenTable: rel.one.kennzeichenTable(),
            // 1:N
            wartungTable: rel.many.wartungTable(),
        },
        kennzeichenTable: {
            autoTable: rel.one.autoTable({
                from: rel.kennzeichenTable.autoId,
                to: rel.autoTable.id,
            }),
        },
        wartungTable: {
            autoTable: rel.one.autoTable({
                from: rel.wartungTable.autoId,
                to: rel.autoTable.id,
            }),
        },
    };
});
