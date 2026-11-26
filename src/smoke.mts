import { db } from './config/db.mts';

const LIMIT = 2;
const INDENT = 2;

const autos = await db.query.autoTable.findMany({
    with: { kennzeichenTable: true, wartungTable: true },
    limit: LIMIT,
});
console.log(JSON.stringify(autos, null, INDENT));
await db.$client.end();
