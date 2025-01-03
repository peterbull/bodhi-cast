
//#nbts@code
import { EccodesWrapper } from "npm:eccodes-ts";
import { getMeanGlobalForecastUrls } from "../../typeflow/src/utils.ts";
import { integer, pgTable, varchar } from "npm:drizzle-orm/pg-core";

import { drizzle } from "npm:drizzle-orm/node-postgres";

//#nbts@code

//#nbts@code
const connString = `postgresql://user:password@localhost:5432/postgres`;

//#nbts@code
const db = drizzle(connString);

//#nbts@code
export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  age: integer().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
});

//#nbts@code

//#nbts@code
const links = await getMeanGlobalForecastUrls();

//#nbts@code
const res = await fetch(links[0]);

//#nbts@code
res;

//#nbts@code
const wrapper = new EccodesWrapper(res.body);

//#nbts@code
const data = await wrapper.readToJson();

//#nbts@code
const swh = await wrapper.getSignificantWaveHeight();

//#nbts@code
swh;

//#nbts@code
